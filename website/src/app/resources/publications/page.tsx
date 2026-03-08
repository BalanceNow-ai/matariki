import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publications & Downloads | Books, Guides & References",
  description:
    "Recommended books, downloadable guides, and reference documents for voyage preparation, safety procedures, and offshore sailing.",
};

type Publication = {
  title: string;
  author?: string;
  type: "book" | "guide" | "chart" | "reference";
  description: string;
  url?: string;
  essential: boolean;
};

type PublicationCategory = {
  id: string;
  title: string;
  description: string;
  publications: Publication[];
};

const publicationCategories: PublicationCategory[] = [
  {
    id: "books",
    title: "Essential Reading",
    description:
      "Books that should be on every bluewater sailor's shelf. These have shaped how we approach offshore sailing.",
    publications: [
      {
        title: "Heavy Weather Sailing",
        author: "Peter Bruce (ed.)",
        type: "book",
        description:
          "The definitive guide to handling yachts in heavy weather. Covers storm tactics, preparation, and real-world case studies. Now in its 8th edition.",
        essential: true,
      },
      {
        title: "The Complete Ocean Skipper",
        author: "Tom Cunliffe",
        type: "book",
        description:
          "Comprehensive guide to offshore sailing from one of the most respected voices in cruising. Covers passage planning, weather, crew management, and seamanship.",
        essential: true,
      },
      {
        title: "World Cruising Routes",
        author: "Jimmy Cornell",
        type: "book",
        description:
          "The essential reference for planning ocean passages. Covers routes, seasons, weather windows, and formalities for cruising grounds worldwide.",
        essential: true,
      },
      {
        title: "Sailing the Pacific",
        author: "Jimmy Cornell",
        type: "book",
        description:
          "Detailed coverage of cruising the Pacific, including New Zealand, Fiji, Tonga, and French Polynesia. Essential for Pacific voyaging.",
        essential: false,
      },
      {
        title: "Storm Tactics Handbook",
        author: "Lin & Larry Pardey",
        type: "book",
        description:
          "Practical guide to heaving-to and deploying series drogues. Based on decades of offshore experience in traditional cruising yachts.",
        essential: false,
      },
      {
        title: "Self Sufficient Sailor",
        author: "Lin & Larry Pardey",
        type: "book",
        description:
          "Philosophy and practice of independent cruising. Covers maintenance, provisioning, and the mindset needed for extended voyaging.",
        essential: false,
      },
    ],
  },
  {
    id: "nz-cruising",
    title: "New Zealand Cruising",
    description:
      "Essential references for cruising New Zealand waters.",
    publications: [
      {
        title: "New Zealand Cruising Guide",
        author: "Royal Akarana Yacht Club",
        type: "guide",
        description:
          "Comprehensive guide to anchorages and marinas throughout New Zealand. Updated regularly. Available in print and digital.",
        url: "https://www.nzcruisingguide.com",
        essential: true,
      },
      {
        title: "Fiordland Cruising Notes",
        author: "Various",
        type: "guide",
        description:
          "Local knowledge guides for Fiordland waters. Covers anchorages, hazards, and conditions specific to the fiords.",
        essential: false,
      },
      {
        title: "NZ Nautical Almanac",
        author: "Maritime NZ",
        type: "reference",
        description:
          "Official publication covering tides, lights, radio procedures, and regulations for New Zealand waters. Updated annually.",
        essential: true,
      },
      {
        title: "Admiralty Charts (NZ)",
        author: "LINZ",
        type: "chart",
        description:
          "Official charts for New Zealand waters. Available in paper and digital (ENC) formats. Essential for safe navigation.",
        url: "https://www.linz.govt.nz/sea/charts",
        essential: true,
      },
    ],
  },
  {
    id: "seamanship",
    title: "Seamanship & Skills",
    description:
      "References for developing practical sailing skills.",
    publications: [
      {
        title: "The Annapolis Book of Seamanship",
        author: "John Rousmaniere",
        type: "book",
        description:
          "Comprehensive reference covering all aspects of sailing from basics to advanced techniques. Well-illustrated and clearly written.",
        essential: false,
      },
      {
        title: "RYA Weather Handbook",
        author: "Chris Tibbs",
        type: "book",
        description:
          "Practical guide to marine weather forecasting for sailors. Covers synoptic charts, GRIB files, and passage planning.",
        essential: false,
      },
      {
        title: "Celestial Navigation",
        author: "Tom Cunliffe",
        type: "book",
        description:
          "Clear introduction to astronavigation. While GPS is primary, understanding celestial provides backup and deeper understanding.",
        essential: false,
      },
      {
        title: "Reeds Skipper's Handbook",
        author: "Malcolm Pearson",
        type: "reference",
        description:
          "Pocket reference covering knots, splicing, signals, navigation, and seamanship. Useful quick reference to keep aboard.",
        essential: false,
      },
    ],
  },
  {
    id: "safety",
    title: "Safety & Emergency",
    description:
      "References for safety procedures and emergency management.",
    publications: [
      {
        title: "ISAF Offshore Special Regulations",
        author: "World Sailing",
        type: "reference",
        description:
          "International standards for offshore racing safety equipment and procedures. Good baseline for cruising safety standards.",
        url: "https://www.sailing.org/inside-world-sailing/rules-regulations/regulations/special-regulations/",
        essential: false,
      },
      {
        title: "Get Home Safe",
        author: "Coastguard NZ",
        type: "guide",
        description:
          "Boating safety guidance from Coastguard New Zealand. Covers preparation, communications, and emergency procedures.",
        url: "https://www.coastguard.nz/boating-safely/",
        essential: false,
      },
      {
        title: "First Aid at Sea",
        author: "Douglas Justins & Colin Berry",
        type: "book",
        description:
          "Medical reference specifically for sailors. Covers diagnosis and treatment when professional help is days away.",
        essential: true,
      },
      {
        title: "Maritime Radio Handbook",
        author: "Various",
        type: "reference",
        description:
          "VHF and HF radio procedures, including distress calls, DSC, and routine communications. Know before you go.",
        essential: false,
      },
    ],
  },
];

