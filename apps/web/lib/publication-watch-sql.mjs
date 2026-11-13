// Publication pointer read paths shared by the WATCH facade and its
// verification scripts. One pointer table (`publication.published_pointers`)
// carries both chains: legacy `publication` rows and MHKA `studio` rows.
// Nothing here writes, signs or re-qualifies; every statement is read-only.

/** Published works of both chains. Legacy rows keep their exact previous
 * predicate (the revision must still be `published`); studio rows must still
 * have their pointer (a withdrawal deletes it in the same transaction). */
export const PUBLISHED_WORKS_SQL = `
    select w.work_id::text as work_id, r.revision_id::text as revision_id,
           r.title as title, r.description as description, r.revision_no::text as revision_no,
           r.content::text as content, p.published_at::text as published_at,
           null::text as studio_beats,
           'publication'::text as source_schema
    from publication.published_pointers p
    join publication.works w on w.work_id = p.work_id
    join publication.work_revisions r on r.revision_id = p.revision_id
    where r.status = 'published'
    union all
    select p.work_id::text as work_id, r.revision_id::text as revision_id,
           r.title as title, ''::text as description, r.revision_no::text as revision_no,
           r.content::text as content, p.published_at::text as published_at,
           r.beats::text as studio_beats,
           'studio'::text as source_schema
    from publication.published_pointers p
    join studio.work_revisions r on r.revision_id = p.studio_revision_id
    where p.source_schema = 'studio'
      and not exists (
        select 1 from publication.withdrawals wd
        where wd.work_id = p.work_id and wd.publication_id = p.publication_id
      )
    order by published_at desc`;

/** Current recheck for one studio work revision. It repeats exactly the
 * conditions `publication.publish_exact_revision` refused to publish without:
 * the pointer still holds this exact revision + its publication snapshot, the
 * revision has not been withdrawn, an independent G5 PASS on the work revision
 * is still current, and the artifact revision has not moved since publication.
 * Media rights cannot be re-read here: `studio.private_work_rights_summary` is
 * restricted to the editorial operator role, so withdrawal stays the runtime
 * kill switch for rights. */
export const STUDIO_REVISION_WATCHABLE_SQL = `
    select 1 as ok
    from publication.published_pointers p
    join publication.publication_snapshots s on s.publication_id = p.publication_id
    join studio.work_revisions r on r.revision_id = p.studio_revision_id
    where p.source_schema = 'studio'
      and p.work_id = :'wid' and p.studio_revision_id = :'rid'
      and s.revision_id = r.revision_id
      and not exists (
        select 1 from publication.withdrawals wd where wd.publication_id = p.publication_id
      )
      and exists (
        select 1 from control.gate_audits ga
        where ga.object_type = 'work_revision' and ga.object_id = r.revision_id
          and ga.gate_code = 'G5' and ga.result = 'PASS' and ga.current_valid
          and (ga.valid_until is null or ga.valid_until > now())
      )
      and control.artifact_revision_for('work_revision', r.revision_id) = s.artifact_revision`;
