import Link from "next/link";

export const metadata = {
  title: "墨痕 · 金泽：一公里之内的南宋",
  description: "Evidence-grounded experience：两座宋桥、一处宋代寺院遗址，为什么靠得这么近？",
};

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">墨痕 · 金泽</p>
        <h1>一公里之内的南宋</h1>
        <p className="lead">
          两座古桥、一处宋寺遗址，今天为什么离得这么近？
          这不是导览，是一次带证据的现场体验——只讲有据的，不确定的就明说。
        </p>
        <div style={{ marginTop: 36 }}>
          <Link
            href="/experience/jinze-water-net"
            style={{
              display: "inline-block",
              padding: "14px 30px",
              background: "#17201d",
              color: "#f5f1e7",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 16,
              letterSpacing: "0.02em",
            }}
          >
            进入金泽现场 →
          </Link>
        </div>
      </section>
      <footer
        style={{
          borderTop: "1px solid #c3c3ba",
          paddingTop: 18,
          color: "#5c6560",
          fontSize: 13,
        }}
      >
        <Link href="/foundation" style={{ color: "#5c6560", textDecoration: "none" }}>
          工程自检（内部）
        </Link>
      </footer>
    </main>
  );
}
