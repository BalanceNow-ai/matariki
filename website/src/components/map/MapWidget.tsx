"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

// Current position from SailLogger: 36°25'41.40" S, 174°49'8.53" E
const CURRENT_POSITION = {
  lat: -36.428167,
  lng: 174.819036,
  updated: "Nov 8, 2025",
  location: "Bay of Islands, NZ",
};

interface MapWidgetProps {
  className?: string;
}

export function MapWidget({ className }: MapWidgetProps) {
  const { lat, lng } = CURRENT_POSITION;

  // Google Maps embed URL
  const mapUrl = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d50000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2snz!4v1699999999999!5m2!1sen!2snz`;

  return (
    <Card className={className} hoverable={false}>
      <div className="relative">
        {/* Google Maps embed */}
        <div className="aspect-[4/3] bg-slate-water relative overflow-hidden rounded-t-lg">
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
              <span className="text-caption text-sea-green">Live Position</span>
            </div>
            <span className="text-xs text-storm-grey">
              Updated {CURRENT_POSITION.updated}
            </span>
          </div>

          <div>
            <div className="text-salt-white font-medium">{CURRENT_POSITION.location}</div>
            <div className="font-mono text-xs text-mist mt-1">
              {Math.abs(lat).toFixed(4)}°S, {Math.abs(lng).toFixed(4)}°E
            </div>
          </div>

          <Link
            href="/track"
            className="block text-center py-2 text-sm text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider border-t border-white/5 -mx-4 px-4 mt-3 pt-3"
          >
            View Full Track →
          </Link>
        </div>
      </div>
    </Card>
  );
}
