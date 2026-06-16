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
          title="Printable Assets and Resource Files"
          copy="Printable companions, ledgers, assessments, and reference materials are organized by protocol."
        />
        <DownloadTable assets={downloads} />
      </section>
    </AppShell>
  );
}
