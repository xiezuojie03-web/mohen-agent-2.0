// apps/web/lib/studio-execution-authority.ts
//
// Studio 生产执行授权：把 local-execution-authorizer.mjs 的签名+验证逻辑
// 复用到 Studio UI 触发路径，让「一句话委托」能真正启动 run.mjs 全链。
//
// 安全边界：只在本地隔离环境生效（DATABASE_URL 指向 127.0.0.1/localhost，
// 无生产 service role key），与 local-execution-authorizer.mjs 同口径。
// 不授权生产部署、不签 Gate、不接触生产密钥。
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { execFileSync } from "node:child_process";

export const AUTH_DIR = process.env.MOHEN_LOCAL_EXECUTION_AUTH_DIR || "D:/MoHen/keys/execution-auth";

function readAuthFile(name: string): string {
  return fs.readFileSync(path.join(AUTH_DIR, name), "utf8");
}

/** 执行授权配置是否就绪：密钥材料 + evidence + 隔离环境。同步零成本预检。 */
export function isExecutionAuthorityReady(): boolean {
  const required = [
    "signing-private.pem", "signing-public.pem",
    "credential", "hold_epoch",
    "enable-requires-evidence.json",
    "tls-ca-cert.pem", "verifier-key.pem", "verifier-cert.pem",
  ];
  for (const f of required) {
    if (!fs.existsSync(path.join(AUTH_DIR, f))) return false;
  }
  // QR-08：只接受本地隔离目标，绝不接受生产端点或生产凭据。
  const env = String(process.env.MOHEN_ENV || "").toLowerCase();
  if (env === "production" || env === "prod") return false;
  const dbUrl = String(process.env.DATABASE_URL || "");
  if (!/^postgresql:\/\/[^@]*@(127\.0\.0\.1|localhost)(:\d+)?\//.test(dbUrl)) return false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  if (process.env.MOHEN_PRODUCTION_EXECUTION_AUTHORIZED === "true") return false;
  return true;
}

/** 加载并校验 enable-requires-evidence.json（绑定 git HEAD + registry digest + 24h 内）。 */
export function loadEnableRequiresEvidence(registryDigest: string): Record<string, { status: string }> {
  const file = path.join(AUTH_DIR, "enable-requires-evidence.json");
  const evidence = JSON.parse(fs.readFileSync(file, "utf8"));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (evidence.git_head !== head) throw new Error("ENABLE_REQUIRES_EVIDENCE_STALE:git-head");
  if (evidence.registry_digest !== registryDigest) throw new Error("ENABLE_REQUIRES_EVIDENCE_STALE:registry-digest");
  const ageMs = Date.now() - Date.parse(evidence.generated_at || "");
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) {
    throw new Error("ENABLE_REQUIRES_EVIDENCE_STALE:age");
  }
  if (evidence.target !== "local-isolated") throw new Error("ENABLE_REQUIRES_EVIDENCE_NOT_ISOLATED");
  return evidence.checks || {};
}

/** 加载已签发授权日志（用于验证器的一次性 nonce）。 */
function loadJournal(): { file: string; issued: Map<string, { claims: any; consumed: boolean }> } {
  const dir = path.join(process.cwd(), ".mohen", "execution-auth");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "issued-grants.jsonl");
  const issued = new Map<string, { claims: any; consumed: boolean }>();
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      if (record.consumed_jti) {
        const prev = issued.get(record.consumed_jti);
        if (prev) prev.consumed = true;
      } else {
        issued.set(record.jti, { claims: record.claims, consumed: false });
      }
    }
  }
  return { file, issued };
}

function appendJournal(record: any) {
  const dir = path.join(process.cwd(), ".mohen", "execution-auth");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "issued-grants.jsonl");
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
}

export interface StageInput {
  stage: string;
  input: any;
}

/**
 * 为单个 stage 签 EdDSA 执行授权令牌。与 local-execution-authorizer.mjs 的
 * buildGrant 同口径：input_digest 必须与 Runner 实跑输入逐字节同源。
 */
