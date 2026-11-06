# Data Production Skill Manifest — six-stage owners

本文件列出**新架构唯一六阶段目标Skill身份**；具体资格及授权以正式Registry、MHKA、生产Protocol和独立Gate合同为准。Registry当前禁用，文件列名不等于Skill/Executor已获在线授权。

## Six canonical Stage Owners

| Stage | Layer | Independent Gate | Skill |
| --- | --- | --- | --- |
| D00 | L0 | G0 | `mohen-source-intake` |
| D01 | L1 | G1 | `mohen-carrier-reading` |
| D02 | L2 | G2 | `mohen-material-understanding` |
| D03 | L3 | G3 | `mohen-world-construction` |
| D04 | L4 | G4 | `mohen-humanistic-discovery` |
| D05 | L5 | G5 | `mohen-read-model-publication` |

上述六个Skill在仓库中的当前正文仍须逐文件核对；**若旧Stage/L/G字段与本表冲突，保持工程问题OPEN，不把本表当成代码已修复的证明**。在Owner暂停M5期间不修改已经施工的Skill或Executor。

## Reusable / Cross-cutting Skills

- `mohen-visual-asset`
- `mohen-historical-spatial-source`
- `mohen-historical-spatial-reconstruction`
- `mohen-project-guard`
- `mohen-acceptance`
- `mohen-experience-prototype`
- `mohen-vertical-slice`

这类能力可复用，但不得另建Stage、签发独立Gate或跨阶段最终写入。

## Retired five-stage and older Skill entrypoints

`mohen-data-ingest`、`mohen-evidence-gate`、`mohen-knowledge-weave`、`mohen-research-intake`、`mohen-association-discovery`、`mohen-humanistic-selection` 的历史退役关系见 `skills/archive/REPLACEMENT_MAP_ARCH-MIG-01_M1.md`。归档不等于允许运行；原D01起步的五阶段编号/层级/质量门映射也不得重新引用为现行生产规则。

GitHub旧五阶段文件的**物理删除**必须有可审计的引用/依赖检查，确保不删当前六阶段代码、实际生产结果及必要迁移/回滚依据。ChatGPT资料库历史文件不在本清理范围。