export default function PublicationsPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Publications" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">
                Publications & Downloads
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                Recommended books, guides, and reference documents for voyage
                preparation and offshore sailing.
              </p>
            </div>
          </div>
        </section>

        {/* Introduction */}
        <Section>
          <div className="max-w-3xl">
            <p className="text-mist leading-relaxed mb-6">
              There's no substitute for reading. The books and guides below
              represent decades of accumulated wisdom from some of the most
              experienced offshore sailors. Many of these titles are aboard
              Matariki III and are referenced regularly.
            </p>
            <p className="text-mist leading-relaxed">
              Items marked as <span className="text-copper-accent">essential</span>{" "}
              are those we consider fundamental to safe and successful offshore
              sailing.
            </p>
          </div>
        </Section>

        {/* Publication Categories */}
        {publicationCategories.map((category, index) => (
          <Section
            key={category.id}
            background={index % 2 === 1 ? "dark" : undefined}
          >
            <SectionLabel
              number={(index + 1).toString().padStart(2, "0")}
              label={category.title}
              className="mb-4"
            />
            <p className="text-mist mb-8 max-w-3xl">{category.description}</p>

            <div className="grid gap-4 md:grid-cols-2">
              {category.publications.map((pub) => (
                <div
                  key={pub.title}
                  className="bg-midnight-blue/50 border border-slate-water/30 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-salt-white font-medium">
                        {pub.title}
                      </h3>
                      {pub.author && (
                        <p className="text-copper-accent text-sm">
                          {pub.author}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-slate-water/50 text-mist capitalize">
                        {pub.type}
                      </span>
                      {pub.essential && (
                        <span className="text-xs px-2 py-1 rounded bg-copper-accent/20 text-copper-accent">
                          Essential
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-mist text-sm leading-relaxed mb-3">
                    {pub.description}
                  </p>
                  {pub.url && (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-copper-accent text-sm hover:text-copper-accent/80"
                    >
                      View Resource →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        ))}

        {/* Downloads Section */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Downloads" className="mb-8" />
            <h2 className="text-h2 text-salt-white mb-6">
              Downloadable Resources
            </h2>
            <p className="text-mist leading-relaxed mb-8">
              We're working on creating downloadable checklists and guides
              specific to Matariki III. These will include pre-departure
              checklists, safety briefing notes, and passage planning templates.
            </p>
            <div className="bg-slate-water/20 border border-slate-water/30 rounded-lg p-6">
              <p className="text-mist text-sm">
                Check back soon for downloadable resources, or{" "}
                <a
                  href="/subscribe"
                  className="text-copper-accent hover:text-copper-accent/80"
                >
                  subscribe to our newsletter
                </a>{" "}
                to be notified when new materials are available.
              </p>
            </div>
          </div>
        </Section>

        {/* Navigation */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/resources">All Resources</Button>
            <Button href="/resources/weather" variant="ghost">
              Weather Resources
            </Button>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
