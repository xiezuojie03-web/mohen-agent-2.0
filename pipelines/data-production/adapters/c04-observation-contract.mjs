// C04 视觉观察契约（照片、版画、插图、碑拓）——纯规则，不调用任何模型。
//
// 为什么需要它：D01 里图片材料走不通，根因不是"缺模型"，而是**没有观察契约**——
// 观察项、图内定位、可见性边界、与图题的分野都没定，模型接进来也无法判定什么算证据。
// 本文件把 specs/data-production/standards/d01《规范_P1_C01-C08》C04 章的要求写成可执行判定：
//   * 执行顺序：EXIF/方向 → 观察可见区域 → 局部框与描述候选 → 标出模糊/遮挡 → 图题/背注与
//     画面观察分离 → 逐一回链。
//   * 输出及定位：原图 hash、色彩空间、尺寸、变换、框坐标、图题来源、是否后期修复。
//   * Gate 处置（原文）：不能区分图题与视觉观察、增强不可逆、低清局部却做确定视觉断言 → HOLD。
//   * 专业补充（原文）：视觉描述仅限可见特征，不把图中人、年代、地名同一性当作技术读取结论。
//
// 边界：本文件只做"形状+边界"判定，不判专业质量、不写 Gate、不签资格、不接触原件字节。

export const C04_OBSERVATION_VERSION = "c04-observation/v1";

// 观察项必须是"可见特征"，且每条都要能回指图内区域。
export const EVIDENCE_CLASSES = Object.freeze(["visual_observation", "caption", "technical_metadata"]);
export const CERTAINTY = Object.freeze(["visible", "probable", "uncertain"]);

// 低清阈值：局部框短边像素低于此值时不得做确定断言（C04 原文"低清局部却做确定视觉断言 → HOLD"）。
export const MIN_DEFINITE_REGION_PIXELS = 48;

// 越界断言：这些属于解释与同一性判断，不属于图像技术读取。
const IDENTITY_CLAIM_PATTERNS = [
  /就是(同|该|此)(座|处|个|名)/,
  /即(为|是)(同一|当年|原物)/,
  /(建于|始建于|成于)(宋|元|明|清|民国)\S*(年|年间)/,
  /(同|即)(一|此)(座|处)(桥|寺|镇|庙)/,
];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isInUnit = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

function validRegion(region) {
  return isObject(region) && isInUnit(region.x) && isInUnit(region.y) &&
    isInUnit(region.w) && isInUnit(region.h) &&
    region.w > 0 && region.h > 0 &&
    region.x + region.w <= 1.0000001 && region.y + region.h <= 1.0000001 &&
    Number.isSafeInteger(region.pixel_width) && Number.isSafeInteger(region.pixel_height) &&
    region.pixel_width > 0 && region.pixel_height > 0;
}

// 图内有可读文字时正确路线是 C02（文字检测→OCR/文本直读），不是让视觉模型读字。
// text_detected 未知时失败关闭：不猜。
export function routeVisualMaterial({ mediaType, textDetected, textRegionCount = 0 } = {}) {
  const image = typeof mediaType === "string" && /^image\//.test(mediaType);
  if (!image) {
    return { method: null, disposition: "HOLD", reason_code: "C04_ROUTE_NOT_IMAGE",
      next_action: "非图片材料请按 C01/C02/C05 等对应方法选路" };
  }
  if (textDetected === true || (Number.isSafeInteger(textRegionCount) && textRegionCount > 0)) {
    return { method: "C02", disposition: "ROUTE", reason_code: "C04_ROUTE_TEXT_REGIONS_TO_C02",
      next_action: "先按 C02 做文字检测区域的原字形/校订双轨读取；视觉模型不得替代文字读取" };
  }
  if (textDetected === false) {
    return { method: "C04", disposition: "ROUTE", reason_code: "C04_ROUTE_NO_LEGIBLE_TEXT",
      next_action: "按 C04 观察契约做可见特征观察（图片题、背注与画面观察分离）" };
  }
  return { method: null, disposition: "HOLD", reason_code: "C04_TEXT_DETECTION_REQUIRED",
    next_action: "先做文字检测（是否含可读文字）再选路，不得跳过直接描述画面" };
}

