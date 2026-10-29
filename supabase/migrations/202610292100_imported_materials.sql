-- 202610292100_imported_materials.sql
-- K4（2026-10-29）：人工导入材料。地方志/文史/口述常无 API，先支持文本粘贴与 .txt/.md 上传；
-- PDF/图片 OCR 在 P2 接入（不冒充已完成）。
create table if not exists public.imported_materials (
  material_id     uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references public.users(user_id) on delete cascade,
  title           text not null,
  text_content    text not null,
  source_url      text,
  license         text,
  rights_declared boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists imported_materials_owner_idx on public.imported_materials (owner_user_id, created_at desc);
