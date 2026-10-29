-- 202610280940_assets.sql
-- 图片资产台账（Owner 决策：图片是未来最重要资产，先建台账；E1-4 落地）。
-- 统一登记：asset_id → title/kind → rights(license/author) → intended_use → ratio → status。

create table if not exists public.assets (
  asset_id     uuid primary key default gen_random_uuid(),
  title        text not null,
  kind         text not null,
  source_url   text,
  license      text,
  author       text,
  rights       jsonb not null default '{}'::jsonb,
  intended_use text,
  ratio        text,
  status       text not null default 'candidate' check (status in ('candidate','verified','demo')),
  created_at   timestamptz not null default now()
);

alter table public.assets enable row level security;

-- 把现有 6 张已核验版权图片登记为 verified（演示阶段也如实标注来源/许可，不冒充未知素材）
insert into public.assets (title, kind, license, author, rights, intended_use, ratio, status) values
  ('万安桥', 'photo', 'CC BY-SA 3.0', 'Fayhoo', '{"basis":"Wikimedia Commons"}', 'EXP 空间/今貌影像', null, 'verified'),
  ('普济桥', 'photo', 'CC BY-SA 3.0', 'Fayhoo', '{"basis":"Wikimedia Commons"}', 'EXP 空间/今貌影像', null, 'verified'),
  ('迎祥桥', 'photo', 'CC BY-SA 3.0', 'Fayhoo', '{"basis":"Wikimedia Commons"}', 'EXP 空间/今貌影像', null, 'verified'),
  ('颐浩寺遗址', 'photo', 'CC BY-SA 3.0', 'Fayhoo', '{"basis":"Wikimedia Commons"}', 'EXP 空间/今貌影像', null, 'verified'),
  ('杨浦滨江绿化带夜景', 'photo', 'CC BY-SA 4.0', 'Ding Kezhong', '{"basis":"Wikimedia Commons"}', 'EXP 空间/今貌影像', null, 'verified'),
  ('Time Shipper 雕塑', 'photo', 'CC BY-SA 4.0', 'Oscar Oiwa', '{"basis":"Wikimedia Commons"}', 'EXP 空间/今貌影像', null, 'verified');
