# 墨痕｜GitHub 云端工程仓库回写本地 · 方案与决策记录

> 生成：2026-11-07 · 作者：总系统工程师（CodeBuddy）· 状态：**方案已获 Owner 确认并执行完毕（回写部分）**
> Owner 授权：2026-11-07「授权你为墨痕项目总系统工程师，负责所有技术问题；产品功能改变/效果确认/成本使用需 Owner 确认」

---

## 1｜目标与最高红线

**目标**：把 GitHub 云端工程仓库（新架构，ChatGPT/Codex 施工中）回写到本地，然后在本地继续后续施工。

**红线（Owner 明确，全程遵守）**：
- 严禁把本地工程仓库直接覆盖 GitHub 云端仓库。
- 云端是经过较长时间施工、尚未完成的新架构；本地原是 C0–C4 旧架构。
- 回写 = 单向拉取，全程**只 pull/fetch/checkout，不 push、不 force、不覆盖云端**。

---

## 2｜现状调查结论

| 项 | 本地（回写前） | 云端 GitHub |
|---|---|---|
| 分支 | `a001/production`（唯一，759dbbd，138 提交） | `main`（默认，571 提交）+ 2 个 `mab/*` 分支 |
| 架构 | 旧 C0–C4 | 新 MHKA-00~05 |
| 关系 | — | `main` 是 `a001/production` 的严格后代（+433 提交，fast-forward） |

**网络与凭证**：本机 git 直连 `github.com:443` 被阻断；发现 IDE 本地代理 `http://127.0.0.1:51081` 可通 GitHub（`api/codeload/raw/github` 均 200），凭证正常（私有仓库可 fetch）。

**关键事实**：本地 `a001/production` 已被云端删除；其 138 个提交全部包含在云端 `main` 内。因此回写无需重新克隆整个仓库，本地已有祖先提交，仅需快进 433 个提交。

---

## 3｜Owner 决策记录（2026-11-07）

| 决策点 | 选项 | Owner 选择 | 含义 |
|---|---|---|---|
| 1｜回写方式 | A 同仓库快进 / B 独立目录克隆 | **1A** | 同仓库快进，保留 git 历史连续性 |
| 2｜工具分工 | A 本地主导 / B 云端 ChatGPT 主导 | **2A** | 改为本地 CodeBuddy 主导施工，变更经 Owner 确认后再推云端 |
| 3｜施工起点 | A 继续 M5 两线 / B 先精读产出报告 | **3B** | 先精读新架构 + 产出差异理解报告，暂不动代码 |

---

## 4｜回写方案（已执行完毕）

| 步骤 | 操作 | 结果 |
|---|---|---|
| 1 | 打旧架构锚点 tag `archive/a001-production-759dbbd` | ✅ 已打，永久保留旧 C0–C4 基线 |
| 2 | 持久化代理到**本仓库** config（`http.proxy`/`https.proxy`，不动全局） | ✅ 已配 `127.0.0.1:51081` |
| 3 | `git fetch --all --prune` 拉取云端全部分支 | ✅ 拉到 main + 2 个 mab 分支；确认云端已删 a001/production |
| 4 | 创建本地 `main`、`mab/m4-provider-spend-controls-20261107`、`mab/owner-led-execution-plan-20261107` 追踪远端 | ✅ 已建 |
| 5 | `git switch main` 切换工作区到新架构 | ✅ HEAD=`d1cf3fc`，工作树干净 |
| 6 | 确认新架构文件齐全（`governance/mhka/`、`tasks/implementation/MAB/`、`.agents/.codebuddy/.github`） | ✅ 齐全 |

**回写后的本地分支全景**：
- `a001/production`（旧 C0–C4，保留，tag 已锚定）
- `main`（新 MHKA 架构，追踪 origin/main，当前施工基线）
- `mab/m4-provider-spend-controls-20261107`（未合并 feature）
- `mab/owner-led-execution-plan-20261107`（未合并 feature）

**未执行（3B 约定，暂不动代码）**：`pnpm install`、跑 CI/单测基线——留待正式动代码施工时执行。

---

## 5｜后续施工计划（回写完成后）

按 Owner 选择 **3B**，当前阶段只做理解与报告，代码施工待下一指令。后续方向：

1. **施工基线**：以本地 `main` 为唯一基线，继续 MAB `PLAN.md` 的 M5 两条并行线：
   - A 线：M1/M2 真实原件（NAJ《松江府志7》私有持久化 + L0–L2 首读/回放/撤权 PG+HTTP 验证）
   - B 线：M4 受控 Provider 执行器（合成输入 PG/HTTP 正反 + 真实币种费用模型 + 失败 HOLD + Receipt）
2. **记账纪律**：每批回写 `tasks/implementation/MAB/progress.md` + `target-diff.csv`；POS/NEG/AUTH + PG/HTTP 验证；HOLD 原样保留。
3. **授权边界**：新增 Provider/密钥/费用、生产 DB/Storage 迁移、正式 Reviewer/Gate 启用、公开发布，均须 Owner 单独确认。

---

## 6｜安全红线（持续有效）

1. 全程只 `fetch/pull/checkout`；**不 push、不 force、不覆盖云端**。
2. 不删除本地 `a001/production` 分支与 `archive/a001-production-759dbbd` tag。
3. 不执行未经 Owner 单独授权的：生产 DB/Storage 迁移、正式 Reviewer/Gate 启用、公开生产发布、新增 Provider/密钥/订阅/充值。
4. 不重做 KAD 设计/来源搜索/UXD，不另造第二 Runner/Registry/Gate/Truth 库。
5. 密钥只从受控服务端 Secret 读取，不写入仓库/日志/聊天。

---

## 7｜遗留注意事项

1. **代理稳定性**：`127.0.0.1:51081` 是 IDE 会话内的本地代理，IDE 会话结束/重启后端口可能变化。若后续需要再次访问 GitHub 而 git 直连仍被阻断，需重新探测当前代理端口并更新本仓库 `http.proxy` 配置。
2. **本地环境残留**：工作区存在 `.env/.env.local`、`node_modules`、`.next`、`.playwright-cli`、`dev*.log`、`test-results` 等运行时残留（多为 gitignore 覆盖），切到 main 后未清理；动代码前需确认环境干净，避免误提交敏感配置。
3. **未合并 feature 分支**：两个 `mab/*` 分支尚未合并进 main，后续施工需先判断其内容是否应合入或已作废。

---

## 8｜关联交付物

- 新旧架构差异理解报告：`tasks/results/LOCAL-REWRITE-ARCH-DIFF-REPORT-20261107.md`
- 本方案与决策记录：`tasks/results/LOCAL-REWRITE-PLAN-20261107.md`
