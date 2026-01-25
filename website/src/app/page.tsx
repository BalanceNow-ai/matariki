import Image from "next/image";
import Link from "next/link";
import { Header, Footer, Section, Container } from "@/components/layout";
import { Button, SectionLabel } from "@/components/ui";
import { StatBlock, PostCard } from "@/components/content";
import { MapWidget } from "@/components/map";
import { NewsletterForm } from "@/components/forms";
import {
  siteSettings as mockSiteSettings,
  getRecentLogEntries,
  getFeaturedGalleryImages,
  yachtSpecs,
} from "@/lib/data/mock";
import { client } from "@/sanity/client";
import { RECENT_POSTS_QUERY, SITE_SETTINGS_QUERY } from "@/sanity/queries";

// Types for Sanity data
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

type SanitySiteSettings = {
  siteName?: string;
  stats?: {
    totalNauticalMiles?: number;
    totalDaysAtSea?: number;
    totalAnchorages?: number;
    redStags?: number;
    diveSites?: number;
  };
};

// Fetch options for ISR
const options = { next: { revalidate: 60 } };

export default async function HomePage() {
  // Fetch from Sanity with fallback to mock data
  let recentPosts = getRecentLogEntries(3);
  let stats = mockSiteSettings.stats;

  try {
    const sanityPosts = await client.fetch<SanityLogEntry[]>(
      RECENT_POSTS_QUERY,
      {},
      options
    );

    if (sanityPosts && sanityPosts.length > 0) {
      // Transform Sanity posts to match component expected format
      recentPosts = sanityPosts.map((post) => ({
        id: post._id,
        title: post.title,
        slug: post.slug.current,
        publishedAt: post.publishedAt,
        voyageId: "",
        category: (post.category || "general") as "sailing" | "hunting" | "diving" | "fishing" | "general",
        excerpt: post.excerpt || "",
        location: {
          name: post.location || "Unknown",
          coordinates: [0, 0] as [number, number],
        },
        heroImage: post.heroImage?.asset?._ref || "/placeholder.jpg",
        body: "",
      }));
    }

    const sanitySettings = await client.fetch<SanitySiteSettings>(
      SITE_SETTINGS_QUERY,
      {},
      options
    );

    if (sanitySettings?.stats) {
      stats = {
        ...mockSiteSettings.stats,
        ...sanitySettings.stats,
      };
    }
  } catch (error) {
    // Silently fall back to mock data if Sanity fetch fails
    console.error("Failed to fetch from Sanity:", error);
  }

  const featuredImages = getFeaturedGalleryImages(5);

  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center">
          {/* Background */}
          <div className="absolute inset-0 z-0 bg-deep-ocean">
            <div className="absolute inset-0 bg-gradient-to-br from-midnight-blue/50 to-slate-water/30" />
          </div>

          {/* Content */}
          <Container className="relative z-10 pt-32 pb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sea-green/20 border border-sea-green/30 rounded-full mb-6">
                  <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
                  <span className="text-caption text-sea-green">
                    At Anchor
                  </span>
                </div>

                {/* Headline */}
                <h1 className="text-display text-salt-white mb-6">
                  Sailing the{" "}
                  <span className="text-copper-accent">Wild South</span>
                </h1>

                {/* Description */}
                <p className="text-lg text-mist mb-8 max-w-xl leading-relaxed">
                  Follow the voyages of Matariki III, an Oyster 68 yacht, as we
                  explore the remote fiords, pristine anchorages, and untamed
                  wilderness of New Zealand and the Pacific.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-4">
                  <Button href="/track" size="lg">
                    Track Live Position
                  </Button>
                  <Button href="/log" variant="ghost" size="lg">
                    Read the Log
                  </Button>
                </div>
              </div>

              {/* Map Widget */}
              <div className="lg:justify-self-end w-full max-w-md">
                <MapWidget />
              </div>
            </div>
          </Container>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <div className="w-6 h-10 border-2 border-mist/30 rounded-full flex justify-center pt-2">
              <div className="w-1 h-3 bg-mist/50 rounded-full animate-bounce" />
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-midnight-blue py-12 border-y border-white/5">
          <Container>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              <StatBlock
                value={stats.totalNauticalMiles}
                label="Nautical Miles"
                suffix="NM"
              />
              <StatBlock value={stats.totalDaysAtSea} label="Days at Sea" />
              <StatBlock value={stats.totalAnchorages} label="Anchorages" />
              <StatBlock value={stats.redStags} label="Red Stags" />
              <StatBlock value={stats.diveSites} label="Dive Sites" />
            </div>
          </Container>
        </section>

        {/* The Yacht Section */}
        <Section id="yacht">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image Placeholder */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-slate-water/50">
                  <div className="absolute inset-0 flex items-center justify-center text-mist">
                    <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-water/50">
                <div className="absolute inset-0 flex items-center justify-center text-mist">
                  <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-water/50">
                <div className="absolute inset-0 flex items-center justify-center text-mist">
                  <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <SectionLabel number="01" label="The Vessel" className="mb-4" />
              <h2 className="text-h2 text-salt-white mb-6">
                Matariki III
                <span className="block text-copper-accent">Oyster 68</span>
              </h2>
              <p className="text-mist mb-6 leading-relaxed">
                Built by Oyster Yachts in the UK and designed by Rob Humphreys,
                Matariki III is a blue-water cruising yacht designed for
                long-distance voyaging in comfort and safety. Her robust
                construction and comprehensive systems allow us to explore the
                most remote corners of the Pacific.
              </p>

              {/* Key Specs */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: "LOA", value: yachtSpecs.dimensions.loa },
                  { label: "Beam", value: yachtSpecs.dimensions.beam },
                  { label: "Draft", value: yachtSpecs.dimensions.draft },
                  {
                    label: "Displacement",
                    value: yachtSpecs.dimensions.displacement,
                  },
                ].map((spec) => (
                  <div key={spec.label} className="border-l-2 border-copper-accent/30 pl-4">
                    <div className="text-caption text-mist">{spec.label}</div>
                    <div className="text-salt-white font-mono">{spec.value}</div>
                  </div>
                ))}
              </div>

              <Button href="/yacht" variant="ghost">
                View Full Specifications
              </Button>
            </div>
          </div>
        </Section>

        {/* Recent Log Entries */}
        <Section background="dark" id="log">
          <div className="flex items-center justify-between mb-12">
            <div>
              <SectionLabel number="02" label="Voyage Log" className="mb-4" />
              <h2 className="text-h2 text-salt-white">Recent Entries</h2>
            </div>
            <Link
              href="/log"
              className="text-sm text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider hidden sm:block"
            >
              View All →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Button href="/log" variant="ghost">
              View All Entries
            </Button>
          </div>
        </Section>

        {/* Gallery Preview */}
        <Section id="gallery">
          <div className="flex items-center justify-between mb-12">
            <div>
              <SectionLabel number="03" label="Gallery" className="mb-4" />
              <h2 className="text-h2 text-salt-white">Latest Captures</h2>
            </div>
            <Link
              href="/gallery"
              className="text-sm text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider hidden sm:block"
            >
              View Gallery →
            </Link>
          </div>

          {/* Asymmetric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Large Placeholder */}
            <div className="col-span-2 row-span-2">
              <Link href="/gallery" className="block relative aspect-square rounded-lg overflow-hidden group bg-slate-water/50">
                <div className="absolute inset-0 flex items-center justify-center text-mist">
                  <svg className="w-20 h-20 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </Link>
            </div>
            {/* Smaller Placeholders */}
            {[1, 2, 3, 4].map((i) => (
              <Link
                key={i}
                href="/gallery"
                className="block relative aspect-square rounded-lg overflow-hidden group bg-slate-water/50"
              >
                <div className="absolute inset-0 flex items-center justify-center text-mist">
                  <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Button href="/gallery" variant="ghost">
              View Gallery
            </Button>
          </div>
        </Section>

        {/* Newsletter CTA */}
        <Section background="gradient" className="text-center">
          <div className="max-w-2xl mx-auto">
            <SectionLabel label="Stay Updated" className="justify-center mb-4" />
            <h2 className="text-h2 text-salt-white mb-4">
              Follow Our Voyages
            </h2>
            <p className="text-mist mb-8">
              Subscribe to receive updates from aboard Matariki III. New log
              entries, photography, and voyage announcements delivered to your
              inbox.
            </p>
            <div className="max-w-md mx-auto">
              <NewsletterForm />
            </div>
          </div>
        </Section>
      </main>

      <Footer />
    </>
  );
}
