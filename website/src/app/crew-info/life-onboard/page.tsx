import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Life Onboard | Crew Info",
  description:
    "What passagemaking life looks like on Matariki III: watches, daily rhythm, and crew culture.",
};

export default function LifeOnboardPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Crew Info" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">
                Life Onboard Matariki III
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                Life onboard is collaborative. Everyone helps.
              </p>
            </div>
          </div>
        </section>

        {/* Introduction */}
        <Section>
          <div className="max-w-3xl">
            <p className="text-mist leading-relaxed text-lg mb-6">
              That might mean helming, trimming sails, keeping lookout, washing
              dishes, helping tidy the saloon, checking gear, or making a cup of
              tea for the next watch.
            </p>
            <p className="text-mist leading-relaxed text-lg">
              On Matariki, there are no guests in the offshore sense — only
              crew.
            </p>
          </div>
        </Section>

        {/* Watchkeeping */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Watches" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">Watchkeeping</h2>
            <div className="space-y-6">
              <p className="text-mist leading-relaxed">
                When underway, a formal watchkeeping routine is used. Incoming
                watchkeepers are briefed properly, and watch handovers matter.
                Position, course, weather, traffic, sail plan, hazards,
                autopilot status, and anything unusual should be communicated
                clearly.
              </p>
              <p className="text-mist leading-relaxed">
                Keeping watch means more than simply being awake. It means
                maintaining a proper lookout, monitoring the boat and her
                systems, and paying attention to what is changing.
              </p>
            </div>
          </div>
        </Section>

        {/* Daily Life */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel label="Rhythm" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">Daily Life</h2>
            <div className="space-y-6">
              <p className="text-mist leading-relaxed">
                Passage life is a rhythm of watches, meals, checks, rest, and
                helping out where needed. Everyone shares responsibility for
                keeping the boat safe, tidy and working well.
              </p>
              <p className="text-mist leading-relaxed">
                That includes simple things like stowing gear properly, keeping
                wet clothing where it belongs, treating fresh water carefully,
                and leaving shared spaces ready for the next person.
              </p>
            </div>
          </div>
        </Section>

        {/* Culture */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Culture" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">The Culture Onboard</h2>
            <div className="space-y-6">
              <p className="text-mist leading-relaxed">
                The best passage crews are calm, tidy, helpful and
                communicative. Offshore sailing rewards people who speak
                clearly, ask early, and stay engaged with what is happening
                around them.
              </p>
              <p className="text-mist leading-relaxed">
                You do not need to know everything in advance. You do need to be
                willing to learn, willing to help, and willing to take care of
                the boat and the people onboard.
              </p>
            </div>
          </div>
        </Section>

        {/* What to Expect */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel label="Expectations" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">
              What New Crew Should Expect
            </h2>
            <div className="space-y-6">
              <p className="text-mist leading-relaxed">
                If this is your first offshore passage, expect a learning curve.
                Expect to be shown how things work. Expect to get salty, tired,
                and occasionally uncomfortable.
              </p>
              <p className="text-mist leading-relaxed">
                Also expect moments of real satisfaction, teamwork, beauty, and
                fun.
              </p>
              <p className="text-copper-accent leading-relaxed font-medium">
                That is part of what makes passagemaking special.
              </p>
            </div>
          </div>
        </Section>

        {/* Download CTA */}
        <Section background="dark">
          <div className="max-w-3xl mx-auto text-center">
            <SectionLabel
              label="Before You Sail"
              className="justify-center mb-6"
            />
            <h2 className="text-h2 text-salt-white mb-6">Ready to Join?</h2>
            <p className="text-mist leading-relaxed mb-8">
              If you have read through the Crew Info pages and are ready to
              sail, download the Crew Brief for a quick reference to take with
              you.
            </p>
            <Button href="/crew-info/crew-brief" variant="primary" size="lg">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View &amp; Download Crew Brief
            </Button>
          </div>
        </Section>

        {/* Navigation */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/crew-info/join-matariki-iii">Join Matariki III</Button>
            <Button href="/crew-info/what-to-bring" variant="ghost">
              What to Bring
            </Button>
            <Button href="/crew-info" variant="ghost">
              All Crew Info
            </Button>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
