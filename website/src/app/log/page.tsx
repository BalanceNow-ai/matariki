import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { PostCard } from "@/components/content";
import { logEntries } from "@/lib/data/mock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voyage Log",
  description: "Read the voyage log entries from Matariki III's adventures around New Zealand and the Pacific.",
};

export default function LogPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <Section>
          <div className="mb-12">
            <SectionLabel label="Voyage Log" className="mb-4" />
            <h1 className="text-h1 text-salt-white mb-4">All Entries</h1>
            <p className="text-mist max-w-2xl">
              Stories from the sea — sailing adventures, hunting expeditions, diving discoveries, and life aboard Matariki III.
            </p>
          </div>

          {/* Filter Bar Placeholder */}
          <div className="flex flex-wrap gap-4 mb-12 pb-8 border-b border-white/5">
            <select className="px-4 py-2 bg-midnight-blue/50 border border-mist/20 text-mist text-sm">
              <option>All Categories</option>
              <option>Sailing</option>
              <option>Hunting</option>
              <option>Diving</option>
              <option>Fishing</option>
            </select>
            <select className="px-4 py-2 bg-midnight-blue/50 border border-mist/20 text-mist text-sm">
              <option>All Voyages</option>
              <option>Fiordland 2026</option>
              <option>Bay of Islands 2025</option>
            </select>
          </div>

          {/* Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {logEntries.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
