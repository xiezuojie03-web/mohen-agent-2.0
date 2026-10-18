// apps/web/app/experience/lvzhiqiu/page.tsx
//
// MH-STRAT-PROD-A001 · 绿之丘体验路由（服务端入口）。
//
// 与金泽「冻结导演稿 + 逐字副本」不同：A001 的语义来自真实数据生产链发布的 read_model，
// 本页只做三件事——读已发布 L5、算 Surface 资格、交给客户端体验壳渲染。
// 本页不写剧情、不写历史事实、不做几何断言；实时读取（force-dynamic），不吃旧缓存。

import "./a001.css";
import A001Experience from "./A001Experience";
import { readA001ExperienceData } from "../../../lib/a001-experience-data";

export const metadata = {
  title: "墨痕 · 绿之丘：从工业仓储到公共生活空间",
  description:
    "杨浦滨江绿之丘（杨树浦路 1500 号）：一栋 1995 年的机修仓库如何成为今天可进入、可停留的公共场所；哪些可以证实，哪些还不能。",
};

export const dynamic = "force-dynamic";

export default async function LvzhiqiuPage() {
  const data = await readA001ExperienceData();
  return <A001Experience data={data} />;
}
