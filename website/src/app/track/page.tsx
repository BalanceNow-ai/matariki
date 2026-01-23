import { Header, Footer, Container } from "@/components/layout";
import { Card } from "@/components/ui";
import { currentPosition, voyages } from "@/lib/data/mock";
import { formatCoordinates, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track",
  description: "Track the live position of Matariki III as we sail around New Zealand and the Pacific.",
};

export default function TrackPage() {
  const [lng, lat] = currentPosition.coordinates;
  const currentVoyage = voyages.find((v) => v.id === currentPosition.voyageId);

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col">
        {/* Map Area */}
        <div className="flex-1 relative">
          {/* Map Placeholder */}
          <div className="absolute inset-0 bg-slate-water">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-24 h-24 text-mist/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-mist text-lg">Interactive Map</p>
                <p className="text-storm-grey text-sm mt-2">Mapbox integration coming soon</p>
              </div>
            </div>

            {/* Position Marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-8 h-8 bg-sea-green rounded-full animate-ping absolute opacity-50" />
                <div className="w-8 h-8 bg-sea-green rounded-full relative flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="absolute top-4 left-4 bottom-4 w-80 hidden md:block">
            <Card className="h-full p-6 overflow-auto" hoverable={false}>
              <div className="space-y-6">
                {/* Current Position */}
                <div>
                  <h2 className="text-caption text-copper-accent mb-3">Current Position</h2>
                  <div className="font-mono text-salt-white text-lg">
                    {formatCoordinates(lat, lng)}
                  </div>
                  <div className="text-xs text-storm-grey mt-1">
                    Last updated: {formatDate(currentPosition.timestamp)}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h2 className="text-caption text-copper-accent mb-3">Status</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
                    <span className="text-salt-white">Underway</span>
                  </div>
                </div>

                {/* Current Voyage */}
                {currentVoyage && (
                  <div>
                    <h2 className="text-caption text-copper-accent mb-3">Current Voyage</h2>
                    <div className="text-salt-white">{currentVoyage.title}</div>
                    <div className="text-sm text-mist mt-1">{currentVoyage.description}</div>
                  </div>
                )}

                {/* Weather */}
                {currentPosition.weather && (
                  <div>
                    <h2 className="text-caption text-copper-accent mb-3">Conditions</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-mist">Wind</div>
                        <div className="text-salt-white font-mono">
                          {currentPosition.weather.windSpeed} kts
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-mist">Direction</div>
                        <div className="text-salt-white font-mono">
                          {currentPosition.weather.windDirection}°
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Voyage Selector */}
                <div>
                  <h2 className="text-caption text-copper-accent mb-3">View Voyage</h2>
                  <select className="w-full px-4 py-2 bg-midnight-blue/50 border border-mist/20 text-salt-white text-sm">
                    {voyages.map((voyage) => (
                      <option key={voyage.id} value={voyage.id}>
                        {voyage.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 md:hidden">
            <Card className="rounded-t-2xl p-6" hoverable={false}>
              <div className="w-12 h-1 bg-storm-grey rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-caption text-copper-accent">Position</div>
                  <div className="font-mono text-salt-white">
                    {formatCoordinates(lat, lng)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sea-green">
                  <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
                  <span className="text-sm">Underway</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
