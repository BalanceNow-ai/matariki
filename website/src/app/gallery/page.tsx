import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, MissingContent } from "@/components/ui";
import { client, projectId, dataset, fetchOptions } from "@/sanity/client";
import { ALL_GALLERY_QUERY, ALL_VIDEOS_QUERY } from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";

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

type SanityVideo = {
  _id: string;
  title: string;
  description?: string;
  videoType: "youtube" | "vimeo" | "file";
  youtubeUrl?: string;
  vimeoUrl?: string;
  thumbnail?: {
    asset: { _ref: string };
  };
  category?: string;
  duration?: string;
  featured?: boolean;
  voyage?: string;
};

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

export type GalleryItem = {
  id: string;
  src: string;
  caption: string;
  category: string;
  voyage?: string;
  type: "image" | "video";
  videoUrl?: string;
  duration?: string;
};

export default async function GalleryPage() {
  let images: GalleryItem[] = [];
  let videos: GalleryItem[] = [];

  try {
    const [sanityImages, sanityVideos] = await Promise.all([
      client.fetch<SanityGalleryImage[]>(ALL_GALLERY_QUERY, {}, fetchOptions),
      client.fetch<SanityVideo[]>(ALL_VIDEOS_QUERY, {}, fetchOptions),
    ]);

    if (sanityImages && sanityImages.length > 0) {
      images = sanityImages
        .filter((img) => img.image?.asset)
        .map((img) => ({
          id: img._id,
          src: urlFor(img.image)?.width(800).height(800).url() || "",
          caption: img.caption || "",
          category: img.category || "general",
          voyage: img.voyage,
          type: "image" as const,
        }));
    }

    if (sanityVideos && sanityVideos.length > 0) {
      videos = sanityVideos
        .map((video) => {
          let thumbnailUrl = "";
          let videoUrl = "";

          // Get thumbnail - use custom or YouTube auto-thumbnail
          if (video.thumbnail?.asset) {
            thumbnailUrl = urlFor(video.thumbnail)?.width(800).height(450).url() || "";
          } else if (video.videoType === "youtube" && video.youtubeUrl) {
            const ytId = getYouTubeId(video.youtubeUrl);
            if (ytId) {
              thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }
          }

          // Get video URL
          if (video.youtubeUrl) videoUrl = video.youtubeUrl;
          else if (video.vimeoUrl) videoUrl = video.vimeoUrl;

          return {
            id: video._id,
            src: thumbnailUrl,
            caption: video.title || "",
            category: video.category || "general",
            voyage: video.voyage,
            type: "video" as const,
            videoUrl,
            duration: video.duration,
          };
        })
        .filter((v) => v.videoUrl);
    }
  } catch (error) {
    console.error("Failed to fetch gallery from Sanity:", error);
  }

  // Combine images and videos (videos first if featured)
  const allMedia: GalleryItem[] = [...videos, ...images];

  // Extract unique categories and voyages for filters
  const categories = [...new Set(allMedia.map((item) => item.category).filter(Boolean))];
  const voyages = [...new Set(allMedia.map((item) => item.voyage).filter(Boolean))] as string[];

  return (
    <>
      <Header />
      <main className="pt-20">
        <Section>
          <div className="mb-12">
            <SectionLabel label="Gallery" className="mb-4" />
            <h1 className="text-h1 text-salt-white mb-4">Photos & Videos</h1>
            <p className="text-mist max-w-2xl">
              Captures from our voyages — landscapes, wildlife, sailing moments, and life at sea.
            </p>
          </div>

          {/* Gallery Grid with Filters */}
          {allMedia.length > 0 ? (
            <GalleryGrid items={allMedia} categories={categories} voyages={voyages} />
          ) : (
            <div className="bg-slate-water/30 rounded-lg py-12">
              <MissingContent label="No gallery images in Sanity" size="lg" />
            </div>
          )}
        </Section>
      </main>
      <Footer />
    </>
  );
}
