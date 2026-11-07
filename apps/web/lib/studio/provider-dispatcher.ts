// apps/web/lib/studio/provider-dispatcher.ts
//
// M4 受控 Provider 派发器（B 线正道）：授权与执行绑定，无授权句柄 = 恒阻断。
//
// 铁律：
// 1. 派发前必须同时满足——真实委托未过期、action 在 allowed_actions、
//    transfer_rights_decision.external_processing='GRANTED'、USD 预算 ≥ 最坏估算
//    （含已花费），且每一个来源的权利都显式允许外部处理；
//    任一不满足即拒绝（失败关闭，TRANSFER_DENIED / HOLD_BUDGET），不发起任何请求。
// 2. 句柄一次性、模块内发行，不可外部构造；授权时绑死 model/输入/来源（input_hash），
//    执行时逐项核对，不一致即拒绝。
// 3. 不重试：30s 超时；成功写 ACCEPT_AS_CANDIDATE + ESTIMATED 回执（真实 usage ×
//    版本化价格表，保守 peak 上界）；失败/超时写 HOLD 回执并抛 DISPATCH_UNCERTAIN。
// 4. 同一 input_hash 已有 ACCEPT 回执 → 回放（不再扣费、不再发起请求）。
// 5. 模型不在版本化价格表内 = 费用未知 = 拒绝派发。
//
// 本文件刻意保持"无相对扩展名之外的运行时相对导入 + 无可擦除之外的 TS 语法"，
// 以便 tools/*.mjs 验证脚本在 Node >=22.18（内建 type stripping）下直接 import 同一份实现，
// 不产生第二套派发逻辑。type-only import 会被擦除，不影响 Node 运行。

import { createHash, randomUUID } from "node:crypto";
import type {
  StudioDelegationRecord,
  StudioExecutionReceiptRecord,
  StudioHeldReceiptRecord,
  StudioVerifiedReceiptRecord,
} from "@mohen/data-access";

// ---------- 版本化价格表（USD / 1M token） ----------
// 来源：DeepSeek 官方价格文档。口径：估算是"最坏情况上界"（peak 时段 + cache 全
// miss）；实算用 usage 的 cache hit/miss 拆分 × peak 价（保守上界；闲时/节假日不建模）。
export interface ModelPrice {
  /** USD / 1M input tokens, cache miss */
  inputCacheMiss: number;
  /** USD / 1M input tokens, cache hit */
  inputCacheHit: number;
  /** USD / 1M output tokens */
  output: number;
}
export interface ProviderPriceTable {
  priceRef: string;
  sourceUrl: string;
  currency: "USD";
  perTokens: number;
  models: Record<string, ModelPrice>;
}
// 2026-11-07 取自 https://api-docs.deepseek.com/quick_start/pricing （peak 价）。
const DEEPSEEK_2026_11_07: ProviderPriceTable = {
  priceRef: "deepseek/2026-11-07",
  sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing",
  currency: "USD",
  perTokens: 1_000_000,
  models: {
    "deepseek-flash": { inputCacheMiss: 0.30, inputCacheHit: 0.006, output: 1.20 },
    "deepseek-v4-pro": { inputCacheMiss: 1.32, inputCacheHit: 0.044, output: 3.96 },
  },
};
export function currentPriceTable(): ProviderPriceTable {
  return DEEPSEEK_2026_11_07;
}
/** 模型价格；不在版本化表内返回 null（= 费用未知，调用方必须拒绝）。 */
export function getModelPrice(model: string, table: ProviderPriceTable = DEEPSEEK_2026_11_07): ModelPrice | null {
  return table.models[model] ?? null;
}
/** 最坏情况费用上界（USD）：输入按全部 cache miss、输出按 maxTokens 计。 */
export function worstCaseCostUsd(
  model: string,
  maxInputTokens: number,
  maxOutputTokens: number,
  table: ProviderPriceTable = DEEPSEEK_2026_11_07
): number | null {
  const price = getModelPrice(model, table);
  if (!price) return null;
  if (!Number.isSafeInteger(maxInputTokens) || maxInputTokens < 0
    || !Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 0) return null;
  return (maxInputTokens * price.inputCacheMiss + maxOutputTokens * price.output) / table.perTokens;
}
export interface ProviderUsage {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  prompt_cache_hit_tokens?: unknown;
  prompt_cache_miss_tokens?: unknown;
}
/**
 * 按真实 usage 估算费用（USD，peak 保守上界）。
 * cache 字段缺失时全部输入按 miss 计；usage 不合法返回 null（费用未知）。
 */
