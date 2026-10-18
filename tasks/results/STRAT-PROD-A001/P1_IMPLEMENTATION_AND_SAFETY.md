# P1｜受控实施准备与最小工程改造（MH-STRAT-PROD-A001 · 第三次重启）

> 承接 P0 `ACCEPT_MINIMAL`。本文件记录第三次重启的代码改动、不可变合同复核、备份/回滚证据与素材方案。

## 1｜代码改动清单（本次新增，均未越权）

| # | 文件 | 改动 | 性质 |
|---|---|---|---|
| 1 | `specs/DATA_CONTRACT.md` §1 | 明确 `world.visual_objects`（L3）经 G3 用途 + G5 投影为 `world_projections.payload.visuals` + `evidence_pointers(today_photo)`，consumer=visual_stage 消费展示权，不另成第七类 L5 | Gate B 已授权 |
| 2 | `governance/C4_..._V2.2.md` §3.1 | 补「视觉资产走 visual_stage 分面，V1–V5 按 §16 分级约束，不直读 L3、不靠静态 JSON 绕过 G5」 | Gate B 已授权 |
| 3 | `specs/data-production/L5_L8_CONSUMPTION_FEEDBACK_CONTRACT.md` §2 | 补视觉资产双消费者许可分离 + V1–V5 分级约束 | Gate B 已授权 |
| 4 | `pipelines/data-production/adapters/layer1-adapters.mjs` | ① D02 补写 `evidence.reading_units`（此前注释声称写但未写，导致 reading_units=0；文本→paragraph、图像→image/H25）；② D05 `world_projections.payload` 新增 `visuals` 数组（today_photo 投影） | 生产代码（Gate A 范围内） |
| 5 | `apps/web/lib/a001-experience-data.ts` | 新增 `A001Visual` 类型与 `visuals` 字段；`currentPhotosConfirmed` 从硬编码 0 改为 `payload.visuals` 真实照片数 | 前端数据层 |
| 6 | `pipelines/data-production/adapters/topic-a001.mjs` | `photoMaterials` 从空改为滨江公共空间 2 张开源照片；`visualBasis` 更新为「滨江照片 V3 + 体量 V4 解释标注」 | 主题配置 |

## 2｜不可变合同复核（未触碰）

- C0/C1/C2/C3 宪法、数据主规、方法注册表、56 条 HOLD、BR 325 边：**未改**。
- 六门 G0–G5 合同、gate-contracts.v3.json、method-binding-contract.json：**未改**。
- `main` / `track/experience-exp-0002` / `hushang-jingwei` Production：**未触碰**。
- 第一代 public 37 表：**未触碰**（只读未写）。
- 金泽既有 G5 / run / BR / 样本资产：**未截断**（A001 按主题前缀 `a001-` 隔离 supersession）。

## 3｜备份 / 回滚证据

| 项 | 证据 |
|---|---|
| 全库冷备 | `D:\MoHen\backups\STRAT-PROD-A001\A001_PRE_20261018_201543.dump`（`pg_dump -Fc`） |
| SHA256 | `9912A0681234007B61F60FCC48A37C6D112F616477BB74CC71DF9B4726F78589` |
| 恢复路径 | `pg_restore -h 127.0.0.1 -p 5432 -U postgres -d mohen_dev <dump>` |
| 代码回滚 | 全部改动在 `a001/production` 分支；`git reset --hard <A002固化commit>` 即回到干净基线 |
| 数据失效可逆 | G5 `current_valid` 只置 false、不删行（P4 已实测撤权后不复活旧内容） |

## 4｜素材方案（Q2 授权「合法开源素材」的复查结果）

| 项 | 结论 |
|---|---|
| 绿之丘建筑本体照片 | Commons **无**专门条目（三次确认） |
| 杨浦滨江公共空间照片 | Commons **有** 2 张 CC BY-SA 4.0：`File:DSC00228滨江绿化带夜景.jpg`（Ding Kezhong）、`File:Time Shipper.jpg`（Oscar Oiwa） |
| 本轮视觉承载 | 滨江公共空间照片 = V3 今日现场（视觉舞台真实照片）；绿之丘建筑体量 = V4 解释标注（克制线框 SVG，标注示意） |
| 残留缺口 | 绿之丘建筑本体照片缺、真多模态读图（图片出域）未做——均如实记录，不阻塞本轮，留 Owner 后续决策 |

## 5｜用户可复验入口

- 生产入口：`node pipelines/data-production/run.mjs --intent "…" --adapters pipelines/data-production/adapters/layer1-adapters.mjs`（`MOHEN_TOPIC_CONFIG=pipelines/data-production/adapters/topic-a001.mjs`）。
- 前端预览：`cd apps/web; npx next dev -p 3000` → `/experience/lvzhiqiu`。
- 数据库核验：`select count(*) from evidence.reading_units;`（本轮跑完后应 > 0）；`select payload->'visuals' from read_model.world_projections …`。
