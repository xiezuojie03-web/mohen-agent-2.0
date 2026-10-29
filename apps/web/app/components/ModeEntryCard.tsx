import Link from "next/link";

export type ModeVariant = "studio" | "watch" | "exp" | "admin";

export default function ModeEntryCard({
  href,
  badge,
  variant,
  title,
  desc,
}: {
  href: string;
  badge: string;
  variant: ModeVariant;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className={`mo-mode-card mo-mode-card--${variant}`}>
      <span className="mo-mode-card__badge">{badge}</span>
      <h3 className="mo-mode-card__title">{title}</h3>
      <p className="mo-mode-card__desc">{desc}</p>
    </Link>
  );
}
