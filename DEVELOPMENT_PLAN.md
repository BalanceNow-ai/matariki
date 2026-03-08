# Matariki III Sailing Adventure Website - Development Plan

**Version:** 1.0
**Date:** January 2026
**Tech Stack:** Next.js 14+ (App Router), Tailwind CSS, Sanity.io CMS, Mapbox GL JS, Vercel

---

## Executive Summary

This plan outlines the development of the Matariki III sailing adventure website across 6 phases. The approach prioritizes establishing foundational infrastructure first (CMS schemas, design system), followed by core features (layout, homepage, blog), then advanced features (maps, gallery), and finally polish and deployment.

**Key Dependencies Identified:**
- Sanity CMS schemas must be created before any data-consuming pages
- Design tokens and Tailwind configuration must precede all component work
- Layout components (Header, Footer) must precede page development
- Core UI components must precede content components
- API routes for positions must precede map integration

---

## Phase 1: Project Foundation (Week 1-2)

### Objective
Establish all foundational infrastructure, tooling, and design system configuration.

### 1.1 Project Initialization

**Deliverable:** Configured Next.js project with all dependencies

**Steps:**
1. Initialize Next.js 14+ project with App Router and TypeScript
   ```bash
   npx create-next-app@latest matariki-website --typescript --tailwind --eslint --app --src-dir
   ```

2. Install core dependencies:
   ```bash
   # CMS
   npm install @sanity/client @sanity/image-url next-sanity

   # Maps
   npm install mapbox-gl @types/mapbox-gl

   # UI utilities
   npm install clsx tailwind-merge

   # Forms
   npm install react-hook-form zod @hookform/resolvers

   # Animation (optional)
   npm install framer-motion
   ```

3. Configure TypeScript with strict mode

4. Set up ESLint with Next.js recommended rules

5. Create `.env.local` template with all required variables:
   ```env
   SANITY_PROJECT_ID=
   SANITY_DATASET=production
   SANITY_API_TOKEN=
   SANITY_REVALIDATE_SECRET=
   NEXT_PUBLIC_MAPBOX_TOKEN=
   SKIPPERBLOGS_MAP_ID=
   BUTTONDOWN_API_KEY=
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

**Verification:** Project runs with `npm run dev` without errors

---

### 1.2 Design System Implementation

**Deliverable:** Complete Tailwind configuration with custom design tokens

**Steps:**
1. Configure `tailwind.config.ts` with custom theme:

   **Colors:**
   - Primary (deep-ocean, midnight-blue, slate-water)
   - Neutral (storm-grey, mist, foam, salt-white)
   - Accent (copper-accent, copper-light, brass)
   - Functional (sea-green, warning-red)
   - Special (champagne-hull)

   **Typography:**
   - Font families: Cormorant Garamond, DM Sans, JetBrains Mono
   - Type scale matching specification (display through caption)

   **Spacing:**
   - Section padding (section-y: 96px/64px)
   - Container max-width (1400px)
   - Custom gutters

2. Create `/src/styles/globals.css` with:
   - CSS custom properties for colors
   - Base typography styles
   - Custom utility classes

3. Set up font loading in `/src/app/layout.tsx`:
   - Use `next/font/google` for Cormorant Garamond, DM Sans, JetBrains Mono
   - Configure font-display: swap
   - Apply font CSS variables

4. Create `/src/lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)

**Verification:** Create a test page displaying all colors, typography scales, and spacing tokens

---

### 1.3 Sanity CMS Setup

**Deliverable:** Fully configured Sanity studio with all content schemas

**Steps:**
1. Initialize Sanity project:
   ```bash
   npm create sanity@latest -- --project-id [ID] --dataset production --template clean
   ```

