/**
 * CREW_PAGE_PUBLIC switches the crew feature between "hidden" (the default)
 * and "public". Hidden: /crew and /crew/apply stay reachable by direct URL
 * for testing, but carry noindex/nofollow and are not linked from the
 * /crew-info pages. Server-only; read at render time.
 */
import type { Metadata } from "next";

export function crewPagePublic(): boolean {
  const value = process.env.CREW_PAGE_PUBLIC?.trim().toLowerCase();
  return value === "true" || value === "1";
}

/** Robots metadata for a crew page. `whenPublic` is what it uses once public. */
export function crewRobots(whenPublic?: Metadata["robots"]): Metadata["robots"] {
  return crewPagePublic() ? whenPublic : { index: false, follow: false };
}
