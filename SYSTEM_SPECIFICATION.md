# Matariki III - Complete System Specification
## Version 2.0 - FDD/TDD Development Approach

---

## 1. Executive Summary

### 1.1 Project Overview
Matariki III is a sailing adventure website for an Oyster 68 yacht, providing real-time GPS tracking, voyage documentation, photo/video galleries, and yacht specifications.

### 1.2 Technology Stack
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| CMS | Sanity.io | 5.6.0 |
| Maps | Leaflet/OpenSeaMap | 1.9.4 |
| State | React Hooks | 19.2.3 |
| Forms | react-hook-form + Zod | 7.71.1 / 4.3.6 |
| Cache | Upstash Redis | 1.36.3 |
| Hosting | Vercel | - |

---

## 2. System Architecture

### 2.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │  Components │  │       Hooks             │  │
│  │  (Next.js)  │  │    (React)  │  │  (useSignalK, etc.)     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  /api/position  │  │  /api/subscribe │  │ Sanity Client   │  │
│  │   GET/POST      │  │     POST        │  │   (GROQ)        │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Upstash Redis  │  │    Buttondown   │  │   Sanity CMS    │  │
│  │  (Positions)    │  │   (Newsletter)  │  │   (Content)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            ▲
            │
┌───────────┴───────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                       │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │    Signal K     │  │   OpenSeaMap    │                      │
│  │   (Boat Data)   │  │   (Tiles)       │                      │
│  └─────────────────┘  └─────────────────┘                      │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure
```
/home/user/matariki/website/
├── sanity/
│   ├── schemas/           # Sanity document schemas
│   │   ├── crew.ts
│   │   ├── galleryImage.ts
│   │   ├── logEntry.ts
│   │   ├── position.ts
│   │   ├── siteSettings.ts
│   │   ├── vessel.ts
│   │   ├── video.ts
│   │   └── voyage.ts
│   └── sanity.config.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── position/     # Position tracking API
│   │   │   │   ├── route.ts       # GET/POST position
│   │   │   │   ├── history/       # GET position history
│   │   │   │   ├── debug/         # Debug endpoint
│   │   │   │   ├── store.ts       # In-memory store
│   │   │   │   └── redis-store.ts # Redis persistence
│   │   │   └── subscribe/    # Newsletter subscription
│   │   ├── (pages)/
│   │   │   ├── page.tsx      # Homepage
│   │   │   ├── about/        # About page
│   │   │   ├── gallery/      # Photo gallery
│   │   │   ├── log/          # Blog/log entries
│   │   │   ├── track/        # Live tracking map
│   │   │   ├── voyages/      # Voyage listings
│   │   │   ├── yacht/        # Yacht specifications
│   │   │   └── subscribe/    # Newsletter signup
│   │   └── studio/           # Sanity Studio
│   ├── components/
│   │   ├── content/          # Content display components
│   │   ├── forms/            # Form components
│   │   ├── gallery/          # Gallery components
│   │   ├── layout/           # Layout components
│   │   ├── map/              # Map components
│   │   ├── tracking/         # Tracking panels
│   │   └── ui/               # UI primitives
│   ├── hooks/
│   │   ├── useSignalK.ts     # Position polling hook
│   │   └── useAISStream.ts   # AIS streaming hook
│   ├── lib/
│   │   ├── data/mock.ts      # Mock data
│   │   └── utils.ts          # Utility functions
│   ├── sanity/
│   │   ├── client.ts         # Sanity client config
│   │   └── queries.ts        # GROQ queries
│   └── types/
│       └── index.ts          # TypeScript interfaces
└── package.json
```

---

## 3. Data Models

### 3.1 Core TypeScript Interfaces

#### Position
```typescript
interface SignalKPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
  source: "signalk" | "fallback";
  // Navigation
  courseOverGround?: number;  // degrees
  speedOverGround?: number;   // knots
  heading?: number;           // degrees (true)
  tripLog?: number;           // nautical miles
  depth?: number;             // meters
  // Wind
  apparentWindSpeed?: number; // knots
  apparentWindAngle?: number; // degrees
  // Environment
  waterTemperature?: number;  // celsius
  barometricPressure?: number; // hPa
  // Vessel
  name?: string;
  mmsi?: string;
  location?: string;
}
```

