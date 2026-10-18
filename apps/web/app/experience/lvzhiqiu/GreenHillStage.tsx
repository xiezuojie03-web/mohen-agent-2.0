"use client";

// apps/web/app/experience/lvzhiqiu/GreenHillStage.tsx
//
// MH-STRAT-PROD-A001 · 视觉舞台：绿之丘的「体量剖面」。
//
// 为什么是剖面而不是照片墙：本轮没有取得权利清晰的现状照片（Commons 无该对象条目），
// 按任务书 §2 采取「自制有据示意」降级——每一道线都对应材料里的一句原话，
// 且全程标注「非测绘图 / 无坐标 / 无比例」，不冒充测绘、历史图纸或航拍。
//
// 严守 Geometry is a Claim（surface-eligibility.ts:16-17）：
//   · 不画坐标、不画比例尺、不做现代配准；
//   · 今天一侧只表达材料明写的形态特征（削去约 50% 体量、拆除第 6 层、斜向切削成台地、
//     一层层高 7 米、中央螺旋扶梯、离地近 20 米的 270° 观景平台、缓坡上二层、漫游至滨江）；
//   · 1995 一侧只表达「6 层钢筋混凝土厂房」与「安浦路曾规划横切」；
//   · 因此本舞台在架构上只作为 approximate_area（近似区域）呈现，不是历史几何重建。
//
// 可交互对象都有 data-testid（P4 实屏复测用）：
//   ramp 缓坡 / spiral 螺旋扶梯 / deck 观景平台 / cut 被削去的体量 /
//   mass 建筑本体 / anpu 安浦路 / river 江岸 / road 杨树浦路 / cellar 地块前身（未证）

export type StageMode = "today" | "then";

export type StageHotspotKey =
  | "ramp"
  | "spiral"
  | "deck"
  | "cut"
  | "mass"
  | "anpu"
  | "river"
  | "road"
  | "cellar";

export interface StageProps {
  mode: StageMode;
  /** 当前被判断/追问聚焦的实体标签 */
  highlight?: string | null;
  activeKey?: StageHotspotKey | null;
  onSelect: (key: StageHotspotKey) => void;
}

const HOTSPOT_LABEL: Record<StageHotspotKey, string> = {
  ramp: "缓坡入口：从杨树浦路上到二层",
  spiral: "中央螺旋式扶梯：连通各层展厅",
  deck: "270 度观景平台：离地近 20 米",
  cut: "被削去的体量：拆第 6 层、削去约 50%",
  mass: "建筑本体：1995 年 6 层钢筋混凝土厂房",
  anpu: "安浦路：曾规划横切这栋建筑",
  river: "黄浦江岸",
  road: "杨树浦路：1500 号",
  cellar: "地块前身：材料称可追溯到 1920 年怡和冷库（未证同一栋）",
};

/** 实体标签 → 热点键（追问聚焦用；只映射生产链里真实存在的标签） */
export const ENTITY_TO_HOTSPOT: Record<string, StageHotspotKey> = {
  绿之丘: "mass",
  烟草公司机修仓库: "mass",
  "怡和冷库（1920）": "cellar",
  安浦路: "anpu",
  杨树浦路: "road",
  滨江公共空间: "river",
  章明团队: "spiral",
};

function Hotspot({
  id,
  active,
  onSelect,
  children,
}: {
  id: StageHotspotKey;
  active: boolean;
  onSelect: (k: StageHotspotKey) => void;
  children: React.ReactNode;
}) {
  return (
    <g
      className={`gh-hotspot${active ? " is-active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={HOTSPOT_LABEL[id]}
      data-testid={`stage-hotspot-${id}`}
      data-active={active ? "true" : "false"}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
    >
      {children}
    </g>
  );
}

/** 绿化簇（材料：「层层叠叠的绿植」） */
function Green({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y} q${6 * s} ${-14 * s} ${12 * s} 0 q${5 * s} ${-9 * s} ${10 * s} ${2 * s}`}
      className="gh-green"
    />
  );
}

