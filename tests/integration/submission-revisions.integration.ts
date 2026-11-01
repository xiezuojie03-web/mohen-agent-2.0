import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { queryRows, queryValue, run } from "../../packages/data-access/src/index.mjs";
import { createWork, submitWork } from "../../apps/web/lib/publication";

// Dedicated, explicitly marked fresh database only; no source-database snapshot.
const work = "9ab37577-1789-4e5a-9d5a-9e629cffdbf7";
const other = "47a0013f-43ed-422e-b047-d3f8ddbf22c3";
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

describe("exact revision submission against isolated PostgreSQL", () => {
  beforeAll(async () => {
    if (process.env.MOHEN_SUBMISSION_TEST !== "isolated-docker" ||
        await queryValue("select current_setting('mohen.test_instance',true)") !== "codex-k3-isolated") {
      throw new Error("MARKED_ISOLATED_DATABASE_REQUIRED");
    }
    await run(readFileSync("supabase/migrations/202610280900_publication_work_revisions.sql", "utf8"));
    await run("alter table publication.works add column owner_user_id uuid");
  });
  beforeEach(async () => {
    await run("truncate publication.works cascade");
    await run("insert into publication.works(work_id,title) values (:'wid','first work'),(:'other','second work')", { wid: work, other });
    await run("insert into publication.work_revisions(revision_id,work_id,revision_no,title) values (:'first',:'wid',1,'first draft'),(:'second',:'wid',2,'second draft')", { wid: work, first, second });
  });

  it("submits the requested draft without submitting another draft", async () => {
    expect(await submitWork(work, first)).toMatchObject({ ok: true, revision_id: first });
    expect(await queryRows("select revision_no::text as no,status from publication.work_revisions order by revision_no")).toEqual([
      { no: "1", status: "submitted" }, { no: "2", status: "draft" },
    ]);
  });
  it("does not acknowledge a revision belonging to another work", async () => {
    expect(await submitWork(other, first)).toEqual({ ok: false, reason: "revision_not_submittable" });
    expect(await queryValue("select count(*)::text from publication.work_revisions where status='submitted'")).toBe("0");
  });
  it("returns the same revision for concurrent duplicate requests", async () => {
    const results = await Promise.all([submitWork(work, first), submitWork(work, first)]);
    expect(results).toEqual([
      { ok: true, work_id: work, revision_id: first, status: "submitted" },
      { ok: true, work_id: work, revision_id: first, status: "submitted" },
    ]);
    expect(await queryValue("select count(*)::text from publication.work_revisions where status='submitted'")).toBe("1");
  });
  it("preserves no-body callers by submitting only the latest revision", async () => {
    expect(await submitWork(work)).toMatchObject({ ok: true, revision_id: second });
    expect(await queryValue("select status from publication.work_revisions where revision_id=:'rid'", { rid: first })).toBe("draft");
  });
  it.each(["published", "rejected"])("refuses to resubmit a %s revision", async status => {
    await run("update publication.work_revisions set status=:'status' where revision_id=:'rid'", { status, rid: first });
    expect(await submitWork(work, first)).toEqual({ ok: false, reason: "revision_not_submittable" });
    expect(await queryValue("select status from publication.work_revisions where revision_id=:'rid'", { rid: first })).toBe(status);
  });

  it("reuses an owned creation request identity after a lost response", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const content = { beats: [{ title: "saved draft" }] };
    const a = await createWork("stable creation", "creator", other, content, id);
    const b = await createWork("stable creation", "creator", other, content, id);
    expect(a).toBe(id);
    expect(b).toBe(id);
    expect(await queryValue("select count(*)::text from publication.works where work_id=:'id'", { id })).toBe("1");
  });
  it("does not reuse a creation identity for different content or another owner", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    await createWork("stable creation", "creator", other, { beats: [] }, id);
    await expect(createWork("changed draft", "creator", other, { beats: ["changed"] }, id)).rejects.toThrow("creation_conflict");
    await expect(createWork("stable creation", "creator", work, { beats: [] }, id)).rejects.toThrow("creation_conflict");
  });
  it("does not leave a work behind when its initial revision insert fails", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    await run("alter table publication.work_revisions add constraint test_reject_creation check(title <> 'reject-create')");
    try {
      await expect(createWork("reject-create", "creator", other, { beats: [] }, id)).rejects.toThrow();
      expect(await queryValue("select count(*)::text from publication.works where title='reject-create'")).toBe("0");
    } finally { await run("alter table publication.work_revisions drop constraint test_reject_creation"); }
  });
});
