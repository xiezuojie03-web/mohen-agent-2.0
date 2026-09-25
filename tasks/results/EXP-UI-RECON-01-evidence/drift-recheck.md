# EXP-UI-RECON-01 · Post-change Runtime Canonical Drift Recheck

> 取证：实际启动 Runtime（Next 15.5 dev :3000）双模式五幕走查（脚本置于仓库外 .workbuddy/tmp，不 track）；核对对象 = state-human-*.json / state-insp-*.json（各 12 场）。

**结果：27 checks, 0 FAIL —— AT-01…AT-10 全部通过；KEEP（五幕/单主焦点/世界重组/Evidence-on-Demand/Patch-not-Replace/Agent Presence/坐标诚实分离）无回归。**

| 默认 Human UI | Inspector（?inspector=1）| 项目 |
|---|---|---|
| False | IMMERSIVE_SPATIAL · 主角=current_map | transition-hint (R1) |
| 暂不采用（依据不足） | 禁用片段 | 片段闸门徽章 (R2) |
| 可引用（有依据）颐浩寺 原址即 吕颐浩 | 可用片段颐浩寺 former_site_of 吕颐浩（HR-4） | 片段闸门 fact (R2) |
| 待确认1992年开放为宗教活动场所（仅非权威转载，无官方文号，不进事实层） | 开放问题1992年开放为宗教活动场所（U10：仅非权威转载，无官方文号，不进事实层） | 开放问题 (R2) |
| 两种资料并存，目前不能据此裁定 | 静默裁决：ineligible并列比较：eligible | 冲突状态条 (R3) |
| None（无法无损人话化 → 默认隐藏） | T11-C1/C2 ACCEPT_CONFLICT（裁定已落实）；HR-MAP-01 维持 PARTIAL_CONFIRM；U6 标… | 史料抽屉不确定度 (R2) |
| 三条证据各自成立；把它们合起来怎么解读，还需要独立的判断。 | Evidence(A)+Evidence(B)+Evidence(C) ≠ Evidence(A+B+C interpretation) | Discovery 规则 (R3) |
| None | 120.919639, 31.039508 | 6 位 raw GPS (R4) |


## 判定依据（对应 Result §10/§11）

- Human-mode：state-human-*.json 中 transitionHint.present 恒 false；rawGpsPairOnPage 恒 null；badges 全为人话；eligible/ineligible/伪公式/AD-/U10/（E1）/（HR-4）/谓词键全文 0 命中。
- Inspector-mode：内部值逐项在原位置恢复（hint 原文、徽章原值、AD-05、U10、ACCEPT_CONFLICT 状态句、伪公式 code、6 位坐标对、replan-card）。
- Runtime 走查：progress Beat 1/5·1/8 → 5/5·8/8；主表面 8 种状态切换（current-map/relational/conflict/histmap/timeline/photo/discovery/replan-relational）；追问后进度不重置、IntentGuide 收口、无 chat input、pageerror=0。