export function estimateCostFromUsageUsd(
  model: string,
  usage: ProviderUsage,
  table: ProviderPriceTable = DEEPSEEK_2026_11_07
): number | null {
  const price = getModelPrice(model, table);
  if (!price || !usage || typeof usage !== "object") return null;
  const prompt = usage.prompt_tokens;
  const completion = usage.completion_tokens;
  if (!Number.isSafeInteger(prompt) || (prompt as number) < 0
    || !Number.isSafeInteger(completion) || (completion as number) < 0) return null;
  const total = prompt as number;
  let hit = Number.isSafeInteger(usage.prompt_cache_hit_tokens)
    ? (usage.prompt_cache_hit_tokens as number) : 0;
  if (hit < 0 || hit > total) hit = 0;
  const miss = total - hit;
  return (miss * price.inputCacheMiss + hit * price.inputCacheHit
    + (completion as number) * price.output) / table.perTokens;
}

// ---------- 派发器 ----------
const canonical = (v: unknown): string => Array.isArray(v)
  ? "[" + v.map(canonical).join(",") + "]"
  : v !== null && typeof v === "object"
    ? "{" + Object.keys(v as Record<string, unknown>).sort()
        .map((k) => JSON.stringify(k) + ":" + canonical((v as Record<string, unknown>)[k])).join(",") + "}"
    : JSON.stringify(v);
const sha256 = (v: unknown) => createHash("sha256").update(canonical(v)).digest("hex");

export class DispatchError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "DispatchError";
    this.code = code;
  }
}

