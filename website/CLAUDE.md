# CLAUDE.md - Matariki III Website

## Project Overview

Next.js 16 website for Matariki III yacht (Oyster 68), using Sanity CMS as headless content management system. The site documents sailing adventures around New Zealand and the Pacific.

### Primary Goals
1. Allow family and followers to track the yacht's position in real-time
2. Publish voyage log entries with photos, linked to map positions
3. Showcase photography and video content
4. Document the yacht's specifications and systems
5. Build an email subscriber list

### Design Direction
Refined maritime luxury — deep ocean colour palette with copper/brass accents. Editorial quality typography. Not a casual sailing blog aesthetic; presentation befitting a flagship yacht.

---

## Development Approach: FDD/TDD

**CRITICAL: All development must follow Feature-Driven Development (FDD) and Test-Driven Development (TDD) principles.**

### FDD Principles
1. **Feature-centric development** - Build by feature, not by layer
2. **Domain modeling first** - Understand the domain (sailing, voyages, tracking) before coding
3. **Iterative and incremental** - Deliver working features in short cycles
4. **Quality at every step** - Each feature must be complete and tested before moving on

### TDD Workflow
1. **Write tests first** - Before implementing any feature, write failing tests that define expected behavior
2. **Red-Green-Refactor cycle**:
   - RED: Write a failing test
   - GREEN: Write minimal code to pass the test
   - REFACTOR: Clean up while keeping tests green
3. **Test coverage requirements**:
   - Unit tests for utility functions and helpers
   - Component tests for React components
   - Integration tests for API routes
   - E2E tests for critical user flows (tracking, blog, gallery)

### Testing Stack
- **Unit/Component**: Vitest + React Testing Library
- **E2E**: Playwright
- **API Testing**: Vitest with MSW (Mock Service Worker)

### Before Starting Any Feature
1. Review the specification in `/SPECIFICATION (2).md`
2. Write acceptance criteria as tests
3. Implement the feature to pass tests
4. Refactor and document

---

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **CMS**: Sanity.io (project ID: `gjwqcjfo`, dataset: `production`)
- **Styling**: Tailwind CSS with custom nautical dark theme
- **Language**: TypeScript

## Critical: Dynamic Rendering for CMS Pages

### The Problem

Pages that fetch data from Sanity CMS must use dynamic rendering. Without it, pages are statically generated at build time, which means:

1. If Sanity is unreachable during build, mock data gets cached
2. CMS content updates won't appear until the next deployment
3. The page serves stale data indefinitely

### The Solution

**All pages that fetch from Sanity must include:**

```typescript
// Force dynamic rendering to always fetch fresh data from Sanity
export const dynamic = "force-dynamic";
```

### Pages Requiring Dynamic Rendering

Any page using `client.fetch()` from `@/sanity/client` needs this export:

- `/` (homepage) - `src/app/page.tsx`
- `/about` - `src/app/about/page.tsx`
- `/log` - `src/app/log/page.tsx`
- `/log/[slug]` - `src/app/log/[slug]/page.tsx`
- `/gallery` - `src/app/gallery/page.tsx`
- `/yacht` - `src/app/yacht/page.tsx`
- `/track` - `src/app/track/page.tsx`
- `/voyages` - `src/app/voyages/page.tsx`
- `/voyages/[slug]` - `src/app/voyages/[slug]/page.tsx`

### Alternative: ISR with Short Revalidation

For pages where real-time data isn't critical, you can use ISR instead:

```typescript
export const revalidate = 60; // Revalidate every 60 seconds
```

## Data Fetching Pattern

All Sanity fetches should follow this pattern with fallback to mock data:

```typescript
import { client, fetchOptions } from "@/sanity/client";
import { QUERY_NAME } from "@/sanity/queries";
import { mockData } from "@/lib/data/mock";

export const dynamic = "force-dynamic";

export default async function Page() {
  let data = mockData; // Default to mock

  try {
    const sanityData = await client.fetch(QUERY_NAME, {}, fetchOptions);
    if (sanityData && sanityData.length > 0) {
      data = sanityData;
    }
  } catch (error) {
    console.error("Failed to fetch from Sanity:", error);
  }

  // Render with data...
}
```

