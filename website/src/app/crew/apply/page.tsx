import type { Metadata } from "next";
import { Header, Footer } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { ApplyWizard } from "@/components/crew/ApplyWizard";
import { openPassages } from "@/lib/crew/passages";
import type { Passage } from "@/lib/crew/types";

export const metadata: Metadata = {
  title: "Apply to crew",
  description: "Apply to crew aboard Matariki III.",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ passage?: string }> }) {
  const { passage } = await searchParams;
  let passages: Passage[] = [];
  try {
    passages = await openPassages();
  } catch (error) {
    console.error("Failed to fetch passages from Sanity:", error);
  }

  return (
    <>
      <Header />
      <main className="pt-20">
        <section className="py-16 md:py-24">
          <div className="container-site">
            <div className="max-w-2xl mx-auto">
              <SectionLabel label="Crew application" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-4">Apply to crew</h1>
              <p className="text-mist mb-12">
                Three short steps, then a ten-minute chat with our AI assistant. Your answers are saved in this browser tab
                as you go.
              </p>
              <ApplyWizard passages={passages} preselect={typeof passage === "string" ? passage : undefined} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
