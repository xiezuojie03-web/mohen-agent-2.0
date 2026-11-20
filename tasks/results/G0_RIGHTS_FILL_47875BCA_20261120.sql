-- G0 权利事实据实登记｜2026-11-20｜Owner 选项 A 授权
-- 目标：来源 47875bca…（wikimedia-commons《朱家角古镇》CC BY-SA 3.0）
-- 依据：rights_evidence 中已存在的真实授权字段（license / license_url /
--       file_page / attribution），据实补齐判定器要求但当前缺失的两个字段：
--       1) rights_by_action.machine_read = 'allowed'（该许可允许机器读取）
--       2) rights_evidence.basis（由上述真实字段归纳为依据说明）
-- 范围：仅 UPDATE source.sources 的这两个 jsonb 字段，且仅在两者均缺失时生效（幂等）。
-- 不写：gate_candidates / gate_audits / qualification_current / invalidation_events /
--       source.source_versions（制品修订不变）/ 任何其他来源或项目。
-- 可回退：BEFORE 输出即原始值，按此可精确还原。

begin;

-- BEFORE（原始值，供核对与回退）
select source_id::text,
       rights_by_action,
       rights_evidence
from source.sources
where source_id = '47875bca-593a-49ae-8c7d-6b192f742f14'::uuid;

-- 据实补齐（幂等：两个字段都存在时不改任何东西）
update source.sources
set rights_by_action = rights_by_action || '{"machine_read":"allowed"}'::jsonb,
    rights_evidence = rights_evidence || '{"basis":"Wikimedia Commons 文件页 https://commons.wikimedia.org/w/index.php?oldid=1099152026 标注许可 CC BY-SA 3.0（https://creativecommons.org/licenses/by-sa/3.0/），署名 Adazzy.Gonzo；该许可允许机器读取与保存副本，须保留署名、来源链接、许可链接并以相同方式共享。"}'::jsonb
where source_id = '47875bca-593a-49ae-8c7d-6b192f742f14'::uuid
  and rights_by_action->>'machine_read' is null
  and rights_evidence->>'basis' is null;

-- AFTER（补后值）
select source_id::text,
       rights_by_action,
       rights_evidence
from source.sources
where source_id = '47875bca-593a-49ae-8c7d-6b192f742f14'::uuid;

-- 制品修订不变核对：仍应等于候选 48766904 存的 28de6385…
select control.artifact_revision_for(
  'source_version', '67839b1e-a344-4dd4-adf8-f7798ddf82d7'::uuid
) as source_version_revision_after;

commit;
