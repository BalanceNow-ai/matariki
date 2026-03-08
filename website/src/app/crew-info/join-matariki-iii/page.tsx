import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Matariki III",
  description:
    "What to expect when joining Matariki III. An Oyster 68 set up for serious cruising with a strong culture of safety, teamwork and respect.",
};

export default function JoinMatarikePage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Crew Info" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">Join Matariki III</h1>
              <p className="text-mist leading-relaxed text-lg">
                Matariki III is an Oyster 68 set up for serious cruising and
                passagemaking. She is a capable offshore yacht, but she is also
                a family boat with a strong culture of safety, teamwork and
                looking after one another.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <Section>
          <div className="max-w-3xl">
            <p className="text-mist leading-relaxed text-lg mb-8">
              You do not need to arrive as an expert sailor. You do need to
              arrive with the right attitude: listen carefully, ask when unsure,
              help out where you can, and treat the boat with respect.
            </p>
            <p className="text-mist leading-relaxed text-lg">
              Life onboard works best when everyone pitches in. On Matariki,
              there are no passengers in the offshore sense — everyone is part
              of the crew.
            </p>
          </div>
        </Section>

        {/* Before You Arrive */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Preparation" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">Before You Arrive</h2>
            <div className="space-y-6">
              <p className="text-mist leading-relaxed">
                Before joining the boat, please let us know about any relevant
                medical conditions, injuries, allergies, or medications we
                should be aware of.
              </p>
              <p className="text-mist leading-relaxed">
                Bring practical clothing, good sun protection, and flat
                non-marking footwear. Leave jewellery at home if possible,
                especially anything that can catch on ropes, winches, hatches,
                or fittings.
              </p>
              <p className="text-mist leading-relaxed">
                If this is your first offshore trip, that is absolutely fine.
                The most important thing is to arrive prepared, rested, open to
                learning, and ready to work as part of the team.
              </p>
            </div>
          </div>
        </Section>

        {/* When You Come Aboard */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel label="Onboarding" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">
              When You Come Aboard
            </h2>
            <div className="space-y-6">
              <p className="text-mist leading-relaxed">
                When you arrive, you will be shown through the boat and briefed
                on the things that matter most: where your gear goes, how to
                move around the boat safely, how the heads work, where key
                safety equipment is kept, and what is expected of you underway.
              </p>
              <p className="text-mist leading-relaxed">
                You will also be briefed on the safety systems carried onboard
                and the basic procedures used on Matariki.
              </p>
            </div>
          </div>
        </Section>

        {/* What We Value */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Culture" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">
              What We Value Onboard
            </h2>
            <p className="text-mist leading-relaxed">
              We value good judgement, calm communication, tidy habits, and a
              willingness to help. Offshore sailing is a team activity, and the
              best crews are the ones who communicate clearly, look after each
              other, and ask questions early.
            </p>
          </div>
        </Section>

        {/* Next Steps */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel label="Next Steps" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">Before You Go Further</h2>
            <p className="text-mist leading-relaxed mb-8">
              If you are joining Matariki, the most useful next steps are:
            </p>
            <div className="space-y-4 mb-10">
              <div className="flex items-start gap-4 p-4 bg-midnight-blue/50 border border-slate-water/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-copper-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-copper-accent font-medium">1</span>
                </div>
                <div>
                  <h3 className="text-salt-white font-medium mb-1">
                    Read What to Bring
                  </h3>
                  <p className="text-mist text-sm">
                    A practical packing guide specific to Matariki.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-midnight-blue/50 border border-slate-water/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-copper-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-copper-accent font-medium">2</span>
                </div>
                <div>
                  <h3 className="text-salt-white font-medium mb-1">
                    Read Safety on Matariki
                  </h3>
                  <p className="text-mist text-sm">
                    The key rules and emergency awareness every crew member
                    should understand.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-midnight-blue/50 border border-slate-water/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-copper-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-copper-accent font-medium">3</span>
                </div>
                <div>
                  <h3 className="text-salt-white font-medium mb-1">
                    Download the Crew Brief
                  </h3>
                  <p className="text-mist text-sm">
                    A short PDF summary to read before departure.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button href="/crew-info/what-to-bring">What to Bring</Button>
              <Button href="/crew-info/safety-on-matariki" variant="ghost">
                Safety on Matariki
              </Button>
              <Button href="/crew-info/crew-brief" variant="ghost">
                View Crew Brief
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
