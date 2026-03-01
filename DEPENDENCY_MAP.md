# Matariki III - Dependency & Integration Map

## 1. Production Dependencies

### Core Framework
| Package | Version | Purpose | Integration Points |
|---------|---------|---------|-------------------|
| next | 16.1.4 | React framework with App Router | All pages, API routes, SSR |
| react | 19.2.3 | UI library | All components |
| react-dom | 19.2.3 | React DOM bindings | Root layout |

### CMS & Content
| Package | Version | Purpose | Integration Points |
|---------|---------|---------|-------------------|
| @sanity/client | 7.14.1 | Sanity API client | /src/sanity/client.ts |
| @sanity/image-url | 2.0.3 | Image URL builder | Pages with images |
| @sanity/vision | 5.6.0 | GROQ query tool | Sanity Studio |
| next-sanity | 12.0.14 | Next.js Sanity integration | Studio route, live preview |
| sanity | 5.6.0 | Sanity Studio | /app/studio route |

### Maps & Visualization
| Package | Version | Purpose | Integration Points |
|---------|---------|---------|-------------------|
| leaflet | 1.9.4 | Map rendering | OpenSeaMapClient.tsx |
| react-leaflet | 5.0.0 | React Leaflet bindings | Map components |
| @types/leaflet | 1.9.21 | TypeScript types | Type checking |
| mapbox-gl | 3.19.0 | Alternative map (unused) | Not integrated |

### Styling
| Package | Version | Purpose | Integration Points |
|---------|---------|---------|-------------------|
| tailwind-merge | 3.4.0 | Class merging | /src/lib/utils.ts (cn function) |
| clsx | 2.1.1 | Class composition | /src/lib/utils.ts |
| styled-components | 6.3.8 | CSS-in-JS (legacy) | Sanity Studio |

### Forms & Validation
| Package | Version | Purpose | Integration Points |
|---------|---------|---------|-------------------|
| react-hook-form | 7.71.1 | Form management | Forms (planned) |
| @hookform/resolvers | 5.2.2 | Form validation | With Zod |
| zod | 4.3.6 | Schema validation | Form validation |

### Data & Caching
| Package | Version | Purpose | Integration Points |
|---------|---------|---------|-------------------|
| @upstash/redis | 1.36.3 | Redis client | /api/position/redis-store.ts |

---

## 2. Development Dependencies

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| vitest | 3.2.4 | Test runner |
| @vitejs/plugin-react | 5.1.4 | React plugin for Vitest |
| jsdom | 28.1.0 | DOM simulation |
| @testing-library/react | 16.3.2 | React testing utilities |
| @testing-library/jest-dom | 6.9.1 | DOM matchers |
| @testing-library/user-event | 14.6.1 | User interaction simulation |
| msw | 2.12.10 | API mocking |

### Build & Tooling
| Package | Version | Purpose |
|---------|---------|---------|
| typescript | 5.x | Type checking |
| eslint | 9.x | Linting |
| eslint-config-next | 16.1.4 | Next.js ESLint config |
| tailwindcss | 4.x | CSS framework |
| @tailwindcss/postcss | 4.x | PostCSS integration |

---

## 3. External Services

### Sanity CMS
```
Service:     Sanity.io
Project ID:  gjwqcjfo
Dataset:     production
API Version: 2024-01-01

Endpoints:
- Content API: https://gjwqcjfo.api.sanity.io/v2024-01-01/data/query/production
- CDN Images: https://cdn.sanity.io/images/gjwqcjfo/production/

Environment Variables:
- NEXT_PUBLIC_SANITY_PROJECT_ID
- NEXT_PUBLIC_SANITY_DATASET
- SANITY_API_TOKEN (optional)
```

### Upstash Redis
```
Service:     Upstash Redis
Use Case:    Position data caching

Keys:
- matariki:position:latest     - Current position
- matariki:position:history    - Position history (max 1000)
- matariki:debug:request-log   - Debug logs (max 50)

Environment Variables:
- UPSTASH_REDIS_REST_URL / KV_REST_API_URL
- UPSTASH_REDIS_REST_TOKEN / KV_REST_API_TOKEN
```

### Buttondown Email
```
Service:     Buttondown
Use Case:    Newsletter subscription

Endpoint:    https://api.buttondown.email/v1/subscribers
Auth:        Token-based (Authorization header)

Environment Variables:
- BUTTONDOWN_API_KEY
```

### OpenSeaMap
```
Service:     OpenSeaMap + OpenStreetMap
Use Case:    Map tiles

Tile URLs:
- Base:      https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
- Nautical:  https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png
```

