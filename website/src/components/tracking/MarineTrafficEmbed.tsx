"use client";

import { useEffect, useRef } from "react";

type MarineTrafficEmbedProps = {
  mmsi: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  height?: string;
  showNames?: boolean;
};

export function MarineTrafficEmbed({
  mmsi,
  latitude = -36.428,
  longitude = 174.819,
  zoom = 10,
  height = "100%",
  showNames = true,
}: MarineTrafficEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = "";

    // Create the script configuration
    const configScript = document.createElement("script");
    configScript.type = "text/javascript";
    configScript.text = `
      width='100%';
      height='${height}';
      border='0';
      shownames='${showNames}';
      latitude='${latitude}';
      longitude='${longitude}';
      zoom='${zoom}';
      maptype='0';
      trackvessel='${mmsi}';
      fleet='';
      remember='false';
      language='en';
      show_track='true';
    `;

    // Create the MarineTraffic embed script
    const embedScript = document.createElement("script");
    embedScript.type = "text/javascript";
    embedScript.src = "https://www.marinetraffic.com/js/embed.js";

    // Append scripts to container
    containerRef.current.appendChild(configScript);
    containerRef.current.appendChild(embedScript);

    return () => {
      // Cleanup on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [mmsi, latitude, longitude, zoom, height, showNames]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px]"
      style={{ height }}
    />
  );
}
