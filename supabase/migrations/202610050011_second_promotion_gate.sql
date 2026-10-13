-- 202610050011_second_promotion_gate.sql
-- B 组 · R15 第二批晋级闸门（C6 · 2026-10-05）
--
-- 依据：
--   · C3 §4.1 状态机：RAW → CANDIDATE → ADJUDICATED → RUNTIME_ELIGIBLE → PUBLISHED
--   · C3 §4.2 晋级闸门通则：「标成可用 / 已发布」必须有该对象的 evidence_gate_audit 记录
--   · 既有形态照抄 202610020008（`va_gate_passed_requires_audit`）：
--     constraint trigger + deferrable initially deferred → 校验发生在 COMMIT，
--     写入者可在同一事务内先写对象、再写门禁审计，提交时才检查。
--
-- 为什么需要第二批：
--   全库此前只有 2 个晋级闸门（claims_require_evidence / va_gate_passed_requires_audit）。
--   entities / relations / evidence / historical_* / cultural_* 的「零违规」来自
--   **没有任何行走到末端状态**，而不是因为有闸门拦着 —— 一旦有人写 published，无人会拦。
--
-- 刻意不做（两条）：
--   ① **不改任何既有行的状态**（本迁移无 UPDATE）：既有 'evidence_linked'(20) / 'human_reviewed'(2)
--      等非规范取值如何映射到 §4.1 五档，属语义决断（会不会被读成"晋级"），交拥有者裁定；
--   ② **不回填历史门禁审计行**：回填会制造"看起来过了门禁"的假象 —— 那正是 ESC-05 的教训
--      （测试在 7 秒内写过 9016 行审计，覆盖率被误读成"真实门禁已跑过"）。
--
-- 末端状态取值说明：'verified' / 'published' 是 guard:promotion 当前口径；
-- 'adjudicated' / 'runtime_eligible' 是 C3 §4.1 的档位名，一并纳入，
-- 以免将来按 §4.1 收敛词表时闸门与守卫再次漂移。
--
-- ★ 比较必须写成 `new.<列>::text in (...)`（实测踩到才改的，不是风格问题）：
--   entities / relations / evidence 的状态列是**枚举** `verification_status`，
--   直接写 `new.status in ('adjudicated', …)` 时 PG 会把字面量转成该枚举，
--   而 'adjudicated' 不在枚举取值里 → **任何** INSERT / UPDATE（哪怕是合法写 'candidate'）
--   都会在提交时报「对于枚举 verification_status 的输入值无效」，等于把这张表写死了。
--   比较前先转 text，非法字面量就只是"不命中"，不会破坏正常写入。

-- ── entities ────────────────────────────────────────────────────────────────
create or replace function guard_entity_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'entity' and g.object_id = new.entity_id::text) then
    raise exception 'entities % 晋级为 % 必须先有 evidence_gate_audit(object_type=entity) 记录', new.entity_id, new.status;
  end if;
  return new;
end $$;
drop trigger if exists entity_promotion_requires_audit on entities;
create constraint trigger entity_promotion_requires_audit
after insert or update of status on entities
deferrable initially deferred
for each row execute function guard_entity_promotion_requires_audit();

-- ── relations ───────────────────────────────────────────────────────────────
create or replace function guard_relation_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'relation' and g.object_id = new.relation_id::text) then
    raise exception 'relations % 晋级为 % 必须先有 evidence_gate_audit(object_type=relation) 记录', new.relation_id, new.status;
  end if;
  return new;
end $$;
drop trigger if exists relation_promotion_requires_audit on relations;
create constraint trigger relation_promotion_requires_audit
after insert or update of status on relations
deferrable initially deferred
for each row execute function guard_relation_promotion_requires_audit();

-- ── evidence ────────────────────────────────────────────────────────────────
create or replace function guard_evidence_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.verification_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'evidence' and g.object_id = new.evidence_id::text) then
    raise exception 'evidence % 晋级为 % 必须先有 evidence_gate_audit(object_type=evidence) 记录', new.evidence_id, new.verification_status;
  end if;
  return new;
end $$;
drop trigger if exists evidence_promotion_requires_audit on evidence;
create constraint trigger evidence_promotion_requires_audit
after insert or update of verification_status on evidence
deferrable initially deferred
for each row execute function guard_evidence_promotion_requires_audit();

-- ── historical_spatial_relations ────────────────────────────────────────────
create or replace function guard_hsr_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'historical_spatial_relation' and g.object_id = new.hs_relation_id::text) then
    raise exception 'historical_spatial_relations % 晋级为 % 必须先有 evidence_gate_audit 记录', new.hs_relation_id, new.status;
  end if;
  return new;
