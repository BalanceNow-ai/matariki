export interface Voyage {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: "planning" | "active" | "completed";
  heroImage?: string;
  waypoints?: Waypoint[];
}

export interface Position {
  coordinates: [number, number]; // [lng, lat]
  timestamp: string;
  source: "iridium" | "ais" | "manual";
  voyageId: string;
  weather?: {
    windSpeed: number;
    windDirection: number;
    conditions: string;
  };
}

export interface DMSCoordinate {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: "N" | "S" | "E" | "W";
}

export interface Waypoint {
  number: number;
  name?: string;
  latitude: DMSCoordinate;
  longitude: DMSCoordinate;
}

export interface LogEntry {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  voyageId: string;
  category: "sailing" | "hunting" | "diving" | "fishing" | "general";
  location?: {
    name: string;
    latitude?: DMSCoordinate;
    longitude?: DMSCoordinate;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  heroImage?: string;
  excerpt?: string;
  contentHtml?: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  caption: string;
  voyageId: string;
  category: string;
  takenAt: string;
  featured: boolean;
  exif?: {
    camera: string;
    lens: string;
    aperture: string;
    shutter: string;
    iso: string;
  };
}

export interface YachtSpecs {
  name: string;
  type: string;
  designer: string;
  builder: string;
  year: number;
  flag: string;
  description?: string;
  descriptionSections?: Array<{
    title?: string;
    content: string;
  }>;
  dimensions: {
    loa: string;
    lwl: string;
    beam: string;
    draft: string;
    displacement: string;
    ballast: string;
  };
  rig: {
    type: string;
    mastHeight: string;
    mainSail: string;
    genoa: string;
  };
  engine: {
    make: string;
    model: string;
    power: string;
    fuelCapacity: string;
  };
  tanks: {
    fuel: string;
    water: string;
    holding: string;
  };
  electronics: string[];
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  currentVoyageId: string;
  stats: {
    totalNauticalMiles: number;
    totalDaysAtSea: number;
    totalAnchorages: number;
    redStags: number;
    diveSites: number;
  };
  socialLinks: {
    instagram?: string;
    youtube?: string;
  };
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
}
