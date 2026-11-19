"use client";

import dynamic from "next/dynamic";
import type { LegMapClientProps } from "./LegMapClient";

// Leaflet touches `window`, so the map only renders in the browser.
const LegMapInner = dynamic(() => import("./LegMapClient").then((m) => m.LegMapClient), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-water/50">
      <div className="text-mist animate-pulse">Loading chart…</div>
    </div>
  ),
});

export function LegMap(props: LegMapClientProps) {
  const hasLines = props.tracks.some((t) => t.coords.length >= 2) || (props.routeLines?.length ?? 0) > 0;
  if (!hasLines) return null;
  return (
    <div className="aspect-[16/9] md:aspect-[21/9] rounded-lg overflow-hidden border border-mist/20 bg-slate-water/50">
      <LegMapInner {...props} className="w-full h-full" />
    </div>
  );
}

export type { MapTrack } from "./LegMapClient";