// 失败关闭：返回 issues 为空才 PASS；任何一条命中即 HOLD，并给出可执行的 next_action。
export function validateC04Observation(candidate) {
  const issues = [];
  const add = (code, path, detail) => issues.push({ code, path, detail });

  if (!isObject(candidate)) {
    return { version: C04_OBSERVATION_VERSION, valid: false, disposition: "HOLD",
      issues: [{ code: "C04_CANDIDATE_INVALID", path: "", detail: "候选必须是对象" }],
      blocking_codes: ["C04_CANDIDATE_INVALID"],
      next_action: "候选必须是对象且含原图 hash、技术元数据与带框坐标的观察项" };
  }
  if (!isHash(candidate.source_image_sha256)) add("C04_SOURCE_IMAGE_HASH_REQUIRED", "source_image_sha256", "必须绑定原图 sha256");
  if (!isObject(candidate.technical)) add("C04_TECHNICAL_METADATA_REQUIRED", "technical", "缺 EXIF/方向、色彩空间、尺寸、变换记录");
  else {
    const t = candidate.technical;
    if (!Number.isSafeInteger(t.width) || !Number.isSafeInteger(t.height) || t.width <= 0 || t.height <= 0)
      add("C04_TECHNICAL_METADATA_REQUIRED", "technical.width/height", "缺原图尺寸");
    if (typeof t.color_space !== "string" || !t.color_space) add("C04_TECHNICAL_METADATA_REQUIRED", "technical.color_space", "缺色彩空间");
    const transforms = Array.isArray(t.transforms) ? t.transforms : [];
    for (const [i, tr] of transforms.entries()) {
      if (!isObject(tr) || tr.reversible !== true)
        add("C04_ENHANCEMENT_IRREVERSIBLE", `technical.transforms[${i}]`, "图像变换必须可逆并保留原字节（禁止用增强伪细节替代原图）");
    }
  }

  // 图题/背注必须与画面观察分离，且要记来源（C04 输出项"图题来源"）。
  const caption = candidate.caption;
  if (caption != null) {
    if (!isObject(caption)) add("C04_CAPTION_INVALID", "caption", "图题必须是对象");
    else {
      if (typeof caption.provenance !== "string" || !caption.provenance)
        add("C04_CAPTION_PROVENANCE_MISSING", "caption.provenance", "图题/背注必须注明来源，不得当作画面观察");
      if (caption.merged_into_observations === true)
        add("C04_CAPTION_MERGED_INTO_OBSERVATION", "caption.merged_into_observations", "不得把图题并入视觉观察");
    }
  }

  const observations = Array.isArray(candidate.observations) ? candidate.observations : null;
  if (!observations || observations.length === 0)
    add("C04_OBSERVATION_EMPTY", "observations", "至少需要一条可回链的可见特征观察");

  for (const [i, item] of (observations ?? []).entries()) {
    const at = `observations[${i}]`;
    if (!isObject(item)) { add("C04_OBSERVATION_INVALID", at, "观察项必须是对象"); continue; }
    if (!EVIDENCE_CLASSES.includes(item.evidence_class))
      add("C04_EVIDENCE_CLASS_INVALID", `${at}.evidence_class`, `必须是 ${EVIDENCE_CLASSES.join("/")}`);
    if (!CERTAINTY.includes(item.certainty))
      add("C04_CERTAINTY_INVALID", `${at}.certainty`, `必须是 ${CERTAINTY.join("/")}`);
    if (!validRegion(item.region)) add("C04_OBSERVATION_WITHOUT_REGION", `${at}.region`, "每条观察必须有可回指的框坐标与像素尺寸");
    if (item.evidence_class === "visual_observation" && typeof item.feature !== "string")
      add("C04_FEATURE_REQUIRED", `${at}.feature`, "视觉观察必须写明可见特征");
    if (typeof item.statement !== "string" || !item.statement.trim())
      add("C04_STATEMENT_REQUIRED", `${at}.statement`, "观察必须有文字表述");
    if (item.certainty === "visible") {
      if (item.occluded === true || item.blurry === true)
        add("C04_VISIBILITY_UNKNOWN_ASSERTED", `${at}.certainty`, "遮挡/模糊区域不得做确定断言（降为 probable/uncertain）");
      if (validRegion(item.region) &&
          Math.min(item.region.pixel_width, item.region.pixel_height) < MIN_DEFINITE_REGION_PIXELS)
        add("C04_LOW_RESOLUTION_DEFINITE_CLAIM", `${at}.region`, `局部框短边 < ${MIN_DEFINITE_REGION_PIXELS}px 时不得做确定断言`);
    }
    if (item.derived_from === "filename" || item.derived_from === "generated")
      add("C04_GENERATED_DETAIL_CLAIM", `${at}.derived_from`, "不得由文件名或生成细节推导画面内容");
    const statement = typeof item.statement === "string" ? item.statement : "";
    if (IDENTITY_CLAIM_PATTERNS.some((re) => re.test(statement)))
      add("C04_IDENTITY_CLAIM_OUT_OF_SCOPE", `${at}.statement`, "图像技术读取不得断言人物/年代/地名同一性，交由解释与考证环节");
  }

  const unique = Object.fromEntries(issues.map((x) => [x.code, x]));
  return {
    version: C04_OBSERVATION_VERSION,
    valid: issues.length === 0,
    disposition: issues.length === 0 ? "PASS" : "HOLD",
    issues,
    blocking_codes: Object.keys(unique).sort(),
    next_action: issues.length === 0 ? null : "按 issues 逐条修正观察候选后重交；不得以模型输出直接替代",
  };
}
