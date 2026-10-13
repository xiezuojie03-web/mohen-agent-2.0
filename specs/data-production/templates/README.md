# Stage Output Report Templates

每个阶段固定输出两类报告：

```text
1. Machine Gate Report
2. Human Review Stage Report
```

二者目的不同：

- Machine Gate：能不能过；
- Human Review：值不值得继续。

## D01–D05

| Stage | Machine Template | Human Template |
|---|---|---|
| D01 | `D01_machine-gate-template.json` | `D01_human-review-template.md` |
| D02 | `D02_machine-gate-template.json` | `D02_human-review-template.md` |
| D03 | `D03_machine-gate-template.json` | `D03_human-review-template.md` |
| D04 | `D04_machine-gate-template.json` | `D04_human-review-template.md` |
| D05 | `D05_machine-gate-template.json` | `D05_human-review-template.md` |

所有 HTML 报告必须从 canonical JSON/MD 生成，不单独维护数据。
