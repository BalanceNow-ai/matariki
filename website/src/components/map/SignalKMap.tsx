"use client";

import { useEffect, useRef, useState } from "react";
import type { Map, Marker } from "mapbox-gl";
import { useSignalK, formatCoordinates, toKnots, timeSince } from "@/hooks/useSignalK";

import "mapbox-gl/dist/mapbox-gl.css";

interface SignalKMapProps {
  className?: string;
  /** Show vessel info panel */
  showInfo?: boolean;
  /** Initial zoom level */
  zoom?: number;
  /** Map style */
  style?: "satellite" | "nautical" | "dark" | "light";
}

const MAP_STYLES = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  nautical: "mapbox://styles/mapbox/outdoors-v12", // Best free option for water
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
};

export function SignalKMap({
  className,
  showInfo = true,
  zoom = 12,
  style = "satellite",
}: SignalKMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);

  const { position, isLoading, error, lastUpdated } = useSignalK({
    pollInterval: 30000, // Update every 30 seconds
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize Mapbox map
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setMapError("Mapbox token not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local");
      return;
    }

    if (!mapContainerRef.current) return;

    const initMap = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;

        mapboxgl.accessToken = token;

        const initialCenter: [number, number] = position
          ? [position.longitude, position.latitude]
          : [174.3278, -35.7275]; // Default: Whangarei

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: MAP_STYLES[style],
          center: initialCenter,
          zoom: zoom,
          attributionControl: false,
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.addControl(
          new mapboxgl.AttributionControl({ compact: true }),
          "bottom-left"
        );

        map.on("load", () => {
          setMapLoaded(true);
          mapRef.current = map;

          // Create custom marker element
          const el = document.createElement("div");
          el.className = "vessel-marker";
          el.innerHTML = `
            <div class="vessel-marker-inner">
              <div class="vessel-marker-pulse"></div>
              <div class="vessel-marker-dot"></div>
            </div>
          `;

          // Add marker
          markerRef.current = new mapboxgl.Marker({
            element: el,
            anchor: "center",
          })
            .setLngLat(initialCenter)
            .addTo(map);
        });

        map.on("error", (e) => {
          console.error("[Map] Error:", e);
          setMapError("Failed to load map");
        });
      } catch (err) {
        console.error("[Map] Init error:", err);
        setMapError("Failed to initialize map");
      }
    };

    initMap();

    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, zoom]);

  // Update marker position when position changes
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !position) return;

    const lngLat: [number, number] = [position.longitude, position.latitude];

    // Animate to new position
    mapRef.current.flyTo({
      center: lngLat,
      duration: 1000,
    });

    markerRef.current.setLngLat(lngLat);

    // Update marker rotation if heading is available
    if (position.heading !== undefined) {
      const el = markerRef.current.getElement();
      el.style.transform = `rotate(${position.heading}deg)`;
    }
  }, [position]);

  const speedKnots = position?.speedOverGround
    ? toKnots(position.speedOverGround)
    : undefined;

  return (
    <div className={`relative bg-slate-water ${className || ""}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Loading State */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-deep-ocean/80">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-copper-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-mist text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-deep-ocean/90">
          <div className="text-center p-6 max-w-md">
            <div className="text-warning-red text-4xl mb-3">⚠</div>
            <p className="text-salt-white font-medium mb-2">Map Unavailable</p>
            <p className="text-mist text-sm">{mapError}</p>
          </div>
        </div>
      )}

      {/* Vessel Info Panel */}
      {showInfo && position && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-deep-ocean/95 backdrop-blur-sm border border-mist/20 rounded-lg p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-sea-green rounded-full animate-pulse" />
            <span className="text-xs font-medium text-sea-green uppercase tracking-wider">
              {position.source === "signalk" ? "Live Signal K" : "Last Known"}
            </span>
            <span className="ml-auto text-xs text-storm-grey">
              {timeSince(position.timestamp)}
            </span>
          </div>

          <h3 className="text-lg text-salt-white font-display mb-2">
            {position.name || "Matariki III"}
          </h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-storm-grey text-xs uppercase tracking-wider mb-1">
                Position
              </div>
              <div className="text-mist font-mono text-xs">
                {formatCoordinates(position.latitude, position.longitude)}
              </div>
            </div>

            {speedKnots !== undefined && (
              <div>
                <div className="text-storm-grey text-xs uppercase tracking-wider mb-1">
                  Speed
                </div>
                <div className="text-mist">
                  <span className="font-mono">{speedKnots.toFixed(1)}</span> kts
                </div>
              </div>
            )}

            {position.courseOverGround !== undefined && (
              <div>
                <div className="text-storm-grey text-xs uppercase tracking-wider mb-1">
                  Course
                </div>
                <div className="text-mist">
                  <span className="font-mono">
                    {position.courseOverGround.toFixed(0)}
                  </span>
                  °
                </div>
              </div>
            )}

            {position.heading !== undefined && (
              <div>
                <div className="text-storm-grey text-xs uppercase tracking-wider mb-1">
                  Heading
                </div>
                <div className="text-mist">
                  <span className="font-mono">{position.heading.toFixed(0)}</span>°
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 text-xs text-warning-red/80 border-t border-mist/10 pt-2">
              Update error: {error}
            </div>
          )}
        </div>
      )}

      {/* Marker Styles */}
      <style jsx global>{`
        .vessel-marker {
          width: 40px;
          height: 40px;
        }
        .vessel-marker-inner {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .vessel-marker-pulse {
          position: absolute;
          inset: 0;
          background: rgba(61, 122, 110, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        }
        .vessel-marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #3d7a6e 0%, #2d5a50 100%);
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
