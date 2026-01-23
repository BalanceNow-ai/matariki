"use client";

import { useState } from "react";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Card } from "@/components/ui";
import { galleryImages } from "@/lib/data/mock";
import type { GalleryImage } from "@/types";

export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((image) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className="relative aspect-square rounded-lg overflow-hidden group bg-slate-water/50"
              >
                <div className="absolute inset-0 flex items-center justify-center text-mist">
                  <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-deep-ocean/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-sm text-salt-white line-clamp-2">{image.caption}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-deep-ocean/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-mist hover:text-salt-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-slate-water/50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-24 h-24 text-mist/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-salt-white text-lg mb-2">{selectedImage.caption}</p>
              <p className="text-caption text-mist">{selectedImage.category}</p>
              {selectedImage.exif && (
                <p className="text-xs text-storm-grey mt-2">
                  {selectedImage.exif.camera} • {selectedImage.exif.aperture} • {selectedImage.exif.shutter} • ISO {selectedImage.exif.iso}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
