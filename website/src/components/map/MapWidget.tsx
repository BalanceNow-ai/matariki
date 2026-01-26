"use client";

import Link from "next/link";

// Current position from SailLogger: 36°25'41.40" S, 174°49'8.53" E
// Location: Kawau Island, Auckland Region
const CURRENT_POSITION = {
  lat: -36.428167,
  lng: 174.819036,
  updated: "Nov 8, 2025",
  location: "Kawau Island",
  region: "Auckland Region, NZ",
};

interface MapWidgetProps {
  className?: string;
}

export function MapWidget({ className }: MapWidgetProps) {
  const { lat, lng } = CURRENT_POSITION;

  // Google Maps embed URL with marker
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}&z=12&output=embed`;

  return (
    <div className={`bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-xl shadow-2xl overflow-hidden ${className || ''}`}>
      {/* Google Maps embed */}
      <div className="aspect-[4/3] bg-slate-water relative overflow-hidden">
        <iframe
          src={mapUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="Matariki III Position"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      {/* Info panel */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
            <span className="text-xs font-medium text-sea-green uppercase tracking-wider">At Anchor</span>
          </div>
          <span className="text-xs text-storm-grey">
            {CURRENT_POSITION.updated}
          </span>
        </div>

        <div>
          <div className="text-lg text-salt-white font-display">{CURRENT_POSITION.location}</div>
          <div className="text-sm text-mist">{CURRENT_POSITION.region}</div>
          <div className="font-mono text-xs text-storm-grey mt-1">
            {Math.abs(lat).toFixed(4)}°S, {lng.toFixed(4)}°E
          </div>
        </div>

        <Link
          href="/track"
          className="block text-center py-2.5 text-sm text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider border-t border-mist/10 -mx-4 px-4 mt-3 pt-3 hover:bg-midnight-blue/30"
        >
          View Full Track →
        </Link>
      </div>
    </div>
  );
}