### Signal K
```
Service:     Signal K (on-vessel)
Use Case:    Real-time position updates
Auth:        Bearer token / X-Auth-Token / Query param

Webhook Endpoint: POST /api/position
Payload Formats:
- Signal K Delta
- Simplified JSON
- Nested Position (MSP-webhook)

Environment Variables:
- SIGNALK_WEBHOOK_SECRET
```

---

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Components                       │    │
│  │  ├── MapWidget ─────────┐                                │    │
│  │  ├── TrackingMap ───────┤── Polls /api/position ────────┤───►│
│  │  ├── VesselDataPanel ───┘                                │    │
│  │  └── NewsletterForm ────── Posts /api/subscribe ────────┤───►│
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  GET /api/position ─────────── Redis/Memory ──────────► │    │
│  │  POST /api/position ◄────────── Signal K Webhook        │    │
│  │  POST /api/subscribe ──────────► Buttondown API         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Pages (SSR) ────────────────── Sanity Client ──────────┤───►│
│  │  ├── Homepage                                            │    │
│  │  ├── /log, /log/[slug]                                  │    │
│  │  ├── /gallery                                           │    │
│  │  ├── /yacht                                             │    │
│  │  ├── /voyages, /voyages/[slug]                          │    │
│  │  └── /about                                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │   Sanity CMS   │  │ Upstash Redis  │  │   Buttondown   │    │
│  │   (Content)    │  │  (Positions)   │  │  (Newsletter)  │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│  ┌────────────────┐  ┌────────────────┐                        │
│  │   OpenSeaMap   │  │   Signal K     │                        │
│  │    (Tiles)     │  │   (Webhook)    │                        │
│  └────────────────┘  └────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Dependency Graph

```
                            layout.tsx (Root)
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                Header.tsx   {children}    Footer.tsx
                    │
        ┌───────────┴───────────┬───────────┐
        │                       │           │
     page.tsx              log/page.tsx  track/page.tsx
        │                       │           │
   ┌────┼────┐             PostCard.tsx  LiveTracker.tsx
   │    │    │                  │           │
MapWidget PostCard NewsletterForm     ┌─────┼─────┐
   │         │         │              │     │     │
OpenSeaMap Badge    Input/Button   OpenSeaMap VesselDataPanel
                                         WeatherConditionsPanel
```

---

## 6. Environment Variable Summary

### Required
```env
NEXT_PUBLIC_SITE_URL=https://matarikiyacht.com
NEXT_PUBLIC_SANITY_PROJECT_ID=gjwqcjfo
NEXT_PUBLIC_SANITY_DATASET=production
SIGNALK_WEBHOOK_SECRET=<your-secret>
```

### Optional (Feature-Specific)
```env
# Redis caching (falls back to memory if missing)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Newsletter (returns 503 if missing)
BUTTONDOWN_API_KEY=

# Sanity authenticated requests
SANITY_API_TOKEN=

# Analytics (not implemented)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=

# AIS integration (not implemented)
NEXT_PUBLIC_AISSTREAM_API_KEY=
```

---

## 7. Test Coverage Map

### Unit Tests
| Module | Coverage | Test File |
|--------|----------|-----------|
| lib/utils.ts | cn, formatDate, formatCoordinates, calculateReadTime | lib/utils.test.ts |
| hooks/useSignalK.ts | Hook behavior, toKnots, formatCoordinates, timeSince | hooks/useSignalK.test.ts |

### Component Tests
| Component | Coverage | Test File |
|-----------|----------|-----------|
| Button | Variants, sizes, interactions | components/ui/Button.test.tsx |
| Input | Rendering, types, error state | components/ui/Input.test.tsx |
| Badge | Categories, styling | components/ui/Badge.test.tsx |
| SectionLabel | Formatting, styling | components/ui/SectionLabel.test.tsx |
| NewsletterForm | Validation, submission, states | components/forms/NewsletterForm.test.tsx |

### API Tests
| Route | Coverage | Test File |
|-------|----------|-----------|
| GET /api/position | Returns position, fallback | api/position.test.ts |
| POST /api/position | Auth, payload formats | api/position.test.ts |
| POST /api/subscribe | Validation, subscription | api/subscribe.test.ts |
| Redis Store | CRUD operations | api/redis-store.test.ts |

### Integration Tests
| Area | Coverage | Test File |
|------|----------|-----------|
| Sanity Queries | Query structure validation | sanity/queries.test.ts |

---

## 8. Deployment Dependencies

### Vercel
```
Platform:     Vercel
Region:       syd1 (Sydney)
Node.js:      20.x
Framework:    Next.js (auto-detected)
Build:        npm run build
Output:       .next/
```

### DNS Requirements
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### Security Headers (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

*Document Version: 1.0*
*Last Updated: 2026-03-01*
