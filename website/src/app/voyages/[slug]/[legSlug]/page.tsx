import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { LegMap } from "@/components/voyages/LegMap";
import { client, fetchOptions, projectId, dataset } from "@/sanity/client";
import { LEG_BY_SLUG_QUERY } from "@/sanity/queries";
import { crewPagePublic } from "@/lib/crew/visibility";
import { formatNm, formatRange, isOpenForCrew, LEG_KIND_LABELS, legProgress, legTrack, type Leg } from "@/lib/voyages/legs";
import imageUrlBuilder from "@sanity/image-url";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urlFor(source: any) {
  if (!projectId || !dataset || !source) return null;
  return imageUrlBuilder({ projectId, dataset }).image(source);
}

type LegLogEntry = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  category: string;
  excerpt?: string;
  heroImage?: { asset: { _ref: string } };
};

type LegPage =
  | (Leg & {
      route?: string;
      minExperience?: string;
      gallery?: Array<{ asset: { _ref: string }; caption?: string }>;
      voyage: { _id: string; title: string; slug: string; status?: string };
      logEntries?: LegLogEntry[];
    })
  | null;

type PageProps = { params: Promise<{ slug: string; legSlug: string }> };

async function fetchLeg(slug: string, legSlug: string): Promise<LegPage> {
  try {
    return await client.fetch<LegPage>(LEG_BY_SLUG_QUERY, { slug, legSlug }, fetchOptions);
  } catch (error) {
    console.error("Failed to fetch leg from Sanity:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, legSlug } = await params;
  const leg = await fetchLeg(slug, legSlug);
  if (!leg) return { title: "Leg Not Found" };
  const where = leg.fromPlace && leg.toPlace ? ` from ${leg.fromPlace} to ${leg.toPlace}` : "";
  return { title: `${leg.title} · ${leg.voyage.title}`, description: `Leg of the ${leg.voyage.title} voyage of Matariki III${where}.` };
}

const PROGRESS = {
  planned: { label: "Planned", style: "bg-mist/20 text-mist border border-mist/30" },
  underway: { label: "Underway", style: "bg-sea-green/20 text-sea-green border border-sea-green/30" },
  completed: { label: "Sailed", style: "bg-copper-accent/20 text-copper-accent border border-copper-accent/30" },
} as const;

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-caption text-storm-grey mb-1">{label}</dt>
      <dd className="text-salt-white">{value}</dd>
    </div>
  );
}

export default async function LegPage({ params }: PageProps) {
  const { slug, legSlug } = await params;
  const leg = await fetchLeg(slug, legSlug);
  if (!leg) notFound();

  const progress = PROGRESS[legProgress(leg)];
  const track = legTrack(leg);
  const canApply = crewPagePublic() && isOpenForCrew(leg);
  const logEntries = leg.logEntries ?? [];
  const media = (leg.gallery ?? [])
    .filter((img) => img.asset)
    .map((img, i) => ({
      id: `leg-gallery-${i}`,
      src: urlFor(img)?.width(800).height(800).url() || "",
      caption: img.caption || "",
      category: "general",
      type: "image" as const,
    }));

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative pt-40 pb-24 bg-midnight-blue">
          {Boolean(leg.heroImage) && (
            <div className="absolute inset-0">
              <Image
                src={urlFor(leg.heroImage)?.width(1920).height(800).url() || ""}
                alt={leg.title}
                fill
                className="object-cover opacity-30"
                priority
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight-blue via-midnight-blue/80 to-transparent" />
            </div>
          )}
          <div className="container-site relative z-10">
            <Link
              href={`/voyages/${leg.voyage.slug}`}
              className="inline-flex items-center gap-2 text-sm text-mist/80 hover:text-salt-white transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {leg.voyage.title}
            </Link>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className={`inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider rounded-full ${progress.style}`}>{progress.label}</span>
              {leg.kind && (
                <span className="inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider rounded-full bg-deep-ocean/60 text-mist border border-mist/30">
                  {LEG_KIND_LABELS[leg.kind]}
                </span>
              )}
            </div>
            <div className="max-w-3xl">
              <h1 className="text-display text-salt-white mb-4">{leg.title}</h1>
              {(leg.fromPlace || leg.toPlace) && (
                <p className="text-copper-accent text-lg mb-6">
                  {leg.fromPlace ?? "?"} → {leg.toPlace ?? "?"}
                </p>
              )}
              {canApply && (
                <Button href={`/crew/apply?passage=${encodeURIComponent(leg._id)}`} size="lg">
                  Apply for this leg
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Dates, distance and track */}
        <Section>
          <SectionLabel label="The Leg" className="mb-8" />
          <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Fact label="Planned" value={formatRange(leg.plannedStart, leg.plannedEnd)} />
            <Fact label="Sailed" value={leg.actualStart ? formatRange(leg.actualStart, leg.actualEnd) : null} />
            <Fact label="Planned distance" value={formatNm(leg.plannedDistanceNm)} />
            <Fact label="Distance sailed" value={formatNm(leg.actualDistanceNm)} />
          </dl>
          <LegMap tracks={[{ id: leg._id, title: leg.title, coords: track, dashed: !leg.actualStart }]} />
          {canApply && leg.minExperience && (
            <p className="text-sm text-mist mt-6 max-w-3xl">
              <span className="text-salt-white">Minimum experience for crew: </span>
              {leg.minExperience}
            </p>
          )}
        </Section>

        {/* Log entries for this leg */}
        {logEntries.length > 0 && (
          <Section background="dark">
            <SectionLabel label="Log Entries" className="mb-8" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {logEntries.map((entry) => (
                <Link key={entry._id} href={`/log/${entry.slug.current}`} className="group block">
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
                      <span className="px-2 py-1 text-xs bg-deep-ocean/80 text-mist rounded capitalize">{entry.category}</span>
                    </div>
                  </div>
                  <p className="text-xs text-storm-grey mb-1">
                    {new Date(entry.publishedAt).toLocaleDateString("en-NZ", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <h3 className="text-salt-white font-medium group-hover:text-copper-accent transition-colors">{entry.title}</h3>
                  {entry.excerpt && <p className="text-mist text-sm mt-1 line-clamp-2">{entry.excerpt}</p>}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Gallery */}
        {media.length > 0 && (
          <Section>
            <SectionLabel label="Gallery" className="mb-8" />
            <GalleryGrid items={media} />
          </Section>
        )}

        {/* Crew call to action */}
        {canApply && (
          <Section background="gradient">
            <div className="max-w-3xl mx-auto text-center">
              <SectionLabel label="Join the crew" className="justify-center mb-6" />
              <h2 className="text-h2 text-salt-white mb-4">Sail this leg with us</h2>
              <p className="text-mist leading-relaxed mb-8">
                {typeof leg.crewPlaces === "number" && `${leg.crewPlaces} crew ${leg.crewPlaces === 1 ? "place" : "places"} open. `}
                Apply for this leg and we&apos;ll be in touch.
              </p>
              <Button href={`/crew/apply?passage=${encodeURIComponent(leg._id)}`} size="lg">
                Apply for this leg
              </Button>
            </div>
          </Section>
        )}
      </main>
      <Footer />
    </>
  );
}
