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
} from '@/sanity/queries'

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
      expect(LOG_ENTRIES_WITH_COORDS_QUERY).toContain('defined(location.coordinates.lat)')
      expect(LOG_ENTRIES_WITH_COORDS_QUERY).toContain('defined(location.coordinates.lng)')
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
