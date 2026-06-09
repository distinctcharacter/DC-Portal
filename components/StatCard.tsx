export function StatCard({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "gold" | "blue" | "green";
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