#### Voyage
```typescript
interface Voyage {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: "planning" | "active" | "completed";
  heroImage?: string;
}
```

#### LogEntry
```typescript
interface LogEntry {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  voyageId: string;
  category: "sailing" | "hunting" | "diving" | "fishing" | "general";
  location?: {
    name: string;
    coordinates: [number, number]; // [lng, lat]
  };
  heroImage?: string;
  excerpt?: string;
  contentHtml?: string;
}
```

#### GalleryImage
```typescript
interface GalleryImage {
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
```

#### YachtSpecs
```typescript
interface YachtSpecs {
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
```

### 3.2 Sanity CMS Schema Mapping

| Schema | Document Type | Key Fields | References |
|--------|--------------|------------|------------|
| voyage | voyage | title, slug, status, startDate, endDate | - |
| logEntry | logEntry | title, slug, category, location, contentHtml | voyage |
| galleryImage | galleryImage | image, caption, category, featured | voyage |
| video | video | title, videoType, youtubeUrl/vimeoUrl | voyage |
| position | position | coordinates, timestamp, source | voyage |
| vessel | vessel | name, type, dimensions, electronics | - |
| crew | crew | name, role, bio, photo | - |
| siteSettings | siteSettings | siteName, tagline, currentVoyage, socialLinks | voyage |

---

## 4. API Specifications

### 4.1 Position API

#### GET /api/position
Returns the latest position of Matariki III.

**Response:**
```json
{
  "latitude": -35.7275,
  "longitude": 174.3278,
  "timestamp": "2026-03-01T10:30:00Z",
  "source": "signalk",
  "speedOverGround": 6.5,
  "courseOverGround": 180,
  "heading": 175,
  "name": "Matariki III",
  "mmsi": "512004962"
}
```

**Error Responses:**
- 500: Internal server error

#### POST /api/position
Receives position updates from Signal K webhook.

**Authentication:**
- Bearer token in Authorization header
- X-Auth-Token header
- Query parameter: ?token=xxx

**Request Formats Supported:**

1. **Signal K Delta Format:**
```json
{
  "updates": [{
    "values": [{
      "path": "navigation.position",
      "value": { "latitude": -35.7275, "longitude": 174.3278 }
    }]
  }]
}
```

2. **Simplified Format:**
```json
{
  "latitude": -35.7275,
  "longitude": 174.3278,
  "courseOverGround": 180.5,
  "speedOverGround": 3.5
}
```

3. **Nested Position Format (MSP-webhook):**
```json
{
  "position": {
    "value": { "latitude": -35.7275, "longitude": 174.3278 }
  },
  "speed": { "value": 2.5 },
  "cog": { "value": 3.14 }
}
```

**Response:**
```json
{ "success": true, "position": { ... } }
```

**Error Responses:**
- 400: Invalid JSON or payload format
- 401: Unauthorized (invalid token)

#### GET /api/position/history
Returns position history.

**Response:**
```json
[
  { "latitude": -35.7275, "longitude": 174.3278, "timestamp": "..." },
  ...
]
```

### 4.2 Subscribe API

#### POST /api/subscribe
Subscribes email to newsletter via Buttondown.

**Request:**
```json
{ "email": "user@example.com" }
```

**Response:**
```json
{ "success": true }
// or
{ "success": true, "alreadySubscribed": true }
```

**Error Responses:**
- 400: Invalid email
- 503: Newsletter service not configured
- 500: Failed to subscribe

---

## 5. Component Specifications

### 5.1 Layout Components

#### Header
- Fixed navigation bar with scroll opacity effect
- Mobile hamburger menu
- Active link highlighting
- Links: Track, Log, Gallery, Yacht, About

#### Footer
- 4-column layout: Brand, Navigation, Voyages, Connect
- Social media links
- Copyright

#### Container
- Max-width: 1400px
- Responsive padding: px-16 (desktop), px-8 (mobile)

#### Section
- Padded section wrapper
- Background variants: default, dark, gradient

### 5.2 UI Components

#### Button
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | "primary" \| "ghost" | "primary" | Button style |
| size | "sm" \| "md" \| "lg" | "md" | Button size |
| href | string | - | Makes button a link |
| disabled | boolean | false | Disabled state |

#### Input
- Form input with label and error states
- Props: label, error, placeholder

#### Card
- Semi-transparent background
- Hover effects: border-copper, translateY(-8px)

