This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Crew applications (`/crew`)

Public page at `/crew`, a three-step application form at `/crew/apply`, a ~10 minute AI interview at
`/crew/apply/interview`, and an admin MCP server at `/api/mcp` so Greg can review applicants from Claude.

**Ground rules built into the code**

- The AI never accepts or rejects anyone, and applicants never see scores. Only conversational text is
  streamed to the browser. Notes, scores and the assessment stay server-side.
- Applications live in a separate **private** Sanity dataset, `crew`. They are read and written only by
  server code using `SANITY_CREW_WRITE_TOKEN` (`src/lib/crew/sanityCrew.ts`). The public client in
  `src/sanity/client.ts` is never used for them.
- CV text and applicant messages are untrusted. They go in the first user turn inside
  `<applicant_data>` / `<cv_text>` tags and never in the system prompt. A deterministic check
  (`src/lib/crew/injection.ts`) also adds a red flag when they try to instruct the AI.
- The form doesn't collect passport numbers, medical history, emergency contacts, age, religion,
  ethnicity, relationships, sexuality or politics.

### One-time setup

1. **Private dataset.** From `website/`:
   ```bash
   npx sanity dataset create crew --visibility private
   ```
   Check it shows as private under sanity.io/manage → Datasets.
2. **Sanity token.** sanity.io/manage → API → Tokens → *Add API token*, with Editor permission.
   Use it as `SANITY_CREW_WRITE_TOKEN`. It is server-only, so never give it a `NEXT_PUBLIC_` prefix.
3. **Studio.** The Studio now has two workspaces: `/studio` (site content, including the new
   *Crew Passage* and *Interview Scenario* types) and `/studio/crew` (applications, grouped by status).
   Add a few passages and interview scenarios before opening applications.
4. **Vercel Blob.** In the Vercel project, go to Storage → Create → Blob, choose **Private** access and
   connect it to the project. That sets `BLOB_READ_WRITE_TOKEN`.
5. **Turnstile.** In the Cloudflare dashboard, go to Turnstile → Add widget for `matarikiyacht.com`,
   using Managed mode. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Without the
   secret, production refuses submissions; development skips the check.
6. **Resend.** Verify the sending domain in Resend and set `RESEND_API_KEY`, `CREW_NOTIFY_EMAIL` (where
   new-application emails go) and, optionally, `CREW_EMAIL_FROM`.
7. **Secrets.** Generate each of these with `openssl rand -hex 32`: `CREW_SESSION_SECRET`,
   `CREW_ADMIN_TOKEN`, and `CRON_SECRET` if it isn't already set.
8. **Anthropic.** Set `ANTHROPIC_API_KEY`. The interview uses `claude-sonnet-5-5`.
9. **Rate limiting.** This reuses the existing `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   (or Vercel KV's `KV_REST_API_URL` / `KV_REST_API_TOKEN`).

Every variable is listed with a comment in `.env.example`.

### Flags

- `CREW_INTERVIEW_ENABLED=false` turns the AI interview off. Applicants submit the form and CV, their
  application goes straight to `submitted`, and the emails go out as usual.

### Adding the MCP server to Claude

The server lives at `https://matarikiyacht.com/api/mcp` and uses Streamable HTTP in stateless mode.
Every request needs the header `Authorization: Bearer <CREW_ADMIN_TOKEN>`; without it the server
returns 401.

- **Claude Code:**
  ```bash
  claude mcp add --transport http matariki-crew https://matarikiyacht.com/api/mcp --header "Authorization: Bearer $CREW_ADMIN_TOKEN"
  ```
- **Claude Desktop / claude.ai custom connectors:** add a custom connector with the URL above. If the
  connector settings let you supply a bearer token or custom header, use `CREW_ADMIN_TOKEN`. If they
  only offer OAuth, the server needs an OAuth layer first. Authentication goes through
  `authenticateAdmin()` in `src/lib/crew/auth.ts`, so that change stays in one place.

**Tools:** `list_applications`, `get_application`, `get_cv_text` (returns a 5-minute signed download
link), `compare_applicants`, `set_status` (writes an audit entry), `add_note`, `passage_roster` and
`draft_reply`. `draft_reply` only returns draft text and never sends anything.

Anyone holding `CREW_ADMIN_TOKEN` can download a CV with
`GET /api/crew/cv/<id>`. It redirects to a 5-minute signed URL.

### Retention

`vercel.json` schedules `/api/cron/crew-purge` daily at 15:17 UTC (about 3–4am NZ). It deletes
applications past `deleteAfter`, along with their CV blobs. `deleteAfter` is 12 months after
submission, or 30 days after creation for drafts that were never finished. To run it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://matarikiyacht.com/api/cron/crew-purge
```

### Checking the dataset really is private

`src/__tests__/crew/dataset-isolation.test.ts` checks the configuration on every test run. Run it with
`CREW_LIVE_DATASET_CHECK=1 pnpm test dataset-isolation` to also query the crew dataset anonymously.
You can do the same by hand:

```bash
curl "https://gjwqcjfo.api.sanity.io/v2024-01-01/data/query/crew?query=*%5B0...1%5D"
```

The result must be a 401/403 or `"result": []`, never documents.
