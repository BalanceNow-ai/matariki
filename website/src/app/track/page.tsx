import Link from "next/link";
import { Header, Footer, Container } from "@/components/layout";
import { Card } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track",
  description:
    "Track the live position of Matariki III as we sail around New Zealand and the Pacific.",
};

// Current position from SailLogger: 36°25'41.40" S, 174°49'8.53" E
const CURRENT_POSITION = {
  lat: -36.428167,
  lng: 174.819036,
  updated: "Nov 8, 2025, 9:08 PM",
  location: "Bay of Islands, NZ",
  cruiseDistance: "724 miles",
  arrived: "Sep 12, 2025",
};

const SAILLOGGER_URL = "https://saillogger.com/svmatariki-iii";

export default function TrackPage() {
  const { lat, lng } = CURRENT_POSITION;

  // Google Maps embed URL - satellite view, zoomed to show context
  const mapUrl = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d100000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2snz!4v1699999999999!5m2!1sen!2snz`;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col">
        {/* Map Area - Full Screen */}
        <div className="flex-1 relative">
          {/* Google Maps embed */}
          <iframe
            src={mapUrl}
            className="absolute inset-0 w-full h-full border-0"
            title="Matariki III Live Tracking"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />

          {/* Position Info Panel */}
          <div className="absolute top-4 left-4 z-10 w-80 hidden md:block">
            <Card hoverable={false} className="p-5">
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
                  <span className="text-caption text-sea-green">At Anchor</span>
                </div>

                {/* Location */}
                <div>
                  <h2 className="text-xl text-salt-white font-display">
                    {CURRENT_POSITION.location}
                  </h2>
                  <div className="font-mono text-sm text-mist mt-1">
                    {Math.abs(lat).toFixed(4)}°S, {lng.toFixed(4)}°E
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-caption text-mist">Last Updated</div>
                    <div className="text-sm text-salt-white mt-1">
                      {CURRENT_POSITION.updated}
                    </div>
                  </div>
                  <div>
                    <div className="text-caption text-mist">Arrived</div>
                    <div className="text-sm text-salt-white mt-1">
                      {CURRENT_POSITION.arrived}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-caption text-mist">Cruise Distance</div>
                    <div className="text-sm text-salt-white mt-1">
                      {CURRENT_POSITION.cruiseDistance}
                    </div>
                  </div>
                </div>

                {/* SailLogger Links */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <div className="text-caption text-mist mb-3">More on SailLogger</div>
                  <a
                    href={`${SAILLOGGER_URL}/timelapse`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-mist hover:text-copper-accent transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    View Timelapse
                  </a>
                  <a
                    href={`${SAILLOGGER_URL}/stats`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-mist hover:text-copper-accent transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Statistics
                  </a>
                  <a
                    href={SAILLOGGER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-mist hover:text-copper-accent transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Full Tracking Data
                  </a>
                </div>
              </div>
            </Card>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 md:hidden">
            <Card className="rounded-t-2xl rounded-b-none p-4" hoverable={false}>
              <div className="w-12 h-1 bg-storm-grey rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
                    <span className="text-caption text-sea-green">At Anchor</span>
                  </div>
                  <div className="text-salt-white font-medium">{CURRENT_POSITION.location}</div>
                  <div className="font-mono text-xs text-mist">
                    {Math.abs(lat).toFixed(4)}°S, {lng.toFixed(4)}°E
                  </div>
                </div>
                <a
                  href={SAILLOGGER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-copper-accent uppercase tracking-wider"
                >
                  SailLogger →
                </a>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
