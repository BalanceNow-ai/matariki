import Link from "next/link";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crew Info",
  description:
    "Everything you need to know before joining Matariki III. Practical guidance for new and returning crew.",
};

type CrewInfoPage = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const crewInfoPages: CrewInfoPage[] = [
  {
    title: "Join Matariki III",
    description:
      "What kind of boat this is and what to expect when you come aboard.",
    href: "/crew-info/join-matariki-iii",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
        />
      </svg>
    ),
  },
  {
    title: "What to Bring",
    description:
      "A practical packing guide specific to Matariki, including what is already onboard.",
    href: "/crew-info/what-to-bring",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
  {
    title: "Safety on Matariki",
    description:
      "The key rules and basic emergency awareness every crew member should understand.",
    href: "/crew-info/safety-on-matariki",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    title: "Life Onboard",
    description:
      "What passagemaking life looks like in practice: watches, daily rhythm, and crew culture.",
    href: "/crew-info/life-onboard",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
];

export default function CrewInfoPage() {
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
                Joining Matariki III
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                If you are joining Matariki III, this is the best place to
                start. These pages are designed to help new and returning crew
                arrive prepared, understand how the boat operates, and know what
                to expect before stepping aboard.
              </p>
            </div>
          </div>
        </section>

        {/* Page Links */}
        <Section>
          <div className="grid md:grid-cols-2 gap-8">
            {crewInfoPages.map((page) => (
              <Link
                key={page.title}
                href={page.href}
                className="group relative bg-midnight-blue/50 border border-slate-water/30 rounded-lg p-8 hover:border-copper-accent/50 hover:bg-midnight-blue/70 transition-all duration-300"
              >
                <div className="text-copper-accent mb-4">{page.icon}</div>
                <h2 className="text-h3 text-salt-white mb-3 group-hover:text-copper-accent transition-colors">
                  {page.title}
                </h2>
                <p className="text-mist leading-relaxed">{page.description}</p>
                <div className="mt-6 flex items-center text-copper-accent text-sm font-medium">
                  <span>Read more</span>
                  <svg
                    className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* Download CTA */}
        <Section background="dark">
          <div className="max-w-3xl mx-auto text-center">
            <SectionLabel
              label="Before You Sail"
              className="justify-center mb-8"
            />
            <h2 className="text-h2 text-salt-white mb-6">Download Crew Brief</h2>
            <p className="text-mist leading-relaxed mb-8">
              If you are sailing with us, please download and read the Crew
              Brief before departure. It covers the essentials: what to bring,
              top safety rules, and what to expect onboard.
            </p>
            <Button
              href="/crew-info/crew-brief"
              variant="primary"
              size="lg"
            >
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
      </main>
      <Footer />
    </>
  );
}