end $$;
drop trigger if exists hsr_promotion_requires_audit on historical_spatial_relations;
create constraint trigger hsr_promotion_requires_audit
after insert or update of status on historical_spatial_relations
deferrable initially deferred
for each row execute function guard_hsr_promotion_requires_audit();

-- ── historical_features ─────────────────────────────────────────────────────
create or replace function guard_hf_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'historical_feature' and g.object_id = new.feature_id::text) then
    raise exception 'historical_features % 晋级为 % 必须先有 evidence_gate_audit 记录', new.feature_id, new.review_status;
  end if;
  return new;
end $$;
drop trigger if exists hf_promotion_requires_audit on historical_features;
create constraint trigger hf_promotion_requires_audit
after insert or update of review_status on historical_features
deferrable initially deferred
for each row execute function guard_hf_promotion_requires_audit();

-- ── cultural_relation_claims ────────────────────────────────────────────────
create or replace function guard_crc_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'cultural_relation_claim' and g.object_id = new.claim_id::text) then
    raise exception 'cultural_relation_claims % 晋级为 % 必须先有 evidence_gate_audit 记录', new.claim_id, new.review_status;
  end if;
  return new;
end $$;
drop trigger if exists crc_promotion_requires_audit on cultural_relation_claims;
create constraint trigger crc_promotion_requires_audit
after insert or update of review_status on cultural_relation_claims
deferrable initially deferred
for each row execute function guard_crc_promotion_requires_audit();

-- ── cultural_meaning_candidates ─────────────────────────────────────────────
create or replace function guard_cmc_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'cultural_meaning_candidate' and g.object_id = new.meaning_id::text) then
    raise exception 'cultural_meaning_candidates % 晋级为 % 必须先有 evidence_gate_audit 记录', new.meaning_id, new.review_status;
  end if;
  return new;
end $$;
drop trigger if exists cmc_promotion_requires_audit on cultural_meaning_candidates;
create constraint trigger cmc_promotion_requires_audit
after insert or update of review_status on cultural_meaning_candidates
deferrable initially deferred
for each row execute function guard_cmc_promotion_requires_audit();

-- ── cultural_present_connections ────────────────────────────────────────────
create or replace function guard_cpc_promotion_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.review_status::text in ('adjudicated','runtime_eligible','verified','published')
     and not exists (select 1 from evidence_gate_audit g
                      where g.object_type = 'cultural_present_connection' and g.object_id = new.present_id::text) then
    raise exception 'cultural_present_connections % 晋级为 % 必须先有 evidence_gate_audit 记录', new.present_id, new.review_status;
  end if;
  return new;
end $$;
drop trigger if exists cpc_promotion_requires_audit on cultural_present_connections;
create constraint trigger cpc_promotion_requires_audit
after insert or update of review_status on cultural_present_connections
deferrable initially deferred
for each row execute function guard_cpc_promotion_requires_audit();

-- ── 状态表达收敛（C3 §4.1）· 只扩展取值，不改任何行 ────────────────────────────
-- cultural_* 三张表的 review_status 原先只允许 candidate / human_reviewed / research / unresolved
-- 也就是说**晋升路径根本不存在**：上面装好的闸门拦不到任何写入，因为末端值写不进去。
-- 这里补上 §4.1 的末端档位（adjudicated / runtime_eligible / published），
-- 让「能晋级」与「晋级必须过闸门」同时成立。既有取值全部保留 → 不改任何行、不触碰冻结项。
alter table cultural_meaning_candidates drop constraint if exists cultural_meaning_candidates_review_status_check;
alter table cultural_meaning_candidates add constraint cultural_meaning_candidates_review_status_check
  check (review_status in ('candidate','human_reviewed','research','unresolved','adjudicated','runtime_eligible','published'));

alter table cultural_present_connections drop constraint if exists cultural_present_connections_review_status_check;
alter table cultural_present_connections add constraint cultural_present_connections_review_status_check
  check (review_status in ('candidate','human_reviewed','research','unresolved','adjudicated','runtime_eligible','published'));

alter table cultural_relation_claims drop constraint if exists cultural_relation_claims_review_status_check;
alter table cultural_relation_claims add constraint cultural_relation_claims_review_status_check
  check (review_status in ('candidate','human_reviewed','research','unresolved','adjudicated','runtime_eligible','published'));

-- 不修改 001~009。不写任何 verified / published 历史事实。
