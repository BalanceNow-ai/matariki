/**
 * Copy for the /crew page.
 *
 * GREG: every string marked PLACEHOLDER below is a stand-in. Replace it with
 * your own words. This same text is what the interview assistant is allowed
 * to answer applicants' questions from, so anything not written here (or in a
 * passage in Sanity) gets "Greg will answer that".
 */

export const PLACEHOLDER = "[PLACEHOLDER]";

export type FaqItem = { q: string; a: string };

export const crewPage = {
  hero: {
    title: "Crew Matariki III",
    lede: `${PLACEHOLDER} One or two sentences on what sailing on Matariki is like and who it suits.`,
  },
  lifeAboard: `${PLACEHOLDER} Watches, cooking rota, how days offshore run, what a coastal day looks like.`,
  theDeal: [
    `${PLACEHOLDER} What crew pay or contribute (food kitty, flights, etc.).`,
    `${PLACEHOLDER} What the boat provides (berth, foul-weather gear?, safety gear).`,
    `${PLACEHOLDER} Minimum commitment per leg.`,
  ],
  lookingFor: [
    `${PLACEHOLDER} Attitude and experience you want.`,
    `${PLACEHOLDER} Skills that are especially welcome aboard.`,
  ],
  houseRules: [
    `${PLACEHOLDER} The skipper's word is final on safety and seamanship.`,
    `${PLACEHOLDER} Alcohol policy underway and at anchor.`,
    `${PLACEHOLDER} Fresh water is limited — short showers, watermaker etiquette.`,
    `${PLACEHOLDER} The ship's cat lives aboard. If you are allergic to cats, tell us on the form.`,
    `${PLACEHOLDER} Other allergies (food, bee stings) — raise them with Greg directly before joining.`,
  ],
  selectionSteps: [
    { title: "Application form", body: "Tell us about yourself, your sailing and which passages you'd like to join." },
    { title: "Short AI interview", body: "About 10 minutes with our AI assistant, which asks about your experience. It summarises your answers; it does not decide anything." },
    { title: "Greg reviews", body: "Greg reads every application and interview himself." },
    { title: "A call", body: "If it looks like a fit, Greg will arrange a call." },
    { title: "References", body: "We check references before confirming a berth." },
  ],
  faq: [
    { q: "Do I need offshore experience?", a: `${PLACEHOLDER} Depends on the passage — see each passage's minimum experience.` },
    { q: "How much does it cost?", a: `${PLACEHOLDER}` },
    { q: "How many crew are aboard?", a: `${PLACEHOLDER}` },
    { q: "What gear do I need?", a: "See the What to Bring page under Crew Info." },
  ] as FaqItem[],
  privacy: `We keep your application in a private store used only for crew selection. Submitted applications are deleted 12 months after submission, and unfinished ones after 30 days. An AI assistant summarises your interview for Greg; it never accepts or rejects anyone, and Greg makes every decision. ${PLACEHOLDER} Contact address for access or deletion requests.`,
};

/** Plain-text facts the interview assistant may draw on when answering questions. */
export function pageFactsForPrompt(): string {
  const strip = (s: string) => s.trim();
  const keep = (s: string) => s.trim().length > 0 && !s.includes(PLACEHOLDER);
  const parts = [
    ["Life aboard", [crewPage.lifeAboard]],
    ["The deal", crewPage.theDeal],
    ["Who we're looking for", crewPage.lookingFor],
    ["House rules", crewPage.houseRules],
    ["How selection works", crewPage.selectionSteps.map((s) => `${s.title}: ${s.body}`)],
    ["FAQ", crewPage.faq.map((f) => `Q: ${f.q} A: ${f.a}`)],
  ] as const;
  return parts
    .map(([title, items]) => {
      // Placeholder copy is not a fact; leave it out so the assistant defers to Greg.
      const facts = (items as readonly string[]).filter(keep).map(strip);
      return facts.length ? `## ${title}\n- ${facts.join("\n- ")}` : `## ${title}\n(no published detail — defer to Greg)`;
    })
    .join("\n\n");
}
