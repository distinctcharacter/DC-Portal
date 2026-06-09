import { AppShell } from "@/components/AppShell";
import { PractitionerWorkspace } from "@/components/PractitionerWorkspace";
import { type Role } from "@/data/mock";

function resolvePreviewRole(access?: string): Role {
  if (access === "practitioner") return "practitioner";
  if (access === "admin") return "admin";
  if (access === "license_holder") return "license_holder";
  return "client";
}

export default function PractitionerPage({
  searchParams
}: {
  searchParams: { access?: string };
}) {
  const role = resolvePreviewRole(searchParams.access);

  return (
    <AppShell sessionRole={role}>
      <PractitionerWorkspace role={role} />
    </AppShell>
  );
}
