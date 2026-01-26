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
import { client, projectId, dataset, fetchOptions } from "@/sanity/client";
import { RECENT_POSTS_QUERY, SITE_SETTINGS_QUERY, FEATURED_GALLERY_QUERY } from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urlFor(source: any) {
  if (!projectId || !dataset || !source) return null;
  return imageUrlBuilder({ projectId, dataset }).image(source);
}

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

type SanityGalleryImage = {
  _id: string;
  image: {
    asset: { _ref: string };
  };
  caption?: string;
  category?: string;
};

export default async function HomePage() {
  // Fetch from Sanity with fallback to mock data
  let recentPosts = getRecentLogEntries(3);
  let stats = mockSiteSettings.stats;
  let featuredImages: Array<{ id: string; src: string; caption: string }> = [];

  try {
    const sanityPosts = await client.fetch<SanityLogEntry[]>(
      RECENT_POSTS_QUERY,
      {},
      fetchOptions
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
      fetchOptions
    );

    if (sanitySettings?.stats) {
      stats = {
        ...mockSiteSettings.stats,
        ...sanitySettings.stats,
      };
    }

    // Fetch gallery images from Sanity
    const sanityGallery = await client.fetch<SanityGalleryImage[]>(
      FEATURED_GALLERY_QUERY,
      {},
      fetchOptions
    );

    if (sanityGallery && sanityGallery.length > 0) {
      featuredImages = sanityGallery
        .filter((img) => img.image?.asset)
        .map((img) => ({
          id: img._id,
          src: urlFor(img.image)?.width(800).height(800).url() || "",
          caption: img.caption || "",
        }));
    }
  } catch (error) {
    // Silently fall back to mock data if Sanity fetch fails
    console.error("Failed to fetch from Sanity:", error);
  }

  // Fall back to mock data if no Sanity gallery images
  if (featuredImages.length === 0) {
    featuredImages = getFeaturedGalleryImages(5).map((img) => ({
      id: img.id,
      src: img.src,
      caption: img.caption,
    }));
  }

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
            {/* Large Featured Image */}
            <div className="col-span-2 row-span-2">
              <Link href="/gallery" className="block relative aspect-square rounded-lg overflow-hidden group bg-slate-water/50">
                {featuredImages[0]?.src ? (
                  <>
                    <Image
                      src={featuredImages[0].src}
                      alt={featuredImages[0].caption || "Gallery image"}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-deep-ocean/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-sm text-salt-white">{featuredImages[0].caption}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-mist">
                    <svg className="w-20 h-20 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </Link>
            </div>
            {/* Smaller Images */}
            {featuredImages.slice(1, 5).map((img, i) => (
              <Link
                key={img.id || i}
                href="/gallery"
                className="block relative aspect-square rounded-lg overflow-hidden group bg-slate-water/50"
              >
                {img.src ? (
                  <>
                    <Image
                      src={img.src}
                      alt={img.caption || "Gallery image"}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-deep-ocean/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-mist">
                    <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
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
