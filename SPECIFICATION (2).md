# Matariki III — Oyster 68 Adventures Website
## Technical Specification for Claude Code

---

## Project Overview

Build a sailing adventure website for **Matariki III**, an Oyster 68 yacht, to document voyages around New Zealand and the Pacific. The site combines live GPS tracking, a voyage blog, photo/video galleries, and yacht documentation.

**Primary Goals:**
1. Allow family and followers to track the yacht's position in real-time
2. Publish voyage log entries with photos, linked to map positions
3. Showcase photography and video content
4. Document the yacht's specifications and systems
5. Build an email subscriber list

**Design Direction:** Refined maritime luxury — deep ocean colour palette with copper/brass accents. Editorial quality typography. Not a casual sailing blog aesthetic; presentation befitting a flagship yacht.

---

## Technology Stack

### Recommended Architecture

```
Frontend:        Next.js 14+ (App Router)
Styling:         Tailwind CSS + custom CSS variables
CMS:             Sanity.io (headless)
Maps:            Mapbox GL JS
Tracking:        Skipperblogs API embed OR custom with PredictWind/Iridium
Hosting:         Vercel
Email:           Buttondown or ConvertKit
Analytics:       Plausible or Umami (privacy-focused)
```

### Alternative Simpler Stack
```
Platform:        Astro (static site generator)
CMS:             Markdown files + Astro Content Collections
Maps:            Mapbox GL JS
Tracking:        Skipperblogs embed (iframe)
Hosting:         Netlify or Vercel
```

---

## Design System

### Colour Palette

```css
:root {
  /* Primary - Ocean depths */
  --deep-ocean: #0a1628;
  --midnight-blue: #162742;
  --slate-water: #1e3a5f;
  
  /* Neutral - Sea mist */
  --storm-grey: #4a6274;
  --mist: #8fa3b3;
  --foam: #e8eef3;
  --salt-white: #f7f9fb;
  
  /* Accent - Yacht hardware */
  --copper-accent: #c17f59;
  --copper-light: #d4a574;
  --brass: #b8956e;
  
  /* Functional */
  --sea-green: #3d7a6e;        /* Success, position markers */
  --warning-red: #a63d3d;      /* Alerts */
  
  /* Special */
  --champagne-hull: #a89070;   /* Matariki III hull colour */
}
```

### Typography

```css
/* Display & Headings */
font-family: 'Cormorant Garamond', Georgia, serif;
/* Weights: 300 (display), 400 (headings), 500 (emphasis) */

/* Body & UI */
font-family: 'DM Sans', -apple-system, sans-serif;
/* Weights: 300 (body), 400 (regular), 500 (buttons/labels) */

/* Technical / Data */
font-family: 'JetBrains Mono', 'SF Mono', monospace;
/* Weights: 300, 400 */
```

**Type Scale:**
```
Display:    4.5rem / 1.05 line-height (hero headlines)
H1:         3rem / 1.1
H2:         2.5rem / 1.2
H3:         1.5rem / 1.3
Subhead:    1.1rem / 1.4 (DM Sans Medium, copper colour)
Body:       1rem / 1.7-1.8
Small:      0.85rem / 1.6
Caption:    0.7rem / 1.5 (monospace, uppercase, letter-spacing: 0.1em)
```

### Spacing System

Use Tailwind defaults with these custom additions:
```
Section padding:  py-24 (96px) on desktop, py-16 on mobile
Container max:    1400px with px-16 (64px) gutters, px-8 on mobile
Card gaps:        gap-8 (32px)
Component gaps:   gap-4 to gap-6
```

### Component Patterns

**Buttons:**
```
Primary:   Copper gradient bg, dark text, uppercase, letter-spacing
Ghost:     Transparent bg, white/mist border, hover → copper border
```

**Cards:**
```
Background:  rgba(22, 39, 66, 0.3)
Border:      1px solid rgba(143, 163, 179, 0.08)
Hover:       border-color copper, translateY(-8px), shadow
```

