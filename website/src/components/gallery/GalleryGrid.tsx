"use client";

import { useState } from "react";
import Image from "next/image";

type GalleryItem = {
  id: string;
  src: string;
  caption: string;
  category: string;
  type?: "image" | "video";
  videoUrl?: string;
  duration?: string;
};

interface GalleryGridProps {
  items: GalleryItem[];
  // Legacy support
  images?: GalleryItem[];
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : null;
}

export function GalleryGrid({ items, images }: GalleryGridProps) {
  // Support both new items prop and legacy images prop
  const mediaItems = items || images || [];
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const handleItemClick = (item: GalleryItem) => {
    if (item.type === "video" && item.videoUrl) {
      setSelectedItem(item);
    } else {
      setSelectedItem(item);
    }
  };

  const getEmbedUrl = (item: GalleryItem): string | null => {
    if (!item.videoUrl) return null;

    if (item.videoUrl.includes("youtube") || item.videoUrl.includes("youtu.be")) {
      return getYouTubeEmbedUrl(item.videoUrl);
    }
    if (item.videoUrl.includes("vimeo")) {
      return getVimeoEmbedUrl(item.videoUrl);
    }
    return null;
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="relative aspect-square rounded-lg overflow-hidden group bg-slate-water/50"
          >
            {item.src ? (
              <Image
                src={item.src}
                alt={item.caption || "Gallery item"}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-mist">
                <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Video play button overlay */}
            {item.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-deep-ocean/80 flex items-center justify-center group-hover:bg-copper-accent/90 transition-colors">
                  <svg className="w-8 h-8 text-salt-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                {item.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-deep-ocean/80 rounded text-xs text-salt-white">
                    {item.duration}
                  </div>
                )}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-deep-ocean/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-sm text-salt-white line-clamp-2">{item.caption}</p>
                {item.type === "video" && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-copper-accent/20 text-copper-accent text-xs rounded">
                    Video
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-deep-ocean/95 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-mist hover:text-salt-white transition-colors z-10"
            onClick={() => setSelectedItem(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-video bg-slate-water/50 rounded-lg overflow-hidden mb-4">
              {selectedItem.type === "video" && selectedItem.videoUrl ? (
                // Video embed
                <iframe
                  src={getEmbedUrl(selectedItem) || selectedItem.videoUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedItem.caption}
                />
              ) : selectedItem.src ? (
                // Image
                <Image
                  src={selectedItem.src}
                  alt={selectedItem.caption || "Gallery image"}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-24 h-24 text-mist/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-salt-white text-lg mb-2">{selectedItem.caption}</p>
              <p className="text-caption text-mist capitalize">
                {selectedItem.type === "video" ? "Video • " : ""}
                {selectedItem.category}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