#### Badge
- Category badges for posts
- Variants per category

#### SectionLabel
- Format: "01 — SECTION NAME"
- Monospace font, uppercase, copper color

### 5.3 Content Components

#### PostCard
- Featured image (16:10)
- Category badge overlay
- Title, excerpt, meta (location + date)

#### StatBlock
- Large number display with label

#### GalleryGrid
- CSS Grid masonry layout
- Hover overlays

### 5.4 Map Components

#### MapWidget
- Small preview map on homepage
- Shows current position with marker
- Live/Last Known status indicator
- Links to full tracking page

#### OpenSeaMap
- Full interactive Leaflet map
- Vessel position marker with heading
- OpenSeaMap nautical chart overlay

#### TrackingMap
- Full-screen map
- Track line visualization
- Waypoint markers

### 5.5 Form Components

#### NewsletterForm
- Email input with validation
- States: idle, loading, success, error
- Submits to /api/subscribe

---

## 6. Integration Points

### 6.1 Sanity CMS
**Connection:**
- Project ID: gjwqcjfo (default)
- Dataset: production
- API Version: 2024-01-01

**Queries:**
| Query | Purpose |
|-------|---------|
| RECENT_POSTS_QUERY | 3 most recent log entries |
| ALL_POSTS_QUERY | All log entries |
| POST_BY_SLUG_QUERY | Single log entry |
| FEATURED_GALLERY_QUERY | 5 featured gallery images |
| ALL_GALLERY_QUERY | All gallery images |
| VESSEL_QUERY | Yacht specifications |
| VOYAGES_QUERY | All voyages |
| CREW_QUERY | Crew members |
| SITE_SETTINGS_QUERY | Site configuration |
| LATEST_POSITION_QUERY | Latest position from CMS |
| ACTIVE_VOYAGE_QUERY | Currently active voyage |

### 6.2 Signal K / Position Tracking
**Data Flow:**
1. Signal K on vessel sends webhook to /api/position
2. API validates authentication
3. Parses position data from various formats
4. Stores in Redis (or memory fallback)
5. Frontend polls /api/position every 60s

**Fallback Position:**
- Whangarei Marina: -35.7275, 174.3278

### 6.3 Upstash Redis
**Keys:**
- `matariki:position:latest` - Current position
- `matariki:position:history` - Position history (max 1000)
- `matariki:debug:request-log` - Request logs (max 50)

**Environment Variables:**
- UPSTASH_REDIS_REST_URL / KV_REST_API_URL
- UPSTASH_REDIS_REST_TOKEN / KV_REST_API_TOKEN

### 6.4 Buttondown Newsletter
**Integration:**
- API endpoint: https://api.buttondown.email/v1/subscribers
- Authentication: Token-based (Authorization header)
- Environment: BUTTONDOWN_API_KEY

### 6.5 OpenSeaMap
**Tile Sources:**
- Base: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
- Nautical: https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png

---

## 7. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_SANITY_PROJECT_ID | Yes | Sanity project ID |
| NEXT_PUBLIC_SANITY_DATASET | Yes | Sanity dataset name |
| SANITY_API_TOKEN | No | For authenticated Sanity requests |
| SIGNALK_WEBHOOK_SECRET | Yes | Auth token for position updates |
| UPSTASH_REDIS_REST_URL | No | Redis URL (falls back to memory) |
| UPSTASH_REDIS_REST_TOKEN | No | Redis token |
| BUTTONDOWN_API_KEY | No | Newsletter API key |
| NEXT_PUBLIC_SITE_URL | Yes | Production URL |

---

## 8. Error Handling

### 8.1 API Error Responses
All API routes return consistent error format:
```json
{ "error": "Error message" }
```

Status codes:
- 400: Bad request (invalid input)
- 401: Unauthorized
- 500: Server error
- 503: Service unavailable

### 8.2 Fallback Behavior
| Scenario | Fallback |
|----------|----------|
| No position data | Whangarei Marina coordinates |
| Redis unavailable | In-memory storage |
| Sanity unavailable | Empty arrays, null objects |
| Newsletter not configured | 503 response |

---

## 9. Performance Requirements

### 9.1 Targets
- Lighthouse Score: 90+ all metrics
- Core Web Vitals: Pass
- Time to First Byte: < 200ms
- First Contentful Paint: < 1.5s

