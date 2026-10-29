-- 202610290000_work_publication_decisions.sql
-- E1-GATE-ACTIVATE：独立 Reviewer 的作品发布裁决（与 Operator 审核分权，与知识 G5 分权）。
-- 独立 Reviewer 对作品的「知识引用 + 媒体权利」做最终签核，Operator 才能发布。
-- 与 control.gate_audits（知识资格，绑定 production_runs）分离：作品发布裁决是独立的一条轴。

create table if not exists control.work_publication_decisions (
  decision_id  uuid primary key default gen_random_uuid(),
  work_id      uuid not null references publication.works(work_id) on delete cascade,
  revision_id  uuid references publication.work_revisions(revision_id) on delete cascade,
  decision     text not null check (decision in ('approved','rejected')),
  reviewer     text not null default 'independent-reviewer',
  note         text,
  reviewed_at  timestamptz not null default now()
);

create index if not exists idx_work_pub_decision_work on control.work_publication_decisions(work_id, reviewed_at desc);
alter table control.work_publication_decisions enable row level security;
