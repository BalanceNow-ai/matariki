import Image from "next/image";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel } from "@/components/ui";
import { galleryImages as mockGalleryImages } from "@/lib/data/mock";
import { client, projectId, dataset } from "@/sanity/client";
import { ALL_GALLERY_QUERY } from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urlFor(source: any) {
  if (!projectId || !dataset || !source) return null;
  return imageUrlBuilder({ projectId, dataset }).image(source);
}

type SanityGalleryImage = {
  _id: string;
  image: {
    asset: { _ref: string };
  };
  caption?: string;
  category?: string;
  voyage?: string;
};

const options = { next: { revalidate: 60 } };

export default async function GalleryPage() {
  let images: Array<{
    id: string;
    src: string;
    caption: string;
    category: string;
  }> = [];

  try {
    const sanityImages = await client.fetch<SanityGalleryImage[]>(
      ALL_GALLERY_QUERY,
      {},
      options
    );

    if (sanityImages && sanityImages.length > 0) {
      images = sanityImages
        .filter((img) => img.image?.asset)
        .map((img) => ({
          id: img._id,
          src: urlFor(img.image)?.width(800).height(800).url() || "",
          caption: img.caption || "",
          category: img.category || "general",
        }));
    }
  } catch (error) {
    console.error("Failed to fetch gallery from Sanity:", error);
  }

  // Fall back to mock data if no Sanity images
  if (images.length === 0) {
    images = mockGalleryImages.map((img) => ({
      id: img.id,
      src: img.src,
      caption: img.caption,
      category: img.category,
    }));
  }

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section>
          <div className="mb-12">
            <SectionLabel label="Gallery" className="mb-4" />
            <h1 className="text-h1 text-salt-white mb-4">Photo Gallery</h1>
            <p className="text-mist max-w-2xl">
              Captures from our voyages — landscapes, wildlife, sailing moments, and life at sea.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-4 mb-12 pb-8 border-b border-white/5">
            <select className="px-4 py-2 bg-midnight-blue/50 border border-mist/20 text-mist text-sm">
              <option>All Categories</option>
              <option>Landscapes</option>
              <option>Sailing</option>
              <option>Wildlife</option>
              <option>Diving</option>
            </select>
            <select className="px-4 py-2 bg-midnight-blue/50 border border-mist/20 text-mist text-sm">
              <option>All Voyages</option>
              <option>Fiordland 2026</option>
              <option>Bay of Islands 2025</option>
            </select>
          </div>

          {/* Gallery Grid */}
          <GalleryGrid images={images} />
        </Section>
      </main>
      <Footer />
    </>
  );
}
