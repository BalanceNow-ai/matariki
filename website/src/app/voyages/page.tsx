import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { client, projectId, dataset } from "@/sanity/client";
import { VOYAGES_QUERY } from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voyages",
  description: "Explore the voyages of Matariki III around New Zealand and the Pacific.",
};

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urlFor(source: any) {
  if (!projectId || !dataset || !source) return null;
  return imageUrlBuilder({ projectId, dataset }).image(source);
}

type SanityVoyage = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  heroImage?: {
    asset: { _ref: string };
  };
};

const options = { next: { revalidate: 60 } };

export default async function VoyagesPage() {
  let voyages: SanityVoyage[] = [];

  try {
    voyages = await client.fetch<SanityVoyage[]>(VOYAGES_QUERY, {}, options);
  } catch (error) {
    console.error("Failed to fetch voyages from Sanity:", error);
  }

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section>
          <div className="mb-12">
            <SectionLabel label="Voyages" className="mb-4" />
            <h1 className="text-h1 text-salt-white mb-4">Our Expeditions</h1>
            <p className="text-mist max-w-2xl">
              Follow Matariki III on her voyages through New Zealand's remote waters and beyond.
            </p>
          </div>

          {voyages.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8">
              {voyages.map((voyage) => (
                <Link
                  key={voyage._id}
                  href={`/voyages/${voyage.slug?.current || voyage._id}`}
                  className="group block"
                >
                  <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-slate-water/50 mb-4">
                    {voyage.heroImage?.asset ? (
                      <Image
                        src={urlFor(voyage.heroImage)?.width(800).height(500).url() || ""}
                        alt={voyage.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-mist">
                        <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    {voyage.status && (
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 text-xs font-medium uppercase tracking-wider rounded-full ${
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
                  </div>
                  <h2 className="text-xl text-salt-white font-display mb-2 group-hover:text-copper-accent transition-colors">
                    {voyage.title}
                  </h2>
                  {voyage.description && (
                    <p className="text-mist text-sm line-clamp-2">{voyage.description}</p>
                  )}
                  {(voyage.startDate || voyage.endDate) && (
                    <p className="text-storm-grey text-xs mt-2">
                      {voyage.startDate && new Date(voyage.startDate).toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}
                      {voyage.endDate && ` — ${new Date(voyage.endDate).toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}`}
                      {!voyage.endDate && voyage.status === "active" && " — Present"}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-mist">No voyages found. Add voyages in the Sanity Studio.</p>
            </div>
          )}
        </Section>
      </main>
      <Footer />
    </>
  );
}
