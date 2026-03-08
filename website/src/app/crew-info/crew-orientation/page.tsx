import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crew Orientation | Pre-Reading for New Crew",
  description:
    "Top 10 online resources for first-time crew members preparing to join an Oyster 68 for an offshore passage.",
};

type Resource = {
  number: number;
  title: string;
  type: string;
  cost: string;
  bestFor: string;
  url?: string;
  description: string[];
};

const resources: Resource[] = [
  {
    number: 1,
    title: "NauticEd: Qualified Crew Member Online Course",
    type: "Online course",
    cost: "~USD 38",
    bestFor: "Structured theoretical foundation",
    url: "https://www.nauticed.org/sailing-courses/view/qualified-crew-member",
    description: [
      "This is the single best structured starting point for a complete beginner. NauticEd's Qualified Crew Member course is a comprehensive online programme that takes approximately seven hours to complete and costs around USD 37.50. It covers all the theoretical knowledge a new crew member needs before going to sea: sailing terminology, the parts of a yacht and her rig, rules of the road, weather and sea conditions, anchoring, communications, and how to handle emergencies. The course includes online tests and awards a formal endorsement on completion.",
      "What makes this course particularly valuable as pre-reading is its structure. Rather than a collection of articles, it is a coherent curriculum that builds knowledge progressively — exactly what a first-timer needs. It is rated 4.84 out of 5 by over 1,000 students. Completing this course before joining the boat means the skipper can spend less time on basic explanations and more time on the practical skills that can only be learned at sea.",
    ],
  },
  {
    number: 2,
    title: 'Cruising Club of America: "Advice to a First Time Offshore Sailor"',
    type: "Article",
    cost: "Free",
    bestFor: "Practical pre-departure advice",
    url: "https://cruisingclub.org/article/advice-first-time-offshore-sailor",
    description: [
      "Written by Andy Burton, a Boston Station member of the Cruising Club of America, this article is one of the most practical and honest pieces of advice available to anyone preparing for their first offshore passage. Burton wrote it specifically for a young crew member joining him for a Newport-to-Bermuda-to-Caribbean delivery aboard a 68-foot Farr-designed yacht — a context almost identical to joining an Oyster 68.",
      "The article covers what clothing to pack (foul-weather gear, layering, soft luggage), how to stay safe (harness use, MOB procedures, never peeing over the rail offshore), how to steer in waves, what watch-keeping really means, and the importance of calling the skipper at the first sign of doubt. It is written in a warm, direct style that makes it feel like advice from a trusted friend rather than a textbook. It should be read in full, more than once.",
    ],
  },
  {
    number: 3,
    title: '59° North Sailing: "What to Expect Offshore"',
    type: "Web guide",
    cost: "Free",
    bestFor: "Mindset and crew culture",
    url: "https://59-north.com/what-to-expect",
    description: [
      "59° North is run by professional offshore sailors Andy Schell and Mia Karlsson, who take paying crew on offshore passages aboard their Farr 65 Falken and Swan 48 Isbjørn. This page is the briefing they give to every crew member before departure, and it is outstanding.",
      "The guide covers the hierarchy of priorities at sea (boat first, then each other), the importance of waking the skipper at any sign of doubt, how to manage the temptation of technology and connectivity, and the philosophy of offshore sailing as one of the last genuinely disconnected experiences available to ordinary people. It also addresses practical questions about watch systems, what to learn on the passage, and how to be a good shipmate. The section on what traits make for good offshore crew is particularly worth reading: the answer, in short, is a positive attitude, curiosity, and the willingness to ask questions rather than make assumptions.",
    ],
  },
  {
    number: 4,
    title: 'Ocean Sailing Expeditions: "Crew Resources"',
    type: "Web guide",
    cost: "Free",
    bestFor: "Safety, seasickness, risk management",
    url: "https://oceansailingexpeditions.com/crew-resources",
    description: [
      'Another professional offshore sailing company\'s guide to their own crew, this resource is notable for its frank and detailed treatment of the physical and mental challenges of offshore sailing. It covers seasickness in practical detail — what to do, what not to do, and how to be proactive rather than reactive with medication. It addresses the importance of conservative decision-making offshore ("heroes and risk-takers" is a section worth reading carefully), the collective responsibility for safety, and the correct use of safety tethers.',
      "The guide makes clear that offshore sailing is fundamentally different from day sailing or coastal racing. The distances from help, the self-sufficiency required, and the need to protect the yacht and crew above all else are themes that run through the entire document. For a first-timer, understanding this mindset before arriving on the dock is genuinely valuable.",
    ],
  },
  {
    number: 5,
    title: 'Morgan\'s Cloud / Attainable Adventure Cruising: "36 Immutable Rules of Seamanship"',
    type: "Article",
    cost: "Free",
    bestFor: "Seamanship philosophy",
    url: "https://www.morganscloud.com/2014/02/04/john-phyllis-33-immutable-rules-of-seamanship",
    description: [
      "John Harries has sailed over 100,000 offshore miles and is one of the most respected voices in the bluewater cruising world. His website, Attainable Adventure Cruising (formerly Morgan's Cloud), is a subscription-based resource for serious offshore sailors, but this particular article — his 36 immutable rules of seamanship — is freely accessible and is essential reading.",
      "The rules range from the practical (always have a way to rest; tidy boat, happy boat) to the philosophical (seamanship cannot be fully defined, only practised). Reading this article will give a first-timer a sense of the mindset and culture of offshore sailing: the respect for the sea, the importance of preparation, and the understanding that good seamanship is a lifelong pursuit rather than a checklist. The comments section is also worth reading, as it contains thoughtful additions from experienced sailors around the world.",
    ],
  },
  {
    number: 6,
    title: 'Yachting World: "The Offshore Skills You Need to Be Bluewater Ready"',
    type: "Article",
    cost: "Free",
    bestFor: "Skill prioritisation",
    url: "https://www.yachtingworld.com/cruising/get-set-for-bluewater-131405",
    description: [
      "Yachting World is one of the oldest and most respected sailing publications in the world, and this article draws on advice from several professional offshore skippers and passage-making instructors. It provides a clear framework for what skills to prioritise before an offshore passage: weather forecasting and GRIB file interpretation, sail trim and reefing technique, man-overboard procedures, and the importance of being proactive rather than reactive at sea.",
      "The article is particularly useful because it helps a new crew member understand why certain skills matter, not just what they are. The emphasis on weather routing — understanding the big picture, anticipating changes, and adjusting the sail plan ahead of time rather than in a panic — is a theme that will resonate on any offshore passage.",
    ],
  },
  {
    number: 7,
    title: "RYA: Getting Started in Sailing",
    type: "Web portal",
    cost: "Free",
    bestFor: "Pathway and course options",
    url: "https://www.rya.org.uk/get-started",
    description: [
      "The Royal Yachting Association (RYA) is the national authority for sailing in the United Kingdom and one of the most trusted sources of sailing education in the world. Their Get Started section provides a clear overview of the pathway from complete beginner to competent crew, with links to course finders, what to wear, and how to find a local club for a taster session before the main voyage.",
      "For a new crew member who wants to supplement her reading with some practical experience before joining the boat, the RYA Competent Crew course (available at sailing schools worldwide) is the ideal preparation. Even if there is not time to complete the full course, reading the RYA's freely available guidance on crewing, safety, and what to wear offshore will provide a solid foundation.",
    ],
  },
  {
    number: 8,
    title: "Grenada Bluewater Sailing: Sailing Terminology Glossary",
    type: "Glossary",
    cost: "Free",
    bestFor: "Sailing terminology",
    url: "https://grenadabluewatersailing.com/sailing-terminology-glossary",
    description: [
      "One of the most disorienting aspects of joining a yacht for the first time is the language. Sailors use a precise and often archaic vocabulary that can make even simple instructions confusing for a newcomer. This glossary, compiled by an experienced bluewater sailing school based in the Caribbean, covers the most important terms clearly and concisely.",
      "A new crew member who has read this glossary will understand the difference between port and starboard, bow and stern, windward and leeward, tacking and gybing, and the names of the key lines and sails. This knowledge will allow her to respond correctly to instructions from the skipper without hesitation — which matters enormously when a sail change needs to happen quickly in deteriorating conditions.",
    ],
  },
  {
    number: 9,
    title: "Oyster Yachts: Official Website and YouTube Channel",
    type: "Website/video",
    cost: "Free",
    bestFor: "Familiarity with the specific yacht",
    url: "https://www.oysteryachts.com",
    description: [
      "There is no substitute for familiarity with the specific yacht. The Oyster Yachts website includes a heritage section covering the Oyster 68, with photographs of the interior and exterior layout, and a specification summary. Their YouTube channel features walkthroughs of various Oyster models, owner testimonials, and footage from the Oyster World Rally — a round-the-world rally for Oyster owners that demonstrates exactly the kind of sailing the boat is designed for.",
      "Watching a few of these videos will give a new crew member a sense of the scale of the yacht, the layout of the cockpit and deck, the quality of the interior, and the kind of passages that Oyster owners undertake. It will also help her understand why the Oyster 68 is regarded as one of the finest bluewater cruising yachts ever built.",
    ],
  },
  {
    number: 10,
    title: '"On the Wind" Podcast by 59° North',
    type: "Podcast",
    cost: "Free",
    bestFor: "Immersive culture and inspiration",
    description: [
      "For a new crew member who prefers to listen rather than read, On the Wind is the definitive podcast about offshore sailing. Hosted by Andy Schell and Mia Karlsson of 59° North, it features long-form interviews with sailors from all backgrounds — from solo circumnavigators to first-time offshore crew — discussing what motivates them, what scares them, and what they have learned at sea.",
      "Listening to a handful of episodes during the weeks before joining the boat will provide an immersive introduction to the culture, language, and mindset of offshore sailing. Particularly recommended are episodes featuring first-time offshore sailors describing their experiences, and episodes with experienced skippers discussing crew management and passage planning. The show reaches over 15,000 listeners per episode and has been running since 2013, so there is a rich back catalogue to explore.",
    ],
  },
];

