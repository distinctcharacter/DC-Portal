import { mockUser, type Resource, type Role } from "@/data/mock";
import { canViewPractitionerLayer } from "@/lib/access";
import { ProtectedResourceButton } from "@/components/ProtectedResourceButton";

export function ResourceCard({
  resource,
  role = mockUser.role
}: {
  resource: Resource;
  role?: Role;
}) {
  const isPractitionerOnly = resource.access === "Practitioner";
  const isLocked = isPractitionerOnly && !canViewPractitionerLayer(role);

  return (
    <article className={`resource-card ${isLocked ? "is-locked" : ""}`}>
      <div className="card-topline">
        <span className="protocol-id">{resource.id}</span>
        <span className={`resource-access ${isLocked ? "locked" : resource.access.toLowerCase()}`}>
          {isLocked ? "Locked" : resource.access}
        </span>
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.description}</p>
      {isLocked && <p className="locked-copy">Requires practitioner access.</p>}
      <dl>
        <div>
          <dt>Category</dt>
          <dd>{resource.category}</dd>
        </div>
        <div>
          <dt>Audience</dt>
          <dd>{resource.audience}</dd>
        </div>
      </dl>
      {resource.href && !isLocked ? (
        <ProtectedResourceButton
          className="button secondary card-action"
          href={resource.href}
          label="Open Resource"
        />
      ) : (
        <button className="button secondary card-action" type="button" disabled>
          Access Locked
        </button>
      )}
    </article>
  );
}
