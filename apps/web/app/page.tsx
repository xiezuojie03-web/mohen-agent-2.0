import Link from "next/link";
import ModeEntryCard, { type ModeVariant } from "./components/ModeEntryCard";

export const metadata = {
  title: "墨痕 MoHen · 从历史中发现与今天的连接",
  description: "用自然语言创作历史作品，沉浸观看，独立探索历史知识库",
};

const MODES: {
  href: string;
  badge: string;
  variant: ModeVariant;
  title: string;
  desc: string;
}[] = [
  {
    href: "/studio",
    badge: "创作",
    variant: "studio",
    title: "创作 Studio",
    desc: "用自然语言委托墨痕，研究、编导并创作你的历史作品",
  },
  {
    href: "/watch",
    badge: "观看",
    variant: "watch",
    title: "观看 WATCH",
    desc: "沉浸式欣赏已发布的历史作品",
  },
  {
    href: "/explore",
    badge: "探索",
    variant: "exp",
    title: "探索 EXP",
    desc: "独立探索整个合格的历史知识库",
  },
  {
    href: "/admin",
    badge: "运营",
    variant: "admin",
    title: "运营管理 Admin",
    desc: "作品审核、发布与知识资产管理",
  },
];

const FLOW = ["委托", "创作", "审核", "观看", "探索"];

export default function Home() {
  return (
    <main className="mo-home">
      <section className="mo-hero">
        <div className="mo-hero__inner">
          <div>
            <p className="mo-hero__eyebrow">墨痕 MOHEN</p>
            <h1 className="mo-hero__title">从广阔历史中，发现与今天生活的连接</h1>
            <p className="mo-hero__lead">
              把史料讲成有人情味的故事。用自然语言委托墨痕做研究、写脚本、出分镜，
              再沉浸观看作品，自由探索背后的历史知识世界。
            </p>
            <div className="mo-hero__cta">
              <Link href="/studio" className="mo-btn mo-btn--primary">
                开始创作
              </Link>
              <a href="#modes" className="mo-btn mo-btn--ghost">
                了解墨痕
              </a>
            </div>
          </div>

          <div className="mo-hero__flow">
            <div className="mo-flow__steps">
              {FLOW.map((label, i) => (
                <div className="mo-flow__step" key={label}>
                  <span className="mo-flow__dot">{i + 1}</span>
                  <span className="mo-flow__label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mo-section" id="modes">
        <div className="mo-cards">
          {MODES.map((m) => (
            <ModeEntryCard key={m.href} {...m} />
          ))}
        </div>
      </section>

      <section className="mo-section">
        <div className="mo-home-grid">
          <div className="mo-panel">
            <h2 className="mo-panel__title">最近发布作品</h2>
            <div className="mo-empty">
              <span className="mo-empty__mark">—</span>
              <span>暂无已发布作品，第 2 步接入后显示</span>
            </div>
          </div>
          <div className="mo-panel">
            <h2 className="mo-panel__title">我的创作任务</h2>
            <div className="mo-empty">
              <span className="mo-empty__mark">—</span>
              <span>暂无进行中的创作</span>
            </div>
          </div>
          <div className="mo-panel">
            <h2 className="mo-panel__title">知识资产概览</h2>
            <div className="mo-empty">
              <span className="mo-empty__mark">—</span>
              <span>知识库建设中，覆盖情况待接入</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="mo-footer">
        <span>墨痕 MoHen · 从历史中发现与今天的连接</span>
        <div className="mo-footer__links">
          <a href="#">关于我们</a>
          <a href="#">使用指南</a>
          <a href="#">联系我们</a>
          <a href="#">版权与权利</a>
        </div>
      </footer>
    </main>
  );
}
