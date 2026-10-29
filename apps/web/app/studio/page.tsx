import StudioWorkbench from "./StudioWorkbench";

export const metadata = { title: "创作 Studio · 墨痕" };

export default function StudioPage() {
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
      <StudioWorkbench />
    </>
  );
}
