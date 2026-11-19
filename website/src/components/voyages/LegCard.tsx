import Link from "next/link";
import Image from "next/image";
import { formatNm, formatRange, isOpenForCrew, LEG_KIND_LABELS, legProgress, type Leg } from "@/lib/voyages/legs";

const PROGRESS_STYLE = {
  planned: "bg-mist/20 text-mist border border-mist/30",
  underway: "bg-sea-green/20 text-sea-green border border-sea-green/30",
  completed: "bg-copper-accent/20 text-copper-accent border border-copper-accent/30",
} as const;
const PROGRESS_LABEL = { planned: "Planned", underway: "Underway", completed: "Sailed" } as const;

export function LegCard({ leg, index, voyageSlug, imageUrl, showCrew }: { leg: Leg; index: number; voyageSlug: string; imageUrl?: string | null; showCrew: boolean }) {
  const progress = legProgress(leg);
  const sailed = leg.actualStart ? formatRange(leg.actualStart, leg.actualEnd) : null;
  const distance = formatNm(leg.actualDistanceNm) ?? formatNm(leg.plannedDistanceNm);
  const body = (
    <>
      <div className="relative aspect-[16/9] rounded-t-lg overflow-hidden bg-slate-water/50">
        {imageUrl ? (
          <Image src={imageUrl} alt={leg.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-copper-accent/40 text-display">{index + 1}</div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 text-xs font-medium uppercase tracking-wider rounded-full ${PROGRESS_STYLE[progress]}`}>{PROGRESS_LABEL[progress]}</span>
          {showCrew && isOpenForCrew(leg) && (
            <span className="px-2 py-1 text-xs font-medium uppercase tracking-wider rounded-full bg-deep-ocean/80 text-sea-green border border-sea-green/30">Crew wanted</span>
          )}
        </div>
      </div>
      <div className="p-5">
        <p className="text-caption text-copper-accent mb-1">
          Leg {index + 1}
          {leg.kind ? ` · ${LEG_KIND_LABELS[leg.kind]}` : ""}
        </p>
        <h3 className="text-h3 text-salt-white group-hover:text-copper-accent transition-colors mb-2">{leg.title}</h3>
        {(leg.fromPlace || leg.toPlace) && (
          <p className="text-mist text-sm mb-2">
            {leg.fromPlace ?? "?"} → {leg.toPlace ?? "?"}
          </p>
        )}
        <p className="text-sm text-mist">
          <span className="text-storm-grey">Planned </span>
          {formatRange(leg.plannedStart, leg.plannedEnd)}
        </p>
        {sailed && (
          <p className="text-sm text-mist">
            <span className="text-storm-grey">Sailed </span>
            {sailed}
          </p>
        )}
        {distance && <p className="text-sm text-mist mt-1">{distance}</p>}
      </div>
    </>
  );
  return leg.slug ? (
    <Link href={`/voyages/${voyageSlug}/${leg.slug}`} className="group card rounded-lg block">
      {body}
    </Link>
  ) : (
    <div className="card rounded-lg">{body}</div>
  );
}
