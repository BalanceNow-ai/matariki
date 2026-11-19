/**
 * One-off migration for voyage legs. Dry run by default: prints every change
 * and writes nothing. Pass --apply to write.
 *
 *   npx tsx scripts/migrate-voyage-legs.ts            # dry run
 *   npx tsx scripts/migrate-voyage-legs.ts --apply    # write
 *
 * Needs SANITY_API_TOKEN (an Editor token for the production dataset) and
 * reads NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET (defaults
 * gjwqcjfo / production).
 *
 * What it does:
 *  1. Passages (legs), published and drafts: copy startDate → plannedStart and
 *     endDate → plannedEnd (only where the planned field is empty), then unset
 *     startDate/endDate. A planned date that already differs is reported and
 *     left alone, and the old field is kept so nothing is lost.
 *  2. Voyages: add an empty `legs` array where there isn't one. Nothing else
 *     on any voyage is touched (Fiordland and Stewart Island 2026 included).
 * Each patch is guarded by the document's revision, so a document edited
 * since it was read is skipped rather than overwritten. Re-running is safe.
 */
import { createClient } from "@sanity/client";

export type PassageDoc = { _id: string; _rev: string; title?: string; startDate?: string; endDate?: string; plannedStart?: string; plannedEnd?: string };
export type VoyageDoc = { _id: string; _rev: string; title?: string; hasLegs: boolean };

export type PlannedPatch = {
  id: string;
  rev: string;
  label: string;
  set: Record<string, unknown>;
  setIfMissing: Record<string, unknown>;
  unset: string[];
  notes: string[];
};

/** Pure: the patches the migration would make. */
export function planMigration(passages: PassageDoc[], voyages: VoyageDoc[]): PlannedPatch[] {
  const patches: PlannedPatch[] = [];
  for (const p of passages) {
    const patch: PlannedPatch = { id: p._id, rev: p._rev, label: `passage "${p.title ?? p._id}"`, set: {}, setIfMissing: {}, unset: [], notes: [] };
    for (const [oldField, newField] of [
      ["startDate", "plannedStart"],
      ["endDate", "plannedEnd"],
    ] as const) {
      const oldValue = p[oldField];
      if (!oldValue) continue;
      const current = p[newField];
      if (!current) {
        patch.set[newField] = oldValue;
        patch.unset.push(oldField);
      } else if (current === oldValue) {
        patch.unset.push(oldField);
      } else {
        patch.notes.push(`${newField} is already ${current} but ${oldField} is ${oldValue}: left both as they are`);
      }
    }
    if (Object.keys(patch.set).length || patch.unset.length || patch.notes.length) patches.push(patch);
  }
  for (const v of voyages) {
    if (v.hasLegs) continue;
    patches.push({ id: v._id, rev: v._rev, label: `voyage "${v.title ?? v._id}"`, set: {}, setIfMissing: { legs: [] }, unset: [], notes: [] });
  }
  return patches;
}

const hasWrites = (p: PlannedPatch) => Object.keys(p.set).length > 0 || Object.keys(p.setIfMissing).length > 0 || p.unset.length > 0;

async function main() {
  const apply = process.argv.includes("--apply");
  const token = process.env.SANITY_API_TOKEN;
  if (!token) {
    console.error("SANITY_API_TOKEN is not set (an Editor token for the production dataset).");
    process.exit(1);
  }
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "gjwqcjfo",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-01-01",
    token,
    useCdn: false,
    perspective: "raw", // includes drafts
  });

  const passages = await client.fetch<PassageDoc[]>(
    `*[_type == "passage" && (defined(startDate) || defined(endDate))]{ _id, _rev, title, startDate, endDate, plannedStart, plannedEnd }`
  );
  const voyages = await client.fetch<VoyageDoc[]>(`*[_type == "voyage"]{ _id, _rev, title, "hasLegs": defined(legs) }`);
  const plan = planMigration(passages, voyages);

  console.log(`${apply ? "APPLYING" : "DRY RUN (pass --apply to write)"}: ${passages.length} passage(s) with old dates, ${voyages.length} voyage(s)\n`);
  if (!plan.length) console.log("Nothing to do.");
  for (const p of plan) {
    console.log(`- ${p.label} (${p.id})`);
    for (const [k, v] of Object.entries(p.set)) console.log(`    set ${k} = ${JSON.stringify(v)}`);
    for (const [k, v] of Object.entries(p.setIfMissing)) console.log(`    set ${k} = ${JSON.stringify(v)} (if missing)`);
    for (const k of p.unset) console.log(`    unset ${k}`);
    for (const n of p.notes) console.log(`    note: ${n}`);
  }
  if (!apply) return;

  let ok = 0;
  let skipped = 0;
  for (const p of plan.filter(hasWrites)) {
    try {
      let patch = client.patch(p.id).ifRevisionId(p.rev);
      if (Object.keys(p.set).length) patch = patch.set(p.set);
      if (Object.keys(p.setIfMissing).length) patch = patch.setIfMissing(p.setIfMissing);
      if (p.unset.length) patch = patch.unset(p.unset);
      await patch.commit();
      ok++;
    } catch (error) {
      skipped++;
      console.error(`  ! skipped ${p.id}: ${(error as Error).message}`);
    }
  }
  console.log(`\nDone: ${ok} patched, ${skipped} skipped.`);
}

// Run only when executed directly (the tests import planMigration).
if (process.argv[1] && /migrate-voyage-legs\.ts$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
