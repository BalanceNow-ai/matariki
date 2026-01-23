import { notFound } from "next/navigation";
import Link from "next/link";
import { Header, Footer, Section, Container } from "@/components/layout";
import { Badge, Button } from "@/components/ui";
import { logEntries } from "@/lib/data/mock";
import { formatDate, formatCoordinates } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return logEntries.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = logEntries.find((p) => p.slug === slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function LogEntryPage({ params }: Props) {
  const { slug } = await params;
  const post = logEntries.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const [lng, lat] = post.location.coordinates;

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <Container>
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-6">
                <Badge variant={post.category}>{post.category}</Badge>
                <span className="text-caption text-mist">
                  {formatDate(post.publishedAt)}
                </span>
              </div>
              <h1 className="text-h1 text-salt-white mb-6">{post.title}</h1>
              <div className="flex items-center gap-4 text-sm text-mist">
                <span className="font-mono">{post.location.name}</span>
                <span className="text-storm-grey">|</span>
                <span className="font-mono text-xs">
                  {formatCoordinates(lat, lng)}
                </span>
              </div>
            </div>
          </Container>
        </section>

        {/* Article Content */}
        <Section>
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <article className="lg:col-span-2">
              <div className="prose prose-invert prose-lg max-w-none">
                <p className="text-xl text-mist leading-relaxed first-letter:text-5xl first-letter:font-display first-letter:text-copper-accent first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                  {post.excerpt}
                </p>
                <p className="text-mist leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <p className="text-mist leading-relaxed">
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
                <h2 className="text-h3 text-salt-white mt-12 mb-4">The Journey Continues</h2>
                <p className="text-mist leading-relaxed">
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                </p>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 space-y-8">
                {/* Location Card */}
                <div className="card p-6 rounded-lg">
                  <h3 className="text-caption text-copper-accent mb-4">Location</h3>
                  <div className="aspect-video bg-slate-water/50 rounded-lg mb-4 flex items-center justify-center">
                    <svg className="w-12 h-12 text-mist/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-salt-white font-medium">{post.location.name}</div>
                  <div className="text-caption text-mist mt-1">
                    {formatCoordinates(lat, lng)}
                  </div>
                </div>

                {/* Weather Card */}
                {post.weather && (
                  <div className="card p-6 rounded-lg">
                    <h3 className="text-caption text-copper-accent mb-4">Conditions</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-mist">Weather</span>
                        <span className="text-salt-white capitalize">{post.weather.conditions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mist">Wind</span>
                        <span className="text-salt-white">{post.weather.windSpeed} kts</span>
                      </div>
                    </div>
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
