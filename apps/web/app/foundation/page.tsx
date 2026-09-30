const checks = [
  ["Project", "Greenfield / Local-first"],
  ["Data", "Evidence before Discovery"],
  ["Agent", "Structured actions only"],
  ["Experience", "Canvas ↔ Mohen"],
];

export const metadata = {
  title: "墨痕 Agent 2.0 · FOUNDATION",
  description: "Internal engineering-health surface",
};

export default function Foundation() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">MOHEN AGENT 2.0 · FOUNDATION</p>
        <h1>在典籍与山河之间，<br/>发现那些尚未讲完的故事。</h1>
        <p className="lead">当前页面只是工程健康面，不是正式产品首页。Phase 0 只验证骨架、契约、数据门禁与可接手性。</p>
      </section>
      <section className="grid">
        {checks.map(([k, v]) => (
          <article key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </article>
        ))}
      </section>
      <section className="status">
        <div>
          <i /> Foundation ready
        </div>
        <p>Current vertical-slice candidate: 金泽 · story thesis not locked.</p>
      </section>
    </main>
  );
}
