#!/usr/bin/env npx ts-node
/**
 * Batch GPX Import Script
 *
 * Processes a large GPX file by parsing it locally and importing track points
 * in batches to avoid payload size limits.
 *
 * Usage:
 *   npx ts-node scripts/batch-import-gpx.ts <gpx-file> [options]
 *
 * Options:
 *   --api-url <url>       API base URL (default: http://localhost:3000)
 *   --token <token>       Admin token for authentication
 *   --batch-size <n>      Points per batch (default: 1000)
 *   --dry-run             Parse file but don't import
 *   --clear-first         Clear existing track before importing
 *   --delay <ms>          Delay between batches in ms (default: 100)
 *
 * Examples:
 *   npx ts-node scripts/batch-import-gpx.ts ./large-track.gpx
 *   npx ts-node scripts/batch-import-gpx.ts ./track.gpx --batch-size 500
 *   npx ts-node scripts/batch-import-gpx.ts ./track.gpx --token your-secret --clear-first
 */

import * as fs from "fs";
import * as path from "path";

// GPX Parser - preserves segment information for proper track rendering
type GPXTrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
  name?: string;
  /** Segment index - points in the same segment form a continuous track */
  segmentIndex?: number;
};

type GPXParseResult = {
  success: boolean;
  points: GPXTrackPoint[];
  errors: string[];
  warnings: string[];
  stats: {
    waypointsFound: number;
    trackPointsFound: number;
    routePointsFound: number;
    segmentsFound: number;
    totalPoints: number;
  };
};

/**
 * Extract lat/lon from an element's attributes, handling any attribute order
 */
function extractLatLon(attributeStr: string): { lat: number; lon: number } | null {
  const latMatch = attributeStr.match(/\blat=["']([^"']+)["']/i);
  const lonMatch = attributeStr.match(/\blon=["']([^"']+)["']/i);

  if (!latMatch || !lonMatch) return null;

  const lat = parseFloat(latMatch[1]);
  const lon = parseFloat(lonMatch[1]);

  if (isNaN(lat) || isNaN(lon)) return null;

  // Validate reasonable coordinate ranges
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return { lat, lon };
}

/**
 * Parse track points from segment content
 */
function parseTrackPointsInSegment(
  segmentContent: string,
  segmentIndex: number
): GPXTrackPoint[] {
  const points: GPXTrackPoint[] = [];

  // Match both forms:
  // 1. Self-closing: <trkpt lat="..." lon="..."/>
  // 2. With content: <trkpt lat="..." lon="...">...</trkpt>
  const trkptRegex = /<trkpt\s+([^>\/]+)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi;
  let match;

  while ((match = trkptRegex.exec(segmentContent)) !== null) {
    const coords = extractLatLon(match[1]);
    if (!coords) continue;

    const innerContent = match[2] || "";
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);

    points.push({
      latitude: coords.lat,
      longitude: coords.lon,
      timestamp: timeMatch ? timeMatch[1] : new Date().toISOString(),
      name: nameMatch ? nameMatch[1] : undefined,
      segmentIndex,
    });
  }

  return points;
}

