import { redirect } from "next/navigation";
import { getSession } from "../../lib/session";
import StudioWorkbench from "./StudioWorkbench";

export const metadata = { title: "创作 Studio · 墨痕" };

// 未登录时不应渲染工作台：客户端取项目会 401，界面只剩「研究项目读取失败」。
// 与 /studio/desk 一致，先由服务端确认会话，再进入创作界面。
export default async function StudioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const d00TaskId = process.env.VERCEL_ENV === "preview" && process.env.MOHEN_D00_APPROVED_RUN
    ? process.env.MOHEN_D00_CREATOR_TASK_ID : undefined;
  // 不再渲染右上角固定悬浮的「资料台」链接：它悬浮在生产操作动线上，
  // 反复造成误触跳页。资料台入口保留在工作台内的「打开完整研究记录」。
  return <StudioWorkbench d00TaskId={d00TaskId} />;
}
