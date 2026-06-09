export function SectionHeader({
  eyebrow,
  title,
  copy
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="section-header">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {copy ? <p>{copy}</p> : null}
    </div>
  );
}
