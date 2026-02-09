import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { ExpeditionSchedule } from "@/components/content";
import { client, fetchOptions, projectId, dataset } from "@/sanity/client";
import { VOYAGE_BY_SLUG_QUERY } from "@/sanity/queries";
import { voyages as mockVoyages, logEntries as mockLogEntries } from "@/lib/data/mock";
import imageUrlBuilder from "@sanity/image-url";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

// Hardcoded expedition plan entry - always shown for Fiordland voyage
const EXPEDITION_PLAN_ENTRY = {
  id: "expedition-plan",
  _id: "expedition-plan",
  title: "Fiordland & Stewart Island: The Expedition Plan",
  slug: { current: "fiordland-stewart-island-expedition-plan" },
  publishedAt: "2026-02-01T09:00:00Z",
  category: "sailing",
  excerpt:
    "Nine weeks through New Zealand's wildest coastline — from Milford Sound to Stewart Island. A comprehensive plan for hunting, diving, and fishing aboard Matariki III.",
  heroImage: undefined as { asset: { _ref: string } } | undefined,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urlFor(source: any) {
  if (!projectId || !dataset || !source) return null;
  return imageUrlBuilder({ projectId, dataset }).image(source);
}

type VoyageImage = {
  _id: string;
  image?: { asset: { _ref: string } };
  caption?: string;
  category?: string;
  takenAt?: string;
};

type VoyageLogEntry = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  category: string;
  excerpt?: string;
  heroImage?: { asset: { _ref: string } };
};

type Voyage = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  heroImage?: { asset: { _ref: string } };
  gallery?: Array<{ asset: { _ref: string }; caption?: string }>;
  galleryImages?: VoyageImage[];
  logEntries?: VoyageLogEntry[];
} | null;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Try Sanity first
  try {
    const voyage = await client.fetch<Voyage>(VOYAGE_BY_SLUG_QUERY, { slug }, fetchOptions);
    if (voyage) {
      return {
        title: voyage.title,
        description: voyage.description || `Follow the ${voyage.title} voyage of Matariki III.`,
      };
    }
  } catch {
    // Fall through to mock data
  }

  // Fall back to mock data
  const mockVoyage = mockVoyages.find((v) => v.slug === slug);
  if (!mockVoyage) {
    return { title: "Voyage Not Found" };
  }

  return {
    title: mockVoyage.title,
    description: mockVoyage.description || `Follow the ${mockVoyage.title} voyage of Matariki III.`,
  };
}

