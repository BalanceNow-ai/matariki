#!/usr/bin/env npx ts-node
/**
 * Batch GPX Import Script
 *
 * Processes multiple GPX files from a directory and imports them to Redis
 * via the /api/position/import-gpx endpoint.
 *
 * Usage:
 *   npx ts-node scripts/batch-import-gpx.ts <gpx-directory> [options]
 *
 * Options:
 *   --api-url <url>     API base URL (default: http://localhost:3000)
 *   --token <token>     Admin token for authentication
 *   --dry-run           Parse files but don't import
 *   --clear-first       Clear existing track before importing
 *
 * Examples:
 *   npx ts-node scripts/batch-import-gpx.ts ./gpx-files
 *   npx ts-node scripts/batch-import-gpx.ts ./gpx-files --token your-secret-token
 *   npx ts-node scripts/batch-import-gpx.ts ./gpx-files --dry-run
 */

import * as fs from "fs";
import * as path from "path";

// GPX Parser (same logic as client-side parser)
type GPXTrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: string;
  name?: string;
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
    totalPoints: number;
  };
};

function parseGPX(gpxContent: string): GPXParseResult {
  const points: GPXTrackPoint[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let waypointsFound = 0;
  let trackPointsFound = 0;
  let routePointsFound = 0;

  if (!gpxContent.includes("<gpx")) {
    errors.push("No <gpx> tag found - file may not be valid GPX format");
  }

  // Parse waypoints (<wpt lat="..." lon="...">)
  const wptRegex = /<wpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/wpt>/gi;
  let wptMatch;
  while ((wptMatch = wptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(wptMatch[1]);
    const lon = parseFloat(wptMatch[2]);
    const innerContent = wptMatch[3];

    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ latitude: lat, longitude: lon, timestamp, name });
      waypointsFound++;
    }
  }

  // Parse track points (<trkpt lat="..." lon="...">)
  const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
  let trkptMatch;
  while ((trkptMatch = trkptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(trkptMatch[1]);
    const lon = parseFloat(trkptMatch[2]);
    const innerContent = trkptMatch[3];

    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ latitude: lat, longitude: lon, timestamp, name });
      trackPointsFound++;
    }
  }

  // Parse route points (<rtept lat="..." lon="...">)
  const rteptRegex = /<rtept\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/rtept>/gi;
  let rteptMatch;
  while ((rteptMatch = rteptRegex.exec(gpxContent)) !== null) {
    const lat = parseFloat(rteptMatch[1]);
    const lon = parseFloat(rteptMatch[2]);
    const innerContent = rteptMatch[3];

    const timeMatch = innerContent.match(/<time>([^<]+)<\/time>/i);
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();

    const nameMatch = innerContent.match(/<name>([^<]+)<\/name>/i);
    const name = nameMatch ? nameMatch[1] : undefined;

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ latitude: lat, longitude: lon, timestamp, name });
      routePointsFound++;
    }
  }

  // Sort by timestamp
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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
      totalPoints: points.length,
    },
  };
}

// CLI argument parsing
interface CLIOptions {
  directory: string;
  apiUrl: string;
  token?: string;
  dryRun: boolean;
  clearFirst: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    directory: "",
    apiUrl: process.env.API_URL || "http://localhost:3000",
    token: process.env.SIGNALK_WEBHOOK_SECRET,
    dryRun: false,
    clearFirst: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--api-url" && args[i + 1]) {
      options.apiUrl = args[++i];
    } else if (arg === "--token" && args[i + 1]) {
      options.token = args[++i];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--clear-first") {
      options.clearFirst = true;
    } else if (!arg.startsWith("--") && !options.directory) {
      options.directory = arg;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
Batch GPX Import Script

Usage:
  npx ts-node scripts/batch-import-gpx.ts <gpx-directory> [options]

Options:
  --api-url <url>     API base URL (default: http://localhost:3000)
  --token <token>     Admin token for authentication (or set SIGNALK_WEBHOOK_SECRET env var)
  --dry-run           Parse files but don't import
  --clear-first       Clear existing track before importing

Examples:
  npx ts-node scripts/batch-import-gpx.ts ./gpx-files
  npx ts-node scripts/batch-import-gpx.ts ./gpx-files --token your-secret-token
  npx ts-node scripts/batch-import-gpx.ts ./gpx-files --dry-run
  `);
}

async function importToAPI(
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

async function main() {
  const options = parseArgs();

  if (!options.directory) {
    printUsage();
    process.exit(1);
  }

  // Resolve directory path
  const gpxDir = path.resolve(options.directory);

  if (!fs.existsSync(gpxDir)) {
    console.error(`Error: Directory not found: ${gpxDir}`);
    process.exit(1);
  }

  // Find all GPX files
  const files = fs.readdirSync(gpxDir).filter((f) => f.toLowerCase().endsWith(".gpx"));

  if (files.length === 0) {
    console.error(`Error: No .gpx files found in ${gpxDir}`);
    process.exit(1);
  }

  console.log(`\n📂 Found ${files.length} GPX file(s) in ${gpxDir}`);
  console.log(`🌐 API URL: ${options.apiUrl}`);
  console.log(`🔑 Token: ${options.token ? "configured" : "not set"}`);
  console.log(`🔍 Dry run: ${options.dryRun}`);
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

  // Collect all points from all files
  let allPoints: GPXTrackPoint[] = [];
  let totalFiles = 0;
  let successfulFiles = 0;

  for (const file of files) {
    const filePath = path.join(gpxDir, file);
    totalFiles++;

    console.log(`📄 Processing: ${file}`);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const result = parseGPX(content);

      if (result.success) {
        console.log(`   ✓ Parsed ${result.stats.totalPoints} points`);
        console.log(`     - Waypoints: ${result.stats.waypointsFound}`);
        console.log(`     - Track points: ${result.stats.trackPointsFound}`);
        console.log(`     - Route points: ${result.stats.routePointsFound}`);

        if (result.warnings.length > 0) {
          result.warnings.forEach((w) => console.log(`   ⚠ ${w}`));
        }

        allPoints = allPoints.concat(result.points);
        successfulFiles++;
      } else {
        console.log(`   ✗ Parse failed`);
        result.errors.forEach((e) => console.log(`     - ${e}`));
      }
    } catch (err) {
      console.log(`   ✗ Error reading file: ${err}`);
    }

    console.log("");
  }

  // Sort all points by timestamp
  allPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Summary
  console.log("═".repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Files processed: ${successfulFiles}/${totalFiles}`);
  console.log(`   Total points: ${allPoints.length}`);

  if (allPoints.length > 0) {
    console.log(`   Date range: ${allPoints[0].timestamp} to ${allPoints[allPoints.length - 1].timestamp}`);
  }

  // Import if not dry run
  if (!options.dryRun && allPoints.length > 0) {
    console.log(`\n🚀 Importing ${allPoints.length} points to ${options.apiUrl}...`);

    const result = await importToAPI(allPoints, options.apiUrl, options.token);

    if (result.success) {
      console.log(`   ✓ Successfully imported ${result.imported} points`);
    } else {
      console.log(`   ✗ Import failed: ${result.error}`);
      process.exit(1);
    }
  } else if (options.dryRun) {
    console.log(`\n🔍 Dry run complete - no data imported`);
  }

  console.log("\n✅ Done!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
