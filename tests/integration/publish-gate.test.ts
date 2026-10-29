import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { queryValue, run } from "../../packages/data-access/src/index.mjs";
import { checkPublishEligibility, createWork, submitWork } from "../../apps/web/lib/publication";

// P0-4 发布双条件：知识出处 / 独立签核绑定 revision / 媒体权利 / 两把钥匙。
// 在隔离测试库（pnpm test 自动建 <真库>_test）上跑；不触碰真库。

const stamp = Date.now();
const publisherId = crypto.randomUUID();
const reviewerId = crypto.randomUUID();
const publisherEmail = `pub_${stamp}@test.local`;
const reviewerEmail = `rev_${stamp}@test.local`;
const workIds: string[] = [];

async function insertUser(id: string, email: string, roles: string) {
  await run(
    "insert into public.users (user_id, email, username, password_hash, roles) values (:'id', :'email', :'name', 'x', :'roles'::text[])",
    { id, email, name: email.split("@")[0], roles: `{${roles}}` }
  );
}

async function seedSubmittedWork(content: unknown): Promise<{ workId: string; revisionId: string }> {
  const workId = await createWork(`gate-${stamp}-${workIds.length}`, publisherEmail, publisherId, content);
  workIds.push(workId);
  await submitWork(workId);
  const revisionId = String(
    await queryValue(
      "select revision_id::text from publication.work_revisions where work_id = :'wid' and status = 'submitted' order by revision_no desc limit 1",
      { wid: workId }
    )
  );
  return { workId, revisionId };
}

async function decide(workId: string, revisionId: string | null, reviewer: string) {
  await run(
    "insert into control.work_publication_decisions (work_id, revision_id, decision, reviewer) values (:'wid', :'rid', 'approved', :'rev')",
    { wid: workId, rid: revisionId, rev: reviewer }
  );
}

beforeAll(async () => {
  await insertUser(publisherId, publisherEmail, "member,creator,operator");
  await insertUser(reviewerId, reviewerEmail, "member,reviewer");
});

afterAll(async () => {
  for (const id of workIds) {
    await run("delete from control.work_publication_decisions where work_id = :'wid'", { wid: id });
    await run("delete from publication.work_revisions where work_id = :'wid'", { wid: id });
    await run("delete from publication.published_pointers where work_id = :'wid'", { wid: id });
    await run("delete from publication.works where work_id = :'wid'", { wid: id });
  }
  await run("delete from public.users where user_id = :'id'", { id: publisherId });
  await run("delete from public.users where user_id = :'id'", { id: reviewerId });
});

describe("P0-4 发布双条件", () => {
  it("无出处 → no_provenance_refs", async () => {
    const { workId } = await seedSubmittedWork({ beats: [] });
    const r = await checkPublishEligibility(workId, publisherId);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_provenance_refs");
  });

  it("有出处但未确认权利 → no_rights_ack", async () => {
    const { workId, revisionId } = await seedSubmittedWork({
      beats: [{ provenanceRefs: ["src-1"] }],
    });
    await decide(workId, revisionId, reviewerEmail);
    const r = await checkPublishEligibility(workId, publisherId);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_rights_ack");
  });

  it("出处 + 独立签核 + 权利确认 → ok", async () => {
    const { workId, revisionId } = await seedSubmittedWork({
      beats: [{ provenanceRefs: ["src-1"] }],
      rights_acknowledged: true,
    });
    await decide(workId, revisionId, reviewerEmail);
    const r = await checkPublishEligibility(workId, publisherId);
    expect(r.ok).toBe(true);
  });

  it("签核人同时是发布人 → reviewer_is_publisher", async () => {
    const { workId, revisionId } = await seedSubmittedWork({
      beats: [{ provenanceRefs: ["src-1"] }],
      rights_acknowledged: true,
    });
    await decide(workId, revisionId, reviewerEmail);
    const r = await checkPublishEligibility(workId, reviewerId);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("reviewer_is_publisher");
  });

  it("签核绑定到旧 revision → reviewer_revision_mismatch", async () => {
    const { workId, revisionId } = await seedSubmittedWork({
      beats: [{ provenanceRefs: ["src-1"] }],
      rights_acknowledged: true,
    });
    // 再提交一版（rev2）：最新 submitted 是 rev2，但签核仍绑在 rev1 上
    await run(
      `insert into publication.work_revisions (revision_id, work_id, revision_no, title, content, status)
       values (:'rid', :'wid', 2, 'gate-rev2', :'content'::jsonb, 'submitted')`,
      {
        rid: crypto.randomUUID(),
        wid: workId,
        content: JSON.stringify({ beats: [{ provenanceRefs: ["src-1"] }], rights_acknowledged: true }),
      }
    );
    await decide(workId, revisionId, reviewerEmail);
    const r = await checkPublishEligibility(workId, publisherId);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("reviewer_revision_mismatch");
  });
});
