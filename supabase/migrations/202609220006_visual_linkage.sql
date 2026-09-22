-- 202609220006_visual_linkage.sql — TASK-0008 WP-D/E 前置
--
-- 为什么需要本迁移（§9 允许 migration 006 的唯一理由）：
--   visual_assets 现有列只有 asset_id / source_id / asset_type / file_path / created_date /
--   depicted_period / rights / checksum / quality_score / legacy_id / eligibility_tags。
--   §5 要求显式分离的 11 个语义中，以下 4 项在现有 schema 中【无处安放】：
--     - depicted_entity        （图所描绘的对象／场景）
--     - visual_link_status     （图→实体 链接状态 confirmed/suspected/similar/unconfirmed）
--     - link_evidence          （支撑该链接判定的 Evidence）
--     - current_or_historical  （本图与该对象历史状态的时间关系）
--   把「链接状态」塞进 visual_assets 单列也是错的：一张图可同时关联多个对象
--   （如镇景图含多座桥），且每个链接各自需要独立的证据与判定规则。
--   故本迁移新增【链接表】而非在 visual_assets 上加列 —— 这是最小的、
--   且语义正确的扩展，不创建平行的评审子系统（人审仍走 human_review_decisions）。
--
-- 不修改 001~004。不写任何 verified 历史事实。

create table if not exists visual_entity_links (
  link_id uuid primary key,
  asset_id uuid not null references visual_assets(asset_id),

  -- 目标实体。场景级目标（如「金泽镇历史镇景/水系」）在 entities 中无对应行时允许为空，
  -- 但 depicted_entity_label 必须显式写出被认定描绘的对象，不得留空。
  entity_id uuid references entities(entity_id),
  depicted_entity_label text not null,

  -- §3 允许的四种链接状态。只有 confirmed 计入 effective_visual_assets。
  link_status text not null
    check (link_status in ('confirmed','suspected','similar','unconfirmed')),

  -- 判定规则必须机器可读（WP-D：caption/title 命名、权威目录元数据、或其它确定性身份规则）
  decision_rule text not null,
  decision_note text,

  -- 链接判定所依据的 Evidence。confirmed 时由触发器强制非空。
  link_evidence_id uuid references evidence(evidence_id),

  -- §5：现代照片与现代遗产对象的「当前」关系，不得与历史状态证据混同
  current_or_historical text not null
    check (current_or_historical in ('current','historical','unknown')),

  -- 名称异写必须显式保留（不变量 11：天王阁/天皇阁不得被静默覆盖）
  name_variant_note text,

  eligibility_tags text[] not null default '{}',
  generated_by text not null default 'mohen-visual-linkage',
  created_at timestamptz not null default now(),

  -- 同一资产对同一对象的链接唯一（幂等可重跑键）
  unique (asset_id, depicted_entity_label)
);

create index if not exists idx_vel_asset on visual_entity_links(asset_id);
create index if not exists idx_vel_entity on visual_entity_links(entity_id);
create index if not exists idx_vel_status on visual_entity_links(link_status);
create index if not exists idx_vel_eligibility on visual_entity_links using gin (eligibility_tags);

-- ── 不变量 3：每个 confirmed 链接必须有 Evidence ──────────────────────────────
create or replace function guard_confirmed_link_has_evidence()
returns trigger language plpgsql as $$
begin
  if new.link_status = 'confirmed' and new.link_evidence_id is null then
    raise exception 'confirmed visual link 必须有 link_evidence_id (asset=%, object=%)',
      new.asset_id, new.depicted_entity_label;
  end if;
  return new;
end $$;

drop trigger if exists vel_confirmed_requires_evidence on visual_entity_links;
create trigger vel_confirmed_requires_evidence
before insert or update on visual_entity_links
for each row execute function guard_confirmed_link_has_evidence();

-- ── 不变量 4：HR-5 排除资产不得计入 heritage-primary（即使被误标 confirmed 也拦下）──
create or replace function guard_excluded_asset_not_heritage_confirmed()
returns trigger language plpgsql as $$
declare
  ex boolean;
begin
  if new.link_status = 'confirmed' then
    select (a.eligibility_tags && array['excluded_from_heritage_primary'])
      into ex
      from visual_assets a where a.asset_id = new.asset_id;
    if coalesce(ex, false) then
      raise exception 'HR-5 排除资产不得建立 confirmed 遗产链接 (asset=%)', new.asset_id;
    end if;
    if new.eligibility_tags && array['excluded_from_heritage_primary'] then
      raise exception '链接自身被标为 excluded_from_heritage_primary，不得为 confirmed (asset=%)', new.asset_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists vel_excluded_not_confirmed on visual_entity_links;
create trigger vel_excluded_not_confirmed
before insert or update on visual_entity_links
for each row execute function guard_excluded_asset_not_heritage_confirmed();

-- ── effective_visual_assets：WP-E 门槛的唯一口径（避免各脚本 SQL 漂移）─────────
-- confirmed + 双方均未被 HR-5 排除。只有此视图内的行可计入 effective gate。
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
  and not (a.eligibility_tags && array['excluded_from_heritage_primary'])
  and not (l.eligibility_tags && array['excluded_from_heritage_primary']);
