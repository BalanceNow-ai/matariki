"use client";

type MarineTrafficEmbedProps = {
  mmsi: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  showNames?: boolean;
  height?: string;
};

export function MarineTrafficEmbed({
  mmsi,
  latitude = -36.428,
  longitude = 174.819,
  zoom = 10,
  showNames = true,
  height,
}: MarineTrafficEmbedProps) {
  // Build the MarineTraffic embed URL with parameters
  const params = new URLSearchParams({
    width: "100%",
    height: "100%",
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    zoom: zoom.toString(),
    maptype: "4", // 0=Normal, 1=Satellite, 4=Dark
    shownames: showNames ? "true" : "false",
    mmsi: mmsi,
    clicktoact: "true",
    fleet: "",
    remember: "false",
    show_track: "true",
  });

  const embedUrl = `https://www.marinetraffic.com/en/ais/embed/maptype:4/zoom:${zoom}/centery:${latitude}/centerx:${longitude}/mmsi:${mmsi}/shownames:${showNames}/clicktoact:true/remember:false`;

  return (
    <iframe
      src={embedUrl}
      className="w-full h-full min-h-[400px] border-0"
      style={height ? { height } : undefined}
      title="MarineTraffic Live Map - Matariki III"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