2. Create schema files in `/sanity/schemas/`:

   **Order of schema creation (dependencies matter):**

   a. `voyage.ts` (no dependencies)
   ```typescript
   // Fields: title, slug, description, startDate, endDate,
   // status (planning/active/completed), heroImage, route (geopoint[])
   ```

   b. `siteSettings.ts` (depends on voyage for currentVoyage ref)
   ```typescript
   // Fields: siteName, tagline, description, currentVoyage (ref),
   // stats object, socialLinks object
   ```

   c. `logEntry.ts` (depends on voyage)
   ```typescript
   // Fields: title, slug, publishedAt, voyage (ref), category,
   // location (name + geopoint), heroImage, excerpt, body (portableText),
   // gallery (image[]), weather object
   ```

   d. `galleryImage.ts` (depends on voyage)
   ```typescript
   // Fields: image (with EXIF/location metadata), caption,
   // voyage (ref), category, takenAt, featured
   ```

   e. `position.ts` (depends on voyage)
   ```typescript
   // Fields: coordinates (geopoint), timestamp, voyage (ref),
   // source (iridium/ais/manual), weather object
   ```

   f. `yachtSpecs.ts` (singleton, no dependencies)
   ```typescript
   // Fields: dimensions, rig, engine, tanks, electronics[], systems[]
   ```

   g. `crewMember.ts` (no dependencies)
   ```typescript
   // Fields: name, role, bio, photo, socialLinks
   ```

3. Configure Sanity client in `/src/lib/sanity/`:
   - `client.ts` - Sanity client configuration
   - `queries.ts` - GROQ queries for all content types
   - `image.ts` - Image URL builder helper

4. Set up Sanity Studio route at `/app/studio/[[...index]]/page.tsx`

5. Configure CORS in Sanity dashboard for localhost and production domain

**Verification:**
- Studio accessible at `/studio`
- Can create, edit, delete documents of each type
- References between documents work correctly

---

### 1.4 Project Structure Setup

**Deliverable:** Organized folder structure ready for component development

**Directory Structure:**
```
/src
├── app/
│   ├── (site)/              # Public routes group
│   │   ├── layout.tsx       # Site layout with Header/Footer
│   │   ├── page.tsx         # Homepage
│   │   ├── track/
│   │   ├── log/
│   │   ├── gallery/
│   │   ├── yacht/
│   │   ├── about/
│   │   └── subscribe/
│   ├── studio/              # Sanity Studio
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout (fonts, metadata)
│   └── globals.css
├── components/
│   ├── layout/
│   ├── ui/
│   ├── content/
│   ├── map/
│   ├── yacht/
│   └── forms/
├── lib/
│   ├── sanity/
│   ├── mapbox/
│   └── utils.ts
├── types/
│   └── index.ts             # TypeScript interfaces
└── hooks/                   # Custom React hooks
```

**Verification:** All directories exist with placeholder files where needed

---

## Phase 2: Layout and Core UI (Week 2-3)

### Objective
Build reusable layout components and core UI primitives.

### 2.1 Layout Components

**Deliverable:** Header, Footer, Container, Section components

**Development Order:**

1. **Container.tsx** (`/src/components/layout/`)
   - Max-width wrapper (1400px)
   - Responsive gutters (px-16 desktop, px-8 mobile)
   - Props: className, children

2. **Section.tsx**
   - Padded section wrapper
   - Props: className, children, background variant, id

3. **Header.tsx**
   - Fixed navigation bar
   - Logo/brand on left
   - Navigation links (Track, Log, Gallery, Yacht, About)
   - Scroll effect (background opacity change)
   - Mobile hamburger menu (responsive)
   - Active link highlighting

4. **Footer.tsx**
   - 4-column layout:
     - Brand/description column
     - Navigation links column
     - Voyages column (dynamic from CMS)
     - Connect column (social links)
   - Bottom bar with copyright and social icons
   - Responsive: stacks on mobile

5. **Site Layout** (`/src/app/(site)/layout.tsx`)
   - Import Header and Footer
   - Wrap children in main element

**Verification:**
- Navigate between placeholder pages
- Header scroll effect works
- Mobile menu opens/closes
- Footer displays correctly on all breakpoints

