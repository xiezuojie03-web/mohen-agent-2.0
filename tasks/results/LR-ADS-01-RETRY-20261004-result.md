# LR-ADS-01 重跑（内容级门槛收紧）· 噪声对比

> **日期**：2026-10-04
> **改动**：`pipelines/research/research-pipeline.mjs` 两处收紧 ——
> ① `extractText` 正文门槛 `len≥20` → `len≥40`（中文占比仍 ≥30%）；
> ② `d02Observations` 跳过视觉载体（`image_catalog` / `historical_map` 不产 Observation，不进共现池）。
> **运行**：`node pipelines/research/research-runner.mjs --scope LR-ADS-01 --max-obs 20000`（WRITE，新 run_id，旧 run 保留作基线对照）。

## 1. 噪声下降对比（基线 run `7727c3b5…` vs 收紧 run `a8948a43…`）

| 指标 | 基线(旧) | 收紧(新) | 变化 |
|---|---|---|---|
| Observation 总数 | 6,913 | 3,393 | **−51%** |
| 标题级 Observation（excerpt<40字） | 3,252（47.1%） | **0**（0%） | **−100% 消除** |
| 视觉载体 Observation（modality=map_image） | 2,023（29.3%） | **0**（0%） | **−100% 消除** |
| Mention 总数 | 8,610 | 5,399 | −37% |
| 关联候选总数 | 2,219 | 1,690 | **−24%** |
| 跨来源候选 | 2,219 | 1,690 | −24% |
| truth_promotion / long_tail | 20 / 2,199 | 20 / 1,670 | tp 持平，长尾 −24% |

## 2. 守卫校验（本轮未越界）

```
RESEARCH_GUARD discovery_jobs=5 db_checked=1 tables=8
  banned_status=0  promoted=0  longtail_review=0
  observations=10306  obs_no_source=0  obs_no_locator=0
  mention_fake_entity=0  truth_leak=0
```

**结论**：标题级与视觉载体两类最大噪声源已被彻底清除；候选总量下降 24% 且信噪比上升（长尾中平凡共现被稀释）。0 Truth 写入、0 自动晋级、0 无定位 Observation —— 仍完全符合 Discovery 模式 `truth_write_ceiling=0` 约束。

## 3. 说明

- 旧 run `7727c3b5…` 仍保留在库中（共现对照用），两 run 并存不冲突（按 run_id 级联）。如需只留收紧版，下轮加 `--reset` 即可。
- 本轮仅做"内容级门槛收紧"（用户指定项）。人物/地名类型误判（step 2）、平凡行政关系压制（step 3）属后续质量步骤，未在本轮改动。
- 运行产物明细：`tasks/results/LR-ADS-01-20261004/result.md`。
