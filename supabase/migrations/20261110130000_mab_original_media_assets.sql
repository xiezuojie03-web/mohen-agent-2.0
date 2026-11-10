-- 20261110130000_mab_original_media_assets.sql
-- 步骤①"原件入系统"（Owner 2026-11-10 批准的施工顺序）。
--
-- 问题：public.assets 原来只登记 6 张当代今貌照片，没有任何方志原件；
-- 作品 content.media 只能引用这批照片，或干脆为空——画面里看不到原件。
--
-- 本迁移只做一件事：让媒资台账能**指向**一个已核验的真实原件页，
-- 并带上逐动作权利判定与字节哈希，供后续"作品用原件/观看侧显示原件"使用。
--
-- 边界：
--   * 全部新增列可空且不回填任何历史行，不推断旧数据；
--   * rights_by_action 默认 '{}'（空 = 九动作全部 unknown = HOLD），
--     只有显式写入 allowed 才可能被下游放行；
--   * 不放开 RLS，不新增 public 读策略：能不能看到字节，由后续消费路径按
--     发布状态与 G5 资格单独判定，台账本身不等于对外可见。

alter table public.assets
  add column if not exists original_id uuid references studio.private_originals(original_id) on delete restrict,
  add column if not exists source_id uuid references source.sources(source_id) on delete restrict,
  add column if not exists page_locator jsonb not null default '{}'::jsonb,
  add column if not exists content_sha256 text,
  add column if not exists rights_by_action jsonb not null default '{}'::jsonb;

alter table public.assets
  add constraint assets_page_locator_object check (jsonb_typeof(page_locator) = 'object'),
  add constraint assets_rights_by_action_object check (jsonb_typeof(rights_by_action) = 'object'),
  add constraint assets_content_sha256_format check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$');

-- 同一个私有原件只能登记成一条媒资，避免同一页出现两个身份。
create unique index if not exists assets_original_unique
  on public.assets(original_id) where original_id is not null;