---

### 2.2 Core UI Components

**Deliverable:** Reusable UI primitives

**Development Order (dependency-based):**

1. **Button.tsx** (`/src/components/ui/`)
   - Variants: primary (copper gradient), ghost (transparent)
   - Sizes: sm, md, lg
   - States: default, hover, active, disabled
   - Props: variant, size, className, children, asChild (for links)

2. **SectionLabel.tsx**
   - Format: "01 — SECTION NAME"
   - Monospace font, uppercase, copper color
   - Optional gradient line extending right
   - Props: number, label, withLine

3. **Badge.tsx**
   - Category badges for posts
   - Variants for each category (sailing, hunting, diving, fishing, general)
   - Props: category, size

4. **Card.tsx**
   - Base card with maritime styling
   - Semi-transparent background
   - Subtle border
   - Hover: copper border, translateY, shadow
   - Props: className, children, hoverable

5. **Input.tsx**
   - Text input with maritime styling
   - Label, placeholder, error states
   - Props: label, error, ...inputProps

6. **StatBlock.tsx** (`/src/components/content/`)
   - Large number display
   - Label underneath
   - Monospace font for numbers
   - Props: value, label, suffix

**Verification:**
- Create Storybook or test page showing all UI variants
- Check hover/focus states
- Verify responsive behavior

---

## Phase 3: Homepage and Blog System (Week 3-5)

### Objective
Complete homepage with all sections and full blog functionality.

### 3.1 Homepage - Hero Section

**Deliverable:** Full-viewport hero with live position widget

**Steps:**
1. Create `/src/app/(site)/page.tsx` with hero section

2. Implement hero features:
   - Full viewport height
   - Background image with gradient overlay (use placeholder initially)
   - Status label ("Currently Underway" or "At Anchor")
   - Main headline (Cormorant Garamond display)
   - Description paragraph
   - Two CTA buttons (primary + ghost)

3. Create **MapWidget.tsx** (`/src/components/map/`)
   - Small map preview card
   - Current position marker (static initially)
   - Coordinates display
   - "View Full Track" link
   - Position on right side (desktop), below content (mobile)

4. Fetch current voyage and position from Sanity:
   ```typescript
   const heroData = await sanityClient.fetch(`{
     "settings": *[_type == "siteSettings"][0],
     "currentPosition": *[_type == "position"] | order(timestamp desc)[0]
   }`)
   ```

**Verification:** Hero displays with correct typography, spacing, and responsive layout

---

### 3.2 Homepage - Stats Bar

**Deliverable:** Statistics section with live data

**Steps:**
1. Create stats bar section in homepage

2. Layout: 5-column grid (responsive: 2+3 on tablet, 1 column mobile)

3. Fetch stats from siteSettings or calculate from voyages:
   - Nautical Miles Sailed
   - Days at Sea
   - Anchorages Visited
   - Red Stags (hunting)
   - Dive Sites

4. Use StatBlock component for each stat

**Verification:** Stats display with correct values and responsive layout

---

### 3.3 Homepage - Yacht Section

**Deliverable:** Yacht preview with image gallery

**Steps:**
1. Create yacht section with 2-column layout

2. Left column: 3-image gallery arrangement
   - One large image
   - Two smaller images below

3. Right column:
   - Section label
   - Heading
   - Description paragraphs
   - Key specs grid (LOA, Beam, Draft, Displacement)
   - CTA button to /yacht

4. Fetch yacht data from yachtSpecs singleton

**Verification:** Images display correctly, responsive stacking works

---

### 3.4 Homepage - Recent Log Entries

**Deliverable:** Blog post cards section

**Steps:**
1. Create **PostCard.tsx** (`/src/components/content/`)
   - Featured image (16:10 aspect ratio)
   - Category badge overlay
   - Title (Cormorant Garamond)
   - Excerpt (2-3 lines, truncated)
   - Meta line: Location + Date (monospace)
   - Hover effects per Card component

