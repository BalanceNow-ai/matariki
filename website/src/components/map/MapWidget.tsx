"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatCoordinates } from "@/lib/utils";
import type { Position } from "@/types";

interface MapWidgetProps {
  position: Position;
  className?: string;
}

export function MapWidget({ position, className }: MapWidgetProps) {
  const [lng, lat] = position.coordinates;

  return (
    <Card className={className} hoverable={false}>
      <div className="relative">
        {/* Static map placeholder - in production would use Mapbox static API */}
        <div className="aspect-[4/3] bg-slate-water relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/images/map-placeholder.svg')] bg-cover bg-center opacity-30" />

          {/* Position marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-4 h-4 bg-sea-green rounded-full animate-ping absolute" />
              <div className="w-4 h-4 bg-sea-green rounded-full relative" />
            </div>
          </div>

          {/* Coordinates overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-deep-ocean/90 to-transparent p-4">
            <div className="font-mono text-xs text-mist">Current Position</div>
            <div className="font-mono text-sm text-salt-white mt-1">
              {formatCoordinates(lat, lng)}
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-caption text-copper-accent">Status</div>
              <div className="text-sm text-salt-white mt-1">Underway</div>
            </div>
            <Link
              href="/track"
              className="text-xs text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider"
            >
              View Track →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
