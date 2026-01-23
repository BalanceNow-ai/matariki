import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import { yachtSpecs } from "@/lib/data/mock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Yacht",
  description: "Matariki III is an Oyster 68 blue-water cruising yacht designed for long-distance voyaging.",
};

export default function YachtPage() {
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
                {yachtSpecs.name}
              </h1>
              <p className="text-2xl text-copper-accent mb-6">{yachtSpecs.type}</p>
              <p className="text-mist leading-relaxed">
                Built by {yachtSpecs.builder} in the UK and designed by {yachtSpecs.designer},
                Matariki III is a blue-water cruising yacht designed for long-distance voyaging
                in comfort and safety. Flying the {yachtSpecs.flag} flag since {yachtSpecs.year}.
              </p>
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
                {Object.entries(yachtSpecs.dimensions).map(([key, value]) => (
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
                {Object.entries(yachtSpecs.rig).map(([key, value]) => (
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
                {Object.entries(yachtSpecs.engine).map(([key, value]) => (
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
                {Object.entries(yachtSpecs.tanks).map(([key, value]) => (
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
        <Section>
          <h2 className="text-h3 text-salt-white mb-6">Electronics & Navigation</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {yachtSpecs.electronics.map((item, index) => (
              <div key={index} className="card p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-sea-green rounded-full" />
                  <span className="text-salt-white">{item}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Image Gallery Placeholder */}
        <Section background="dark">
          <SectionLabel label="Gallery" className="mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-slate-water/50 rounded-lg flex items-center justify-center">
                <svg className="w-12 h-12 text-mist/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
