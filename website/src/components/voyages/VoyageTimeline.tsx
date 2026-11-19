import Link from "next/link";
import { buildTimeline, formatDate, formatRange, type KeyEvent, type Leg } from "@/lib/voyages/legs";

const PROGRESS_LABEL = { planned: "Planned", underway: "Underway", completed: "Sailed" } as const;

/** Planned (outline) vs actual (copper) bars per leg on one date axis, with key events as markers. */
export function VoyageTimeline({ legs, keyEvents = [], voyageSlug }: { legs: Leg[]; keyEvents?: KeyEvent[]; voyageSlug: string }) {
  const timeline = buildTimeline(legs, keyEvents);
  if (!timeline) return null;

  return (
    <div className="card rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-xs text-mist">
        <span>{formatDate(timeline.start)}</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-6 h-2 rounded-full border border-mist/60" /> Planned
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-6 h-2 rounded-full bg-copper-accent" /> Actual
          </span>
          {timeline.markers.length > 0 && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-2 h-2 rotate-45 bg-sea-green" /> Key event
            </span>
          )}
        </div>
        <span>{formatDate(timeline.end)}</span>
      </div>

      <div className="relative">
        {/* Key-event guide lines run behind every row, across the same width as the bars
            (on desktop the bars start after the 14rem label column and its 1rem gap). */}
        <div className="absolute inset-y-0 left-0 right-0 md:left-[15rem] pointer-events-none" data-testid="timeline-guides" aria-hidden>
          {timeline.markers.map((m) => (
            <div key={m.event._key ?? m.event.name} className="absolute top-0 bottom-0 w-px bg-sea-green/30" style={{ left: `${m.at}%` }} />
          ))}
        </div>

        <ol className="relative space-y-4">
          {timeline.rows.map(({ leg, planned, actual, progress }, i) => (
            <li key={leg._id} className="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 md:gap-4 items-center">
              <div className="min-w-0">
                {leg.slug ? (
                  <Link href={`/voyages/${voyageSlug}/${leg.slug}`} className="text-salt-white hover:text-copper-accent transition-colors text-sm font-medium truncate block">
                    {i + 1}. {leg.title}
                  </Link>
                ) : (
                  <span className="text-salt-white text-sm font-medium truncate block">
                    {i + 1}. {leg.title}
                  </span>
                )}
                <span className="text-xs text-storm-grey">{PROGRESS_LABEL[progress]}</span>
              </div>
              <div className="relative h-6" role="img" aria-label={`${leg.title}: planned ${formatRange(leg.plannedStart, leg.plannedEnd)}${leg.actualStart ? `, actual ${formatRange(leg.actualStart, leg.actualEnd)}` : ""}`}>
                <div className="absolute inset-y-0 left-0 right-0 my-auto h-px bg-slate-water" />
                {planned && (
                  <div
                    className="absolute top-0 h-3 rounded-full border border-mist/60"
                    style={{ left: `${planned.left}%`, width: `${planned.width}%` }}
                    title={`Planned: ${formatRange(leg.plannedStart, leg.plannedEnd)}`}
                  />
                )}
                {actual && (
                  <div
                    className={`absolute bottom-0 h-3 rounded-full bg-copper-accent ${progress === "underway" ? "opacity-70" : ""}`}
                    style={{ left: `${actual.left}%`, width: `${actual.width}%` }}
                    title={`Actual: ${formatRange(leg.actualStart, leg.actualEnd)}`}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {timeline.markers.length > 0 && (
        <ul className="mt-6 pt-6 border-t border-slate-water grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {timeline.markers.map(({ event }) => (
            <li key={event._key ?? event.name} className="flex items-start gap-3">
              <span className="mt-1.5 inline-block w-2 h-2 rotate-45 bg-sea-green shrink-0" aria-hidden />
              <span>
                {event.url ? (
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-salt-white hover:text-copper-accent transition-colors">
                    {event.name}
                  </a>
                ) : (
                  <span className="text-salt-white">{event.name}</span>
                )}
                <span className="block text-xs text-storm-grey">{[formatDate(event.date), event.place].filter(Boolean).join(" · ")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
