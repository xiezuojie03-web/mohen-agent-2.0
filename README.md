# 墨痕 Agent 2.0

> Greenfield Project with Existing Assets.  
> 当前阶段：Phase 0 — Foundation & Data Factory。

墨痕不是“网站 + 聊天框”。它是一个以证据为边界、以时空人文知识为底座、由 Agent 驱动 Experience Canvas 的探索系统。

## 第一次接手项目，只读 5 个入口

1. `CONTEXT.md` — 现在做到哪里。
2. `specs/FOUNDATION.md` — 不可轻易改变的原则。
3. `specs/OWNERSHIP_MAP.md` — 什么代码归谁管。
4. `tasks/CURRENT_TASK.md` — 当前唯一任务。
5. 与任务直接相关的一个 Contract / Skill。不要默认通读整个仓库。

## 本地启动

前提：Git、Node.js LTS、pnpm。数据库在 TASK-0002 后接入；TASK-0001 不要求先装 Docker。

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`。首屏只是 Foundation 健康页，不是正式产品 UI。

## 验收

```bash
pnpm guard:docs
pnpm guard:structure
pnpm test
pnpm build
```

需要浏览器验收时再执行：

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## 数据原则

`data/raw` 保存原始资料，但大文件不进 Git。数据库正式知识不能由 AI 直接写入：  
`RAW → EXTRACTED → CANDIDATE → EVIDENCE_LINKED → VERIFIED / REJECTED / PENDING → PUBLISHED`

`seed.master.json` 在 2.0 中只是 Legacy 输入/可再生导出，不是真源。

## Legacy

老项目只读。禁止在老项目内安装依赖、构建、格式化或执行会写文件的脚本。迁移必须通过 `legacy/manifests` + staging 完成。

## 文档纪律

Git 保存历史，Contract 保存当前规则，ADR 保存重大决策。不要创建 `final2`、`v3-fix`、`new-new` 文档。
