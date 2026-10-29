// V1 来源清单（资料台展示用）。
// 与 sources/registry.json 的 v1:true 项保持同步；权威元数据在 registry，这里只做 UI 摘要。
export const V1_SOURCES = [
  { id: "shl-open-data", name: "上海图书馆开放数据", access: "api" },
  { id: "wikimedia-commons", name: "Wikimedia Commons", access: "api" },
  { id: "loc", name: "美国国会图书馆", access: "api" },
  { id: "zh-wikisource", name: "维基文库", access: "api" },
  { id: "shidianguji", name: "识典古籍", access: "manual" },
  { id: "nlc-guji", name: "国家图书馆·中华古籍资源库", access: "manual" },
  { id: "user-upload", name: "用户上传 PDF/照片", access: "manual" },
];