2. Create recent posts section:
   - Section label with "View all" link
   - 3-column grid (1 column mobile)
   - Fetch 3 most recent published logEntry documents

3. GROQ query:
   ```groq
   *[_type == "logEntry"] | order(publishedAt desc)[0...3] {
     title, slug, excerpt, publishedAt, category,
     "location": location.name,
     heroImage
   }
   ```

**Verification:** Cards display with data from CMS, links work

---

### 3.5 Homepage - Gallery Preview and Newsletter

**Deliverable:** Gallery teaser and email signup form

**Steps:**
1. Create gallery preview section:
   - Asymmetric grid (1 large left, 4 smaller right)
   - Fetch 5 most recent featured galleryImage documents
   - Link to /gallery

2. Create **NewsletterForm.tsx** (`/src/components/forms/`)
   - Email input with validation
   - Submit button
   - Loading and success states
   - Error handling

3. Create newsletter CTA section:
   - Gradient background
   - Centered layout
   - Heading and description
   - NewsletterForm component

4. Create `/src/app/api/subscribe/route.ts`:
   - POST endpoint
   - Validate email
   - Submit to Buttondown/ConvertKit API
   - Return success/error response

**Verification:**
- Gallery images display correctly
- Newsletter form validates email
- API endpoint works (test with API client)

---

### 3.6 Blog Listing Page

**Deliverable:** /log page with filters and pagination

**Steps:**
1. Create `/src/app/(site)/log/page.tsx`

2. Implement page features:
   - Page header with title
   - Filter bar:
     - Category dropdown (All, Sailing, Hunting, Diving, Fishing)
     - Voyage dropdown (dynamic from CMS)
     - Date filter (year/month)
   - Grid of PostCard components
   - Pagination or "Load more" button

3. Create GROQ query with filters:
   ```groq
   *[_type == "logEntry"
     && ($category == "all" || category == $category)
     && ($voyage == "all" || voyage._ref == $voyage)
   ] | order(publishedAt desc)[$start...$end]
   ```

4. Implement URL-based filtering (searchParams)

**Verification:**
- All posts display
- Filters work correctly
- Pagination loads more posts

---

### 3.7 Blog Entry Page

**Deliverable:** /log/[slug] dynamic route with full article

**Steps:**
1. Create `/src/app/(site)/log/[slug]/page.tsx`

2. Create **ArticleBody.tsx** (`/src/components/content/`)
   - Portable Text renderer for Sanity blocks
   - Custom components:
     - Paragraph (with optional drop cap)
     - Headings (h2, h3)
     - Images (single, full-width)
     - Block quotes
     - Embedded video
     - Image galleries

3. Implement article page:
   - Hero image (full-width or contained)
   - Title (display typography)
   - Meta bar: Date, Location, Category, Read time
   - Article body
   - Sidebar (desktop) / bottom (mobile):
     - Mini map with entry location
     - Coordinates
     - Weather conditions
     - Related entries
     - Share buttons

4. Create **MiniMap.tsx** (`/src/components/map/`)
   - Small static map
   - Single location marker
   - Non-interactive

5. Generate static params for ISR:
   ```typescript
   export async function generateStaticParams() {
     const posts = await sanityClient.fetch(`*[_type == "logEntry"]{ "slug": slug.current }`)
     return posts.map(post => ({ slug: post.slug }))
   }
   ```

6. Configure revalidation:
   ```typescript
   export const revalidate = 3600 // 1 hour
   ```

**Verification:**
- Dynamic routing works
- Article renders all block types correctly
- Mini map displays location
- Related posts show

---

## Phase 4: Maps and Gallery (Week 5-7)

### Objective
Implement full tracking map and photo gallery with lightbox.

### 4.1 Mapbox Integration Setup

**Deliverable:** Mapbox client configuration and utilities

**Steps:**
1. Create `/src/lib/mapbox/config.ts`:
   - Map style URL (dark-v11 or custom)
   - Default center (New Zealand)
   - Default zoom level