## Theme Colors

The site uses a dark nautical theme. Key colors (defined in `tailwind.config.ts`):

- `deep-ocean`: #0a1628 (darkest background)
- `midnight-blue`: #0f2139 (card backgrounds)
- `slate-water`: #1a3a5c (borders, subtle backgrounds)
- `storm-grey`: #6b7c93 (muted text)
- `mist`: #94a3b8 (secondary text)
- `salt-white`: #f8fafc (primary text)
- `copper-accent`: #d97706 (accent color, highlights)
- `sea-green`: #10b981 (success states)

## Sanity Schema Types

- `crew` - Crew members (name, role, photo, bio, sortOrder)
- `voyage` - Voyages (title, slug, dates, status, heroImage, gallery, showExpeditionSchedule)
- `logEntry` - Log entries (title, slug, body, heroImage, category)
- `galleryImage` - Gallery images
- `video` - Video content
- `vessel` - Vessel details (descriptionSections for multi-section content)
- `siteSettings` - Global settings
- `position` - Position tracking data

## CMS-Driven Feature Flags

### Use Sanity Fields Instead of Hardcoded Slug Checks

**Bad practice** - hardcoding slug checks:
```typescript
// DON'T do this
const isExpeditionVoyage = slug.includes("fiordland");
```

**Good practice** - using CMS boolean flags:
```typescript
// DO this - use Sanity field
const showExpeditionSchedule = voyage.showExpeditionSchedule === true;
```

### Available Feature Flags

- `voyage.showExpeditionSchedule` - Shows expedition schedule component on voyage pages
- `crew.sortOrder` - Controls display order of crew members

### Migration Notes

Some content is still hardcoded and should eventually be migrated to Sanity:

1. **Expedition Plan Log Entry** - Currently a hardcoded entry in `log/page.tsx` and `voyages/[slug]/page.tsx`
2. **Expedition Schedule Component** - Static React component that could be CMS-driven in the future

## Common Issues

### Crew/Content Not Showing from CMS

1. Check if `export const dynamic = "force-dynamic"` is present
2. Check Vercel function logs for fetch results
3. Verify content is published in Sanity (not just draft)

### Images Not Loading

1. Ensure Sanity image has `asset` property
2. Check `urlFor()` helper is receiving valid source
3. Verify Sanity project ID and dataset are correct

### Mock Data Showing Instead of CMS

This almost always means the page is statically rendered. Add dynamic rendering export.

---

## Performance Requirements

- **Lighthouse Score:** 90+ on all metrics
- **Core Web Vitals:** Must pass
- **Images:** WebP/AVIF with srcset, lazy loading, blur placeholders
- **Fonts:** Subset, preload, font-display: swap
- **Map:** Lazy load Mapbox GL JS
- **ISR:** Revalidate blog pages on CMS publish

---

## Key Site Architecture

### Page Structure
```
/                       # Homepage
/track                  # Full-screen live tracking map
/log                    # Blog listing (all entries)
/log/[slug]             # Individual log entry
/gallery                # Photo & video gallery
/gallery/[voyage]       # Gallery filtered by voyage
/yacht                  # Vessel profile & specifications
/about                  # Crew & background
/voyages                # Voyages listing
/voyages/[slug]         # Individual voyage details
```

### Core Features
1. **Live GPS Tracking** - Real-time position on Mapbox, voyage tracks as GeoJSON
2. **Voyage Blog** - Log entries linked to positions, categories (sailing, hunting, diving, fishing)
3. **Photo/Video Gallery** - Masonry grid, lightbox with EXIF data, voyage filtering
4. **Yacht Documentation** - Specifications, systems, refit log

### Key Data Structures
- **Position**: coordinates, timestamp, voyage reference, source (iridium/ais/manual)
- **Log Entry**: title, slug, body (Portable Text), location, voyage reference, category
- **Voyage**: title, slug, dates, status, route (geopoints), hero image
- **Gallery Image**: image with EXIF/location metadata, caption, voyage reference

---

## Reference Documents

- **Specification**: `/SPECIFICATION (2).md` - Full technical specification
- **Development Plan**: `/DEVELOPMENT_PLAN.md` - Phased implementation plan
