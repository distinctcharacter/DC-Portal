export function SubstackSubscribeCard() {
  return (
    <section className="substack-card" aria-label="Distinct Character Substack subscription">
      <div>
        <span className="eyebrow">Distinct Character Notes</span>
        <h2>Stay connected to the ecosystem.</h2>
        <p>
          Subscribe for essays, protocol updates, and applied reflections from Distinct Character.
        </p>
      </div>
      <div className="substack-embed">
        <iframe
          title="Subscribe to Distinct Character on Substack"
          src="https://distinctcharacter.substack.com/embed"
          width="480"
          height="320"
          frameBorder="0"
          scrolling="no"
        />
      </div>
    </section>
  );
}