2. Create `/src/lib/mapbox/utils.ts`:
   - GeoJSON helpers
   - Coordinate formatting functions
   - Distance calculations

3. Create position fetching utilities:
   - Function to fetch current position
   - Function to fetch position history
   - Function to generate track GeoJSON

**Verification:** Mapbox token validated, utilities tested

---

### 4.2 Full Tracking Page

**Deliverable:** /track with full-screen interactive map

**Steps:**
1. Create `/src/app/(site)/track/page.tsx`

2. Create **TrackingMap.tsx** (`/src/components/map/`)
   - Full-screen Mapbox GL map
   - Lazy load Mapbox GL JS
   - Dark map style
   - Track line as GeoJSON LineString
   - Waypoint markers
   - Current position with pulsing animation

3. Create **PositionMarker.tsx**:
   - Custom marker for current position
   - Pulsing/glowing animation
   - Popup with coordinates and timestamp

4. Create **WaypointPopup.tsx**:
   - Date/time
   - Location name
   - Weather data (if available)
   - Link to corresponding log entry

5. Create sidebar/panel component:
   - Current position coordinates
   - Current voyage name
   - Distance stats
   - Voyage selector dropdown
   - Date range filter
   - Collapsible on mobile

6. Create `/src/app/api/positions/` routes:
   - `current/route.ts` - GET latest position
   - `history/route.ts` - GET position history with filters

**Verification:**
- Map renders full-screen
- Track line displays
- Markers are interactive
- Sidebar filters work
- Mobile collapse works

---

### 4.3 Map Widget Enhancement

**Deliverable:** Enhanced homepage map widget with live data

**Steps:**
1. Update MapWidget.tsx:
   - Fetch real position data
   - Small interactive Mapbox map
   - Current position marker
   - Recent track segment
   - Click to navigate to /track

2. Add refresh capability (polling or manual)

**Verification:** Widget shows real position, updates work

---

### 4.4 Gallery Page

**Deliverable:** /gallery with masonry grid and filters

**Steps:**
1. Create `/src/app/(site)/gallery/page.tsx`

2. Create **GalleryGrid.tsx** (`/src/components/content/`)
   - CSS Grid masonry-style layout
   - Or use justified-layout library
   - Image aspect ratio preservation
   - Hover overlay with caption preview

3. Create **GalleryImage.tsx**:
   - next/image with blur placeholder
   - Category badge overlay
   - Click to open lightbox

4. Implement filter bar:
   - Voyage selector
   - Media type: Photos, Videos, All
   - Category: Sailing, Hunting, Diving, Wildlife, Landscapes

5. GROQ query with filters:
   ```groq
   *[_type == "galleryImage"
     && ($voyage == "all" || voyage._ref == $voyage)
     && ($category == "all" || category == $category)
   ] | order(takenAt desc)
   ```

**Verification:**
- Images load efficiently
- Filters work
- Responsive grid adapts

---

### 4.5 Lightbox Component

**Deliverable:** Full-screen image viewer

**Steps:**
1. Create **Lightbox.tsx** (`/src/components/content/`)
   - Full-screen overlay
   - Large image display
   - Navigation (prev/next) with keyboard support
   - Close button and Escape key
   - EXIF data panel:
     - Camera and lens
     - Settings (aperture, shutter, ISO)
     - Location (if geotagged)
   - Caption display
   - Swipe support on mobile

2. Create lightbox context/provider for state management

3. Add to gallery page

**Verification:**
- Opens from gallery
- Navigation works
- EXIF displays
- Mobile swipe works
- Closes correctly

---

### 4.6 Voyage-Filtered Gallery

**Deliverable:** /gallery/[voyage] route

**Steps:**
1. Create `/src/app/(site)/gallery/[voyage]/page.tsx`

2. Filter gallery by voyage slug

3. Add voyage info header

4. Generate static params from voyages

**Verification:** URLs work, filtering correct

---

## Phase 5: Static Pages and Polish (Week 7-9)

