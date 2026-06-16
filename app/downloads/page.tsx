import { AppShell } from "@/components/AppShell";
import { DownloadTable } from "@/components/DownloadTable";
import { SectionHeader } from "@/components/SectionHeader";
import { downloads } from "@/data/mock";

export default function DownloadsPage() {
  return (
    <AppShell>
      <section className="content-section route-section">
        <SectionHeader
          eyebrow="Download Center"
          title="Printable Assets and Controlled Resources"
          copy="Printable companions, ledgers, assessments, and practitioner materials are organized by protocol and access level."
        />
        <DownloadTable assets={downloads} />
      </section>
    </AppShell>
  );
}
