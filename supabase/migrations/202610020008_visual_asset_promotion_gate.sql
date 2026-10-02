-- 202610020008_visual_asset_promotion_gate.sql
-- 目的：让 `visual_assets` 跟上**已有的 4 个先例**，而不是发明新机制。
--
-- 依据：
--   · 项目拥有者 2026-10-02 选定「方案 A + 规则」（见 tasks/results/DATA-RECON-01-*.md）
--   · C3 §4.2 晋级闸门通则（本次同批写入）
--   · 先例形态照抄 `claims_require_evidence`（202609210001_foundation.sql L104–119）
--
-- 为什么需要它：
--   `visual_assets` 是全库**唯一**用「反向排除名单 + 空值默认可用」表达资格的表
--   （`eligibility_tags text[] NOT NULL DEFAULT '{}'`，空 = 可用）。
--   两条夜跑导入路径的 INSERT 都不带该列 → 落进空名单 → **无条件可用**。
--   实测后果：1220/1288 行"未排除"，真正有效仅 8 张；20 张人工排除被同 URL 重灌洗掉。
--
-- 本迁移的执行顺序是刻意的（见第 4 步注释）：先加列 → 再改历史数据 → 再改视图 → **最后**建触发器。

-- ── 1) 正面资格字段：默认"待审"，与现状"默认可用"语义相反 ─────────────────────
alter table visual_assets
  add column if not exists eligibility_status text not null default 'pending_review';

alter table visual_assets drop constraint if exists visual_assets_eligibility_status_check;
alter table visual_assets add constraint visual_assets_eligibility_status_check
  check (eligibility_status in ('pending_review','gate_passed','gate_failed','excluded'));

-- ── 2) 历史数据修正（**不删除任何行**）─────────────────────────────────────────
-- 2a. 已在排除名单里的 → excluded
update visual_assets set eligibility_status = 'excluded'
 where eligibility_tags && array['excluded_from_heritage_primary']
   and eligibility_status <> 'excluded';

-- 2b. 已有"确认链接"的 → gate_passed
--     依据是 `vel_confirmed_requires_evidence` 触发器保证 confirmed 链接**必带 evidence**；
--     **不是**依据 evidence_gate_audit 的覆盖率——那批覆盖来自 2026-10-02 的测试运行
--     （7 秒内写入 9016 行，见 CURRENT §9 ESC-05），不能当作"过了真实门禁"的证据。
update visual_assets a set eligibility_status = 'gate_passed'
 where a.eligibility_status = 'pending_review'
   and exists (
     select 1 from visual_entity_links l
      where l.asset_id = a.asset_id
        and l.link_status = 'confirmed'
        and not (l.eligibility_tags && array['excluded_from_heritage_primary'])
   );

-- ── 3) 下游判定改为按状态（与原口径**等价**，不改变当前结果）────────────────────
-- 原口径 = "有 confirmed 链接 且 双方均未被排除"；新口径 = 上面 + eligibility_status='gate_passed'。
-- 由于第 2b 步恰好把那批置为 gate_passed，本视图的行数应与迁移前**逐行一致**。
create or replace view effective_visual_assets as
select
  l.link_id,
  l.asset_id,
  l.entity_id,
  l.depicted_entity_label,
  l.link_status,
  l.current_or_historical,
  l.decision_rule,
  a.source_id,
  a.file_path,
  a.asset_type,
  a.created_date,
  a.rights
from visual_entity_links l
join visual_assets a on a.asset_id = l.asset_id
where l.link_status = 'confirmed'
  and a.eligibility_status = 'gate_passed'
  and not (a.eligibility_tags && array['excluded_from_heritage_primary'])
  and not (l.eligibility_tags && array['excluded_from_heritage_primary']);

-- ── 4) 晋级闸门触发器 ────────────────────────────────────────────────────────
-- **最后才建**：前面的历史数据修正会把历史行置为 gate_passed；若先建触发器，
-- 这一步会被它拦下（"修正历史"与"未来晋级"是两件事，不应混用同一道闸）。
--
-- 形态照抄 `claims_require_evidence`：
--   · constraint trigger + **deferrable initially deferred** → 校验发生在 **COMMIT**，
--     因此写入者可以在**同一事务内**先插资产、再插门禁审计记录，提交时才检查；
--   · 只管最高一级（gate_passed），中间状态自由。
create or replace function guard_visual_asset_gate_passed_requires_audit()
returns trigger language plpgsql as $$
begin
  if new.eligibility_status = 'gate_passed' and not exists (
    select 1 from evidence_gate_audit g
     where g.object_type = 'visual_asset'
       and g.object_id = new.asset_id::text
  ) then
    raise exception 'visual_asset % 标为 gate_passed 必须有 evidence_gate_audit 记录', new.asset_id;
  end if;
  return new;
end $$;

drop trigger if exists va_gate_passed_requires_audit on visual_assets;
create constraint trigger va_gate_passed_requires_audit
after insert or update of eligibility_status on visual_assets
deferrable initially deferred
for each row execute function guard_visual_asset_gate_passed_requires_audit();

-- 查询加速：下游按状态过滤
create index if not exists idx_va_eligibility_status on visual_assets(eligibility_status);

-- 不修改 001~007。不写任何 verified / published 历史事实。
