"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Position } from "@/types";

const SAILLOGGER_URL = "https://saillogger.com/svmatariki-iii";

interface MapWidgetProps {
  position?: Position;
  className?: string;
}

export function MapWidget({ className }: MapWidgetProps) {
  return (
    <Card className={className} hoverable={false}>
      <div className="relative">
        {/* SailLogger embed preview */}
        <div className="aspect-[4/3] bg-slate-water relative overflow-hidden">
          <iframe
            src={SAILLOGGER_URL}
            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
            title="Matariki III Position"
            loading="lazy"
          />
          {/* Click overlay to navigate to full track page */}
          <Link
            href="/track"
            className="absolute inset-0 z-10"
            aria-label="View full tracking map"
          />
        </div>

        {/* Info panel */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-caption text-copper-accent">Live Tracking</div>
              <div className="text-sm text-salt-white mt-1">via SailLogger</div>
            </div>
            <Link
              href="/track"
              className="text-xs text-copper-accent hover:text-copper-light transition-colors uppercase tracking-wider"
            >
              Full Screen →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