function parseGPX(gpxContent: string): GPXParseResult {
  const points: GPXTrackPoint[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let waypointsFound = 0;
  let trackPointsFound = 0;
  let routePointsFound = 0;
  let segmentsFound = 0;

  if (!gpxContent.includes("<gpx")) {
    errors.push("No <gpx> tag found - file may not be valid GPX format");
  }

  // Parse waypoints (<wpt lat="..." lon="...">)
  const wptRegex = /<wpt\s+([^>]+)>([\s\S]*?)<\/wpt>/gi;
  let wptMatch;
  while ((wptMatch = wptRegex.exec(gpxContent)) !== null) {
    const coords = extractLatLon(wptMatch[1]);
    if (!coords) continue;

    const innerContent = wptMatch[2];
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);

    points.push({
      latitude: coords.lat,
      longitude: coords.lon,
      timestamp: timeMatch ? timeMatch[1] : new Date().toISOString(),
      name: nameMatch ? nameMatch[1] : undefined,
      segmentIndex: -1, // Waypoints are standalone
    });
    waypointsFound++;
  }

  // Parse track segments - CRITICAL for proper track rendering
  // Each <trkseg> represents a continuous track segment
  const trksegRegex = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let trksegMatch;
  let segmentIndex = 0;

  while ((trksegMatch = trksegRegex.exec(gpxContent)) !== null) {
    segmentsFound++;
    const segmentContent = trksegMatch[1];
    const segmentPoints = parseTrackPointsInSegment(segmentContent, segmentIndex);
    points.push(...segmentPoints);
    trackPointsFound += segmentPoints.length;
    segmentIndex++;
  }

  // If no segments found, try parsing trkpt outside of trkseg (malformed but common)
  if (segmentsFound === 0) {
    const fallbackPoints = parseTrackPointsInSegment(gpxContent, 0);
    points.push(...fallbackPoints);
    trackPointsFound += fallbackPoints.length;
    if (fallbackPoints.length > 0) {
      segmentsFound = 1;
    }
  }

  // Parse route points (<rtept lat="..." lon="...">)
  const rteptRegex = /<rtept\s+([^>\/]+)(?:\/>|>([\s\S]*?)<\/rtept>)/gi;
  let rteptMatch;

  while ((rteptMatch = rteptRegex.exec(gpxContent)) !== null) {
    const coords = extractLatLon(rteptMatch[1]);
    if (!coords) continue;

    const innerContent = rteptMatch[2] || "";
    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);

    points.push({
      latitude: coords.lat,
      longitude: coords.lon,
      timestamp: timeMatch ? timeMatch[1] : new Date().toISOString(),
      name: nameMatch ? nameMatch[1] : undefined,
      segmentIndex: segmentsFound, // Route points get their own segment
    });
    routePointsFound++;
  }

  // Sort by segment first, then by timestamp within segment
  points.sort((a, b) => {
    const segA = a.segmentIndex ?? 0;
    const segB = b.segmentIndex ?? 0;
    if (segA !== segB) return segA - segB;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  if (points.length === 0) {
    if (gpxContent.includes("<trkpt") || gpxContent.includes("<wpt") || gpxContent.includes("<rtept")) {
      warnings.push("GPX contains point elements but none could be parsed - check format");
    } else {
      warnings.push("No waypoints, track points, or route points found in GPX");
    }
  }

  return {
    success: points.length > 0,
    points,
    errors,
    warnings,
    stats: {
      waypointsFound,
      trackPointsFound,
      routePointsFound,
      segmentsFound,
      totalPoints: points.length,
    },
  };
}

// CLI argument parsing
interface CLIOptions {
  filePath: string;
  apiUrl: string;
  token?: string;
  batchSize: number;
  dryRun: boolean;
  clearFirst: boolean;
  delay: number;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    filePath: "",
    apiUrl: process.env.API_URL || "http://localhost:3000",
    token: process.env.SIGNALK_WEBHOOK_SECRET,
    batchSize: 1000,
    dryRun: false,
    clearFirst: false,
    delay: 100,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--api-url" && args[i + 1]) {
      options.apiUrl = args[++i];
    } else if (arg === "--token" && args[i + 1]) {
      options.token = args[++i];
    } else if (arg === "--batch-size" && args[i + 1]) {
      options.batchSize = parseInt(args[++i], 10);
    } else if (arg === "--delay" && args[i + 1]) {
      options.delay = parseInt(args[++i], 10);
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--clear-first") {
      options.clearFirst = true;
    } else if (!arg.startsWith("--") && !options.filePath) {
      options.filePath = arg;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
Batch GPX Import Script

Processes a large GPX file by importing track points in batches.

Usage:
  npx ts-node scripts/batch-import-gpx.ts <gpx-file> [options]

Options:
  --api-url <url>       API base URL (default: http://localhost:3000)
  --token <token>       Admin token (or set SIGNALK_WEBHOOK_SECRET env var)
  --batch-size <n>      Points per batch (default: 1000)
  --delay <ms>          Delay between batches in ms (default: 100)
  --dry-run             Parse file but don't import
  --clear-first         Clear existing track before importing

Examples:
  npx ts-node scripts/batch-import-gpx.ts ./large-track.gpx
  npx ts-node scripts/batch-import-gpx.ts ./track.gpx --batch-size 500
  npx ts-node scripts/batch-import-gpx.ts ./track.gpx --token your-secret --clear-first
  `);
}

async function importBatch(
  points: GPXTrackPoint[],
  apiUrl: string,
  token?: string
): Promise<{ success: boolean; imported: number; error?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["X-API-Key"] = token;
  }

  const response = await fetch(`${apiUrl}/api/position/import-gpx`, {
    method: "POST",
    headers,
    body: JSON.stringify({ points }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      imported: 0,
      error: data.error || data.message || `HTTP ${response.status}`,
    };
  }

  return {
    success: true,
    imported: data.imported || points.length,
  };
}

async function clearTrack(apiUrl: string, token?: string): Promise<boolean> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["X-API-Key"] = token;
  }

  const response = await fetch(`${apiUrl}/api/position/clear`, {
    method: "POST",
    headers,
  });

  return response.ok;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  const options = parseArgs();

  if (!options.filePath) {
    printUsage();
    process.exit(1);
  }

  // Resolve file path
  const gpxFile = path.resolve(options.filePath);

  if (!fs.existsSync(gpxFile)) {
    console.error(`Error: File not found: ${gpxFile}`);
    process.exit(1);
  }

  const stats = fs.statSync(gpxFile);
  console.log(`\n📄 GPX File: ${gpxFile}`);
  console.log(`   Size: ${formatBytes(stats.size)}`);
  console.log(`🌐 API URL: ${options.apiUrl}`);
  console.log(`🔑 Token: ${options.token ? "configured" : "not set"}`);
  console.log(`📦 Batch size: ${options.batchSize} points`);
  console.log(`⏱️  Delay between batches: ${options.delay}ms`);
  console.log(`🔍 Dry run: ${options.dryRun}`);
  console.log("");

  // Read and parse the GPX file
  console.log("📖 Reading GPX file...");
  const content = fs.readFileSync(gpxFile, "utf-8");
  console.log(`   File content: ${formatBytes(content.length)}`);

  console.log("🔍 Parsing GPX content...");
  const result = parseGPX(content);

  if (!result.success) {
    console.error("✗ Parse failed:");
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`✓ Parsed ${result.stats.totalPoints} points`);
  console.log(`  - Waypoints: ${result.stats.waypointsFound}`);
  console.log(`  - Track segments: ${result.stats.segmentsFound}`);
  console.log(`  - Track points: ${result.stats.trackPointsFound}`);
  console.log(`  - Route points: ${result.stats.routePointsFound}`);

  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  if (result.points.length > 0) {
    console.log(`  Date range: ${result.points[0].timestamp} to ${result.points[result.points.length - 1].timestamp}`);
  }

  console.log("");

  // Clear track if requested
  if (options.clearFirst && !options.dryRun) {
    console.log("🗑️  Clearing existing track...");
    const cleared = await clearTrack(options.apiUrl, options.token);
    if (cleared) {
      console.log("   ✓ Track cleared\n");
    } else {
      console.log("   ✗ Failed to clear track (may need authentication)\n");
    }
  }

  // Import in batches
  const totalPoints = result.points.length;
  const totalBatches = Math.ceil(totalPoints / options.batchSize);

  console.log(`🚀 Importing ${totalPoints} points in ${totalBatches} batches...`);
  console.log("");

  let totalImported = 0;
  let failedBatches = 0;

  for (let i = 0; i < totalBatches; i++) {
    const start = i * options.batchSize;
    const end = Math.min(start + options.batchSize, totalPoints);
    const batch = result.points.slice(start, end);
    const batchNum = i + 1;

    const progress = ((batchNum / totalBatches) * 100).toFixed(1);
    process.stdout.write(`   Batch ${batchNum}/${totalBatches} (${progress}%) - ${batch.length} points... `);

    if (options.dryRun) {
      console.log("(dry run)");
      totalImported += batch.length;
    } else {
      const batchResult = await importBatch(batch, options.apiUrl, options.token);
      if (batchResult.success) {
        console.log(`✓ imported ${batchResult.imported}`);
        totalImported += batchResult.imported;
      } else {
        console.log(`✗ ${batchResult.error}`);
        failedBatches++;
      }

      // Delay between batches to avoid overwhelming the server
      if (i < totalBatches - 1 && options.delay > 0) {
        await sleep(options.delay);
      }
    }
  }

  // Summary
  console.log("");
  console.log("═".repeat(50));
  console.log(`📊 Import Summary:`);
  console.log(`   Total points parsed: ${totalPoints}`);
  console.log(`   Total points imported: ${totalImported}`);
  console.log(`   Batches: ${totalBatches - failedBatches}/${totalBatches} successful`);

  if (failedBatches > 0) {
    console.log(`   ⚠ ${failedBatches} batch(es) failed`);
  }

  console.log("\n✅ Done!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
