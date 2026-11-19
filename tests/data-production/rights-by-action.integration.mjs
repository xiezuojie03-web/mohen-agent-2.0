// MAB M5 (20261119110000): the per-action rights columns default to empty objects (unknown =
// HOLD), accept only jsonb objects, and a source-version rights snapshot can be fixed exactly
// once — afterwards it is immutable. These assertions pin that contract against silent drift.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const psql = process.env.MOHEN_TEST_PSQL;
const localTcpHost = ["127.0.0.1", "localhost"].includes(process.env.MOHEN_TEST_HOST ?? "") ? process.env.MOHEN_TEST_HOST : undefined;
const socket = localTcpHost ?? process.env.MOHEN_TEST_SOCKET;
const database = process.env.MOHEN_TEST_DATABASE;
if (!psql || !(localTcpHost || socket?.startsWith("/workspace/")) || !/^mohen_k3_[a-z0-9_]*test$/.test(database ?? "")) throw new Error("ISOLATED_TEST_DATABASE_REQUIRED");
const args = ["-X", "-q", "-h", socket, "-p", process.env.MOHEN_TEST_PORT ?? "55432", "-U", "k3_admin", "-d", database, "-At", "-v", "ON_ERROR_STOP=1"];
const sql = (text) => execFileSync(psql, args, { input: text, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();

assert.equal(sql("select current_setting('mohen.test_instance',true)"), "codex-k3-isolated");

// Schema shape: three not-null jsonb columns defaulting to '{}'.
assert.equal(sql(`select count(*) from information_schema.columns
 where table_schema='source' and table_name='sources' and column_name in ('rights_by_action','rights_evidence')
 and data_type='jsonb' and is_nullable='NO' and column_default like '''{}''::jsonb%'`), "2");
assert.equal(sql(`select count(*) from information_schema.columns
 where table_schema='source' and table_name='source_versions' and column_name='rights_snapshot'
 and data_type='jsonb' and is_nullable='NO' and column_default like '''{}''::jsonb%'`), "1");

const sourceId = "aaaa0000-0000-4000-8000-000000000001";
const insertSource = (rights = "'{}'", evidence = "'{}'") =>
  `insert into source.sources(source_id,provider,title,source_type,carrier_type,content_availability,rights_by_action,rights_evidence)
   values('${sourceId}','TEST_ONLY','TEST_ONLY rights fixture','fixture','text','full_content',${rights},${evidence})`;

// Negative: arrays and bare strings are not objects — the CHECK constraints reject them.
assert.throws(() => sql(insertSource(`'["machine_read"]'`)), /sources_rights_by_action_object/);
assert.throws(() => sql(insertSource(`'{"machine_read":"allowed"}'`, `'["owner-decision"]'`)), /sources_rights_evidence_object/);
assert.throws(() => sql(insertSource(`'"machine_read"'`)), /sources_rights_by_action_object/);

// Positive: explicit per-action objects are accepted and readable.
sql(insertSource(`'{"machine_read":"allowed","display":"unknown"}'`, `'{"machine_read":{"basis":"owner-decision","captured_at":"2026-11-09"}}'`));
assert.equal(sql(`select rights_by_action->>'machine_read' from source.sources where source_id='${sourceId}'`), "allowed");

// Version fixture: a fresh snapshot starts empty.
const versionId = "aaaa0000-0000-4000-8000-0000000000a1";
sql(`insert into source.source_versions(source_version_id,source_id,checksum_sha256) values('${versionId}','${sourceId}','${"c".repeat(64)}')`);
assert.equal(sql(`select rights_snapshot from source.source_versions where source_version_id='${versionId}'`), "{}");

// Positive: the empty snapshot may be fixed once with an explicit object.
sql(`update source.source_versions set rights_snapshot='{"machine_read":"allowed"}' where source_version_id='${versionId}'`);
assert.equal(sql(`select rights_snapshot->>'machine_read' from source.source_versions where source_version_id='${versionId}'`), "allowed");

// Negative: once non-empty it is immutable, and it can never become a non-object.
assert.throws(() => sql(`update source.source_versions set rights_snapshot='{"machine_read":"denied"}' where source_version_id='${versionId}'`), /RIGHTS_SNAPSHOT_IMMUTABLE/);
assert.throws(() => sql(`update source.source_versions set rights_snapshot='[]' where source_version_id='${versionId}'`), /RIGHTS_SNAPSHOT_INVALID/);

// Negative: even the one-time write must be an object (fresh row, still empty).
const version2 = "aaaa0000-0000-4000-8000-0000000000a2";
sql(`insert into source.source_versions(source_version_id,source_id,checksum_sha256) values('${version2}','${sourceId}','${"d".repeat(64)}')`);
assert.throws(() => sql(`update source.source_versions set rights_snapshot='["machine_read"]' where source_version_id='${version2}'`), /RIGHTS_SNAPSHOT_INVALID/);

console.log("MAB_RIGHTS_BY_ACTION_PASS columns-default-empty object-checks-enforced snapshot-one-time-write snapshot-immutable");
