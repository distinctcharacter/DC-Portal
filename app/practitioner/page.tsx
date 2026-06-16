import { AppShell } from "@/components/AppShell";
import { PractitionerWorkspace } from "@/components/PractitionerWorkspace";
import { type Role } from "@/data/mock";

export default function PractitionerPage({
  searchParams
}: {
  searchParams: { access?: string };
}) {
  const role: Role = "client";

  return (
    <AppShell sessionRole={role}>
      <PractitionerWorkspace role={role} />
    </AppShell>
  );
}
