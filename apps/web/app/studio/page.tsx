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
  return (
    <>
      <a
        href="/studio/desk"
        style={{
          position: "fixed",
          right: 18,
          top: 10,
          zIndex: 60,
          background: "#1f3a2d",
          color: "#fff",
          borderRadius: 4,
          padding: "5px 10px",
          fontSize: 12,
          textDecoration: "none",
        }}
      >
        资料台
      </a>
      <StudioWorkbench d00TaskId={d00TaskId} />
    </>
  );
}