export default function CrewOrientationPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="New Crew" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">
                Pre-Reading for New Crew
              </h1>
              <p className="text-copper-accent text-lg font-medium mb-4">
                Top 10 Online Resources for Joining an Oyster 68
              </p>
              <p className="text-mist leading-relaxed">
                Prepared for a first-time crew member preparing for an offshore
                passage on a large bluewater cruising yacht.
              </p>
            </div>
          </div>
        </section>

        {/* Introduction */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel number="00" label="Introduction" className="mb-8" />
            <div className="prose prose-invert max-w-none">
              <p className="text-mist leading-relaxed mb-6">
                The Oyster 68 is a serious offshore cruising yacht. At 67.5 feet
                (20.57 m) and over 38 tonnes of displacement, she is a large,
                heavy, and capable vessel designed by Holman & Pye and built by
                Oyster Marine to cross oceans in comfort. Her cutter rig — with
                a main, an inner staysail, and an outer genoa or yankee — gives
                her great versatility in all conditions. With a comfort ratio of
                51.64 (well above the 30–40 range typical of coastal cruisers),
                she is built to handle the Southern Ocean, the North Atlantic,
                and everything in between.
              </p>
              <p className="text-mist leading-relaxed">
                For a first-time crew member, the experience of stepping aboard
                a yacht of this size and heading offshore can be both thrilling
                and daunting. The resources below have been selected to give a
                solid foundation of knowledge before setting foot on the dock.
                They are all freely available online (except one modest course
                fee), cover the right level of depth for a complete beginner,
                and are directly relevant to life on a large cruising yacht.
              </p>
            </div>
          </div>
        </Section>

        {/* Resources */}
        {resources.map((resource) => (
          <Section
            key={resource.number}
            background={resource.number % 2 === 0 ? "dark" : undefined}
          >
            <div className="max-w-3xl">
              <SectionLabel
                number={resource.number.toString().padStart(2, "0")}
                label={resource.title}
                className="mb-6"
              />

              <div className="flex flex-wrap gap-3 mb-6">
                <span className="px-3 py-1 bg-slate-water/50 text-mist text-sm rounded">
                  {resource.type}
                </span>
                <span className="px-3 py-1 bg-slate-water/50 text-mist text-sm rounded">
                  {resource.cost}
                </span>
                <span className="px-3 py-1 bg-copper-accent/20 text-copper-accent text-sm rounded">
                  {resource.bestFor}
                </span>
              </div>

              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-copper-accent hover:text-copper-accent/80 text-sm mb-6 break-all"
                >
                  {resource.url}
                </a>
              )}

              <div className="space-y-4">
                {resource.description.map((paragraph, index) => (
                  <p key={index} className="text-mist leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </Section>
        ))}

        {/* Summary Table */}
        <Section background="dark">
          <div className="max-w-4xl">
            <SectionLabel label="Summary" className="mb-8" />
            <h2 className="text-h2 text-salt-white mb-8">Quick Reference</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-water">
                    <th className="py-4 pr-4 text-copper-accent font-medium">
                      #
                    </th>
                    <th className="py-4 pr-4 text-copper-accent font-medium">
                      Resource
                    </th>
                    <th className="py-4 pr-4 text-copper-accent font-medium hidden sm:table-cell">
                      Type
                    </th>
                    <th className="py-4 pr-4 text-copper-accent font-medium hidden md:table-cell">
                      Cost
                    </th>
                    <th className="py-4 text-copper-accent font-medium hidden lg:table-cell">
                      Best For
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr
                      key={resource.number}
                      className="border-b border-slate-water/50"
                    >
                      <td className="py-4 pr-4 text-mist">{resource.number}</td>
                      <td className="py-4 pr-4 text-salt-white">
                        {resource.title}
                      </td>
                      <td className="py-4 pr-4 text-mist hidden sm:table-cell">
                        {resource.type}
                      </td>
                      <td className="py-4 pr-4 text-mist hidden md:table-cell">
                        {resource.cost}
                      </td>
                      <td className="py-4 text-mist hidden lg:table-cell">
                        {resource.bestFor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* About the Oyster 68 */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel label="The Yacht" className="mb-8" />
            <h2 className="text-h2 text-salt-white mb-6">
              A Note on the Oyster 68
            </h2>
            <p className="text-mist leading-relaxed mb-6">
              The Oyster 68 is a 67.5-foot, 38-tonne cutter-rigged bluewater
              cruising yacht with a comfort ratio of 51.64 — one of the highest
              in her class. She carries 1,314 litres of fresh water and is
              designed for extended offshore passages. Her deep fin keel and
              skeg-hung rudder make her predictable and forgiving to sail, and
              her large, well-protected cockpit means that most sail handling
              can be done safely without going forward in bad conditions.
            </p>
            <p className="text-mist leading-relaxed mb-8">
              She is, in short, an exceptional platform for a first offshore
              experience — and the resources above will ensure that her new crew
              member arrives prepared, enthusiastic, and ready to contribute.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button href="/yacht">View Yacht Specifications</Button>
              <Button href="/crew-info" variant="ghost">
                Back to Crew Info
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
