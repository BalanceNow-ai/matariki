import Link from "next/link";
import { Header, Footer, Container } from "@/components/layout";
import { Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track",
  description:
    "Track the live position of Matariki III as we sail around New Zealand and the Pacific.",
};

const SAILLOGGER_URL = "https://saillogger.com/svmatariki-iii";

export default function TrackPage() {
  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col">
        {/* Map Area - Full Screen Embed */}
        <div className="flex-1 relative">
          <iframe
            src={SAILLOGGER_URL}
            className="absolute inset-0 w-full h-full border-0"
            title="Matariki III Live Tracking"
            allowFullScreen
          />

          {/* Quick Links Panel */}
          <div className="absolute top-4 right-4 z-10">
            <div className="card p-4 rounded-lg space-y-3">
              <h3 className="text-caption text-copper-accent">Quick Links</h3>
              <div className="flex flex-col gap-2">
                <a
                  href={`${SAILLOGGER_URL}/timelapse`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-mist hover:text-salt-white transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Timelapse
                </a>
                <a
                  href={`${SAILLOGGER_URL}/stats`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-mist hover:text-salt-white transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Statistics
                </a>
                <a
                  href={SAILLOGGER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-mist hover:text-salt-white transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Open in SailLogger
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
