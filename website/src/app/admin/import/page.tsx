"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseGPXFile, type GPXParseResult } from "@/lib/gpx-parser";

/** Points sent per request, to stay inside the serverless payload limit. */
const BATCH_SIZE = 2000;

type ImportSummary = {
  importId: string;
  count: number;
  oldest: string | null;
  newest: string | null;
  importedAt: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().replace("T", " ").slice(0, 16);
}

/**
 * A plain SVG outline of the track, drawn from the parsed points.
 *
 * Deliberately not a map component: the point is to confirm the file contains
 * the shape you expect before committing it, and that does not justify pulling
 * a mapping library into an admin page.
 */
function TrackPreview({ points }: { points: { latitude: number; longitude: number }[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return null;

    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const spanLat = maxLat - minLat || 1e-6;
    const spanLon = maxLon - minLon || 1e-6;

    // Keep at most ~2000 points in the outline; more adds nothing visible.
    const stride = Math.max(1, Math.ceil(points.length / 2000));
    const parts: string[] = [];

    for (let i = 0; i < points.length; i += stride) {
      const p = points[i];
      const x = ((p.longitude - minLon) / spanLon) * 380 + 10;
      // SVG y grows downward; latitude grows northward.
      const y = 190 - ((p.latitude - minLat) / spanLat) * 180;
      parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }

    return parts.join(" ");
  }, [points]);

  if (!path) {
    return (
      <p className="text-xs text-storm-grey">
        Not enough points to draw a preview.
      </p>
    );
  }

  return (
    <svg viewBox="0 0 400 200" className="w-full h-48 bg-deep-ocean rounded-lg border border-slate-water">
      <path d={path} fill="none" stroke="#d97706" strokeWidth="1.5" />
    </svg>
  );
}

