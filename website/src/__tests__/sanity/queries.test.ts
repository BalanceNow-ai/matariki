import { describe, it, expect } from 'vitest'
import {
  RECENT_POSTS_QUERY,
  ALL_POSTS_QUERY,
  POST_BY_SLUG_QUERY,
  FEATURED_GALLERY_QUERY,
  ALL_GALLERY_QUERY,
  ALL_VIDEOS_QUERY,
  SITE_SETTINGS_QUERY,
  VOYAGES_QUERY,
  CREW_QUERY,
  VESSEL_QUERY,
  LATEST_POSITION_QUERY,
  ACTIVE_VOYAGE_QUERY,
  VOYAGES_FOR_SELECTOR_QUERY,
  LOG_ENTRIES_WITH_COORDS_QUERY,
  VOYAGE_BY_SLUG_QUERY,
  LEG_BY_SLUG_QUERY,
  LEG_CARD_FIELDS,
} from '@/sanity/queries'
import { LISTED_PASSAGES_QUERY, OPEN_PASSAGES_QUERY, OPEN_FOR_CREW_FILTER } from '@/lib/crew/passages'

describe('Sanity GROQ Queries', () => {
  describe('RECENT_POSTS_QUERY', () => {
    it('is a valid GROQ query string', () => {
      expect(typeof RECENT_POSTS_QUERY).toBe('string')
      expect(RECENT_POSTS_QUERY.length).toBeGreaterThan(0)
    })

    it('queries logEntry type', () => {
      expect(RECENT_POSTS_QUERY).toContain('_type == "logEntry"')
    })

    it('limits to 3 entries', () => {
      expect(RECENT_POSTS_QUERY).toContain('[0...3]')
    })

    it('orders by publishedAt desc', () => {
      expect(RECENT_POSTS_QUERY).toContain('order(publishedAt desc)')
    })

    it('requires defined slug', () => {
      expect(RECENT_POSTS_QUERY).toContain('defined(slug.current)')
    })

    it('selects required fields', () => {
      expect(RECENT_POSTS_QUERY).toContain('_id')
      expect(RECENT_POSTS_QUERY).toContain('title')
      expect(RECENT_POSTS_QUERY).toContain('slug')
      expect(RECENT_POSTS_QUERY).toContain('publishedAt')
      expect(RECENT_POSTS_QUERY).toContain('category')
      expect(RECENT_POSTS_QUERY).toContain('heroImage')
    })
  })

  describe('ALL_POSTS_QUERY', () => {
    it('queries logEntry type', () => {
      expect(ALL_POSTS_QUERY).toContain('_type == "logEntry"')
    })

    it('does not limit results', () => {
      expect(ALL_POSTS_QUERY).not.toMatch(/\[\d+\.\.\.\d+\]/)
    })

    it('orders by publishedAt desc', () => {
      expect(ALL_POSTS_QUERY).toContain('order(publishedAt desc)')
    })
  })

  describe('POST_BY_SLUG_QUERY', () => {
    it('queries by slug parameter', () => {
      expect(POST_BY_SLUG_QUERY).toContain('slug.current == $slug')
    })

    it('returns single document', () => {
      expect(POST_BY_SLUG_QUERY).toContain('[0]')
    })

    it('includes content fields', () => {
      expect(POST_BY_SLUG_QUERY).toContain('contentHtml')
      expect(POST_BY_SLUG_QUERY).toContain('location')
    })

    it('dereferences voyage', () => {
      expect(POST_BY_SLUG_QUERY).toContain('voyage->title')
    })
  })

  describe('FEATURED_GALLERY_QUERY', () => {
    it('queries galleryImage type', () => {
      expect(FEATURED_GALLERY_QUERY).toContain('_type == "galleryImage"')
    })

    it('filters by featured', () => {
      expect(FEATURED_GALLERY_QUERY).toContain('featured == true')
    })

    it('limits to 5 images', () => {
      expect(FEATURED_GALLERY_QUERY).toContain('[0...5]')
    })

    it('orders by takenAt desc', () => {
      expect(FEATURED_GALLERY_QUERY).toContain('order(takenAt desc)')
    })
  })

  describe('ALL_GALLERY_QUERY', () => {
    it('queries galleryImage type', () => {
      expect(ALL_GALLERY_QUERY).toContain('_type == "galleryImage"')
    })

    it('includes EXIF data', () => {
      expect(ALL_GALLERY_QUERY).toContain('exif')
    })

    it('dereferences voyage title', () => {
      expect(ALL_GALLERY_QUERY).toContain('voyage->title')
    })
  })

  describe('ALL_VIDEOS_QUERY', () => {
    it('queries video type', () => {
      expect(ALL_VIDEOS_QUERY).toContain('_type == "video"')
    })

    it('includes video URL fields', () => {
      expect(ALL_VIDEOS_QUERY).toContain('youtubeUrl')
      expect(ALL_VIDEOS_QUERY).toContain('vimeoUrl')
    })

    it('includes video metadata', () => {
      expect(ALL_VIDEOS_QUERY).toContain('duration')
      expect(ALL_VIDEOS_QUERY).toContain('featured')
    })
  })

  describe('SITE_SETTINGS_QUERY', () => {
    it('queries siteSettings singleton', () => {
      expect(SITE_SETTINGS_QUERY).toContain('_type == "siteSettings"')
      expect(SITE_SETTINGS_QUERY).toContain('[0]')
    })

    it('dereferences current voyage', () => {
      expect(SITE_SETTINGS_QUERY).toContain('currentVoyage->title')
    })

    it('includes social links', () => {
      expect(SITE_SETTINGS_QUERY).toContain('socialLinks')
    })
  })

  describe('VOYAGES_QUERY', () => {
    it('queries voyage type', () => {
      expect(VOYAGES_QUERY).toContain('_type == "voyage"')
    })

    it('orders by startDate desc', () => {
      expect(VOYAGES_QUERY).toContain('order(startDate desc)')
    })

    it('includes required voyage fields', () => {
      expect(VOYAGES_QUERY).toContain('title')
      expect(VOYAGES_QUERY).toContain('slug')
      expect(VOYAGES_QUERY).toContain('status')
    })
  })

  describe('CREW_QUERY', () => {
    it('queries crew type', () => {
      expect(CREW_QUERY).toContain('_type == "crew"')
    })

    it('orders by sortOrder', () => {
      expect(CREW_QUERY).toContain('order(sortOrder asc)')
    })

    it('includes crew fields', () => {
      expect(CREW_QUERY).toContain('name')
      expect(CREW_QUERY).toContain('role')
      expect(CREW_QUERY).toContain('bio')
      expect(CREW_QUERY).toContain('photo')
    })
  })

  describe('VESSEL_QUERY', () => {
    it('queries vessel singleton', () => {
      expect(VESSEL_QUERY).toContain('_type == "vessel"')
      expect(VESSEL_QUERY).toContain('[0]')
    })

    it('includes specification objects', () => {
      expect(VESSEL_QUERY).toContain('dimensions')
      expect(VESSEL_QUERY).toContain('rig')
      expect(VESSEL_QUERY).toContain('engine')
      expect(VESSEL_QUERY).toContain('tanks')
    })

    it('includes description sections', () => {
      expect(VESSEL_QUERY).toContain('descriptionSections')
    })
  })

  describe('LATEST_POSITION_QUERY', () => {
    it('queries position type', () => {
      expect(LATEST_POSITION_QUERY).toContain('_type == "position"')
    })

    it('orders by timestamp desc', () => {
      expect(LATEST_POSITION_QUERY).toContain('order(timestamp desc)')
    })

    it('returns single document', () => {
      expect(LATEST_POSITION_QUERY).toContain('[0]')
    })
  })

  describe('ACTIVE_VOYAGE_QUERY', () => {
    it('filters by active status', () => {
      expect(ACTIVE_VOYAGE_QUERY).toContain('status == "active"')
    })

    it('returns single document', () => {
      expect(ACTIVE_VOYAGE_QUERY).toContain('[0]')
    })
  })

  describe('VOYAGES_FOR_SELECTOR_QUERY', () => {
    it('orders by startDate desc', () => {
      expect(VOYAGES_FOR_SELECTOR_QUERY).toContain('order(startDate desc)')
    })

    it('includes minimal fields for dropdown', () => {
      expect(VOYAGES_FOR_SELECTOR_QUERY).toContain('_id')
      expect(VOYAGES_FOR_SELECTOR_QUERY).toContain('title')
      expect(VOYAGES_FOR_SELECTOR_QUERY).toContain('slug')
      expect(VOYAGES_FOR_SELECTOR_QUERY).toContain('status')
    })
  })

  describe('LOG_ENTRIES_WITH_COORDS_QUERY', () => {
    it('filters by defined coordinates', () => {
      expect(LOG_ENTRIES_WITH_COORDS_QUERY).toContain('defined(location.latitude.degrees)')
      expect(LOG_ENTRIES_WITH_COORDS_QUERY).toContain('defined(location.longitude.degrees)')
    })

    it('includes voyage references', () => {
      expect(LOG_ENTRIES_WITH_COORDS_QUERY).toContain('voyageId')
      expect(LOG_ENTRIES_WITH_COORDS_QUERY).toContain('voyageTitle')
    })
  })

  describe('VOYAGE_BY_SLUG_QUERY', () => {
    it('queries by slug parameter', () => {
      expect(VOYAGE_BY_SLUG_QUERY).toContain('slug.current == $slug')
    })

    it('includes related gallery images', () => {
      expect(VOYAGE_BY_SLUG_QUERY).toContain('galleryImages')
    })

    it('includes related log entries', () => {
      expect(VOYAGE_BY_SLUG_QUERY).toContain('logEntries')
    })
  })
})

