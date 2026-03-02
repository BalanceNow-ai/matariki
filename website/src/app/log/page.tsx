import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, MissingContent } from "@/components/ui";
import { PostCard } from "@/components/content";
import { client, fetchOptions, projectId, dataset } from "@/sanity/client";
import { ALL_POSTS_QUERY } from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";
import type { Metadata } from "next";
import type { LogEntry } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any;

const urlFor = (source: SanityImageSource) =>
  projectId && dataset
    ? imageUrlBuilder({ projectId, dataset }).image(source)
    : null;

export const metadata: Metadata = {
  title: "Voyage Log",
  description: "Read the voyage log entries from Matariki III's adventures around New Zealand and the Pacific.",
};

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

type SanityLogEntry = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  category: string;
  excerpt: string;
  location?: string;
  heroImage?: {
    asset: { _ref: string };
  };
};

export default async function LogPage() {
  let logEntries: LogEntry[] = [];

  try {
    const sanityPosts = await client.fetch<SanityLogEntry[]>(
      ALL_POSTS_QUERY,
      {},
      fetchOptions
    );

    if (sanityPosts && sanityPosts.length > 0) {
      logEntries = sanityPosts.map((post) => ({
        id: post._id,
        title: post.title,
        slug: post.slug.current,
        publishedAt: post.publishedAt,
        voyageId: "",
        category: (post.category || "general") as "sailing" | "hunting" | "diving" | "fishing" | "general",
        excerpt: post.excerpt || "",
        location: {
          name: post.location || "Unknown",
          coordinates: { lat: 0, lng: 0 },
        },
        heroImage: post.heroImage
          ? urlFor(post.heroImage)?.width(800).height(500).url() || undefined
          : undefined,
      }));
    }
  } catch (error) {
    console.error("[Log] Failed to fetch from Sanity:", error);
  }
  return (
    <>
      <Header />
      <main className="pt-20">
        <Section>
          <div className="mb-12">
            <SectionLabel label="Voyage Log" className="mb-4" />
            <h1 className="text-h1 text-salt-white mb-4">All Entries</h1>
            <p className="text-mist max-w-2xl">
              Stories from the sea — sailing adventures, hunting expeditions, diving discoveries, and life aboard Matariki III.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-4 mb-12 pb-8 border-b border-white/5">
            <select className="px-4 py-2 bg-deep-ocean border border-mist/30 text-salt-white text-sm rounded cursor-pointer hover:border-copper-accent/50 focus:border-copper-accent focus:outline-none transition-colors [&>option]:bg-deep-ocean [&>option]:text-salt-white">
              <option>All Categories</option>
              <option>Sailing</option>
              <option>Hunting</option>
              <option>Diving</option>
              <option>Fishing</option>
            </select>
            <select className="px-4 py-2 bg-deep-ocean border border-mist/30 text-salt-white text-sm rounded cursor-pointer hover:border-copper-accent/50 focus:border-copper-accent focus:outline-none transition-colors [&>option]:bg-deep-ocean [&>option]:text-salt-white">
              <option>All Voyages</option>
              <option>Fiordland 2026</option>
              <option>Bay of Islands 2025</option>
            </select>
          </div>

          {/* Posts Grid */}
          {logEntries.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {logEntries.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="bg-slate-water/30 rounded-lg py-12">
              <MissingContent label="No log entries in Sanity" size="lg" />
            </div>
          )}
        </Section>
      </main>
      <Footer />
    </>
  );
}