export default function GreenHillStage({ mode, highlight, activeKey, onSelect }: StageProps) {
  const isToday = mode === "today";
  const hi = (k: StageHotspotKey) => activeKey === k;

  return (
    <figure className="gh-stage" data-testid="green-hill-stage" data-mode={mode}>
      <svg
        viewBox="0 0 1000 560"
        className="gh-stage__svg"
        role="img"
        aria-label={
          isToday
            ? "绿之丘今天的体量剖面示意：切削后的台地建筑、缓坡入口、螺旋扶梯与 270 度观景平台，一侧是黄浦江"
            : "绿之丘前身体量剖面示意：1995 年建成的六层钢筋混凝土厂房，安浦路曾规划横切"
        }
      >
        <rect x="0" y="0" width="1000" height="560" className="gh-paper" />

        {/* 江面 */}
        <Hotspot id="river" active={hi("river")} onSelect={onSelect}>
          <rect className="gh-hit" x="856" y="120" width="144" height="360" />
          <rect x="862" y="120" width="138" height="360" className="gh-water" />
          {[170, 215, 260, 305, 350, 395, 440].map((y, i) => (
            <path key={y} d={`M872 ${y} q20 -8 40 0 t40 0 t28 0`} className="gh-wave" opacity={0.5 - i * 0.05} />
          ))}
          <text x="868" y="110" className="gh-label gh-label--water">黄浦江</text>
        </Hotspot>

        {/* 地面与滨江步道 */}
        <line x1="40" y1="470" x2="862" y2="470" className="gh-ground" />
        <path d="M300 486 L862 486" className="gh-walk" />
        <text x="768" y="516" className="gh-label gh-label--walk">漫步至滨江</text>

        {/* 杨树浦路 */}
        <Hotspot id="road" active={hi("road")} onSelect={onSelect}>
          <rect className="gh-hit" x="40" y="528" width="822" height="30" />
          <line x1="40" y1="534" x2="862" y2="534" className="gh-road" />
          <line x1="40" y1="548" x2="862" y2="548" className="gh-road" />
          <text x="44" y="524" className="gh-label">杨树浦路 1500 号</text>
        </Hotspot>

        {isToday ? (
          <g data-testid="stage-body-today">
            {/* 缓坡：从杨树浦路上到建筑二层 */}
            <Hotspot id="ramp" active={hi("ramp")} onSelect={onSelect}>
              <rect className="gh-hit" x="96" y="300" width="200" height="176" />
              <path d="M116 470 L116 402 L300 338" className="gh-ramp" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <line
                  key={i}
                  x1={128 + i * 30}
                  y1={462 - i * 9}
                  x2={146 + i * 30}
                  y2={448 - i * 9}
                  className="gh-ramp-tread"
                />
              ))}
              <text x="100" y="286" className="gh-label">缓坡 · 上二层</text>
              <line x1="176" y1="296" x2="196" y2="384" className="gh-leader" />
            </Hotspot>

            {/* 切削后的台地体量 */}
            <Hotspot id="mass" active={hi("mass")} onSelect={onSelect}>
              <rect className="gh-hit" x="296" y="205" width="470" height="266" />
              <path
                d="M300 470 L300 330 L380 330 L380 285 L470 285 L470 245 L660 245 L660 285 L740 285 L740 330 L800 330 L800 470 Z"
                className={`gh-mass${hi("mass") || highlight === "mass" ? " is-focus" : ""}`}
              />
              <line x1="304" y1="330" x2="796" y2="330" className="gh-level" />
              <line x1="384" y1="285" x2="736" y2="285" className="gh-level" />
              <Green x={330} y={328} />
              <Green x={368} y={328} />
              <Green x={400} y={283} />
              <Green x={440} y={283} />
              <Green x={492} y={243} s={1.1} />
              <Green x={540} y={243} s={1.1} />
              <Green x={600} y={243} s={1.1} />
              <Green x={668} y={283} />
              <Green x={716} y={283} />
              <text x="318" y="376" className="gh-label">一层层高 7 米 · 柱跨净距超 4 米</text>
            </Hotspot>

            {/* 被削去的体量：虚线 + 斜纹，「已经不存在」 */}
            <Hotspot id="cut" active={hi("cut")} onSelect={onSelect}>
              <rect className="gh-hit" x="360" y="150" width="400" height="102" />
              <path d="M380 285 L380 196 L740 196 L740 285" className="gh-cut" />
              {Array.from({ length: 16 }).map((_, i) => (
                <line key={i} x1={386 + i * 22} y1={282} x2={404 + i * 22} y2={200} className="gh-hatch" />
              ))}
              <text x="380" y="184" className="gh-label gh-label--cut">被削去约 50% 体量 · 拆除第 6 层</text>
            </Hotspot>

            {/* 中央螺旋式扶梯 */}
            <Hotspot id="spiral" active={hi("spiral")} onSelect={onSelect}>
              <rect className="gh-hit" x="558" y="356" width="96" height="96" />
              <circle cx="606" cy="404" r="30" className="gh-spiral" />
              <path
                d="M606 404 m0 0 a30 30 0 1 1 0.1 0 M606 404 m0 0 a21 21 0 1 0 0.1 0 M606 404 m0 0 a12 12 0 1 1 0.1 0"
                className="gh-spiral-line"
              />
              <text x="626" y="458" className="gh-label gh-label--faint">螺旋扶梯</text>
            </Hotspot>

            {/* 270° 观景平台（悬挑于江岸） */}
            <Hotspot id="deck" active={hi("deck")} onSelect={onSelect}>
              <rect className="gh-hit" x="760" y="262" width="120" height="66" />
              <path d="M800 330 L862 330 L862 344 L800 344 Z" className="gh-deck" />
              <line x1="862" y1="322" x2="862" y2="352" className="gh-deck-edge" />
              <line x1="866" y1="330" x2="866" y2="470" className="gh-measure" />
              <text x="762" y="250" className="gh-label gh-label--deck">270° 观景平台</text>
              <text x="762" y="272" className="gh-label gh-label--deck">离地近 20 米</text>
            </Hotspot>
          </g>
        ) : (
          <g data-testid="stage-body-then">
            {/* 1995：六层钢筋混凝土厂房 */}
            <Hotspot id="mass" active={hi("mass")} onSelect={onSelect}>
              <rect className="gh-hit" x="252" y="140" width="576" height="340" />
              <rect x="260" y="150" width="560" height="320" className="gh-mass gh-mass--then" />
              {[198, 246, 294, 342, 390].map((y) => (
                <line key={y} x1="260" y1={y} x2="820" y2={y} className="gh-level" />
              ))}
              {/* 窗格：只表达「封闭外墙」，不表示真实开窗数 */}
              {[0, 1, 2, 3, 4, 5].map((row) =>
                [0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={282 + col * 60}
                    y={166 + row * 48}
                    width="26"
                    height="16"
                    className="gh-window"
                  />
                ))
              )}
              <text x="272" y="138" className="gh-label">1995 · 6 层钢筋混凝土厂房</text>
            </Hotspot>

            {/* 被后来拆除的第 6 层 */}
            <Hotspot id="cut" active={hi("cut")} onSelect={onSelect}>
              <rect className="gh-hit" x="252" y="150" width="576" height="52" />
              {Array.from({ length: 27 }).map((_, i) => (
                <line key={i} x1={262 + i * 21} y1={197} x2={278 + i * 21} y2={153} className="gh-hatch" />
              ))}
            </Hotspot>

            {/* 安浦路曾规划横切 */}
            <Hotspot id="anpu" active={hi("anpu")} onSelect={onSelect}>
              <rect className="gh-hit" x="180" y="250" width="700" height="150" />
              <line x1="200" y1="392" x2="880" y2="276" className="gh-anpu" />
            </Hotspot>

            {/* 地块前身：1920 怡和冷库（未证同一栋） */}
            <Hotspot id="cellar" active={hi("cellar")} onSelect={onSelect}>
              <rect className="gh-hit" x="220" y="498" width="600" height="40" />
              <ellipse cx="540" cy="470" rx="280" ry="11" className="gh-cellar" />
            </Hotspot>

            {/* 说明文字放在几何之外，避免压线 */}
            <text x="300" y="424" className="gh-label gh-label--anpu">安浦路曾规划从此横切 → 建筑面临拆除</text>
            <line x1="196" y1="174" x2="256" y2="174" className="gh-leader" />
            <text x="64" y="168" className="gh-label gh-label--faint">第 6 层</text>
            <text x="64" y="192" className="gh-label gh-label--faint">后被拆除</text>
            <text x="300" y="524" className="gh-label gh-label--q">前身 1920 怡和冷库（未证同一栋）</text>
          </g>
        )}
      </svg>

      <figcaption className="gh-stage__caption" data-testid="stage-caption">
        {isToday ? (
          <>
            <b>今天</b> · 体量示意：按材料记载的「削去约 50% 体量、拆除第 6 层、面向滨江斜向切削成台地」绘制。
          </>
        ) : (
          <>
            <b>前身（1995）</b> · 体量示意：按材料记载的「6 层钢筋混凝土厂房」「安浦路曾规划横切」绘制。
          </>
        )}
        <span className="gh-stage__disclaimer">
          非测绘图 · 无坐标 · 无比例 · 未做历史影像配准（本轮无权利清晰的现状照片与历史图纸）
        </span>
      </figcaption>
    </figure>
  );
}
