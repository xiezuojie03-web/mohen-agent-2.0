# EXPERIENCE CONTRACT

## 核心
Agent 不生成页面；Agent 更新 `ExperienceState`，Renderer 呈现状态。

## ExperienceState
至少包含：goal、map、time、visual、discovery、narrative、evidence、route、trail。

## CompositionState
`primarySurface + secondarySurface + contextSurface + narrativeDensity + visualIntensity + transitionIntent`

同一时刻只有一个 Primary Surface。

## ExperienceAction
V0.1：
- FOCUS_PLACE
- SET_TIME
- SHOW_HISTORICAL_LAYER
- SELECT_DISCOVERY
- OPEN_EVIDENCE
- SET_VISUAL_MODE
- SET_COMPOSITION
- PATCH_NARRATIVE
- PROPOSE_ROUTE
- REPLAN

## Mohen Presence
- Ambient：轻提示/观察/等待。
- Guide：主动指出 Discovery 与下一步。
- Dialogue：澄清、深追问、证据解释、Goal 修改。

重要发言必须尽量指向 Canvas 上可见的事实、变化或证据。

## 渐进揭示
聚焦 → 线索 → 历史层 → 视觉证据 → 关系 → 故事 → 行动。禁止一次性把地图、图、长文、证据同时堆满。

## 历史视觉
只使用可溯源原始历史图像、现代现场图、注释、数据驱动重建。首期禁止生成式历史场景图。
