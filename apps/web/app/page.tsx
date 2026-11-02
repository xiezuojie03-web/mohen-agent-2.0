import Link from "next/link";
import ModeEntryCard, { type ModeVariant } from "./components/ModeEntryCard";

export const metadata = {
  title: "墨痕 MoHen · 从历史中发现与今天的连接",
  description: "用自然语言创作历史作品，沉浸观看，独立探索历史知识库",
};

const CREATION_STEPS = ["自然语言委托", "研究与创作", "审核与发布"];

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

];

export default function Home() {
  return (
    <main className="mo-home">
      <section className="mo-hero">
        <div className="mo-hero__inner">
          <div>
            <p className="mo-hero__eyebrow">墨痕 MOHEN</p>
            <h1 className="mo-hero__title">从广阔历史中，发现与今天生活的连接</h1>
            <p className="mo-hero__lead">
              从一个历史问题出发，发现人与地方、时代与日常生活的联系。
              可以独立探索知识世界，也可以委托研究与创作，或观看已发布的作品。
            </p>
            <div className="mo-hero__cta">
              <Link href="/studio" className="mo-btn mo-btn--primary">开始创作</Link>
              <a href="#modes" className="mo-btn mo-btn--ghost">
                了解墨痕
              </a>
            </div>
          </div>
          <div className="mo-hero__flow" aria-label="创作到发布的工作过程；观看与探索也可独立进入">
            <div className="mo-flow__steps">
              {CREATION_STEPS.map((step, i) => (
                <div className="mo-flow__step" key={step}>
                  <span className="mo-flow__dot">{i + 1}</span>
                  <span className="mo-flow__label">{step}</span>
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
              <span>这里将出现当前可观看的已发布作品</span>
            </div>
          </div>
          <div className="mo-panel">
            <h2 className="mo-panel__title">我的创作任务</h2>
            <div className="mo-empty">
              <span className="mo-empty__mark">—</span>
              <span>登录后查看你的研究与创作任务</span>
            </div>
          </div>
          <div className="mo-panel">
            <h2 className="mo-panel__title">知识资产概览</h2>
            <div className="mo-empty">
              <span className="mo-empty__mark">—</span>
              <span>知识覆盖概览暂未接入</span>
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
