import Link from "next/link";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Guides, references, and recommended resources for sailing, offshore passages, and life aboard an Oyster 68.",
};

type ResourceCategory = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status: "available" | "coming-soon";
};

const resourceCategories: ResourceCategory[] = [
  {
    title: "New Crew Orientation",
    description:
      "Essential pre-reading for first-time crew members preparing to join an Oyster 68 for an offshore passage. Curated online courses, articles, and guides.",
    href: "/resources/crew-orientation",
    status: "available",
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
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  {
    title: "Weather Resources",
    description:
      "Weather forecasting tools, GRIB file sources, and meteorological resources for passage planning in New Zealand and Pacific waters.",
    href: "/resources/weather",
    status: "available",
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
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        />
      </svg>
    ),
  },
  {
    title: "Recommended Gear",
    description:
      "Equipment recommendations for offshore sailing, from foul weather gear and safety equipment to electronics and galley essentials.",
    href: "/resources/gear",
    status: "available",
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
    title: "Publications & Downloads",
    description:
      "Downloadable guides, checklists, and reference documents for voyage preparation, safety procedures, and yacht systems.",
    href: "/resources/publications",
    status: "available",
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
];

export default function ResourcesPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Resources" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">
                Sailing Knowledge & References
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                A curated collection of guides, tools, and recommendations for
                offshore sailing, passage preparation, and life aboard a
                bluewater cruising yacht.
              </p>
            </div>
          </div>
        </section>

        {/* Resource Categories */}
        <Section>
          <div className="grid md:grid-cols-2 gap-8">
            {resourceCategories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="group relative bg-midnight-blue/50 border border-slate-water/30 rounded-lg p-8 hover:border-copper-accent/50 hover:bg-midnight-blue/70 transition-all duration-300"
              >
                {category.status === "coming-soon" && (
                  <span className="absolute top-4 right-4 text-xs text-storm-grey bg-slate-water/50 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
                <div className="text-copper-accent mb-4">{category.icon}</div>
                <h2 className="text-h3 text-salt-white mb-3 group-hover:text-copper-accent transition-colors">
                  {category.title}
                </h2>
                <p className="text-mist leading-relaxed">
                  {category.description}
                </p>
                <div className="mt-6 flex items-center text-copper-accent text-sm font-medium">
                  <span>Explore</span>
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

        {/* Additional Info */}
        <Section background="dark">
          <div className="max-w-3xl mx-auto text-center">
            <SectionLabel label="Contributing" className="justify-center mb-8" />
            <h2 className="text-h2 text-salt-white mb-6">
              Have a Resource to Share?
            </h2>
            <p className="text-mist leading-relaxed mb-6">
              We&apos;re always looking for quality resources to add to this
              collection. If you know of an excellent guide, tool, or reference
              that would benefit other sailors, we&apos;d love to hear about it.
            </p>
            <p className="text-mist leading-relaxed">
              Reach out via our social channels or newsletter to suggest
              additions.
            </p>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