**Section Labels:**
```
Font:        JetBrains Mono, 0.7rem, uppercase
Colour:      Copper accent
With line:   Flex with ::after pseudo-element gradient line
```

---

## Site Architecture

### Page Structure

```
/                       # Homepage
/track                  # Full-screen live tracking map
/log                    # Blog listing (all entries)
/log/[slug]             # Individual log entry
/gallery                # Photo & video gallery
/gallery/[voyage]       # Gallery filtered by voyage
/yacht                  # Vessel profile & specifications
/yacht/systems          # Technical systems documentation
/about                  # Crew & background
/subscribe              # Newsletter signup
/gear                   # Equipment recommendations (affiliate)
```

### URL Patterns

```
Log entries:     /log/into-the-fiords
Voyages:         /voyages/fiordland-2026
Gallery sets:    /gallery/fiordland-2026
Static pages:    /about, /yacht, /subscribe
```

---

## Page Specifications

### Homepage (`/`)

**Sections (in order):**

1. **Hero**
   - Full-viewport height
   - Background: Hero image of Matariki III (in_water.jpg) with gradient overlay
   - Content: Status label ("Currently Underway"), headline, description, 2 CTAs
   - Widget: Live position map card (right side on desktop, below on mobile)
   
2. **Stats Bar**
   - Full-width darker background
   - 5-column grid: NM Sailed, Days at Sea, Anchorages, Red Stags, Dive Sites
   - Data pulled from CMS or calculated from voyage entries
   
3. **The Yacht Section**
   - 2-column: Image gallery (3 images) | Text content + specs
   - Link to /yacht page
   
4. **Recent Log Entries**
   - Section header with "View all" link
   - 3-column card grid (1 column mobile)
   - Cards: Image, category tag, meta (location + date), title, excerpt
   
5. **Gallery Preview**
   - Asymmetric grid (large left, 4 smaller right)
   - Link to /gallery
   
6. **Newsletter CTA**
   - Centered, gradient background
   - Email input + submit button
   
7. **Footer**
   - 4-column: Brand/description, Navigation, Voyages, Connect
   - Bottom bar: Copyright, social icons

**Data Requirements:**
- Current position (lat/lng, last updated timestamp)
- Current voyage stats
- 3 most recent published log entries
- 5 most recent gallery images
- Cumulative statistics

---

### Track Page (`/track`)

**Layout:** Full-screen map with overlay UI

**Components:**

