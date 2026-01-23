# Matariki III — Oyster 68 Adventures Website

## Project Overview

A sailing adventure website for **Matariki III**, an Oyster 68 yacht, documenting voyages around New Zealand and the Pacific. The site combines live GPS tracking, voyage blog, photo/video galleries, and yacht documentation.

**Primary Goals:**
1. Real-time yacht position tracking for family and followers
2. Voyage log entries with photos linked to map positions
3. Photography and video gallery
4. Yacht specifications and systems documentation
5. Email subscriber list

**Design Direction:** Refined maritime luxury — deep ocean color palette with copper/brass accents. Editorial quality typography. Not casual sailing blog aesthetic; presentation befitting a flagship yacht.

---

## Technology Stack

```
Frontend:        Next.js 14+ (App Router)
Styling:         Tailwind CSS + custom CSS variables
CMS:             Sanity.io (headless)
Maps:            Mapbox GL JS
Tracking:        Skipperblogs API embed OR custom with PredictWind/Iridium
Hosting:         Vercel (syd1 region)
Email:           Buttondown or ConvertKit
Analytics:       Plausible, Umami, or Vercel Analytics
```

---

## Design System

### Color Palette

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
  --champagne-hull: #a89070;   /* Matariki III hull color */
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
- Display: 4.5rem / 1.05 line-height (hero headlines)
- H1: 3rem / 1.1
- H2: 2.5rem / 1.2
- H3: 1.5rem / 1.3
- Subhead: 1.1rem / 1.4 (DM Sans Medium, copper color)
- Body: 1rem / 1.7-1.8
- Small: 0.85rem / 1.6
- Caption: 0.7rem / 1.5 (monospace, uppercase, letter-spacing: 0.1em)

### Spacing

- Section padding: `py-24` (96px) desktop, `py-16` mobile
- Container max: 1400px with `px-16` (64px) gutters, `px-8` mobile
- Card gaps: `gap-8` (32px)
- Component gaps: `gap-4` to `gap-6`

### Component Patterns

**Buttons:**
- Primary: Copper gradient bg, dark text, uppercase, letter-spacing
- Ghost: Transparent bg, white/mist border, hover → copper border

**Cards:**
- Background: `rgba(22, 39, 66, 0.3)`
- Border: `1px solid rgba(143, 163, 179, 0.08)`
- Hover: border-color copper, `translateY(-8px)`, shadow

**Section Labels:**
- Font: JetBrains Mono, 0.7rem, uppercase
- Color: Copper accent
- With line: Flex with `::after` pseudo-element gradient line

---

## Site Architecture

### Routes

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

### API Routes

```
/api/positions/current    # GET: Latest position
/api/positions/history    # GET: Position history with date filters
/api/subscribe            # POST: Newsletter signup
/api/contact              # POST: Contact form submission
/api/revalidate           # POST: On-demand ISR trigger from CMS webhook
/api/cron/fetch-position  # Cron: Position polling (every 15 min)
```

---

## Component Structure

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

## Homepage Sections

1. **Hero** - Full viewport, hero image with gradient overlay, status label, headline, CTAs, live position map widget
2. **Stats Bar** - 5 columns: NM Sailed, Days at Sea, Anchorages, Red Stags, Dive Sites
3. **The Yacht** - 2-column: image gallery (3 images) + text/specs
4. **Recent Log Entries** - 3-column card grid
5. **Gallery Preview** - Asymmetric grid (large left, 4 smaller right)
6. **Newsletter CTA** - Centered, gradient background, email form
7. **Footer** - 4-column: Brand, Navigation, Voyages, Connect

---

## Sanity CMS Schemas

### Key Document Types

- **voyage** - title, slug, description, startDate, endDate, status, heroImage, route
- **logEntry** - title, slug, publishedAt, voyage (ref), category, location, heroImage, excerpt, body, gallery, weather
- **galleryImage** - image (with EXIF/location), caption, voyage (ref), category, takenAt, featured
- **position** - coordinates, timestamp, voyage (ref), source, weather
- **siteSettings** - siteName, tagline, description, currentVoyage (ref), stats, socialLinks

### Categories

Log entries: `sailing`, `hunting`, `diving`, `fishing`, `general`

---

## Environment Variables

```env
# CMS
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_API_TOKEN=
SANITY_REVALIDATE_SECRET=

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=

# Tracking
SKIPPERBLOGS_MAP_ID=

# Email
BUTTONDOWN_API_KEY=
# or CONVERTKIT_API_KEY + CONVERTKIT_FORM_ID

# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=

# Site
NEXT_PUBLIC_SITE_URL=https://matariki3.nz
```

---

## Responsive Breakpoints

- Mobile: < 768px (single column, stacked)
- Tablet: 768-1024px (2 columns where appropriate)
- Desktop: > 1024px (full layout)
- Wide: > 1280px (increased gutters)

---

## Performance Requirements

- Lighthouse Score: 90+ on all metrics
- Core Web Vitals: Pass
- Images: WebP/AVIF with srcset, lazy loading, blur placeholders
- Fonts: Subset, preload, font-display: swap
- Map: Lazy load Mapbox GL JS
- ISR: Revalidate pages on CMS publish

---

## Development Guidelines

1. Use Next.js App Router with TypeScript
2. Implement ISR with on-demand revalidation via Sanity webhooks
3. Use `next/image` for all images with Sanity CDN remote patterns
4. Deploy to Vercel syd1 region for NZ/Pacific latency
5. Configure security headers in vercel.json
6. Use Edge functions for real-time position API

### Image Configuration

```typescript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
    formats: ['image/avif', 'image/webp'],
  },
};
```

---

## Build Order (MVP)

1. Project setup (Next.js, Tailwind, Sanity, design tokens)
2. Layout & Navigation (Header, Footer, base layouts)
3. Homepage (Hero, Stats, Posts, Newsletter)
4. Blog System (Sanity schemas, listing, entry pages)
5. Map Integration (Skipperblogs embed or Mapbox)
6. Gallery (grid, lightbox)
7. Static Pages (Yacht, About)
8. Polish (responsive, performance, SEO, deploy)

---

## Reference Assets

- `in_water.jpg` — Matariki III at dock (hero image)
- `slings.jpg` — Matariki III in travel lift (hull shot)
- `Resized_20220803_102523.jpeg` — Mast/rig work

See `SPECIFICATION (2).md` for complete technical details.