### Objective
Complete remaining pages and optimize for production.

### 5.1 Yacht Page

**Deliverable:** /yacht with specifications and systems

**Steps:**
1. Create `/src/app/(site)/yacht/page.tsx`

2. Implement sections:
   - Hero with large yacht image
   - Name, type, tagline
   - Overview description
   - Key specifications grid

3. Create **SpecsTable.tsx** (`/src/components/yacht/`)
   - Organized specification display
   - Categories: Dimensions, Rig, Engine, Tanks, etc.
   - Two-column key-value layout

4. Image gallery section:
   - Exterior shots
   - Interior shots
   - Detail shots

5. Systems section (expandable or link to subpage):
   - Navigation & Electronics
   - Electrical System
   - Watermaker & Plumbing
   - Safety Equipment
   - Sail Inventory
   - Tender & Toys

6. Create **SystemsList.tsx**:
   - Expandable accordion
   - Category grouping
   - Equipment details

**Verification:** All specs display, images load, expandables work

---

### 5.2 About Page

**Deliverable:** /about with crew and story

**Steps:**
1. Create `/src/app/(site)/about/page.tsx`

2. Implement sections:
   - Hero with crew photo
   - Crew bio(s)
   - Sailing background/experience
   - "Why we sail" / mission statement
   - Social media links

3. Create **ContactForm.tsx** (`/src/components/forms/`):
   - Name, email, message fields
   - Validation
   - Submit handling

4. Create `/src/app/api/contact/route.ts`:
   - POST endpoint
   - Validate inputs
   - Send email (or store in CMS)

**Verification:** Content displays, contact form works

---

### 5.3 Subscribe Page

**Deliverable:** /subscribe dedicated newsletter page

**Steps:**
1. Create `/src/app/(site)/subscribe/page.tsx`

2. Expanded newsletter signup with:
   - Value proposition
   - What subscribers receive
   - Frequency
   - Newsletter form
   - Sample content preview (optional)

**Verification:** Form works, page displays well

---

### 5.4 SEO and Metadata

**Deliverable:** Complete SEO implementation

**Steps:**
1. Configure root metadata in `/src/app/layout.tsx`:
   ```typescript
   export const metadata: Metadata = {
     title: { default: 'Matariki III', template: '%s | Matariki III' },
     description: '...',
     metadataBase: new URL('https://matariki3.nz'),
   }
   ```

2. Add page-specific metadata to each route

3. Create `/src/app/opengraph-image.tsx` (or static images):
   - Default OG image
   - Dynamic OG images for blog posts

4. Create `/src/app/sitemap.ts`:
   - Generate sitemap from all routes and CMS content

5. Create `/src/app/robots.ts`:
   - Configure crawler rules

6. Add JSON-LD structured data:
   - Website schema
   - Article schema for blog posts
   - BreadcrumbList

**Verification:**
- OG tags present on all pages
- Sitemap accessible
- robots.txt correct
- Validate with social preview tools

---

### 5.5 ISR and Revalidation

**Deliverable:** On-demand revalidation from CMS

**Steps:**
1. Create `/src/app/api/revalidate/route.ts`:
   - Verify secret from Sanity webhook
   - Parse webhook payload
   - Call revalidatePath() for affected routes
   - Handle different document types

2. Configure Sanity webhook:
   - URL: `https://matariki3.nz/api/revalidate?secret=[SECRET]`
   - Trigger on: Create, Update, Delete
   - Filter: logEntry, voyage, galleryImage, siteSettings
   - Projection: `{_type, slug}`

3. Add revalidation tags to fetch calls for granular invalidation

**Verification:**
- Publish content in Sanity
- Verify page updates without rebuild
- Check webhook logs

---

### 5.6 Error and Loading States

**Deliverable:** Polished error handling

**Steps:**
1. Create `/src/app/(site)/error.tsx`:
   - Client error boundary
   - Styled error page
   - Retry button

