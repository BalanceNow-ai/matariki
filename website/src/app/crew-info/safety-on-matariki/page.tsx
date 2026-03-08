import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety on Matariki | Crew Info",
  description:
    "Safety expectations, core rules, and emergency awareness for crew joining Matariki III.",
};

export default function SafetyPage() {
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
                Safety on Matariki III
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                Safety on Matariki is practical, clear and taken seriously.
                Every crew member is expected to play their part, look after one
                another, and ask when unsure.
              </p>
            </div>
          </div>
        </section>

        {/* Introduction */}
        <Section>
          <div className="max-w-3xl">
            <p className="text-mist leading-relaxed text-lg">
              Before departure, crew are briefed on the key safety equipment
              carried onboard and the basic procedures used at sea. New crew are
              not expected to know everything already, but they are expected to
              take safety seriously and listen well.
            </p>
          </div>
        </Section>

        {/* Core Safety Rules */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Rules" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">Core Safety Rules</h2>
            <p className="text-mist leading-relaxed mb-8">
              A few rules matter all the time.
            </p>
            <div className="space-y-4">
              {[
                "No one goes onto the foredeck alone",
                "No one uses the duckboard for ablutions without two people on deck and a harness on",
                "PFD and harness rules must be followed",
                "Soft sea shoes or sea boots only",
                "Watch the boom, power winches and running rigging",
                "If in doubt, ask",
              ].map((rule) => (
                <div
                  key={rule}
                  className="flex items-start gap-4 p-4 bg-midnight-blue border border-slate-water/30 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-copper-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3.5 h-3.5 text-copper-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-salt-white">{rule}</p>
                </div>
              ))}
            </div>
            <p className="text-mist leading-relaxed mt-8 text-sm">
              Crew should also wait until they have been shown how to use key
              systems such as the stove and the heads.
            </p>
          </div>
        </Section>

        {/* Lifejackets and Harnesses */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel label="Equipment" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">
              Lifejackets and Harnesses
            </h2>
            <p className="text-mist leading-relaxed mb-6">
              Matariki carries the essential offshore safety equipment onboard,
              including PFDs, tethers, jacklines, liferaft, grab bag, EPIRB,
              PLBs, rescue gear, flares, medical kit and emergency steering.
            </p>
            <p className="text-mist leading-relaxed">
              Before departure, each crew member is briefed on the location and
              use of this equipment. The principle is simple: safety gear is
              there to be used early, not late.
            </p>
          </div>
        </Section>

        {/* Emergency Procedures */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Emergencies" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">
              Emergency Procedures
            </h2>
            <p className="text-mist leading-relaxed mb-8">
              Full briefings, equipment locations and drills are covered onboard
              before departure. What follows is the awareness-level version
              every crew member should understand before joining the boat.
            </p>

            {/* MOB */}
            <div className="mb-8">
              <h3 className="text-h3 text-salt-white mb-4">Man Overboard</h3>
              <p className="text-mist leading-relaxed">
                If someone goes overboard, raise the alarm immediately. Shout
                &ldquo;Man Overboard&rdquo;, hit the MOB button on the GPS, keep
                pointing at the person in the water, throw the lifebuoy and Dan
                buoy, and get help on deck at once. Recovery is directed by the
                skipper.
              </p>
            </div>

            {/* Fire */}
            <div className="mb-8">
              <h3 className="text-h3 text-salt-white mb-4">Fire</h3>
              <p className="text-mist leading-relaxed">
                If there is a fire, shout &ldquo;Fire&rdquo; and state the
                location clearly. Use the nearest suitable extinguisher or fire
                blanket if it is safe to do so. If the fire cannot be
                controlled, the response escalates under the skipper&apos;s
                direction.
              </p>
            </div>

            {/* Flooding */}
            <div className="mb-8">
              <h3 className="text-h3 text-salt-white mb-4">
                Flooding or Hull Damage
              </h3>
              <p className="text-mist leading-relaxed">
                If the boat is taking on water, stay calm and work methodically.
                Alert the skipper immediately, get crew ready, and prepare to
                assist with pumps, damage control, or further emergency
                procedures as directed.
              </p>
            </div>

            {/* Medical */}
            <div className="mb-8">
              <h3 className="text-h3 text-salt-white mb-4">Medical Emergency</h3>
              <p className="text-mist leading-relaxed">
                In a medical emergency, alert the skipper immediately and begin
                first aid.
              </p>
            </div>

            {/* Abandon Ship */}
            <div>
              <h3 className="text-h3 text-salt-white mb-4">Abandon Ship</h3>
              <p className="text-mist leading-relaxed">
                Abandoning ship is a last resort and only on the skipper&apos;s
                instruction. Crew should understand that the liferaft, grab bag,
                EPIRB and distress procedures are part of the boat&apos;s
                emergency systems, and that full abandon-ship briefings are
                covered onboard.
              </p>
            </div>
          </div>
        </Section>

        {/* When to Call the Skipper */}
        <Section>
          <div className="max-w-3xl">
            <div className="p-6 bg-midnight-blue border border-copper-accent/30 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-copper-accent/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-copper-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-h3 text-salt-white">
                  When to Call the Skipper
                </h2>
              </div>
              <p className="text-mist leading-relaxed mb-4">
                Call the skipper immediately if there is:
              </p>
              <ul className="space-y-2">
                {[
                  "Any collision risk",
                  "Landfall within five nautical miles",
                  "A need to reef",
                  "A major change in wind or sea state",
                  "Any fire, flooding, MOB, collision, injury, or other emergency",
                  "Any failure of navigation, safety, steering, communications, or other major onboard systems",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-mist leading-relaxed"
                  >
                    <span className="text-copper-accent mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Final Note */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Seamanship" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">Final Note</h2>
            <p className="text-mist leading-relaxed text-lg">
              Good seamanship starts with awareness, discipline and clear
              communication. The safest crews are the ones who speak up early,
              look after each other, and never guess when they are unsure.
            </p>
          </div>
        </Section>

        {/* Navigation */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/crew-info/life-onboard">Life Onboard</Button>
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
