// pipelines/evidence/recovery-rules.mjs — TASK-0004 取证判定规则（纯函数，无 DB / 无网络）。
//
// 单独成文件的原因：这些规则是「不许猜」的硬约束，必须能被测试直接引用并逐条验证，
// 而不能只埋在管线里靠人工看报告确认。
//
// 三条铁律：
//   1. 坐标：无对象级来源一律不得 verified；镇级锚点只能得 approximate，不得冒充点位。
//   2. 身份：至少 2 个独立维度一致才给 decision candidate；仅凭姓名绝不 merge。
//   3. 视觉：来源标签与实际 provider 不一致必须产生风险标记；现代照片不得证明历史状态。

// 文字位置著录关键词：出现说明「有文字位置描述」，但仍不是坐标来源
export const LOCATIONAL_RE = /位于|寺址|地址|横跨|坐落于|镇区|北市|南市|市河/;

// 传说/待考自述：命中则该句不可作为历史结论
export const LEGEND_RE = /传说|相传|俟考|属传说性质|据地方文史资料/;

/**
 * 坐标状态判定。
 * @param {string} description Legacy 实体描述
 * @returns {{status:'approximate'|'unresolved', hasLocationalProse:boolean}}
 *
 * 注意：**本函数永不返回 'verified'**。
 * verified 只在存在「对象级坐标来源」时才可能产生，而这类来源只能由带 source_id 的
 * 外部坐标 Evidence 提供，不能由描述文本推断。这里刻意不给 verified 出口，
 * 是为了从代码层面堵死「读一段描述就说坐标已核实」的路径。
 */
export function coordinateStatus(description) {
  const hasLocationalProse = LOCATIONAL_RE.test(String(description || ""));
  return {
    status: hasLocationalProse ? "approximate" : "unresolved",
    hasLocationalProse,
  };
}

/**
 * 精度/范围判定：镇级锚点不得冒充点位。
 * @param {{scope:string}} anchor 外部坐标锚点
 * @returns {boolean} 是否可以作为对象点位展示
 */
export function isObjectLevelCoordinate(anchor) {
  if (!anchor || !anchor.scope) return false;
  return anchor.scope === "object" || anchor.scope === "building_centroid";
}

/**
 * 身份判定。
 * @param {object} p
 * @param {Array<{dim:string, agree:boolean}>} p.dimensions 独立识别维度（外部来源须实际提供该维度）
 * @param {boolean} p.trueCrossTownHomonym 是否存在**真实的**跨镇同名（排除姓名桩后）
 * @param {boolean} p.stubHomonym 是否存在同名但无任何身份维度的空壳记录（族谱姓名桩）
 * @returns {{decision:string, basis:string, agreeCount:number, merged:boolean}}
 *
 * 关键：`merged` 恒为 false。本函数只产出 decision candidate，
 * 是否建立 sameAs 外部同源链接属跨源身份判断，必须进人工审核（HR-1），不得自动合并。
 */
export function resolveIdentity({ dimensions, trueCrossTownHomonym, stubHomonym }) {
  const agreeCount = (dimensions || []).filter((d) => d && d.agree).length;
  const ok = agreeCount >= 2 && !trueCrossTownHomonym;
  return {
    decision: ok ? "同一历史人物（外部来源佐证）；与空壳同名记录不合并" : "unresolved",
    basis: `${agreeCount}/${(dimensions || []).length} 个独立识别维度一致；真实跨镇同名=${!!trueCrossTownHomonym}；空壳同名=${!!stubHomonym}`,
    agreeCount,
    merged: false, // 永不自动合并
  };
}

/**
 * 视觉 provenance 分类。
 * @param {object} p
 * @param {string} p.filePath 文件 URL/路径
 * @param {string} p.providerLabel 库内登记的来源标签
 * @param {object|null} p.imageinfo Commons imageinfo（null=元数据不可得）
 * @param {string} p.description Commons 描述
 * @returns {{providerActual:string, labelMismatch:boolean, linkage:string, risk:string}}
 */
export function classifyVisual({ filePath, providerLabel, imageinfo, description }) {
  const path = String(filePath || "");
  const providerActual = /upload\.wikimedia\.org/.test(path)
    ? "wikimedia-commons"
    : /library\.sh\.cn|data1\.library\.sh\.cn/.test(path)
    ? "shanghai-library"
    : "unknown";
  const labelMismatch = !!providerLabel && providerLabel !== providerActual;

  // 依据文件名/描述判断内容，**不做图像识别、不下载原图**
  const isTrain = /CRH|CR400|G\d{3,4}|From .* to /i.test(path + " " + String(description || ""));
  const isBookScan = /\.djvu|\.pdf|CADAL/i.test(path);

  let linkage = "unconfirmed";
  if (isBookScan) linkage = "suspected"; // 书影：与金泽的对应关系待考

  // 全量风险标记（一个资产可能同时命中多项，不得只报一条）
  const riskFlags = [];
  if (labelMismatch) riskFlags.push("provider_label_mismatch");
  if (!imageinfo) riskFlags.push("metadata_unavailable");
  if (isTrain) riskFlags.push("content_not_depicting_entity");

  // 主风险按「对用户危害程度」排序：图配错 > 无法核验 > 来源标签不一致
  const risk = riskFlags.includes("content_not_depicting_entity")
    ? "content_not_depicting_entity"
    : riskFlags.includes("metadata_unavailable")
    ? "metadata_unavailable"
    : riskFlags.includes("provider_label_mismatch")
    ? "provider_label_mismatch"
    : "ok";

  return { providerActual, labelMismatch, linkage, risk, riskFlags, isTrain, isBookScan };
}

/**
 * 语义谓词推断：只在 Evidence 句**明确**支持时返回具体谓词，兜底为最弱的 mentioned_in。
 *
 * 反向约束（血的教训）：句中出现「位于 / 横跨 / 重建」并**不**等价于主宾之间存在
 * located_on / rebuilt_in —— 那只是主语自身的属性描写（如「万安桥位于金泽镇北，横跨金泽塘，
 * 为金泽古桥群中最北一座」）。早期版本据此生成了「万安桥 located_on 古桥群叠影」这类
 * 编造出来的关系。故这两个谓词在此不设出口，只能由带坐标/纪年的独立 Evidence 支撑，
 * 否则一律退回到 mentioned_in。
 *
 * named_after 有方向性：**被命名者 → 命名来源**。仅当宾语是人物类实体、主语不是人物类
 * 实体时才成立（颐浩寺遗址 named_after 吕颐浩 ✓；反过来则是把方向搞反）。
 *
 * @param {string} sentence Evidence 原句
 * @param {{subjectType?:string, objectType?:string}} ctx 两端实体类型
 * @returns {string}
 */
export function predicateFrom(sentence, ctx = {}) {
  const s = String(sentence || "");
  const sub = ctx.subjectType || "";
  const obj = ctx.objectType || "";

  if (/同跨一河|姐妹桥|一南一北同跨|同一河|并跨/.test(s)) return "spans_same_waterway";
  if (/寺名取自|名取自|承其名|以.{0,6}命名|因.{0,6}得名/.test(s)) {
    // 方向校验：被命名者（主语）不能是人物，命名来源（宾语）必须是人物
    if (obj === "figure" && sub !== "figure") return "named_after";
  }
  return "mentioned_in"; // 兜底：仅并提，最弱语义
}