2. Create `/src/app/(site)/not-found.tsx`:
   - Custom 404 page
   - Helpful navigation

3. Create loading states:
   - `/src/app/(site)/loading.tsx` (global)
   - Route-specific loading.tsx files
   - Skeleton components

**Verification:** Trigger errors, verify display

---

### 5.7 Performance Optimization

**Deliverable:** 90+ Lighthouse scores

**Steps:**
1. Image optimization:
   - Verify all images use next/image
   - Add blur placeholders to Sanity images
   - Verify WebP/AVIF serving

2. Font optimization:
   - Subset fonts (if self-hosting)
   - Verify preload
   - Check FOUT/FOIT

3. JavaScript optimization:
   - Lazy load Mapbox GL JS
   - Dynamic imports for heavy components
   - Bundle analysis

4. CSS optimization:
   - Purge unused Tailwind
   - Critical CSS (Next.js handles)

5. Core Web Vitals:
   - LCP: Optimize hero image
   - FID: Minimize main thread blocking
   - CLS: Reserve space for images, fonts

**Verification:**
- Run Lighthouse audits
- Test on throttled connections
- Verify Core Web Vitals in Chrome DevTools

---

### 5.8 Responsive Testing

**Deliverable:** All breakpoints working correctly

**Steps:**
1. Test all pages at:
   - Mobile: 375px, 414px
   - Tablet: 768px, 1024px
   - Desktop: 1280px, 1440px, 1920px

2. Check:
   - Navigation (hamburger menu)
   - Grid layouts
   - Typography scaling
   - Touch targets (minimum 44x44px)
   - Horizontal scrolling (none)

3. Fix issues identified

**Verification:** No layout breaks at any viewport

---

## Phase 6: Deployment (Week 9-10)

### Objective
Deploy to production and verify all integrations.

### 6.1 Vercel Configuration

**Deliverable:** Production-ready Vercel setup

