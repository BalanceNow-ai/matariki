import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import { listedPassages } from "@/lib/crew/passages";
import { crewPage, privacyContact } from "@/lib/crew/pageContent";
import type { Passage } from "@/lib/crew/types";

export const metadata: Metadata = {
  title: "Crew",
  description: "Sail as crew aboard Matariki III, an Oyster 68. Upcoming passages and how to apply.",
};

// Passages are CMS-driven; always render with fresh data.
export const dynamic = "force-dynamic";

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "TBC";

function PassageCard({ passage }: { passage: Passage }) {
  const full = passage.status === "full";
  return (
    <div className="card rounded-lg p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption text-copper-accent">{passage.type}</span>
        <span className={`text-caption ${full ? "text-warning-red" : "text-sea-green"}`}>
          {full ? "Full" : "Open"}
        </span>
      </div>
      <h3 className="text-h3 text-salt-white mb-2">{passage.title}</h3>
      {passage.route && <p className="text-mist mb-2">{passage.route}</p>}
      <p className="text-sm text-mist mb-4">
        {fmt(passage.startDate)} – {fmt(passage.endDate)}
        {typeof passage.nights === "number" && ` · ${passage.nights} nights`}
        {typeof passage.crewPlaces === "number" && ` · ${passage.crewPlaces} crew places`}
      </p>
      {passage.minExperience && (
        <p className="text-sm text-mist mb-6">
          <span className="text-salt-white">Minimum experience: </span>
          {passage.minExperience}
        </p>
      )}
      <div className="mt-auto">
        {full ? (
          <span className="text-sm text-storm-grey">This leg is full.</span>
        ) : (
          <Button href={`/crew/apply?passage=${encodeURIComponent(passage._id)}`} size="sm">
            Apply for this leg
          </Button>
        )}
      </div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-mist leading-relaxed">
          <span className="text-copper-accent mt-1">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function CrewPage() {
  const contact = privacyContact();
  let passages: Passage[] = [];
  try {
    passages = await listedPassages();
  } catch (error) {
    console.error("Failed to fetch passages from Sanity:", error);
  }

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Crew" className="mb-4" />
              {/* GREG: write this */}
              <h1 className="text-display text-salt-white mb-6">{crewPage.hero.title}</h1>
              <p className="text-mist leading-relaxed text-lg mb-8">{crewPage.hero.lede}</p>
              <div className="flex flex-wrap gap-4">
                <Button href="/crew/apply">Apply to crew</Button>
                <Button href="#passages" variant="ghost">
                  Upcoming passages
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Life aboard */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel number="01" label="Life aboard" className="mb-6" withLine />
            <h2 className="text-h2 text-salt-white mb-6">Life aboard</h2>
            {/* GREG: write this */}
            <p className="text-mist leading-relaxed text-lg">{crewPage.lifeAboard}</p>
          </div>
        </Section>

        {/* Passages */}
        <Section background="dark" id="passages">
          <SectionLabel number="02" label="Upcoming passages" className="mb-6" withLine />
          <h2 className="text-h2 text-salt-white mb-10">Upcoming passages</h2>
          {passages.length ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {passages.map((p) => (
                <PassageCard key={p._id} passage={p} />
              ))}
            </div>
          ) : (
            <p className="text-mist">No passages are open right now. Check back soon.</p>
          )}
        </Section>

        {/* The deal */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel number="03" label="The deal" className="mb-6" withLine />
            <h2 className="text-h2 text-salt-white mb-6">The deal</h2>
            {/* GREG: write this */}
            <List items={crewPage.theDeal} />
          </div>
        </Section>

        {/* Who we're looking for */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel number="04" label="Who we're looking for" className="mb-6" withLine />
            <h2 className="text-h2 text-salt-white mb-6">Who we&apos;re looking for</h2>
            {/* GREG: write this */}
            <List items={crewPage.lookingFor} />
          </div>
        </Section>

        {/* House rules */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel number="05" label="House rules" className="mb-6" withLine />
            <h2 className="text-h2 text-salt-white mb-6">House rules</h2>
            {/* GREG: write this — includes the ship's cat and allergies */}
            <List items={crewPage.houseRules} />
          </div>
        </Section>

        {/* How selection works */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel number="06" label="How selection works" className="mb-6" withLine />
            <h2 className="text-h2 text-salt-white mb-8">How selection works</h2>
            <ol className="space-y-4">
              {crewPage.selectionSteps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex items-start gap-4 p-4 bg-midnight-blue/50 border border-slate-water/30 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-copper-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-copper-accent font-medium">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-salt-white font-medium mb-1">{step.title}</h3>
                    <p className="text-mist text-sm">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        {/* FAQ */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel number="07" label="FAQ" className="mb-6" withLine />
            <h2 className="text-h2 text-salt-white mb-6">Questions</h2>
            {/* GREG: write this */}
            <div className="space-y-4">
              {crewPage.faq.map((item) => (
                <details key={item.q} className="group border border-mist/10 rounded-lg p-4">
                  <summary className="cursor-pointer text-salt-white font-medium">{item.q}</summary>
                  <p className="text-mist mt-3 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* Privacy */}
        <Section background="dark" id="privacy">
          <div className="max-w-3xl">
            <SectionLabel number="08" label="Privacy" className="mb-6" withLine />
            <h2 className="text-h2 text-salt-white mb-6">Your information</h2>
            {/* GREG: write this — check against the site privacy policy */}
            <p className="text-mist leading-relaxed mb-4">{crewPage.privacy}</p>
            <p className="text-mist leading-relaxed mb-8">
              To see or delete what we hold about you, contact{" "}
              {contact.href ? (
                <a href={contact.href} className="text-copper-accent hover:underline">
                  {contact.text}
                </a>
              ) : (
                contact.text
              )}
              .
            </p>
            <p className="text-mist text-sm">
              See also our <Link href="/privacy" className="text-copper-accent hover:underline">privacy policy</Link>.
            </p>
            <div className="mt-10">
              <Button href="/crew/apply">Apply to crew</Button>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
