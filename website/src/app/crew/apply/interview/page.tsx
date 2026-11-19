import type { Metadata } from "next";
import { Header, Footer } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { InterviewChat } from "@/components/crew/InterviewChat";

export const metadata: Metadata = {
  title: "Crew interview",
  robots: { index: false },
};

export default function InterviewPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <section className="py-16 md:py-24">
          <div className="container-site">
            <div className="max-w-2xl mx-auto">
              <SectionLabel label="Crew application · step 4" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-8">A quick chat</h1>
              <InterviewChat />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
