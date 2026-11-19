/**
 * Email drafts for Greg. Plain templates (no model call), never sent from
 * here, and never mention AI scores or the assessment.
 */
import type { CrewApplication, Passage } from "../types";

export const REPLY_INTENTS = ["invite_call", "decline", "request_references", "accept"] as const;
export type ReplyIntent = (typeof REPLY_INTENTS)[number];

export function draftReply(
  app: Pick<CrewApplication, "applicant" | "passages">,
  passages: Pick<Passage, "_id" | "title">[],
  intent: ReplyIntent
): { subject: string; body: string } {
  const first = app.applicant.fullName.trim().split(/\s+/)[0] || "there";
  const legs =
    passages.filter((p) => app.passages.includes(p._id)).map((p) => p.title).join(" and ") || "the passage you applied for";
  const sign = "\n\nCheers,\nGreg\nMatariki III";

  switch (intent) {
    case "invite_call":
      return {
        subject: "Your Matariki III crew application — a quick call?",
        body: `Kia ora ${first},\n\nThanks for applying to crew on ${legs}. I've read through your application and would like to have a chat. Could you send me two or three times over the next week that suit you for a 20–30 minute call (NZ time)?${sign}`,
      };
    case "request_references":
      return {
        subject: "Matariki III — references",
        body: `Kia ora ${first},\n\nThanks for your time on the phone. Before I confirm anything for ${legs}, I'd like to speak to one or two skippers you've sailed with. Could you send me their names and the best way to reach them, and give them a heads-up that I'll be in touch?${sign}`,
      };
    case "accept":
      return {
        subject: "Welcome aboard Matariki III",
        body: `Kia ora ${first},\n\nGreat news — I'd like to offer you a berth on ${legs}. I'll send through joining details, dates and the crew brief shortly. In the meantime, have a look at the Crew Info pages on the website, and let me know if anything has changed with your availability.${sign}`,
      };
    case "decline":
      return {
        subject: "Your Matariki III crew application",
        body: `Kia ora ${first},\n\nThanks for applying to crew on ${legs}, and for taking the time over the application. I've had a lot of interest and won't be able to offer you a place this time. I'll keep your details on file in case things change, and I hope to cross tacks with you somewhere down the track.${sign}`,
      };
  }
}
