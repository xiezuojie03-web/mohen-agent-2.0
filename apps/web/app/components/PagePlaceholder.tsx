export default function PagePlaceholder({
  eyebrow,
  title,
  desc,
  note,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  note: string;
}) {
  return (
    <main className="mo-placeholder">
      <p className="mo-placeholder__eyebrow">{eyebrow}</p>
      <h1 className="mo-placeholder__title">{title}</h1>
      <p className="mo-placeholder__desc">{desc}</p>
      <span className="mo-placeholder__note">{note}</span>
    </main>
  );
}