export interface DispatcherDeps {
  delegations: {
    getDelegation(delegationId: string, token: string): Promise<StudioDelegationRecord | null>;
    listReceipts(delegationId: string, token: string): Promise<StudioExecutionReceiptRecord[]>;
    appendVerifiedReceipt(input: unknown, token: string): Promise<StudioVerifiedReceiptRecord>;
    appendHeldReceipt(input: unknown, token: string): Promise<StudioHeldReceiptRecord>;
  };
  readSourceRights(
    sourceIds: string[],
    token: string
  ): Promise<Array<{ source_id: string; rights: Record<string, unknown> | string | null }>>;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface AuthorizedCall {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}

export interface AuthorizeDispatchInput {
  delegationId: string;
  action: string;
  model: string;
  call: AuthorizedCall;
  sourceIds: string[];
  sessionToken: string;
}

/** 授权句柄：对外不透明，一次性消费。replay=true 时执行不发起请求、不扣费。 */
export interface DispatchHandle {
  readonly handleId: string;
  readonly replay: boolean;
}

interface HandleState {
  delegation: StudioDelegationRecord;
  action: string;
  model: string;
  call: AuthorizedCall;
  sourceIds: string[];
  sessionToken: string;
  inputHash: string;
  attemptNo: number;
  replayReceipt: StudioExecutionReceiptRecord | null;
  consumed: boolean;
}

// 模块内一次性句柄表（本地单进程 M5 范围；无句柄 = 无派发）。
const handles = new Map<string, HandleState>();

/** 仅供 blocker 判定：存在且未消费的真实句柄才放行。 */
export function isUsableDispatchHandle(handle: unknown): handle is DispatchHandle {
  if (!handle || typeof handle !== "object") return false;
  const id = (handle as DispatchHandle).handleId;
  if (typeof id !== "string") return false;
  const state = handles.get(id);
  return !!state && !state.consumed;
}

const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function validateInput(input: AuthorizeDispatchInput): void {
  if (!input || typeof input !== "object") throw new DispatchError("DISPATCH_INPUT_INVALID");
  if (!uuidPattern.test(input.delegationId ?? "")) throw new DispatchError("DISPATCH_INPUT_INVALID");
  if (typeof input.action !== "string" || !input.action.trim() || input.action.length > 200)
    throw new DispatchError("DISPATCH_INPUT_INVALID");
  if (typeof input.model !== "string" || !input.model.trim() || input.model.length > 200)
    throw new DispatchError("DISPATCH_INPUT_INVALID");
  const call = input.call;
  if (!call || typeof call.system !== "string" || !call.system.trim()
    || typeof call.user !== "string" || !call.user.trim()
    || call.system.length + call.user.length > 200_000
    || typeof call.temperature !== "number" || !(call.temperature >= 0 && call.temperature <= 2)
    || !Number.isSafeInteger(call.maxTokens) || call.maxTokens < 1 || call.maxTokens > 8192)
    throw new DispatchError("DISPATCH_INPUT_INVALID");
  if (!Array.isArray(input.sourceIds) || !input.sourceIds.length || input.sourceIds.length > 32
    || !input.sourceIds.every((s) => typeof s === "string" && uuidPattern.test(s)))
    throw new DispatchError("DISPATCH_INPUT_INVALID");
  if (typeof input.sessionToken !== "string" || !input.sessionToken)
    throw new DispatchError("DISPATCH_INPUT_INVALID");
}

/**
 * 授权：核对委托/预算/逐来源权利，发行一次性句柄。
 * 不发起任何 provider 请求；拒绝一律抛 DispatchError（失败关闭）。
 */
export async function authorizeProviderDispatch(
  deps: DispatcherDeps,
  input: AuthorizeDispatchInput
): Promise<DispatchHandle> {
  validateInput(input);
  const delegation = await deps.delegations.getDelegation(input.delegationId, input.sessionToken);
  if (!delegation) throw new DispatchError("DISPATCH_DELEGATION_NOT_FOUND");
  if (!Number.isFinite(Date.parse(String(delegation.expires_at ?? "")))
    || Date.parse(String(delegation.expires_at)) <= Date.now())
    throw new DispatchError("DISPATCH_DELEGATION_EXPIRED");
  const actions = Array.isArray(delegation.allowed_actions) ? delegation.allowed_actions : [];
  if (!actions.includes(input.action)) throw new DispatchError("DISPATCH_ACTION_NOT_ALLOWED");
  const transfer = delegation.transfer_rights_decision as Record<string, unknown> | undefined;
  if (transfer?.external_processing !== "GRANTED") throw new DispatchError("TRANSFER_DENIED");
  if (delegation.currency !== "USD") throw new DispatchError("DISPATCH_CURRENCY_UNSUPPORTED");

  // 最坏情况：输入按 1 token/字符上界 + 输出按 maxTokens，全部 cache miss、peak 价。
  const estInputTokens = input.call.system.length + input.call.user.length + 32;
  const worst = worstCaseCostUsd(input.model, estInputTokens, input.call.maxTokens);
  if (worst === null) throw new DispatchError("DISPATCH_MODEL_UNPRICED");
  const budget = Number(delegation.budget_limit);
  if (!Number.isFinite(budget) || budget < 0) throw new DispatchError("HOLD_BUDGET");

  const receipts = await deps.delegations.listReceipts(input.delegationId, input.sessionToken);
  const spent = receipts
    .filter((r) => r.acceptance_state === "ACCEPT_AS_CANDIDATE" && r.cost !== null)
    .reduce((sum, r) => sum + Number(r.cost), 0);
  if (spent + worst > budget + 1e-9) throw new DispatchError("HOLD_BUDGET");

  // 逐来源权利：权利未知/缺失/不可解析 = TRANSFER_DENIED（失败关闭）。
  // rights 可能是对象（pg 驱动解析 jsonb）或 JSON 字符串（psql 文本通道），两种都接受。
  const sourceIds = [...new Set(input.sourceIds)].sort();
  const rows = await deps.readSourceRights(sourceIds, input.sessionToken);
  if (!Array.isArray(rows) || rows.length !== sourceIds.length) throw new DispatchError("TRANSFER_DENIED");
  for (const row of rows) {
    let rights: Record<string, unknown>;
    try {
      const raw = row?.rights as unknown;
      rights = typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
    } catch {
      throw new DispatchError("TRANSFER_DENIED", `TRANSFER_DENIED source=${row?.source_id}`);
    }
    if (!rights || typeof rights !== "object" || Array.isArray(rights))
      throw new DispatchError("TRANSFER_DENIED", `TRANSFER_DENIED source=${row?.source_id}`);
    const allowed = rights.external_processing === "allow"
      || rights.status === "public_domain_secondary_use";
    if (!allowed) throw new DispatchError("TRANSFER_DENIED", `TRANSFER_DENIED source=${row?.source_id}`);
  }

  const inputHash = sha256({
    action: input.action, model: input.model, sourceIds,
    system: input.call.system, user: input.call.user,
    temperature: input.call.temperature, maxTokens: input.call.maxTokens,
  });
  const replay = receipts.find((r) => r.acceptance_state === "ACCEPT_AS_CANDIDATE"
    && (r.result_manifest as Record<string, unknown> | undefined)?.input_hash === inputHash) ?? null;
  const attemptNo = receipts.reduce((max, r) => Math.max(max, Number(r.attempt_no) || 0), 0) + 1;

  const handleId = randomUUID();
  handles.set(handleId, {
    delegation, action: input.action, model: input.model, call: { ...input.call },
    sourceIds, sessionToken: input.sessionToken, inputHash, attemptNo,
    replayReceipt: replay, consumed: false,
  });
  return { handleId, replay: replay !== null };
}

export interface DispatchResult {
  replay: boolean;
  text: string | null;
  receipt: StudioExecutionReceiptRecord;
}

async function writeHeldReceipt(
  deps: DispatcherDeps,
  state: HandleState,
  startedAt: string,
  errorCode: string
): Promise<void> {
  try {
    await deps.delegations.appendHeldReceipt({
      delegationId: state.delegation.delegation_id,
      attemptNo: state.attemptNo,
      requestHash: state.delegation.request_hash,
      resultManifest: { input_hash: state.inputHash, model: state.model, phase: "provider_call" },
      candidateRefs: [],
      actualProvider: "deepseek",
      actualEngineVersion: currentPriceTable().priceRef,
      startedAt,
      finishedAt: new Date().toISOString(),
      cost: null,
      currency: null,
      costConfidence: "UNKNOWN",
      errorCode,
    }, state.sessionToken);
  } catch {
    // 回执写失败不改变处置：不重试、不补发，保持 DISPATCH_UNCERTAIN。
  }
}

/**
 * 执行：句柄一次性消费；成功写 verified 回执，失败写 HOLD 回执并抛 DISPATCH_UNCERTAIN。
 * 永不重试（provider 可能已计费）。
 */
export async function dispatchAuthorizedCall(
  deps: DispatcherDeps,
  handle: DispatchHandle,
  call: Pick<AuthorizedCall, "system" | "user" | "temperature">
): Promise<DispatchResult> {
  if (!isUsableDispatchHandle(handle)) throw new DispatchError("DISPATCH_HANDLE_INVALID");
  const state = handles.get(handle.handleId)!;
  state.consumed = true;

  const actualHash = sha256({
    action: state.action, model: state.model, sourceIds: state.sourceIds,
    system: call.system, user: call.user,
    temperature: call.temperature, maxTokens: state.call.maxTokens,
  });
  if (actualHash !== state.inputHash) throw new DispatchError("DISPATCH_INPUT_MISMATCH");

  if (state.replayReceipt) {
    const manifest = state.replayReceipt.result_manifest as Record<string, unknown>;
    return {
      replay: true,
      text: typeof manifest.output_text === "string" ? manifest.output_text : null,
      receipt: state.replayReceipt,
    };
  }

  const apiKey = deps.apiKey ?? process.env.MOHEN_LLM_API_KEY ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new DispatchError("DISPATCH_CONFIG_MISSING");
  const baseUrl = (deps.baseUrl ?? process.env.MOHEN_LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 30_000;

  const startedAt = new Date().toISOString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: state.model,
        temperature: call.temperature,
        max_tokens: state.call.maxTokens,
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
      }),
      signal: ctrl.signal,
    });
  } catch (error) {
    const code = ctrl.signal.aborted ? "PROVIDER_TIMEOUT" : "PROVIDER_TRANSPORT_ERROR";
    await writeHeldReceipt(deps, state, startedAt, code);
    throw new DispatchError("DISPATCH_UNCERTAIN", code);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    await writeHeldReceipt(deps, state, startedAt, `PROVIDER_HTTP_${res.status}`);
    throw new DispatchError("DISPATCH_UNCERTAIN", `PROVIDER_HTTP_${res.status}`);
  }

  let json: { choices?: Array<{ message?: { content?: string } }>; usage?: ProviderUsage };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    await writeHeldReceipt(deps, state, startedAt, "PROVIDER_RESPONSE_INVALID");
    throw new DispatchError("DISPATCH_UNCERTAIN", "PROVIDER_RESPONSE_INVALID");
  }
  const text = json.choices?.[0]?.message?.content?.trim() || null;
  const usage = json.usage;
  const cost = text && usage ? estimateCostFromUsageUsd(state.model, usage) : null;
  if (!text || !usage || cost === null) {
    await writeHeldReceipt(deps, state, startedAt, "PROVIDER_USAGE_UNKNOWN");
    throw new DispatchError("DISPATCH_UNCERTAIN", "PROVIDER_USAGE_UNKNOWN");
  }

  const manifest = {
    usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      prompt_cache_hit_tokens: usage.prompt_cache_hit_tokens ?? null,
      prompt_cache_miss_tokens: usage.prompt_cache_miss_tokens ?? null,
    },
    price_ref: currentPriceTable().priceRef,
    rate_window: "peak",
    model: state.model,
    input_hash: state.inputHash,
    output_hash: sha256(text),
    output_text: text,
  };
  let receipt: StudioVerifiedReceiptRecord;
  try {
    receipt = await deps.delegations.appendVerifiedReceipt({
      delegationId: state.delegation.delegation_id,
      attemptNo: state.attemptNo,
      requestHash: state.delegation.request_hash,
      resultManifest: manifest,
      candidateRefs: [],
      actualProvider: "deepseek",
      actualEngineVersion: currentPriceTable().priceRef,
      startedAt,
      finishedAt: new Date().toISOString(),
      cost: cost.toFixed(6),
      currency: "USD",
      costConfidence: "ESTIMATED",
    }, state.sessionToken);
  } catch {
    // provider 已计费但回执不确定：保持账实一致优先，绝不静默重试。
    throw new DispatchError("DISPATCH_RECEIPT_UNCERTAIN");
  }
  return { replay: false, text, receipt };
}

/**
 * 默认依赖（真实库 + 真实 fetch）。仅在持有真实句柄的执行路径上惰性构建；
 * 无句柄时不会被调用。逐来源权利读取使用同一会话身份（RLS 下可见范围）。
 */
export async function createStudioDispatcherDeps(): Promise<DispatcherDeps> {
  const dataAccess = await import("@mohen/data-access");
  const pool = dataAccess.getNodePgPool();
  const delegations = dataAccess.createStudioDelegationRepository(pool);
  return {
    delegations,
    readSourceRights: async (sourceIds, token) => {
      const ids = sourceIds.filter((s) => uuidPattern.test(s));
      if (ids.length !== sourceIds.length || !ids.length) return [];
      const list = ids.map((id) => `'${id}'::uuid`).join(",");
      return dataAccess.queryRows(
        `select s.source_id::text as source_id, s.rights as rights
         from source.sources s, (select set_config('mohen.session_token', :'token', false)) cfg
         where s.source_id = any(array[${list}])`,
        { token }
      ) as unknown as Promise<Array<{ source_id: string; rights: Record<string, unknown> | string | null }>>;
    },
  };
}