### 9.2 Optimization Strategies
- Image optimization via next/image
- Lazy loading for maps
- Redis caching for positions
- Sanity CDN for images
- ISR revalidation: 60 seconds

---

## 10. Security Considerations

### 10.1 Authentication
- Position API: Token-based authentication
- Multiple auth methods supported (Bearer, X-Auth-Token, query params)

### 10.2 Input Validation
- Email validation in subscribe API
- JSON parsing with error handling
- Coordinate validation in position API

### 10.3 Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

---

## 11. Test Specification

### 11.1 Unit Tests

#### Utility Functions
| Function | Test Cases |
|----------|------------|
| cn() | Merges class names, handles conflicts |
| formatDate() | Formats dates in NZ locale |
| formatCoordinates() | Formats lat/lng with directions |
| calculateReadTime() | Calculates reading time from word count |
| toKnots() | Converts m/s to knots |
| timeSince() | Formats relative time strings |

#### Hooks
| Hook | Test Cases |
|------|------------|
| useSignalK | Initial load, polling, error handling, refetch |

### 11.2 Component Tests

#### UI Components
| Component | Test Cases |
|-----------|------------|
| Button | Renders variants, handles clicks, renders as link |
| Input | Shows label, displays error, handles change |
| Card | Renders children, applies hover styles |
| Badge | Renders category variants |
| SectionLabel | Formats number and label correctly |

#### Form Components
| Component | Test Cases |
|-----------|------------|
| NewsletterForm | Validates email, submits, shows states |

### 11.3 Integration Tests

#### API Routes
| Endpoint | Test Cases |
|----------|------------|
| GET /api/position | Returns position, fallback on error |
| POST /api/position | Auth, SignalK format, simplified format |
| GET /api/position/history | Returns array of positions |
| POST /api/subscribe | Valid email, invalid email, API errors |

#### Sanity Queries
| Query | Test Cases |
|-------|------------|
| RECENT_POSTS_QUERY | Returns 3 posts max |
| POST_BY_SLUG_QUERY | Returns single post or null |
| VESSEL_QUERY | Returns vessel data |
| VOYAGES_QUERY | Returns sorted voyages |

### 11.4 E2E Tests

| Flow | Steps |
|------|-------|
| Homepage load | Verify hero, map widget, recent posts, footer |
| Newsletter signup | Enter email, submit, verify success |
| Navigation | Click all nav links, verify pages load |
| Position tracking | Verify map loads, position displays |

---

## 12. Feature-Driven Development (FDD) Features

### 12.1 Feature List

| ID | Feature | Status | Priority |
|----|---------|--------|----------|
| F001 | Display yacht position on map | ✅ Implemented | P0 |
| F002 | Real-time position updates | ✅ Implemented | P0 |
| F003 | Display recent log entries | ✅ Implemented | P0 |
| F004 | Newsletter subscription | ✅ Implemented | P1 |
| F005 | Gallery display | ✅ Implemented | P1 |
| F006 | Yacht specifications | ✅ Implemented | P1 |
| F007 | Voyage listing | ✅ Implemented | P2 |
| F008 | Log entry detail page | ✅ Implemented | P1 |
| F009 | Position history | ✅ Implemented | P2 |
| F010 | Crew profiles | ✅ Implemented | P2 |

### 12.2 Feature Dependencies
```
F001 (Map) ─┬─► F002 (Real-time)
            └─► F009 (History)

F003 (Log List) ──► F008 (Log Detail)

F007 (Voyage List) ──► Gallery, Logs filtered by voyage
```

---

## 13. Deployment

### 13.1 Vercel Configuration
- Framework: Next.js
- Region: syd1 (Sydney)
- Node.js: 20.x

### 13.2 Build Command
```bash
npm run build
```

### 13.3 Environment Setup
All environment variables must be configured in Vercel dashboard.

---

## 14. Monitoring & Debugging

### 14.1 Debug Endpoints
- GET /api/position/debug - Request log viewer
- GET /api/position/diagnostic - System diagnostics
- /diagnostic/api - API test page
- /diagnostic/newsletter - Newsletter test page
- /diagnostic/position - Position debug page

### 14.2 Logging
- Console logs for position updates
- Request logging in Redis

---

*Document Version: 2.0*
*Last Updated: 2026-03-01*
*Generated for FDD/TDD Development Approach*
