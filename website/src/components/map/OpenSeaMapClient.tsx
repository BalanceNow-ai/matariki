"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Types for position data
export type VesselPosition = {
  latitude: number;
  longitude: number;
  timestamp: string;
  heading?: number;
  courseOverGround?: number;
  speedOverGround?: number;
};

type OpenSeaMapClientProps = {
  position: VesselPosition;
  trackHistory?: VesselPosition[];
  showTrack?: boolean;
  zoom?: number;
  className?: string;
};

// Create custom vessel icon (boat shape pointing in direction of travel)
function createVesselIcon(heading?: number): L.DivIcon {
  const rotation = heading ?? 0;

  return L.divIcon({
    className: "vessel-marker",
    html: `
      <div style="transform: rotate(${rotation}deg); transform-origin: center center;">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2L8 28L16 24L24 28L16 2Z" fill="#D97706" stroke="#FCD34D" stroke-width="1.5"/>
          <circle cx="16" cy="14" r="3" fill="#FCD34D"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

// Map view controller component
function MapViewController({
  position,
  autoCenter,
}: {
  position: VesselPosition;
  autoCenter: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (autoCenter) {
      map.setView([position.latitude, position.longitude], map.getZoom());
    }
  }, [map, position.latitude, position.longitude, autoCenter]);

  return null;
}

export function OpenSeaMapClient({
  position,
  trackHistory = [],
  showTrack = true,
  zoom = 12,
  className = "",
}: OpenSeaMapClientProps) {
  const [autoCenter, setAutoCenter] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  // Convert track history to polyline coordinates
  const trackCoords: [number, number][] = showTrack
    ? trackHistory.map((pos) => [pos.latitude, pos.longitude])
    : [];

  // Add current position to track if showing
  if (showTrack && trackCoords.length > 0) {
    trackCoords.push([position.latitude, position.longitude]);
  }

  // Format timestamp for popup
  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString("en-NZ", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={[position.latitude, position.longitude]}
        zoom={zoom}
        className="w-full h-full min-h-[400px]"
        ref={mapRef}
        zoomControl={true}
        attributionControl={true}
      >
        {/* Base layer: OpenStreetMap */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Marine overlay: OpenSeaMap */}
        <TileLayer
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a>'
        />

        {/* Track history polyline */}
        {showTrack && trackCoords.length > 1 && (
          <Polyline
            positions={trackCoords}
            pathOptions={{
              color: "#D97706",
              weight: 3,
              opacity: 0.7,
              dashArray: "5, 10",
            }}
          />
        )}

        {/* Vessel marker */}
        <Marker
          position={[position.latitude, position.longitude]}
          icon={createVesselIcon(position.heading ?? position.courseOverGround)}
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold text-base mb-1">Matariki III</h3>
              <p className="text-gray-600">
                {position.latitude.toFixed(5)}°,{" "}
                {position.longitude.toFixed(5)}°
              </p>
              {position.speedOverGround !== undefined && (
                <p>SOG: {position.speedOverGround.toFixed(1)} kts</p>
              )}
              {(position.heading ?? position.courseOverGround) !== undefined && (
                <p>
                  HDG:{" "}
                  {(position.heading ?? position.courseOverGround)?.toFixed(0)}°
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formatTimestamp(position.timestamp)}
              </p>
            </div>
          </Popup>
        </Marker>

        <MapViewController position={position} autoCenter={autoCenter} />
      </MapContainer>

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setAutoCenter(!autoCenter)}
          className={`px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-colors ${
            autoCenter
              ? "bg-copper-accent text-white"
              : "bg-white/90 text-slate-700 hover:bg-white"
          }`}
          title={autoCenter ? "Auto-center ON" : "Auto-center OFF"}
        >
          {autoCenter ? "Tracking" : "Track"}
        </button>
      </div>
    </div>
  );
}
