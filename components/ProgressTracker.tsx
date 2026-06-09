import { sbpSections } from "@/data/mock";

export function ProgressTracker() {
  return (
    <aside className="progress-tracker" aria-label="Protocol progress">
      <span className="eyebrow">Current Sequence</span>
      <h3>Somatic Baseline</h3>
      <ol>
        {sbpSections.map((section) => (
          <li className={section.status} key={section.id}>
            <span className="step-dot" />
            <div>
              <strong>{section.title}</strong>
              <small>{section.status.replace("_", " ")}</small>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