export function signStageGrant(params: {
  stage: string;
  runId: string;
  mode: string;
  job: any;
  registry: any;
  registryDigest: string;
  input: any;
  issued?: Map<string, { claims: any; consumed: boolean }>;
}): { token: string; claims: any } {
  const { stage, runId, mode, job, registry, registryDigest, input } = params;
  const evidenceChecks = loadEnableRequiresEvidence(registryDigest);
  const requires = Array.isArray(job.execution_policy?.enable_requires)
    ? job.execution_policy.enable_requires
    : [];
  const unproven = requires.filter((k: string) => evidenceChecks[k]?.status !== "PASS");
  if (unproven.length) throw new Error(`ENABLE_REQUIRES_EVIDENCE_INCOMPLETE:${unproven.join(",")}`);

  const iat = Math.floor(Date.now() / 1000);
  const claims = {
    iss: "mohen-independent-execution-authorizer",
    aud: "mohen-production-stage",
    run_id: runId,
    stage,
    job_id: job.job_id,
    mode,
    architecture_generation: registry.architecture_generation,
    iat,
    exp: iat + 240,
    jti: crypto.randomBytes(24).toString("hex"),
    hold_epoch: readAuthFile("hold_epoch").trim(),
    registry_digest: registryDigest,
    input_digest: executionDigest(input),
    authorized_conditions: Object.fromEntries(requires.map((k: string) => [k, true])),
  };
  const header = { alg: "EdDSA", typ: "MOHEN-STAGE", kid: "mohen-stage-v1" };
  const h = Buffer.from(JSON.stringify(header)).toString("base64url");
  const c = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.sign(
    null,
    Buffer.from(`${h}.${c}`),
    crypto.createPrivateKey(readAuthFile("signing-private.pem"))
  );
  const token = `${h}.${c}.${Buffer.from(signature).toString("base64url")}`;
  appendJournal({ jti: claims.jti, claims, consumed: false });
  if (params.issued) params.issued.set(claims.jti, { claims, consumed: false });
  return { token, claims };
}

/** 与 execution-authority.mjs 同源的规范哈希。 */
function executionDigest(value: any): string {
  function canonical(x: any): any {
    if (x === null || typeof x === "string" || typeof x === "boolean") return x;
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (Array.isArray(x)) return x.map(canonical);
    if (typeof x === "object" && Object.getPrototypeOf(x) === Object.prototype) {
      return Object.fromEntries(Object.keys(x).sort().map((k) => [k, canonical(x[k])]));
    }
    throw new Error("EXECUTION_INPUT_NOT_JSON");
  }
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export { executionDigest };

/**
 * 启动本地 HTTPS 一次性 nonce 验证器。返回 server 与 port，
 * 由调用方在 run.mjs 退出后关闭。
 * 共享 issued Map，让动态令牌服务新签发的 jti 立即可被验证。
 */
export function startVerifier(
  issued?: Map<string, { claims: any; consumed: boolean }>
): Promise<{ server: https.Server; port: number; issued: Map<string, { claims: any; consumed: boolean }> }> {
  const credential = readAuthFile("credential").trim();
  const shared = issued ?? loadJournal().issued;
  const journalFile = path.join(process.cwd(), ".mohen", "execution-auth", "issued-grants.jsonl");
  return new Promise((resolve) => {
    const server = https.createServer(
      { key: readAuthFile("verifier-key.pem"), cert: readAuthFile("verifier-cert.pem") },
      (req, res) => {
        if (req.method !== "POST") { res.writeHead(405).end(); return; }
        const auth = req.headers.authorization ?? "";
        const expected = `Bearer ${credential}`;
        const okAuth = auth.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
        if (!okAuth) { res.writeHead(401).end(); return; }
        let body = "";
        req.on("data", (chunk) => { body += chunk; if (body.length > 4096) req.destroy(); });
        req.on("end", () => {
          try {
            const request = JSON.parse(body);
            const record = shared.get(request.jti);
            if (!record) { res.writeHead(404).end(); return; }
            if (record.consumed) { res.writeHead(409).end(); return; }
            const c = record.claims;
            if (request.run_id !== c.run_id || request.stage !== c.stage ||
                request.job_id !== c.job_id || request.mode !== c.mode ||
                request.hold_epoch !== c.hold_epoch ||
                request.registry_digest !== c.registry_digest ||
                request.input_digest !== c.input_digest) {
              res.writeHead(403).end();
              return;
            }
            record.consumed = true;
            fs.appendFileSync(journalFile, `${JSON.stringify({ consumed_jti: c.jti, at: new Date().toISOString() })}\n`);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({
              allowed: true, consumed_nonce: c.jti, run_id: c.run_id, stage: c.stage,
              job_id: c.job_id, mode: c.mode, hold_epoch: c.hold_epoch,
              registry_digest: c.registry_digest, input_digest: c.input_digest,
            }));
          } catch { res.writeHead(400).end(); }
        });
      }
    );
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: (server.address() as any).port, issued: shared });
    });
  });
}

