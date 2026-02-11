import { notFound } from "next/navigation";
import Image from "next/image";
import imageUrlBuilder from "@sanity/image-url";
import { Header, Footer, Section, Container } from "@/components/layout";
import { Badge, Button, MissingContent } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { client, projectId, dataset } from "@/sanity/client";
import type { Metadata } from "next";

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any;

const POST_QUERY = `*[_type == "logEntry" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  publishedAt,
  category,
  excerpt,
  contentHtml,
  location,
  heroImage
}`;

const urlFor = (source: SanityImageSource) =>
  projectId && dataset
    ? imageUrlBuilder({ projectId, dataset }).image(source)
    : null;

const options = { next: { revalidate: 30 } };

interface Props {
  params: Promise<{ slug: string }>;
}

type SanityPost = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  category?: string;
  excerpt?: string;
  contentHtml?: string;
  location?: {
    name?: string;
    coordinates?: { lat: number; lng: number };
  };
  heroImage?: SanityImageSource;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await client.fetch<SanityPost>(POST_QUERY, { slug }, options);
    if (post) {
      return {
        title: post.title,
        description: post.excerpt,
      };
    }
  } catch {
    // Fall through
  }

  return { title: "Post Not Found" };
}

export default async function LogEntryPage({ params }: Props) {
  const { slug } = await params;

  // Try to fetch from Sanity
  let sanityPost: SanityPost | null = null;
  try {
    sanityPost = await client.fetch<SanityPost>(POST_QUERY, { slug }, options);
  } catch (error) {
    console.error("Failed to fetch from Sanity:", error);
  }

  // If we have a Sanity post, render it
  if (sanityPost) {
    const heroImageUrl = sanityPost.heroImage
      ? urlFor(sanityPost.heroImage)?.width(1200).height(600).url()
      : null;

    return (
      <>
        <Header />
        <main className="pt-20">
          {/* Hero */}
          <section className="relative z-10 pt-40 pb-24 bg-midnight-blue">
            {heroImageUrl && (
              <div className="absolute inset-0">
                <Image
                  src={heroImageUrl}
                  alt={sanityPost.title}
                  fill
                  className="object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight-blue to-transparent" />
              </div>
            )}
            <Container className="relative">
              <div className="max-w-3xl">
                <div className="flex items-center gap-4 mb-6">
                  <Badge variant={(sanityPost.category || "general") as "sailing" | "hunting" | "diving" | "fishing" | "general"}>
                    {sanityPost.category || "general"}
                  </Badge>
                  <span className="text-caption text-mist">
                    {formatDate(sanityPost.publishedAt)}
                  </span>
                </div>
                <h1 className="text-h1 text-salt-white mb-6">{sanityPost.title}</h1>
                {sanityPost.location?.name && (
                  <div className="flex items-center gap-4 text-sm text-mist">
                    <span className="font-mono">{sanityPost.location.name}</span>
                  </div>
                )}
              </div>
            </Container>
          </section>

          {/* Article Content */}
          <Section className="pb-24 md:pb-32">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <article className="lg:col-span-2">
                <div className="prose prose-invert prose-lg max-w-none prose-p:text-mist prose-headings:text-salt-white prose-a:text-copper-accent">
                  {sanityPost.excerpt ? (
                    <p className="text-xl text-mist leading-relaxed first-letter:text-5xl first-letter:font-display first-letter:text-copper-accent first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                      {sanityPost.excerpt}
                    </p>
                  ) : (
                    <div className="not-prose mb-8">
                      <MissingContent label="Excerpt missing" size="sm" />
                    </div>
                  )}
                  {sanityPost.contentHtml ? (
                    <div
                      className="not-prose"
                      dangerouslySetInnerHTML={{ __html: sanityPost.contentHtml }}
                    />
                  ) : (
                    <div className="not-prose bg-slate-water/30 rounded-lg py-8">
                      <MissingContent label="Content missing" size="md" />
                    </div>
                  )}
                </div>
              </article>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="sticky top-24 space-y-8">
                  {/* Location Card */}
                  {sanityPost.location?.name && (
                    <div className="card p-6 rounded-lg">
                      <h3 className="text-caption text-copper-accent mb-4">Location</h3>
                      <div className="text-salt-white font-medium">{sanityPost.location.name}</div>
                    </div>
                  )}

                  {/* Back Link */}
                  <Button href="/log" variant="ghost" className="w-full">
                    ← Back to Log
                  </Button>
                </div>
              </aside>
            </div>
          </Section>
        </main>
        <Footer />
      </>
    );
  }

  // No content found - return 404
  notFound();
}