export default function AdminImportPage() {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<GPXParseResult | null>(null);
  const [parsing, setParsing] = useState(false);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [imports, setImports] = useState<ImportSummary[] | null>(null);
  const [importsError, setImportsError] = useState<string | null>(null);

  // Kept for the session only. A token in localStorage outlives the reason it
  // was entered.
  useEffect(() => {
    const stored = sessionStorage.getItem("matariki-admin-token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (token) sessionStorage.setItem("matariki-admin-token", token);
  }, [token]);

  const authHeaders = useCallback((): Record<string, string> => {
    return token.trim() ? { "X-API-Key": token.trim() } : {};
  }, [token]);

  const untimedCount = parsed
    ? parsed.stats.totalPoints - parsed.stats.pointsWithTimestamps
    : 0;
  const needsTimeWindow = untimedCount > 0;
  const canImport =
    !!parsed && parsed.points.length > 0 && !importing && (!needsTimeWindow || !!startTime);

  const timeRange = useMemo(() => {
    if (!parsed) return null;
    const times = parsed.points
      .map((p) => (p.timestamp ? new Date(p.timestamp).getTime() : NaN))
      .filter((t) => !Number.isNaN(t));
    if (times.length === 0) return null;
    return {
      first: new Date(Math.min(...times)).toISOString(),
      last: new Date(Math.max(...times)).toISOString(),
    };
  }, [parsed]);

  const loadImports = useCallback(async () => {
    setImportsError(null);
    try {
      const res = await fetch("/api/position/imports", { headers: authHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setImports(null);
        setImportsError(body.message || body.error || `HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setImports(data.imports ?? []);
    } catch (err) {
      setImportsError(String(err));
    }
  }, [authHeaders]);

  const handleFile = useCallback(async (selected: File) => {
    setFile(selected);
    setParsed(null);
    setResult(null);
    setError(null);
    setParsing(true);
    try {
      setParsed(await parseGPXFile(selected));
    } catch (err) {
      setError(`Could not read the file: ${err}`);
    } finally {
      setParsing(false);
    }
  }, []);

  const runImport = useCallback(async () => {
    if (!parsed || !file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    // One id for the whole file, so every batch belongs to the same undoable
    // import rather than becoming an unrelated fragment.
    const importId = `${new Date().toISOString().replace(/[:.]/g, "-")}_${file.name
      .replace(/\.gpx$/i, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .slice(0, 40)
      .toLowerCase()}`;

    let imported = 0;
    let skipped = 0;

    try {
      for (let i = 0; i < parsed.points.length; i += BATCH_SIZE) {
        const batch = parsed.points.slice(i, i + BATCH_SIZE);
        setProgress(
          `Uploading ${Math.min(i + BATCH_SIZE, parsed.points.length)} of ${parsed.points.length}…`
        );

        const res = await fetch("/api/position/import-gpx", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            points: batch,
            importId,
            filename: file.name,
            // A datetime-local input has no timezone, so the server would
            // read "2026-02-18T20:00" as UTC and land the track 13 hours out
            // for anyone in New Zealand. Convert here, where the browser knows
            // what offset the typed time actually meant.
            startTime: startTime ? new Date(startTime).toISOString() : undefined,
            endTime: endTime ? new Date(endTime).toISOString() : undefined,
          }),
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(
            `${body.error ?? `HTTP ${res.status}`}: ${body.message ?? "import failed"}` +
              (imported > 0 ? ` (${imported} points already stored under ${importId})` : "")
          );
          return;
        }

        imported += body.imported ?? 0;
        skipped += body.skipped ?? 0;
      }

      setResult(
        `Imported ${imported} points${skipped > 0 ? `, ${skipped} already present` : ""}. Import id: ${importId}`
      );
      await loadImports();
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }, [parsed, file, startTime, endTime, authHeaders, loadImports]);

  const undoImport = useCallback(
    async (importId: string) => {
      if (!confirm(`Remove every point from import "${importId}"?`)) return;

      try {
        const res = await fetch(
          `/api/position/imports?importId=${encodeURIComponent(importId)}`,
          { method: "DELETE", headers: authHeaders() }
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setImportsError(body.message || body.error || `HTTP ${res.status}`);
          return;
        }
        setResult(body.message ?? "Import removed");
        await loadImports();
      } catch (err) {
        setImportsError(String(err));
      }
    },
    [authHeaders, loadImports]
  );

  const download = useCallback(
    async (format: "gpx" | "geojson") => {
      try {
        const res = await fetch(`/api/position/export?format=${format}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message || body.error || `Export failed (HTTP ${res.status})`);
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `matariki-track-${new Date().toISOString().slice(0, 10)}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(String(err));
      }
    },
    [authHeaders]
  );

  return (
    <div className="min-h-screen bg-deep-ocean text-salt-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-display">Track import</h1>
          <p className="text-sm text-mist mt-1">
            Fill gaps in the recorded track from a GPX file. Imports are stored
            durably and can be undone individually.
          </p>
        </header>

        {/* Auth */}
        <section className="bg-midnight-blue border border-slate-water rounded-xl p-4">
          <label className="block text-xs text-copper-accent uppercase tracking-wider mb-2">
            Admin token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onBlur={loadImports}
            placeholder="SIGNALK_WEBHOOK_SECRET"
            className="w-full bg-deep-ocean border border-slate-water rounded-lg px-3 py-2 text-sm font-mono"
          />
        </section>

        {/* Backup first */}
        <section className="bg-midnight-blue border border-slate-water rounded-xl p-4">
          <h2 className="text-sm font-medium mb-1">Back up the current track</h2>
          <p className="text-xs text-mist mb-3">
            Take a copy before importing. There was previously no way to export
            this data, which is why the track already lost cannot be recovered.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => download("gpx")}
              className="px-3 py-2 text-sm rounded-lg bg-slate-water hover:bg-slate-water/70"
            >
              Download GPX
            </button>
            <button
              onClick={() => download("geojson")}
              className="px-3 py-2 text-sm rounded-lg bg-slate-water hover:bg-slate-water/70"
            >
              Download GeoJSON
            </button>
          </div>
        </section>

        {/* Upload */}
        <section className="bg-midnight-blue border border-slate-water rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-medium">Import a GPX file</h2>

          <input
            type="file"
            accept=".gpx,application/gpx+xml,text/xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full text-sm text-mist file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-copper-accent file:text-deep-ocean"
          />

          {parsing && <p className="text-sm text-mist">Reading file…</p>}

          {parsed && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-storm-grey">Points</dt>
                <dd>{parsed.stats.totalPoints.toLocaleString()}</dd>
                <dt className="text-storm-grey">With timestamps</dt>
                <dd>
                  {parsed.stats.pointsWithTimestamps.toLocaleString()}
                  {untimedCount > 0 && (
                    <span className="text-copper-accent"> ({untimedCount.toLocaleString()} without)</span>
                  )}
                </dd>
                <dt className="text-storm-grey">Segments</dt>
                <dd>{parsed.stats.segmentsFound}</dd>
                {timeRange && (
                  <>
                    <dt className="text-storm-grey">Covers</dt>
                    <dd>
                      {formatDate(timeRange.first)} → {formatDate(timeRange.last)}
                    </dd>
                  </>
                )}
              </dl>

              {parsed.warnings.length > 0 && (
                <ul className="text-xs text-copper-accent space-y-1">
                  {parsed.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}

              <TrackPreview points={parsed.points} />

              {/* Only shown when the file actually needs it. */}
              {needsTimeWindow && (
                <div className="border border-copper-accent/40 bg-copper-accent/10 rounded-lg p-3 space-y-3">
                  <p className="text-xs text-copper-accent">
                    {untimedCount.toLocaleString()} points carry no time. Give the
                    window this track was sailed in and they will be spaced evenly
                    across it. Without it they cannot be placed on the timeline,
                    and the import will be refused.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-xs text-storm-grey mb-1">
                        Start (required) &mdash; your local time
                      </span>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-deep-ocean border border-slate-water rounded px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-storm-grey mb-1">
                        End (optional) &mdash; your local time
                      </span>
                      <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-deep-ocean border border-slate-water rounded px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                </div>
              )}

              <button
                onClick={runImport}
                disabled={!canImport}
                className="px-4 py-2 text-sm rounded-lg bg-copper-accent text-deep-ocean font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? "Importing…" : `Import ${parsed.points.length.toLocaleString()} points`}
              </button>
            </div>
          )}

          {progress && <p className="text-sm text-mist">{progress}</p>}
          {result && <p className="text-sm text-sea-green">{result}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>

        {/* Provenance */}
        <section className="bg-midnight-blue border border-slate-water rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Previous imports</h2>
            <button
              onClick={loadImports}
              className="text-xs px-2 py-1 rounded bg-slate-water hover:bg-slate-water/70"
            >
              Refresh
            </button>
          </div>

          {importsError && <p className="text-sm text-red-400">{importsError}</p>}

          {imports && imports.length === 0 && (
            <p className="text-sm text-storm-grey">No GPX imports recorded.</p>
          )}

          {imports && imports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-storm-grey text-left">
                  <tr>
                    <th className="py-1 pr-3">Import</th>
                    <th className="py-1 pr-3">Points</th>
                    <th className="py-1 pr-3">Covers</th>
                    <th className="py-1" />
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => (
                    <tr key={imp.importId} className="border-t border-slate-water/50">
                      <td className="py-2 pr-3 font-mono break-all">{imp.importId}</td>
                      <td className="py-2 pr-3">{imp.count.toLocaleString()}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDate(imp.oldest)} → {formatDate(imp.newest)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => undoImport(imp.importId)}
                          className="px-2 py-1 rounded bg-red-900/40 text-red-300 hover:bg-red-900/60"
                        >
                          Undo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
