# CLAUDE.md - Matariki III Website

## Project Overview

Next.js 16 website for Matariki III yacht, using Sanity CMS as headless content management system.

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

- `crew` - Crew members (name, role, photo, bio, order)
- `voyage` - Voyages (title, slug, dates, status, heroImage, gallery)
- `logEntry` - Log entries (title, slug, body, heroImage, category)
- `galleryImage` - Gallery images
- `video` - Video content
- `vessel` - Vessel details
- `siteSettings` - Global settings
- `position` - Position tracking data

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
