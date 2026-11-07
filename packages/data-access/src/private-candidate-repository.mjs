import { createHash, createHmac } from "node:crypto";
import { createAppTransaction } from "./app-transaction.mjs";

// 与 20261107200000 迁移的确定性 id 派生保持一一对应；同 digest 幂等，不同
// digest 即不同候选。所有落库结果仅是 UNASSESSED 候选，不含任何 Gate 结论。
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const b64u = (b) => Buffer.from(b, "utf8").toString("base64url");
const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const canonical = (value) => JSON.stringify(value);
const derivedUuid = (seed) =>
  createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 32)
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");

const isUuid = (v) => typeof v === "string" && UUID.test(v);
const isHash = (v) => typeof v === "string" && HASH.test(v);
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// D02–D05 私有候选仓储：D02 走 HMAC attestation（服务端原样重验），D03–D05 由
// SQL 侧完成引用链校验。适配器 PASS 仅表示 Producer 完成。
export function createPrivateCandidateRepository(pool, { verificationKey, keyVersion } = {}) {
  const verifierConfigured = typeof verificationKey === "string" && verificationKey.length > 0
    && typeof keyVersion === "string" && keyVersion.length > 0;
  const transaction = createAppTransaction(pool, "STUDIO_IDENTITY_REQUIRED");

  return {
    // D02: H05 地方志材料观察。attestation claims 由服务端注册信息补齐，防止
    // 调用方自报 project_id/raw_sha256。
    async saveMaterialObservation({ runId, originalId, readUnitId, observation }, token) {
      if (!isUuid(runId) || !isUuid(originalId) || !isUuid(readUnitId) || !isObject(observation))
        throw Error("PRIVATE_MATERIAL_OBSERVATION_INPUT_INVALID");
      if (!verifierConfigured) throw Error("BRIDGE_BYTE_VERIFIER_NOT_CONFIGURED");
      const requestDigest = sha(canonical({ runId, originalId, readUnitId, observation }));
      const evidenceId = derivedUuid(`mab-private-material-evidence:${requestDigest}`);
      const readingUnitId = derivedUuid(`mab-private-material-reading-unit:${requestDigest}`);
      const linkId = derivedUuid(`mab-private-material-link:${requestDigest}`);
      const saved = await transaction(token, async (client, uid) => {
        const { rows } = await client.query(
          "select studio.private_source_registration($1::uuid) as registration",
          [originalId]);
        const registration = rows[0]?.registration ?? {};
        if (registration?.schema !== "mohen.private-source-registration.v1"
          || registration?.original_id !== originalId
          || !isUuid(registration?.project_id) || !isHash(registration?.sha256))
          throw Error("PRIVATE_MATERIAL_OBSERVATION_ORIGINAL_UNVERIFIED");
        const now = Date.now();
        const claims = {
          kind: "MOHEN_PRIVATE_MATERIAL_OBSERVATION_V1",
          kid: keyVersion,
          uid,
          project_id: registration.project_id,
          original_id: originalId,
          raw_sha256: registration.sha256,
          run_id: runId,
          read_unit_id: readUnitId,
          evidence_id: evidenceId,
          reading_unit_id: readingUnitId,
          link_id: linkId,
          request_digest: requestDigest,
          observation,
          iat: now,
          exp: now + 30000,
        };
        const encoded = b64u(canonical(claims));
        const signature = createHmac("sha256", verificationKey).update(encoded).digest("hex");
        if (process.env.MOHEN_DEBUG_ATTESTATION) {
          import("node:fs").then(fs => fs.writeFileSync(process.env.MOHEN_DEBUG_ATTESTATION,
            JSON.stringify({ keyVersion, uid, encoded, signature, requestDigest, evidenceId, readingUnitId, linkId }, null, 1)));
        }
        const result = await client.query(
          "select studio.persist_private_material_observation($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::uuid,$7::jsonb,$8::text) as saved",
          [originalId, evidenceId, readingUnitId, linkId, requestDigest, runId,
            canonical(observation), `${encoded}.${signature}`]);
        return result.rows[0]?.saved ?? {};
      });
      if (saved?.evidence_id !== evidenceId || saved?.reading_unit_id !== readingUnitId
        || saved?.link_id !== linkId || saved?.read_unit_id !== readUnitId
        || !isUuid(saved?.read_run_id) || saved?.request_digest !== requestDigest
        || !isHash(saved?.artifact_revision))
        throw Error("PRIVATE_MATERIAL_OBSERVATION_NOT_PERSISTED");
      return { ...saved, qualification: "UNASSESSED" };
    },

    // D03: W07 世界事实主张。
    async saveWorldClaim({ runId, originalId, evidenceId, claim }, token) {
      if (!isUuid(runId) || !isUuid(originalId) || !isUuid(evidenceId) || !isObject(claim))
        throw Error("PRIVATE_WORLD_CLAIM_INPUT_INVALID");
      const requestDigest = sha(canonical({ runId, originalId, evidenceId, claim }));
      const changeId = derivedUuid(`mab-private-world-change:${requestDigest}`);
      const revisionId = derivedUuid(`mab-private-world-claim:${requestDigest}`);
      const saved = await transaction(token, async (client) => {
        const result = await client.query(
          "select studio.persist_private_world_claim($1::uuid,$2::uuid,$3::uuid,$4::text,$5::uuid,$6::uuid,$7::jsonb) as saved",
          [originalId, changeId, revisionId, requestDigest, runId, evidenceId, canonical(claim)]);
        return result.rows[0]?.saved ?? {};
      });
      if (saved?.change_id !== changeId || saved?.claim_revision_id !== revisionId
        || !isUuid(saved?.claim_evidence_link_id) || saved?.evidence_id !== evidenceId
        || saved?.request_digest !== requestDigest || !isHash(saved?.artifact_revision))
        throw Error("PRIVATE_WORLD_CLAIM_NOT_PERSISTED");
      return { ...saved, qualification: "UNASSESSED" };
    },

    // D04: A06 制度机制人文发现。
    async saveHumanisticFinding({ runId, originalId, claimRevisionId, finding }, token) {
      if (!isUuid(runId) || !isUuid(originalId) || !isUuid(claimRevisionId) || !isObject(finding))
        throw Error("PRIVATE_HUMANISTIC_FINDING_INPUT_INVALID");
      const requestDigest = sha(canonical({ runId, originalId, claimRevisionId, finding }));
      const findingId = derivedUuid(`mab-private-finding:${requestDigest}`);
      const saved = await transaction(token, async (client) => {
        const result = await client.query(
          "select studio.persist_private_humanistic_finding($1::uuid,$2::uuid,$3::text,$4::uuid,$5::uuid,$6::jsonb) as saved",
          [originalId, findingId, requestDigest, runId, claimRevisionId, canonical(finding)]);
        return result.rows[0]?.saved ?? {};
      });
      if (saved?.finding_id !== findingId || saved?.claim_revision_id !== claimRevisionId
        || saved?.request_digest !== requestDigest || !isHash(saved?.artifact_revision))
        throw Error("PRIVATE_HUMANISTIC_FINDING_NOT_PERSISTED");
      return { ...saved, qualification: "UNASSESSED" };
    },

    // D05: P02 世界投影。
    async saveWorldProjection({ runId, originalId, findingId, projection }, token) {
      if (!isUuid(runId) || !isUuid(originalId) || !isUuid(findingId) || !isObject(projection))
        throw Error("PRIVATE_WORLD_PROJECTION_INPUT_INVALID");
      const requestDigest = sha(canonical({ runId, originalId, findingId, projection }));
      const projectionId = derivedUuid(`mab-private-world-projection:${requestDigest}`);
      const saved = await transaction(token, async (client) => {
        const result = await client.query(
          "select studio.persist_private_world_projection($1::uuid,$2::uuid,$3::text,$4::uuid,$5::uuid,$6::jsonb) as saved",
          [originalId, projectionId, requestDigest, runId, findingId, canonical(projection)]);
        return result.rows[0]?.saved ?? {};
      });
      if (saved?.projection_id !== projectionId || saved?.finding_id !== findingId
        || saved?.request_digest !== requestDigest || !isHash(saved?.artifact_revision))
        throw Error("PRIVATE_WORLD_PROJECTION_NOT_PERSISTED");
      return { ...saved, qualification: "UNASSESSED" };
    },
  };
}
