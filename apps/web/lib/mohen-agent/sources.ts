// V1 来源清单（资料台/来源健康展示用）。
// 与 sources/registry.json 的 v1:true 项保持同步；权威元数据在 registry，这里只做 UI/健康检查摘要。
export interface SourceSummary {
  id: string;
  name: string;
  access: "api" | "manual" | "dataset";
  healthUrl?: string;
}

export const V1_SOURCES: SourceSummary[] = [
  {
    id: "shl-open-data",
    name: "上海图书馆开放数据",
    access: "api",
    healthUrl: "https://data1.library.sh.cn/gj/webapi/works?title=%E9%87%91%E6%B3%BD",
  },
  {
    id: "wikimedia-commons",
    name: "Wikimedia Commons",
    access: "api",
    healthUrl: "https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json",
  },
  {
    id: "loc",
    name: "美国国会图书馆",
    access: "api",
    healthUrl: "https://www.loc.gov/search/?q=china&fo=json",
  },
  {
    id: "zh-wikisource",
    name: "维基文库",
    access: "api",
    healthUrl: "https://zh.wikisource.org/w/api.php?action=query&meta=siteinfo&format=json",
  },
  { id: "shidianguji", name: "识典古籍", access: "manual" },
  { id: "nlc-guji", name: "国家图书馆·中华古籍资源库", access: "manual" },
  { id: "user-upload", name: "用户上传 PDF/照片", access: "manual" },
];
