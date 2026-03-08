import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, MissingContent } from "@/components/ui";
import { client, projectId, dataset, fetchOptions } from "@/sanity/client";
import { VESSEL_QUERY } from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Yacht",
  description: "Matariki III is an Oyster 68 blue-water cruising yacht designed for long-distance voyaging.",
};

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urlFor(source: any) {
  if (!projectId || !dataset || !source) return null;
  return imageUrlBuilder({ projectId, dataset }).image(source);
}

type GalleryImage = {
  _key: string;
  asset: { _ref: string };
  caption?: string;
};

type DescriptionSection = {
  title?: string;
  content: string;
};

type VesselData = {
  _id: string;
  name: string;
  type: string;
  designer: string;
  builder: string;
  year: number;
  flag: string;
  description?: string;
  descriptionSections?: DescriptionSection[];
  dimensions?: {
    loa?: string;
    lwl?: string;
    beam?: string;
    draft?: string;
    displacement?: string;
    ballast?: string;
  };
  rig?: {
    type?: string;
    mastHeight?: string;
    mainSail?: string;
    genoa?: string;
  };
  engine?: {
    make?: string;
    model?: string;
    power?: string;
    fuelCapacity?: string;
  };
  tanks?: {
    fuel?: string;
    water?: string;
    holding?: string;
  };
  electronics?: string[];
  gallery?: GalleryImage[];
} | null;

export default async function YachtPage() {
  let vessel: VesselData = null;

  try {
    vessel = await client.fetch<VesselData>(VESSEL_QUERY, {}, fetchOptions);
  } catch (error) {
    console.error("Failed to fetch vessel from Sanity:", error);
  }

  // If no vessel data, show missing content
  if (!vessel) {
    return (
      <>
        <Header />
        <main className="pt-20">
          <section className="relative py-24 bg-midnight-blue">
            <div className="container-site">
              <div className="max-w-3xl">
                <SectionLabel label="The Vessel" className="mb-4" />
                <div className="bg-slate-water/30 rounded-lg py-12">
                  <MissingContent label="Vessel data not configured in Sanity" size="lg" />
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const dimensions = vessel.dimensions || {};
  const rig = vessel.rig || {};
  const engine = vessel.engine || {};
  const tanks = vessel.tanks || {};
  const electronics = vessel.electronics || [];
  const descriptionSections = vessel.descriptionSections || [];

  // Transform gallery images for GalleryGrid component
  const galleryItems = (vessel.gallery || [])
    .filter((img) => img.asset)
    .map((img) => ({
      id: img._key,
      src: urlFor(img)?.width(800).height(800).url() || "",
      caption: img.caption || "",
      category: "yacht",
      type: "image" as const,
    }));

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="The Vessel" className="mb-4" />
              <h1 className="text-display text-salt-white mb-4">
                {vessel.name || <span className="text-red-400">Name missing</span>}
              </h1>
              <p className="text-2xl text-copper-accent mb-6">{vessel.type || <span className="text-red-400">Type missing</span>}</p>

              {/* Description Sections */}
              {descriptionSections.length > 0 ? (
                <div className="space-y-6">
                  {descriptionSections.map((section, index) => (
                    <div key={index}>
                      {section.title && (
                        <h3 className="text-lg text-salt-white font-medium mb-2">{section.title}</h3>
                      )}
                      <p className="text-mist leading-relaxed">{section.content}</p>
                    </div>
                  ))}
                </div>
              ) : vessel.description ? (
                <p className="text-mist leading-relaxed">{vessel.description}</p>
              ) : (
                <p className="text-mist leading-relaxed">
                  Built by {vessel.builder || "—"} in the UK and designed by {vessel.designer || "—"},
                  Matariki III is a blue-water cruising yacht designed for long-distance voyaging
                  in comfort and safety. Flying the {vessel.flag || "—"} flag since {vessel.year || "—"}.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Specifications */}
        <Section>
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Dimensions */}
            <div>
              <h2 className="text-h3 text-salt-white mb-6">Dimensions</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(dimensions).filter(([_, v]) => v).map(([key, value]) => (
                  <div key={key} className="border-l-2 border-copper-accent/30 pl-4 py-2">
                    <div className="text-caption text-mist uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-salt-white font-mono text-lg">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rig */}
            <div>
              <h2 className="text-h3 text-salt-white mb-6">Rig</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(rig).filter(([_, v]) => v).map(([key, value]) => (
                  <div key={key} className="border-l-2 border-copper-accent/30 pl-4 py-2">
                    <div className="text-caption text-mist uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-salt-white font-mono text-lg">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Engine & Tanks */}
        <Section background="dark">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Engine */}
            <div>
              <h2 className="text-h3 text-salt-white mb-6">Engine</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(engine).filter(([_, v]) => v).map(([key, value]) => (
                  <div key={key} className="border-l-2 border-copper-accent/30 pl-4 py-2">
                    <div className="text-caption text-mist uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-salt-white font-mono text-lg">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tanks */}
            <div>
              <h2 className="text-h3 text-salt-white mb-6">Tanks</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(tanks).filter(([_, v]) => v).map(([key, value]) => (
                  <div key={key} className="border-l-2 border-copper-accent/30 pl-4 py-2">
                    <div className="text-caption text-mist uppercase">{key}</div>
                    <div className="text-salt-white font-mono text-lg">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Electronics */}
        {electronics.length > 0 && (
          <Section>
            <h2 className="text-h3 text-salt-white mb-6">Electronics & Navigation</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {electronics.map((item, index) => (
                <div key={index} className="card p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-sea-green rounded-full" />
                    <span className="text-salt-white">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Image Gallery */}
        <Section background="dark">
          <SectionLabel label="Gallery" className="mb-8" />
          {galleryItems.length > 0 ? (
            <GalleryGrid items={galleryItems} />
          ) : (
            <div className="bg-slate-water/30 rounded-lg py-12">
              <MissingContent label="No gallery images in Sanity vessel document" size="lg" />
            </div>
          )}
        </Section>
      </main>
      <Footer />
    </>
  );
}
