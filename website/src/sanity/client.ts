import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "gjwqcjfo";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const isDev = process.env.NODE_ENV === "development";

export const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  // Disable stega in production for cleaner output
  stega: { enabled: false },
});

// Use no-cache in development for instant updates
export const fetchOptions = isDev
  ? { cache: "no-store" as const }
  : { next: { revalidate: 60 } };

export { projectId, dataset };
