import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { NewsletterForm } from "@/components/forms";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Subscribe to receive updates from Matariki III's voyages around New Zealand and the Pacific.",
};

export default function SubscribePage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <Section className="min-h-[calc(100vh-5rem)] flex items-center">
          <div className="max-w-2xl mx-auto text-center">
            <SectionLabel label="Newsletter" className="justify-center mb-8" />
            <h1 className="text-h1 text-salt-white mb-6">
              Stay Connected
            </h1>
            <p className="text-mist leading-relaxed mb-4">
              Join our mailing list to receive updates from aboard Matariki III.
              We'll send you new log entries, photography highlights, and
              voyage announcements — typically once or twice a month.
            </p>
            <p className="text-sm text-storm-grey mb-8">
              No spam, unsubscribe anytime.
            </p>

            <div className="max-w-md mx-auto mb-12">
              <NewsletterForm />
            </div>

            {/* What You'll Receive */}
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="card p-6 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-copper-accent/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-copper-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="text-salt-white font-medium mb-2">Log Entries</h3>
                <p className="text-sm text-mist">
                  Stories from the sea — sailing, hunting, diving, and life aboard.
                </p>
              </div>
              <div className="card p-6 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-copper-accent/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-copper-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-salt-white font-medium mb-2">Photography</h3>
                <p className="text-sm text-mist">
                  Curated photos from our voyages — landscapes, wildlife, and moments at sea.
                </p>
              </div>
              <div className="card p-6 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-copper-accent/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-copper-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-salt-white font-medium mb-2">Voyage Updates</h3>
                <p className="text-sm text-mist">
                  Where we're headed next and highlights from current expeditions.
                </p>
              </div>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