**Steps:**
1. Create `vercel.json`:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": "nextjs",
     "regions": ["syd1"],
     "headers": [
       {
         "source": "/fonts/(.*)",
         "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
       },
       {
         "source": "/(.*)",
         "headers": [
           { "key": "X-Content-Type-Options", "value": "nosniff" },
           { "key": "X-Frame-Options", "value": "DENY" },
           { "key": "X-XSS-Protection", "value": "1; mode=block" }
         ]
       }
     ],
     "rewrites": [
       { "source": "/sitemap.xml", "destination": "/api/sitemap" }
     ]
   }
   ```

2. Configure `next.config.js`:
   ```javascript
   module.exports = {
     images: {
       remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
       formats: ['image/avif', 'image/webp'],
     },
   }
   ```

**Verification:** Config files valid

---

### 6.2 Environment Variables

**Deliverable:** All secrets configured in Vercel

**Steps:**
1. In Vercel Dashboard > Project Settings > Environment Variables:
   - SANITY_PROJECT_ID
   - SANITY_DATASET
   - SANITY_API_TOKEN
   - SANITY_REVALIDATE_SECRET
   - NEXT_PUBLIC_MAPBOX_TOKEN
   - NEXT_PUBLIC_SITE_URL (production URL)
   - BUTTONDOWN_API_KEY
   - CRON_SECRET (for position polling)

2. Set appropriate scopes (Production, Preview, Development)

**Verification:** Variables set for all environments

---

### 6.3 Domain Configuration

**Deliverable:** Custom domain active with SSL

**Steps:**
1. Add domain in Vercel Dashboard > Domains

2. Configure DNS:
   ```
   Type    Name    Value
   A       @       76.76.21.21
   CNAME   www     cname.vercel-dns.com
   ```

3. Wait for DNS propagation (up to 48 hours)

4. Enable "Redirect www to non-www" (or vice versa)

5. Verify SSL certificate (auto-provisioned)

**Verification:**
- https://matariki3.nz loads
- www redirects correctly
- SSL shows valid

---

### 6.4 External Service Configuration

**Deliverable:** All integrations working in production

**Steps:**
1. **Sanity:**
   - Add production domain to CORS origins
   - Configure webhook for revalidation
   - Test webhook delivery

2. **Mapbox:**
   - Add production domain to allowed URLs
   - Verify API token restrictions

3. **Buttondown/ConvertKit:**
   - Verify API key works
   - Test subscription flow

4. **Analytics:**
   - Enable Vercel Analytics
   - Or configure Plausible/Umami

**Verification:** All integrations tested on production

---

### 6.5 Pre-Launch Checklist

**Deliverable:** All items verified

**Checklist:**
- [ ] All pages render correctly
- [ ] Navigation works (all links valid)
- [ ] Forms submit successfully (newsletter, contact)
- [ ] Map displays current position
- [ ] Images load with optimization
- [ ] Responsive on all devices
- [ ] SEO metadata present
- [ ] sitemap.xml accessible
- [ ] robots.txt correct
- [ ] 404 page styled
- [ ] Favicon and app icons display
- [ ] SSL certificate active
- [ ] Sanity webhook working
- [ ] No console errors
- [ ] Lighthouse scores 90+
- [ ] Core Web Vitals pass
- [ ] Analytics tracking

---

### 6.6 Launch and Monitoring

**Deliverable:** Site live with monitoring

**Steps:**
1. Final deployment to production

2. Enable Vercel Analytics and Speed Insights

3. Set up uptime monitoring (optional):
   - Vercel's built-in checks
   - Or external service (UptimeRobot, etc.)

4. Monitor for errors post-launch

5. Document any issues for follow-up

**Verification:** Site live, no critical errors

---

## Post-Launch / Future Enhancements

### Phase 2+ Features (Not in MVP)

1. **Position Polling Cron Job**
   - If tracking source requires polling
   - Configure Vercel cron job
   - `/api/cron/fetch-position`

2. **Video Integration**
   - YouTube channel feed
   - Video gallery section
   - Embedded players

3. **Weather Widget**
   - Current conditions at yacht position
   - Weather API integration

4. **Gear/Equipment Page**
   - Affiliate product recommendations
   - Equipment reviews

5. **Progressive Web App (PWA)**
   - Offline support
   - Install prompt

6. **Multi-language Support**
   - Maori translations
   - Language switcher

---

## Summary Timeline

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1 | Foundation | Project init, Tailwind config, Sanity schemas |
| 2 | Foundation + Layout | Design system complete, Header/Footer |
| 3 | Layout + Homepage | Core UI components, Hero, Stats |
| 4 | Homepage + Blog | Yacht section, Posts section, Newsletter |
| 5 | Blog | Log listing, Log entry pages, Article renderer |
| 6 | Maps | Mapbox setup, Full tracking page |
| 7 | Maps + Gallery | Map widget, Gallery grid, Lightbox |
| 8 | Static Pages | Yacht, About, Subscribe pages |
| 9 | Polish | SEO, Performance, Responsive, Errors |
| 10 | Deployment | Vercel config, Domain, Launch |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Mapbox complexity | Start with Skipperblogs embed, migrate to custom later |
| Sanity schema changes | Design schemas carefully upfront, use migrations |
| Image performance | Use Sanity image pipeline, next/image consistently |
| Position data availability | Graceful fallbacks when position unavailable |
| Scope creep | Strict MVP definition, Phase 2+ backlog |

---

## Resource Requirements

### Accounts Needed
- Sanity.io (free tier sufficient for MVP)
- Mapbox (free tier: 50k loads/month)
- Vercel (free tier or Pro)
- Buttondown or ConvertKit
- Domain registrar access
- Skipperblogs subscription (if using)

### Content Needed
- Hero images (high-res, landscape)
- Yacht photos (exterior, interior, details)
- Crew photos
- Initial log entries (2-3 minimum)
- Yacht specifications (complete data)
- About/crew bio text

---

*Development Plan Version 1.0 — January 2026*
