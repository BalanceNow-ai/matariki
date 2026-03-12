# GPX Track Rendering Issue Diagnosis

**Date:** 2026-03-12
**File Analyzed:** `missing_plus_later_from_final_with_bridged_timestamps.gpx`

## Summary

Some tracks from the GPX file are not rendering due to timestamp-based deduplication dropping ~3.5% of track points, including critical "bridge" points that connect segments.

## File Statistics

| Metric | Value |
|--------|-------|
| Total track points | 48,839 |
| Track segments | 20 |
| Unique timestamps | 47,136 |
| Duplicate timestamps | 1,663 |
| Points lost to deduplication | 1,703 (~3.5%) |

## Root Causes

### 1. Timestamp-Only Deduplication (Primary Issue)

**Location:** `website/src/app/api/position/redis-store.ts:419-423`

```typescript
const existingTimestamps = new Set(existingTrack.map(p => p.timestamp));
const newPositions = positions.filter(newPos => !existingTimestamps.has(newPos.timestamp));
```

The deduplication uses timestamp as the sole key. When multiple points share the same timestamp (common in merged/bridged GPX files), only the first point is kept.

### 2. Bridged Timestamps at Segment Boundaries

The GPX file uses "bridged timestamps" - when merging tracks, the last point of segment N and first point of segment N+1 are given identical timestamps to create visual continuity:

```xml
</trkseg><trkseg><trkpt lat="-45.2512920" lon="167.1646463"><time>2026-03-03T22:33:38Z</time>
</trkseg><trkseg><trkpt lat="-45.2512971" lon="167.1646465"><time>2026-03-03T22:33:38Z</time>
```

When deduplication runs, one bridge point is dropped, breaking the visual connection between segments and causing gaps in the rendered track.

### 3. Empty Segment

An empty `<trkseg></trkseg>` exists at byte offset 4095322. While the parser handles this gracefully, it unnecessarily increments `segmentIndex`.

## Affected Timestamps (Sample)

Timestamps appearing 3 times (maximum duplication found):

- `2026-03-11T00:54:45Z`
- `2026-03-09T22:57:06Z`
- `2026-03-07T02:44:42Z`
- `2026-03-03T22:33:38Z`
- `2026-02-27T05:46:21Z`

## Recommended Fix

Change deduplication to use a composite key of timestamp + coordinates:

```typescript
// Before (broken):
const existingTimestamps = new Set(existingTrack.map(p => p.timestamp));
const newPositions = positions.filter(newPos => !existingTimestamps.has(newPos.timestamp));

// After (fixed):
const existingKeys = new Set(existingTrack.map(p =>
  `${p.timestamp}|${p.latitude.toFixed(7)}|${p.longitude.toFixed(7)}`
));
const newPositions = positions.filter(newPos =>
  !existingKeys.has(`${newPos.timestamp}|${newPos.latitude.toFixed(7)}|${newPos.longitude.toFixed(7)}`)
);
```

This preserves points that share timestamps but have different coordinates.

## Files to Modify

1. `website/src/app/api/position/redis-store.ts` - Fix `importTrackFromGPX` deduplication logic (lines 419-423 and 457-458)

## Verification Steps

After fix:
1. Clear existing track data
2. Re-import `missing_plus_later_from_final_with_bridged_timestamps.gpx`
3. Verify all 20 segments render
4. Confirm bridge points connect segments visually
