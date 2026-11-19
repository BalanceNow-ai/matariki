/**
 * Submission emails via Resend.
 *
 * The applicant's acknowledgement never contains scores, the recommendation
 * or anything from the assessment. Email failures are logged, not thrown:
 * a lost email must not lose an application.
 */
import "server-only";
import { Resend } from "resend";
import type { CrewApplication } from "./types";

const FROM = () => process.env.CREW_EMAIL_FROM || "Matariki III <crew@matarikiyacht.com>";

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function ownerEmailText(app: CrewApplication, passageTitles: string[]): string {
  const a = app.assessment;
  const lines = [
    `New crew application: ${app.applicant.fullName}`,
    `Passages: ${passageTitles.join(", ") || app.passages.join(", ")}`,
    `Offshore miles: ${app.applicant.offshoreMiles} (total ${app.applicant.totalMiles})`,
    a
      ? `AI summary (advisory only): ${a.recommendation}, weighted ${a.weightedScore}/5${
          a.redFlags.length ? `, ${a.redFlags.length} red flag(s)` : ""
        }`
      : "No AI interview (interview disabled or skipped).",
    a ? `\n${a.summary}` : "",
    "",
    `Application id: ${app._id}`,
    `Ask Claude: get_application({ id: "${app._id}" })`,
  ];
  return lines.join("\n");
}

export function applicantEmailText(app: CrewApplication): string {
  const first = app.applicant.fullName.split(/\s+/)[0];
  return [
    `Kia ora ${first},`,
    "",
    "Thanks for applying to crew on Matariki III. We've got your application.",
    "",
    "Greg reads every application himself. If it looks like a fit he'll be in touch to arrange a call, and after that we'd check references.",
    "",
    "If anything changes with your availability, just reply to this email.",
    "",
    "Matariki III",
  ].join("\n");
}

export async function sendSubmissionEmails(app: CrewApplication, passageTitles: string[]): Promise<void> {
  const resend = client();
  const owner = process.env.CREW_NOTIFY_EMAIL;
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping crew submission emails");
    return;
  }
  const jobs: Promise<unknown>[] = [];
  if (owner) {
    const text = ownerEmailText(app, passageTitles);
    jobs.push(
      resend.emails.send({
        from: FROM(),
        to: owner,
        subject: `Crew application: ${app.applicant.fullName}`,
        text,
        html: `<pre style="font-family:inherit;white-space:pre-wrap">${esc(text)}</pre>`,
      })
    );
  }
  jobs.push(
    resend.emails.send({
      from: FROM(),
      to: app.applicant.email,
      ...(owner ? { replyTo: owner } : {}),
      subject: "Your Matariki III crew application",
      text: applicantEmailText(app),
    })
  );
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === "rejected") console.error("Crew email failed:", r.reason);
    else if ((r.value as { error?: unknown })?.error) console.error("Crew email failed:", (r.value as { error: unknown }).error);
  }
}