1. **Map (Mapbox GL JS)**
   - Dark style base (mapbox://styles/mapbox/dark-v11 or custom)
   - Full voyage track as GeoJSON LineString
   - Waypoints as clickable markers
   - Current position with pulsing animation
   - Nautical chart overlay option (if available)

2. **Sidebar/Panel (collapsible on mobile)**
   - Current position coordinates
   - Current voyage name
   - Distance stats (total, this voyage)
   - Voyage selector dropdown
   - Date range filter
   
3. **Waypoint Popups**
   - Date/time
   - Location name
   - Weather data (if available)
   - Link to corresponding log entry (if exists)

**Technical:**
```javascript
// Position data structure
{
  coordinates: [lng, lat],
  timestamp: "2026-01-24T08:30:00Z",
  source: "iridium" | "ais" | "manual",
  voyage_id: "fiordland-2026",
  weather?: {
    wind_speed: 15,
    wind_direction: 225,
    conditions: "partly_cloudy"
  }
}

// Track GeoJSON
{
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [[lng, lat], ...]
    },
    properties: {
      voyage_id: "fiordland-2026",
      voyage_name: "Fiordland Expedition"
    }
  }]
}
```

**Tracking Integration Options:**

Option A: Skipperblogs Embed
```html
<iframe 
  src="https://www.skipperblogs.com/map/embed/[MAP_ID]" 
  width="100%" 
  height="100%"
  frameborder="0">
</iframe>
```

Option B: Custom Mapbox + Data API
- Fetch positions from PredictWind API or custom endpoint
- Store in database (Supabase/Planetscale)
- Update via webhook or polling

---

### Log Page (`/log`)

**Layout:** 
- Header with title and filters
- Grid of entry cards
- Pagination or infinite scroll

**Filters:**
- Category: All, Sailing, Hunting, Diving, Fishing
- Voyage: Dropdown of voyage names
- Date: Year/month selector

**Card Content:**
- Featured image (16:10 aspect ratio)
- Category badge (top-left overlay)
- Title (Cormorant Garamond)
- Excerpt (2-3 lines, truncated)
- Meta: Location + Date (monospace)

**Sorting:** Newest first (default), oldest first option

---

### Log Entry (`/log/[slug]`)

**Layout:** Article with sidebar

**Main Content:**
- Hero image (full-width or contained)
- Title (display size)
- Meta bar: Date, Location, Category, Read time
- Article body (MDX support for rich content)
- Image galleries inline
- Pull quotes styled distinctively

**Sidebar (desktop) / Bottom (mobile):**
- Mini map showing entry location
- Entry position coordinates
- Weather conditions (if recorded)
- Related entries (same voyage or category)
- Share buttons

**Article Components Needed:**
- Paragraph (with drop cap option for first)
- Headings (h2, h3)
- Images (single, full-width, gallery grid)
- Block quotes
- Embedded video (YouTube/Vimeo)
- Location callout (coordinates + map thumbnail)

---

### Gallery (`/gallery`)

**Layout:** Masonry or justified grid

**Filters:**
- Voyage selector
- Media type: Photos, Videos, All
- Category: Sailing, Hunting, Diving, Wildlife, Landscapes

**Lightbox:**
- Full-screen image view
- EXIF data display (camera, lens, settings)
- Location (if geotagged)
- Caption
- Prev/Next navigation
- Download option (optional)

**Video Handling:**
- Thumbnail with play overlay
- Opens in modal or expands inline
- YouTube/Vimeo embeds

---

### Yacht Page (`/yacht`)

**Sections:**

1. **Hero**
   - Large image of Matariki III
   - Name, type, tagline
   
2. **Overview**
   - Description paragraphs
   - Key specifications grid (LOA, Beam, Draft, Displacement, etc.)
   
3. **Image Gallery**
   - Exterior shots
   - Interior shots
   - Detail shots (helm, rigging, etc.)
   
4. **Systems** (expandable or link to subpage)
   - Navigation & Electronics
   - Electrical System
   - Watermaker & Plumbing
   - Safety Equipment
   - Sail Inventory
   - Tender & Toys
   
5. **Refit Log** (optional)
   - Timeline of major work
   - Before/after images

**Specifications Data:**
```javascript
{
  name: "Matariki III",
  type: "Oyster 68",
  designer: "Rob Humphreys",
  builder: "Oyster Yachts",
  year: 2008, // or actual year
  flag: "New Zealand",
  dimensions: {
    loa: "68'",
    lwl: "58'",
    beam: "19'",
    draft: "9'6\"",
    displacement: "38 tonnes",
    ballast: "12 tonnes"
  },
  rig: {
    type: "Sloop",
    mast_height: "95'",
    main_sail: "xxx sqft",
    genoa: "xxx sqft",
    // etc
  },
  engine: {
    make: "xxx",
    model: "xxx",
    power: "xxx HP",
    fuel_capacity: "xxx L"
  },
  tanks: {
    fuel: "xxx L",
    water: "xxx L",
    holding: "xxx L"
  },
  electronics: [
    "B&G navigation suite",
    "Raymarine radar",
    // etc
  ]
}
```

---

### About Page (`/about`)

**Sections:**
1. Crew bio and photo
2. Sailing background/experience
3. Why we sail / mission
4. Contact form or email link
5. Social media links

---

## Content Management (Sanity Schema)

### Voyage
```javascript
{
  name: 'voyage',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'description', type: 'text' },
    { name: 'startDate', type: 'date' },
    { name: 'endDate', type: 'date' },
    { name: 'status', type: 'string', options: ['planning', 'active', 'completed'] },
    { name: 'heroImage', type: 'image' },
    { name: 'route', type: 'geopoint[]' }, // or GeoJSON
  ]
}
```

### Log Entry
```javascript
{
  name: 'logEntry',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'publishedAt', type: 'datetime' },
    { name: 'voyage', type: 'reference', to: 'voyage' },
    { name: 'category', type: 'string', options: ['sailing', 'hunting', 'diving', 'fishing', 'general'] },
    { name: 'location', type: 'object', fields: [
      { name: 'name', type: 'string' },
      { name: 'coordinates', type: 'geopoint' }
    ]},
    { name: 'heroImage', type: 'image' },
    { name: 'excerpt', type: 'text', rows: 3 },
    { name: 'body', type: 'portableText' }, // Rich text
    { name: 'gallery', type: 'array', of: [{ type: 'image' }] },
    { name: 'weather', type: 'object', fields: [
      { name: 'conditions', type: 'string' },
      { name: 'windSpeed', type: 'number' },
      { name: 'windDirection', type: 'number' }
    ]}
  ]
}
```

### Gallery Image
```javascript
{
  name: 'galleryImage',
  type: 'document',
  fields: [
    { name: 'image', type: 'image', options: { metadata: ['exif', 'location'] } },
    { name: 'caption', type: 'string' },
    { name: 'voyage', type: 'reference', to: 'voyage' },
    { name: 'category', type: 'string' },
    { name: 'takenAt', type: 'datetime' },
    { name: 'featured', type: 'boolean' }
  ]
}
```

### Position (for custom tracking)
```javascript
{
  name: 'position',
  type: 'document',
  fields: [
    { name: 'coordinates', type: 'geopoint' },
    { name: 'timestamp', type: 'datetime' },
    { name: 'voyage', type: 'reference', to: 'voyage' },
    { name: 'source', type: 'string', options: ['iridium', 'ais', 'manual'] },
    { name: 'weather', type: 'object', /* ... */ }
  ]
}
```

### Site Settings
```javascript
{
  name: 'siteSettings',
  type: 'document',
  fields: [
    { name: 'siteName', type: 'string' },
    { name: 'tagline', type: 'string' },
    { name: 'description', type: 'text' },
    { name: 'currentVoyage', type: 'reference', to: 'voyage' },
    { name: 'stats', type: 'object', fields: [
      { name: 'totalNauticalMiles', type: 'number' },
      { name: 'totalDaysAtSea', type: 'number' },
      { name: 'totalAnchorages', type: 'number' },
      { name: 'redStags', type: 'number' },
      { name: 'diveSites', type: 'number' }
    ]},
    { name: 'socialLinks', type: 'object', fields: [
      { name: 'instagram', type: 'url' },
      { name: 'youtube', type: 'url' }
    ]}
  ]
}
```

---

## Component Library

### Core Components to Build

```
/components
├── layout/
│   ├── Header.tsx           # Fixed nav with scroll effect
│   ├── Footer.tsx           # 4-column footer
│   ├── Container.tsx        # Max-width wrapper
│   └── Section.tsx          # Padded section with optional bg
│
├── ui/
│   ├── Button.tsx           # Primary, ghost, sizes
│   ├── SectionLabel.tsx     # "01 — Section Name" with line
│   ├── Card.tsx             # Base card with hover
│   ├── Input.tsx            # Form inputs
│   └── Badge.tsx            # Category badges
│
├── content/
│   ├── PostCard.tsx         # Blog entry card
│   ├── GalleryGrid.tsx      # Masonry/grid gallery
│   ├── Lightbox.tsx         # Full-screen image viewer
│   ├── ArticleBody.tsx      # MDX/Portable text renderer
│   └── StatBlock.tsx        # Number + label
│
├── map/
│   ├── TrackingMap.tsx      # Full Mapbox implementation
│   ├── MapWidget.tsx        # Small position widget
│   ├── PositionMarker.tsx   # Animated current position
│   └── WaypointPopup.tsx    # Popup content
│
├── yacht/
│   ├── SpecsTable.tsx       # Specifications grid
│   ├── SystemsList.tsx      # Expandable systems
│   └── RefitTimeline.tsx    # Chronological refit log
│
└── forms/
    ├── NewsletterForm.tsx   # Email signup
    └── ContactForm.tsx      # Contact page form
```

---

## API Routes (if using Next.js)

```
/api/
├── positions/
│   ├── current          # GET: Latest position
│   └── history          # GET: Position history (with date filters)
│
├── subscribe            # POST: Newsletter signup
│
├── contact              # POST: Contact form submission
│
└── revalidate           # POST: On-demand ISR trigger (webhook from CMS)
```

---

## Environment Variables

```env
# CMS
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_API_TOKEN=

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=

# Tracking (if using Skipperblogs)
SKIPPERBLOGS_MAP_ID=

# Email
BUTTONDOWN_API_KEY=
# or
CONVERTKIT_API_KEY=
CONVERTKIT_FORM_ID=

# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=

# Misc
NEXT_PUBLIC_SITE_URL=https://matariki3.nz
```

---

## Performance Requirements

- **Lighthouse Score:** 90+ on all metrics
- **Core Web Vitals:** Pass
- **Images:** WebP/AVIF with srcset, lazy loading, blur placeholders
- **Fonts:** Subset, preload, font-display: swap
- **Map:** Lazy load Mapbox GL JS
- **ISR:** Revalidate blog pages on CMS publish

---

## Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px

/* Key breakpoints for this design */
Mobile:     < 768px   (single column, stacked layout)
Tablet:     768-1024px (2 columns where appropriate)
Desktop:    > 1024px  (full layout)
Wide:       > 1280px  (increased gutters)
```

---

## Vercel Deployment

### Project Configuration

**vercel.json:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["syd1"],
  "headers": [
    {
      "source": "/fonts/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/sitemap.xml",
      "destination": "/api/sitemap"
    }
  ]
}
```

### Environment Variables (Vercel Dashboard)

Set these in Project Settings → Environment Variables:

```
# Production + Preview + Development
SANITY_PROJECT_ID=xxxxxxxxx
SANITY_DATASET=production
SANITY_API_TOKEN=sk-xxxxxxxxx

NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxx
NEXT_PUBLIC_SITE_URL=https://matariki3.nz

BUTTONDOWN_API_KEY=xxxxxxxxx

# Production Only
SANITY_REVALIDATE_SECRET=xxxxxxxxx
```

### Build Settings

```
Framework Preset:    Next.js
Build Command:       next build
Output Directory:    .next
Install Command:     npm install
Node.js Version:     20.x
```

### Domain Configuration

1. Add custom domain in Vercel Dashboard → Domains
2. Configure DNS:
   ```
   Type    Name    Value
   A       @       76.76.21.21
   CNAME   www     cname.vercel-dns.com
   ```
3. Enable "Redirect www to non-www" (or vice versa)
4. SSL auto-provisions via Let's Encrypt

### Preview Deployments

- Every push to non-production branches creates preview URL
- Preview URLs format: `matariki3-git-[branch]-[username].vercel.app`
- Use for content review before publishing

### ISR (Incremental Static Regeneration)

Configure revalidation in page components:

```typescript
// app/log/[slug]/page.tsx
export const revalidate = 3600; // Revalidate every hour

// Or use on-demand revalidation via webhook
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  
  if (secret !== process.env.SANITY_REVALIDATE_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 });
  }
  
  const body = await request.json();
  
  // Revalidate based on Sanity webhook payload
  if (body._type === 'logEntry') {
    revalidatePath('/log');
    revalidatePath(`/log/${body.slug.current}`);
  }
  
  if (body._type === 'voyage') {
    revalidatePath('/track');
    revalidatePath('/');
  }
  
  return Response.json({ revalidated: true });
}
```

### Sanity Webhook Setup

1. In Sanity Dashboard → API → Webhooks
2. Create webhook:
   ```
   Name:        Vercel Revalidation
   URL:         https://matariki3.nz/api/revalidate?secret=[SECRET]
   Trigger on:  Create, Update, Delete
   Filter:      _type in ["logEntry", "voyage", "galleryImage", "siteSettings"]
   Projection:  {_type, slug}
   ```

### Edge Functions (Optional)

For real-time position updates, use Vercel Edge Functions:

```typescript
// app/api/position/route.ts
export const runtime = 'edge';
export const preferredRegion = 'syd1';

export async function GET() {
  // Fetch latest position from tracking source
  const position = await fetch('https://api.predictwind.com/...');
  
  return Response.json(position, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
    }
  });
}
```

### Analytics (Vercel Analytics)

Add to layout:

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Cron Jobs (Position Polling)

If tracking source requires polling rather than push:

```json
// vercel.json addition
{
  "crons": [
    {
      "path": "/api/cron/fetch-position",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

```typescript
// app/api/cron/fetch-position/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Fetch and store position
  // ...
  
  return Response.json({ success: true });
}
```

### Image Optimization

Vercel automatically optimizes images via `next/image`. Configure domains:

```typescript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};
```

---

## Deployment Checklist

- [ ] Vercel project created and linked to Git repo
- [ ] Environment variables configured in Vercel dashboard
- [ ] Custom domain added and DNS configured
- [ ] SSL certificate active (auto-provisioned)
- [ ] Sanity CORS origins include production domain
- [ ] Sanity webhook configured for ISR
- [ ] Mapbox allowed URLs include production domain
- [ ] Newsletter integration tested on preview deployment
- [ ] Vercel Analytics enabled
- [ ] OpenGraph images generating correctly
- [ ] Sitemap accessible at /sitemap.xml
- [ ] robots.txt configured
- [ ] 404 page styled
- [ ] Favicon and app icons uploaded
- [ ] Preview deployments working
- [ ] Production deployment successful

---

## Phase 1 MVP (Recommended Build Order)

1. **Project Setup**
   - Initialize Next.js with Tailwind
   - Configure Sanity project
   - Set up design tokens (colours, fonts, spacing)

2. **Layout & Navigation**
   - Header component with scroll effect
   - Footer component
   - Base page layouts

3. **Homepage**
   - Hero section (static image first)
   - Stats bar
   - Recent posts section (mock data)
   - Newsletter form

4. **Blog System**
   - Sanity schemas for voyages and log entries
   - Log listing page
   - Log entry page with article rendering

5. **Map Integration**
   - Skipperblogs embed OR basic Mapbox setup
   - Map widget for homepage
   - Full track page

6. **Gallery**
   - Basic grid layout
   - Lightbox component

7. **Static Pages**
   - Yacht page
   - About page

8. **Polish & Launch**
   - Mobile responsive pass
   - Performance optimization
   - SEO metadata
   - Deploy

---

## Future Enhancements (Phase 2+)

- Video integration (YouTube channel feed)
- Weather widget at current position
- Passage planning / upcoming voyages
- Guest log / comments
- Equipment affiliate store
- Offline support (PWA)
- Multi-language (Māori translations)

---

## Assets Required

### Images (to be provided)
- [ ] Hero images (multiple, high-res, landscape)
- [ ] Yacht exterior shots (various angles)
- [ ] Yacht interior shots
- [ ] Crew photos
- [ ] Sample log entry images
- [ ] Favicon source (yacht silhouette or similar)

### Content (to be provided)
- [ ] Yacht specifications (complete)
- [ ] Systems documentation
- [ ] About/crew bio text
- [ ] Initial log entries
- [ ] Social media handles

### Accounts Needed
- [ ] Sanity.io account
- [ ] Mapbox account
- [ ] Vercel or Netlify account
- [ ] Buttondown or ConvertKit account
- [ ] Domain registrar access
- [ ] Skipperblogs subscription (if using)

---

## Reference Files

The following design mockups are provided:
- `matariki-homepage.html` — Full homepage visual design
- `site-structure.html` — Design system documentation
- `in_water.jpg` — Matariki III at dock (hero image)
- `slings.jpg` — Matariki III in travel lift (hull shot)
- `Resized_20220803_102523.jpeg` — Mast/rig work

---

*Specification Version 1.0 — January 2026*
