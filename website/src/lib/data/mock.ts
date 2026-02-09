import type {
  Voyage,
  Position,
  LogEntry,
  GalleryImage,
  YachtSpecs,
  SiteSettings,
  CrewMember,
} from "@/types";

export const siteSettings: SiteSettings = {
  siteName: "Matariki III",
  tagline: "Oyster 68 Adventures",
  description:
    "Following the voyages of Matariki III around New Zealand and the Pacific",
  currentVoyageId: "fiordland-2026",
  stats: {
    totalNauticalMiles: 12847,
    totalDaysAtSea: 342,
    totalAnchorages: 156,
    redStags: 23,
    diveSites: 89,
  },
  socialLinks: {
    instagram: "https://instagram.com/sailingmatariki",
    youtube: "https://youtube.com/@matariki3",
  },
};

export const voyages: Voyage[] = [
  {
    id: "fiordland-2026",
    title: "Fiordland & Stewart Island 2026",
    slug: "fiordland-2026",
    description:
      "Nine weeks through New Zealand's wildest coastline — hunting, diving, and fishing from Milford Sound through the fiords to Stewart Island.",
    startDate: "2026-02-20",
    endDate: "2026-04-18",
    status: "active",
    heroImage: "/images/fiordland-hero.jpg",
  },
  {
    id: "bay-of-islands-2025",
    title: "Bay of Islands Summer",
    slug: "bay-of-islands-2025",
    description:
      "A summer cruise through the beautiful Bay of Islands and surrounding waters.",
    startDate: "2025-12-01",
    endDate: "2026-01-10",
    status: "completed",
    heroImage: "/images/boi-hero.jpg",
  },
];

export const currentPosition: Position = {
  coordinates: [167.1543, -45.4321],
  timestamp: "2026-01-23T14:30:00Z",
  source: "iridium",
  voyageId: "fiordland-2026",
  weather: {
    windSpeed: 15,
    windDirection: 225,
    conditions: "partly_cloudy",
  },
};

export const logEntries: LogEntry[] = [
  {
    id: "4",
    title: "Fiordland & Stewart Island: The Expedition Plan",
    slug: "fiordland-stewart-island-expedition-plan",
    publishedAt: "2026-02-01T09:00:00Z",
    voyageId: "fiordland-2026",
    category: "sailing",
    location: {
      name: "Milford Sound",
      coordinates: [167.9256, -44.6414],
    },
    heroImage: "/images/fiordland-expedition.jpg",
    excerpt:
      "Nine weeks through New Zealand's wildest coastline — from Milford Sound to Stewart Island. A comprehensive plan for hunting, diving, and fishing aboard Matariki III, timed to hit the roar in Fiordland's most remote country.",
    body: "Full expedition schedule available in post...",
  },
  {
    id: "1",
    title: "Into the Fiords",
    slug: "into-the-fiords",
    publishedAt: "2026-01-22T10:00:00Z",
    voyageId: "fiordland-2026",
    category: "sailing",
    location: {
      name: "Doubtful Sound",
      coordinates: [166.9876, -45.3210],
    },
    heroImage: "/images/doubtful-sound.jpg",
    excerpt:
      "After weeks of preparation, we finally entered the ethereal waters of Doubtful Sound. The sheer granite walls rose dramatically from the inky depths...",
    body: "Full article content here...",
    gallery: ["/images/gallery-1.jpg", "/images/gallery-2.jpg"],
    weather: {
      conditions: "overcast",
      windSpeed: 10,
      windDirection: 180,
    },
  },
  {
    id: "2",
    title: "Dawn Stalk in the Bush",
    slug: "dawn-stalk-bush",
    publishedAt: "2026-01-20T08:00:00Z",
    voyageId: "fiordland-2026",
    category: "hunting",
    location: {
      name: "Secretary Island",
      coordinates: [166.8234, -45.2567],
    },
    heroImage: "/images/hunting-dawn.jpg",
    excerpt:
      "The pre-dawn mist hung low over the native bush as I made my way up the ridge. The silence was broken only by the calls of bellbirds...",
    body: "Full article content here...",
    weather: {
      conditions: "misty",
      windSpeed: 5,
      windDirection: 90,
    },
  },
  {
    id: "3",
    title: "Diving the Deep Cove",
    slug: "diving-deep-cove",
    publishedAt: "2026-01-18T14:00:00Z",
    voyageId: "fiordland-2026",
    category: "diving",
    location: {
      name: "Deep Cove",
      coordinates: [167.1432, -45.4523],
    },
    heroImage: "/images/diving-cove.jpg",
    excerpt:
      "The unique conditions of Fiordland create a diving experience unlike anywhere else on Earth. The freshwater layer creates darkness that allows deep-water species to thrive near the surface...",
    body: "Full article content here...",
    gallery: ["/images/underwater-1.jpg", "/images/underwater-2.jpg"],
  },
];

