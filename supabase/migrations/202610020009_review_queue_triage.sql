-- 202610020009_review_queue_triage.sql
-- 目的：M2 第四条（断点 B-02 的正解）—— review_queue 的 AUTO/HOLD/REJECT 三分。
--
-- 依据：
--   · 协议 specs/MoHen_Data_Production_Protocol.md #5（三分流：AUTO 晋级 / HOLD 隔离 / REJECT 拒绝）
--     与 #12（auto_promote_policy 未声明 = 不自动晋级）
--   · 任务结果 §4 M2 第四条：「任何写入 Candidate 及以上层的作业，必须同时产生
--     review_queue 行（AUTO/HOLD/REJECT 三分）」
--   · 先例形态照抄 R15（202610020008）：库层强制 + 只读守卫，而非只写在文档里
--
-- 设计边界（与冻结规则 §8.3 兼容）：
--   · 本迁移**只加列 / 触发器 / 索引**，不回填、不修改任何既有行——
--     既有 293 行的 triage_outcome 保持 NULL＝「出生于三分机制之前」，不算违规；
--   · 1246 张图片的数据处置仍冻结：本机制只约束**未来写入**如何被分诊。
--
-- 语义：
--   triage_outcome ＝ 生产作业对本对象的分诊结论（协议 #5）：
--     auto   ＝ 确定性晋级。Tier C 不得 auto（既有 tier-C 守卫的推广）；
--              必须出生为 approved，且必须在 review_note 记录规则/版本（协议 #6）。
--     hold   ＝ 隔离区。必须出生为 pending——定案权在人，不得出生即定案。
--     reject ＝ 自动拒绝/隔离。必须出生为 rejected；对象即使未成为候选也要留痕。
--   ingest_run_id ＝ 分诊所属批次（断点 B-03：此前"本批"只能按时间窗口径；
--              727 张图无任何 ingest_runs 行）。分诊行带 run_id 出生 → run 级归因成立。
--
-- 可重复执行（与 001–008 同约定）：if not exists / drop-create / create or replace。

-- ── 1) 分诊列 + run 关联 ─────────────────────────────────────────────────────
alter table review_queue
  add column if not exists triage_outcome text,
  add column if not exists ingest_run_id uuid references ingest_runs(ingest_run_id);

alter table review_queue drop constraint if exists review_queue_triage_outcome_check;
alter table review_queue add constraint review_queue_triage_outcome_check
  check (triage_outcome in ('auto','hold','reject'));

-- ── 2) 同 run 同对象唯一（分诊幂等：协议 #7 Idempotent）──────────────────────
--    部分索引：只约束带 run 的分诊行；历史行（NULL run）不受影响。
create unique index if not exists uq_review_queue_triage_per_run
  on review_queue(object_type, object_id, ingest_run_id)
  where ingest_run_id is not null;

-- 查询加速：执行报告按分诊计数（"HOLD 新增数"，协议 #8）
create index if not exists idx_review_queue_triage
  on review_queue(triage_outcome) where triage_outcome is not null;

-- ── 3) 分诊守卫触发器 ────────────────────────────────────────────────────────
--    与既有 review_queue_tier_c_guard（202609210002）互补：
--    · tier_c_guard 管「人审语义」（Tier C approved 须 note + reviewed_at）；
--    · 本触发器管「分诊语义」（机器三分的出生形态与不可改写）。
create or replace function guard_review_queue_triage()
returns trigger language plpgsql as $$
begin
  -- ① 分诊行必须带原因：AUTO/HOLD/REJECT 都是判断，判断必须可解释
  if new.triage_outcome is not null and new.reason_code is null then
    raise exception 'review_queue % 分诊为 % 却没有 reason_code', new.review_id, new.triage_outcome;
  end if;

  -- ② 分诊结论不可改写（R14 规则 5「历史记录不改写」精神）：
  --    人审改变的是 status，不是当初机器的分诊。
  if tg_op = 'UPDATE' and old.triage_outcome is not null
     and new.triage_outcome is distinct from old.triage_outcome then
    raise exception 'review_queue % 的 triage_outcome 不可从 % 改写为 %（分诊是当时事实；人审改 status）',
      new.review_id, old.triage_outcome, new.triage_outcome;
  end if;

  if tg_op = 'INSERT' then
    if new.triage_outcome = 'auto' then
      if new.review_tier = 'C' then
        raise exception 'review_queue % 分诊 auto 但 tier=C —— Tier C 不得自动晋级', new.review_id;
      end if;
      if new.status <> 'approved' then
        raise exception 'review_queue % 分诊 auto 必须出生为 approved（确定性晋级）', new.review_id;
      end if;
      if new.review_note is null then
        raise exception 'review_queue % 分诊 auto 必须在 review_note 记录规则/版本（协议 #6）', new.review_id;
      end if;
    elsif new.triage_outcome = 'hold' then
      if new.status <> 'pending' then
        raise exception 'review_queue % 分诊 hold 必须出生为 pending（隔离区；定案权在人）', new.review_id;
      end if;
    elsif new.triage_outcome = 'reject' then
      if new.status <> 'rejected' then
        raise exception 'review_queue % 分诊 reject 必须出生为 rejected', new.review_id;
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists review_queue_triage_guard on review_queue;
create trigger review_queue_triage_guard
  before insert or update on review_queue
  for each row execute function guard_review_queue_triage();

-- 不修改既有行（冻结）；不回填 triage_outcome。