export default async function VoyagePage({ params }: PageProps) {
  const { slug } = await params;

  // Try to fetch from Sanity
  let voyage: Voyage = null;
  try {
    voyage = await client.fetch<Voyage>(VOYAGE_BY_SLUG_QUERY, { slug }, fetchOptions);
  } catch (error) {
    console.error("Failed to fetch voyage from Sanity:", error);
  }

  // If we have a Sanity voyage, render it
  if (voyage) {
    const allImages = [
      ...(voyage.gallery || []).map((img, i) => ({
        _id: `gallery-${i}`,
        image: img,
        caption: img.caption,
      })),
      ...(voyage.galleryImages || []),
    ];

    // Check if this is the Fiordland expedition voyage (match by slug or title containing "fiordland")
    const isExpeditionVoyage = slug.toLowerCase().includes("fiordland") ||
      voyage.title.toLowerCase().includes("fiordland");

    // Combine Sanity log entries with hardcoded expedition plan for Fiordland voyage
    const sanityLogEntries = voyage.logEntries || [];
    const allLogEntries = isExpeditionVoyage
      ? [EXPEDITION_PLAN_ENTRY, ...sanityLogEntries.filter(e => e.slug.current !== EXPEDITION_PLAN_ENTRY.slug.current)]
      : sanityLogEntries;

    return (
      <>
        <Header />
        <main className="pt-20">
          {/* Hero */}
          <section className="relative py-24 bg-midnight-blue">
            {voyage.heroImage?.asset && (
              <div className="absolute inset-0">
                <Image
                  src={urlFor(voyage.heroImage)?.width(1920).height(800).url() || ""}
                  alt={voyage.title}
                  fill
                  className="object-cover opacity-30"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-blue via-midnight-blue/80 to-transparent" />
              </div>
            )}
            <div className="container-site relative z-10">
              <Link
                href="/voyages"
                className="inline-flex items-center gap-2 text-mist hover:text-salt-white transition-colors mb-6"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All Voyages
              </Link>
              <div className="max-w-3xl">
                {voyage.status && (
                  <span className={`inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider rounded-full mb-4 ${
                    voyage.status === "active"
                      ? "bg-sea-green/20 text-sea-green border border-sea-green/30"
                      : voyage.status === "completed"
                      ? "bg-copper-accent/20 text-copper-accent border border-copper-accent/30"
                      : "bg-mist/20 text-mist border border-mist/30"
                  }`}>
                    {voyage.status}
                  </span>
                )}
                <h1 className="text-display text-salt-white mb-4">{voyage.title}</h1>
                {(voyage.startDate || voyage.endDate) && (
                  <p className="text-copper-accent text-lg mb-6">
                    {voyage.startDate && new Date(voyage.startDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}
                    {voyage.endDate && ` — ${new Date(voyage.endDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}`}
                    {!voyage.endDate && voyage.status === "active" && " — Present"}
                  </p>
                )}
                {voyage.description && (
                  <p className="text-mist text-lg leading-relaxed">{voyage.description}</p>
                )}
              </div>
            </div>
          </section>

          {/* Expedition Schedule for Fiordland voyage */}
          {isExpeditionVoyage && (
            <Section>
              <SectionLabel label="Expedition Schedule" className="mb-8" />
              <ExpeditionSchedule />
            </Section>
          )}

          {/* Log Entries */}
          {allLogEntries.length > 0 && (
            <Section background={isExpeditionVoyage ? "dark" : undefined}>
              <SectionLabel label="Log Entries" className="mb-8" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allLogEntries.map((entry) => (
                  <Link
                    key={entry._id}
                    href={`/log/${entry.slug.current}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-water/50 mb-3">
                      {entry.heroImage?.asset ? (
                        <Image
                          src={urlFor(entry.heroImage)?.width(600).height(450).url() || ""}
                          alt={entry.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-mist">
                          <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 text-xs bg-deep-ocean/80 text-mist rounded capitalize">
                          {entry.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-storm-grey mb-1">
                      {new Date(entry.publishedAt).toLocaleDateString("en-NZ", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <h3 className="text-salt-white font-medium group-hover:text-copper-accent transition-colors">
                      {entry.title}
                    </h3>
                    {entry.excerpt && (
                      <p className="text-mist text-sm mt-1 line-clamp-2">{entry.excerpt}</p>
                    )}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Photo Gallery */}
          {allImages.length > 0 && (
            <Section background="dark">
              <SectionLabel label="Gallery" className="mb-8" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allImages.map((img) => (
                  <div key={img._id} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-water/50">
                    {img.image?.asset ? (
                      <Image
                        src={urlFor(img.image)?.width(400).height(400).url() || ""}
                        alt={img.caption || "Voyage photo"}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-mist">
                        <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-salt-white text-sm">{img.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Empty State - only show if no expedition schedule, no log entries, and no gallery */}
          {!isExpeditionVoyage && allLogEntries.length === 0 && allImages.length === 0 && (
            <Section>
              <div className="text-center py-16">
                <p className="text-mist">Content for this voyage coming soon.</p>
              </div>
            </Section>
          )}
        </main>
        <Footer />
      </>
    );
  }

  // Fall back to mock data
  const mockVoyage = mockVoyages.find((v) => v.slug === slug);

  if (!mockVoyage) {
    notFound();
  }

  // Get related log entries from mock data
  const relatedLogEntries = mockLogEntries.filter((entry) => entry.voyageId === mockVoyage.id);

  // Check if this is the Fiordland expedition voyage (match by slug or title containing "fiordland")
  const isExpeditionVoyage = slug.toLowerCase().includes("fiordland") ||
    mockVoyage.title.toLowerCase().includes("fiordland");

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site relative z-10">
            <Link
              href="/voyages"
              className="inline-flex items-center gap-2 text-mist hover:text-salt-white transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Voyages
            </Link>
            <div className="max-w-3xl">
              {mockVoyage.status && (
                <span className={`inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider rounded-full mb-4 ${
                  mockVoyage.status === "active"
                    ? "bg-sea-green/20 text-sea-green border border-sea-green/30"
                    : mockVoyage.status === "completed"
                    ? "bg-copper-accent/20 text-copper-accent border border-copper-accent/30"
                    : "bg-mist/20 text-mist border border-mist/30"
                }`}>
                  {mockVoyage.status}
                </span>
              )}
              <h1 className="text-display text-salt-white mb-4">{mockVoyage.title}</h1>
              {(mockVoyage.startDate || mockVoyage.endDate) && (
                <p className="text-copper-accent text-lg mb-6">
                  {mockVoyage.startDate && new Date(mockVoyage.startDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}
                  {mockVoyage.endDate && ` — ${new Date(mockVoyage.endDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" })}`}
                  {!mockVoyage.endDate && mockVoyage.status === "active" && " — Present"}
                </p>
              )}
              {mockVoyage.description && (
                <p className="text-mist text-lg leading-relaxed">{mockVoyage.description}</p>
              )}
            </div>
          </div>
        </section>

        {/* Expedition Schedule for Fiordland voyage */}
        {isExpeditionVoyage && (
          <Section>
            <SectionLabel label="Expedition Schedule" className="mb-8" />
            <ExpeditionSchedule />
          </Section>
        )}

        {/* Log Entries */}
        {relatedLogEntries.length > 0 && (
          <Section background={isExpeditionVoyage ? "dark" : undefined}>
            <SectionLabel label="Log Entries" className="mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedLogEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/log/${entry.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-water/50 mb-3">
                    <div className="absolute inset-0 flex items-center justify-center text-mist">
                      <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 text-xs bg-deep-ocean/80 text-mist rounded capitalize">
                        {entry.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-storm-grey mb-1">
                    {new Date(entry.publishedAt).toLocaleDateString("en-NZ", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <h3 className="text-salt-white font-medium group-hover:text-copper-accent transition-colors">
                    {entry.title}
                  </h3>
                  {entry.excerpt && (
                    <p className="text-mist text-sm mt-1 line-clamp-2">{entry.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Empty State */}
        {relatedLogEntries.length === 0 && !isExpeditionVoyage && (
          <Section>
            <div className="text-center py-16">
              <p className="text-mist">Content for this voyage coming soon.</p>
            </div>
          </Section>
        )}
      </main>
      <Footer />
    </>
  );
}