/** 组装 run.mjs 所需的执行授权环境变量。 */
export function buildAuthEnv(tokens: Record<string, string>, verifierPort: number): Record<string, string> {
  return {
    MOHEN_EXECUTION_AUTH_TOKENS: JSON.stringify(tokens),
    MOHEN_EXECUTION_AUTH_PUBLIC_KEY: readAuthFile("signing-public.pem"),
    MOHEN_EXECUTION_AUTH_VERIFY_URL: `https://127.0.0.1:${verifierPort}/consume`,
    MOHEN_EXECUTION_AUTH_VERIFY_CREDENTIAL: readAuthFile("credential").trim(),
    NODE_EXTRA_CA_CERTS: path.join(AUTH_DIR, "tls-ca-cert.pem"),
    MOHEN_DATABASE_CA_CERT: readAuthFile("tls-ca-cert.pem"),
  };
}

export interface DynamicTokenService {
  server: https.Server;
  port: number;
  credential: string;
}

/**
 * 启动动态令牌签发服务：Runner 在 D01–D05 执行前按需请求令牌。
 * 服务验证 run_id/stage/job_id/mode 与当前 registry 一致后签发，
 * input_digest 由服务端用收到的 input 计算，Producer 不能自造。
 */
export function startDynamicTokenService(
  registry: any,
  registryDigest: string,
  runId: string,
  issued?: Map<string, { claims: any; consumed: boolean }>,
  port = 0
): Promise<DynamicTokenService> {
  const credential = readAuthFile("credential").trim();
  return new Promise((resolve) => {
    const server = https.createServer(
      { key: readAuthFile("verifier-key.pem"), cert: readAuthFile("verifier-cert.pem") },
      (req, res) => {
        if (req.method !== "POST") { res.writeHead(405).end(); return; }
        const auth = req.headers.authorization ?? "";
        const expected = `Bearer ${credential}`;
        const okAuth = auth.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
        if (!okAuth) { res.writeHead(401).end(); return; }
        let body = "";
        req.on("data", (chunk) => { body += chunk; if (body.length > 65536) req.destroy(); });
        req.on("end", () => {
          try {
            const request = JSON.parse(body);
            if (request.run_id !== runId) { res.writeHead(403).end(); return; }
            const job = registry.jobs.find((j: any) => j.stage === request.stage);
            if (!job || job.job_id !== request.job_id) { res.writeHead(404).end(); return; }
            const { token } = signStageGrant({
              stage: request.stage,
              runId,
              mode: request.mode,
              job,
              registry,
              registryDigest,
              input: request.input,
              issued,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ token }));
          } catch (e: any) {
            res.writeHead(500, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: String(e?.message || e) }));
          }
        });
      }
    );
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, port: (server.address() as any).port, credential });
    });
  });
}