export const galleryImages: GalleryImage[] = [
  {
    id: "1",
    src: "/images/gallery/fiord-dawn.jpg",
    caption: "Dawn breaking over Doubtful Sound",
    voyageId: "fiordland-2026",
    category: "landscapes",
    takenAt: "2026-01-21T06:30:00Z",
    featured: true,
    exif: {
      camera: "Sony A7R V",
      lens: "24-70mm f/2.8",
      aperture: "f/8",
      shutter: "1/125",
      iso: "400",
    },
  },
  {
    id: "2",
    src: "/images/gallery/matariki-anchor.jpg",
    caption: "Matariki III at anchor in a secluded bay",
    voyageId: "fiordland-2026",
    category: "sailing",
    takenAt: "2026-01-20T17:00:00Z",
    featured: true,
  },
  {
    id: "3",
    src: "/images/gallery/dolphin-bow.jpg",
    caption: "Bottlenose dolphins riding the bow wave",
    voyageId: "fiordland-2026",
    category: "wildlife",
    takenAt: "2026-01-19T11:00:00Z",
    featured: true,
  },
  {
    id: "4",
    src: "/images/gallery/waterfall.jpg",
    caption: "One of countless waterfalls cascading into the fiord",
    voyageId: "fiordland-2026",
    category: "landscapes",
    takenAt: "2026-01-18T14:30:00Z",
    featured: true,
  },
  {
    id: "5",
    src: "/images/gallery/helm-sunset.jpg",
    caption: "Golden hour at the helm",
    voyageId: "fiordland-2026",
    category: "sailing",
    takenAt: "2026-01-17T19:00:00Z",
    featured: true,
  },
];

export const yachtSpecs: YachtSpecs = {
  name: "Matariki III",
  type: "Oyster 68",
  designer: "Rob Humphreys",
  builder: "Oyster Yachts",
  year: 2008,
  flag: "New Zealand",
  dimensions: {
    loa: "68' (20.7m)",
    lwl: "58' (17.7m)",
    beam: "19' (5.8m)",
    draft: "9'6\" (2.9m)",
    displacement: "38 tonnes",
    ballast: "12 tonnes",
  },
  rig: {
    type: "Sloop",
    mastHeight: "95' (29m)",
    mainSail: "1,200 sqft",
    genoa: "1,400 sqft",
  },
  engine: {
    make: "Cummins",
    model: "QSM11",
    power: "355 HP",
    fuelCapacity: "2,000 L",
  },
  tanks: {
    fuel: "2,000 L",
    water: "1,200 L",
    holding: "200 L",
  },
  electronics: [
    "B&G Zeus navigation system",
    "Raymarine 72nm radar",
    "AIS Class A transceiver",
    "Iridium GO satellite communications",
    "FLIR thermal camera",
    "Fusion entertainment system",
  ],
};

export const crew: CrewMember[] = [
  {
    id: "1",
    name: "Captain James",
    role: "Skipper",
    bio: "With over 30 years of blue water sailing experience and 100,000+ nautical miles under his keel, James brings expertise and passion to every voyage.",
    photo: "/images/crew/captain.jpg",
  },
];

export function getCurrentVoyage(): Voyage | undefined {
  return voyages.find((v) => v.id === siteSettings.currentVoyageId);
}

export function getRecentLogEntries(count: number = 3): LogEntry[] {
  return [...logEntries]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, count);
}

export function getFeaturedGalleryImages(count: number = 5): GalleryImage[] {
  return galleryImages.filter((img) => img.featured).slice(0, count);
}
