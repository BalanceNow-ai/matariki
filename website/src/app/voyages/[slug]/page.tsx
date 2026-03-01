import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { client, fetchOptions, projectId, dataset } from "@/sanity/client";
import { VOYAGE_BY_SLUG_QUERY } from "@/sanity/queries";
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

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

type VoyageImage = {
  _id: string;
  image?: { asset: { _ref: string } };
  caption?: string;
  category?: string;
  takenAt?: string;
};

type VoyageVideo = {
  _id: string;
  title: string;
  description?: string;
  videoType: "youtube" | "vimeo" | "file";
  youtubeUrl?: string;
  vimeoUrl?: string;
  thumbnail?: { asset: { _ref: string } };
  category?: string;
  duration?: string;
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
  videos?: VoyageVideo[];
  logEntries?: VoyageLogEntry[];
} | null;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const voyage = await client.fetch<Voyage>(VOYAGE_BY_SLUG_QUERY, { slug }, fetchOptions);
    if (voyage) {
      return {
        title: voyage.title,
        description: voyage.description || `Follow the ${voyage.title} voyage of Matariki III.`,
      };
    }
  } catch {
    // Fall through
  }

  return { title: "Voyage Not Found" };
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

  // If no voyage found, return 404
  if (!voyage) {
    notFound();
  }

  // Build unified gallery items for GalleryGrid
  const imageItems = [
    ...(voyage.gallery || []).map((img, i) => ({
      id: `gallery-${i}`,
      src: urlFor(img)?.width(800).height(800).url() || "",
      caption: img.caption || "",
      category: "general",
      type: "image" as const,
    })),
    ...(voyage.galleryImages || [])
      .filter((img) => img.image?.asset)
      .map((img) => ({
        id: img._id,
        src: urlFor(img.image)?.width(800).height(800).url() || "",
        caption: img.caption || "",
        category: img.category || "general",
        type: "image" as const,
      })),
  ];

  const videoItems = (voyage.videos || [])
    .map((video) => {
      let thumbnailUrl = "";
      let videoUrl = "";

      if (video.thumbnail?.asset) {
        thumbnailUrl = urlFor(video.thumbnail)?.width(800).height(450).url() || "";
      } else if (video.videoType === "youtube" && video.youtubeUrl) {
        const ytId = getYouTubeId(video.youtubeUrl);
        if (ytId) thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }

      if (video.youtubeUrl) videoUrl = video.youtubeUrl;
      else if (video.vimeoUrl) videoUrl = video.vimeoUrl;

      return {
        id: video._id,
        src: thumbnailUrl,
        caption: video.title || "",
        category: video.category || "general",
        type: "video" as const,
        videoUrl,
        duration: video.duration,
      };
    })
    .filter((v) => v.videoUrl);

  const allMedia = [...videoItems, ...imageItems];

  // Use Sanity log entries directly
  const allLogEntries = voyage.logEntries || [];

  return (
      <>
        <Header />
        <main className="pt-20">
          {/* Hero */}
          <section className="relative pt-40 pb-24 bg-midnight-blue">
            {voyage.heroImage?.asset && (
              <div className="absolute inset-0">
                <Image
                  src={urlFor(voyage.heroImage)?.width(1920).height(800).url() || ""}
                  alt={voyage.title}
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
                href="/voyages"
                className="inline-flex items-center gap-2 text-sm text-mist/80 hover:text-salt-white transition-colors mb-6"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All Voyages
              </Link>
              {voyage.status && (
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 text-xs font-medium uppercase tracking-wider rounded-full ${
                    voyage.status === "active"
                      ? "bg-sea-green/20 text-sea-green border border-sea-green/30"
                      : voyage.status === "completed"
                      ? "bg-copper-accent/20 text-copper-accent border border-copper-accent/30"
                      : "bg-mist/20 text-mist border border-mist/30"
                  }`}>
                    {voyage.status}
                  </span>
                </div>
              )}
              <div className="max-w-3xl">
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

          {/* Log Entries */}
          {allLogEntries.length > 0 && (
            <Section>
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

          {/* Gallery (Photos & Videos) */}
          {allMedia.length > 0 && (
            <Section background="dark">
              <SectionLabel label="Gallery" className="mb-8" />
              <GalleryGrid items={allMedia} />
            </Section>
          )}

          {/* Empty State - only show if no log entries and no gallery */}
          {allLogEntries.length === 0 && allMedia.length === 0 && (
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