describe('Voyage legs queries', () => {
  it('VOYAGE_BY_SLUG_QUERY returns the ordered legs, legs referencing the voyage, key events and route', () => {
    expect(VOYAGE_BY_SLUG_QUERY).toContain('"legs": legs[]->')
    expect(VOYAGE_BY_SLUG_QUERY).toContain('_type == "passage" && voyage._ref == ^._id')
    expect(VOYAGE_BY_SLUG_QUERY).toContain('!(_id in path("drafts.**"))')
    expect(VOYAGE_BY_SLUG_QUERY).toContain('|order(order asc, plannedStart asc)')
    expect(VOYAGE_BY_SLUG_QUERY).toContain('keyEvents[]{ _key, name, date, place, url }')
    expect(VOYAGE_BY_SLUG_QUERY).toContain('summary')
    expect(VOYAGE_BY_SLUG_QUERY).toContain('routeGeoJson')
  })

  it('leg fields read planned dates with a fallback to the pre-migration names', () => {
    expect(LEG_CARD_FIELDS).toContain('"plannedStart": coalesce(plannedStart, startDate)')
    expect(LEG_CARD_FIELDS).toContain('"plannedEnd": coalesce(plannedEnd, endDate)')
    for (const f of ['actualStart', 'actualEnd', 'plannedDistanceNm', 'actualDistanceNm', 'waypoints', 'fromPoint', 'toPoint', 'kind', 'crewPlaces', 'status']) {
      expect(LEG_CARD_FIELDS).toContain(f)
    }
  })

  it('LEG_BY_SLUG_QUERY only matches a published leg of the voyage in the URL', () => {
    expect(LEG_BY_SLUG_QUERY).toContain('_type == "passage"')
    expect(LEG_BY_SLUG_QUERY).toContain('slug.current == $legSlug')
    expect(LEG_BY_SLUG_QUERY).toContain('voyage->slug.current == $slug')
    expect(LEG_BY_SLUG_QUERY).toContain('!(_id in path("drafts.**"))')
    expect(LEG_BY_SLUG_QUERY).toContain('[0]')
  })

  it('LEG_BY_SLUG_QUERY finds log entries through their leg reference', () => {
    expect(LEG_BY_SLUG_QUERY).toContain('*[_type == "logEntry" && leg._ref == ^._id && defined(slug.current)]')
    expect(LEG_BY_SLUG_QUERY).toContain('gallery')
    expect(LEG_BY_SLUG_QUERY).toContain('minExperience')
  })
})

describe('/crew passage queries', () => {
  it('list a leg only when it is open and has crew places', () => {
    expect(OPEN_FOR_CREW_FILTER).toContain('status == "open"')
    expect(OPEN_FOR_CREW_FILTER).toContain('crewPlaces > 0')
    expect(LISTED_PASSAGES_QUERY).toContain(OPEN_FOR_CREW_FILTER)
    expect(LISTED_PASSAGES_QUERY).not.toContain('"full"')
    // The form accepts exactly what the page lists.
    expect(OPEN_PASSAGES_QUERY).toBe(LISTED_PASSAGES_QUERY)
  })

  it('keep the dates crew code expects, from the planned fields', () => {
    expect(LISTED_PASSAGES_QUERY).toContain('"startDate": coalesce(plannedStart, startDate)')
    expect(LISTED_PASSAGES_QUERY).toContain('"endDate": coalesce(plannedEnd, endDate)')
    expect(LISTED_PASSAGES_QUERY).toContain('| order(startDate asc)')
  })
})
