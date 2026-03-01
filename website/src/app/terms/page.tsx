// src/app/terms/page.tsx

export const metadata = {
  title: "Terms of Use",
  description: "Terms of use for Matariki Yacht website.",
};

const CONTACT_EMAIL = "gpwoolley@gmail.com";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
      <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: "0 0 1rem 0" }}>Terms of Use</h1>
      <p style={{ margin: "0 0 1.25rem 0", color: "#555" }}>
        Last updated: {new Date().toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <p style={{ margin: "0 0 1.25rem 0" }}>
        By accessing this Site, you agree to these Terms. If you do not agree, do not use the Site.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Informational content</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        Content is provided for general interest only. Any routing, weather, seamanship, or operational information is
        not advice. Always rely on qualified professionals and official sources for safety-critical decisions.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Tracking</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        If the Site displays vessel position or voyage progress, it may be delayed, approximate, intermittent, or
        unavailable. Do not rely on tracking data for navigation, safety, or rescue decisions.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>No warranties</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        The Site is provided “as is” without warranties of any kind. We do not guarantee accuracy, completeness, or
        availability.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Limitation of liability</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        To the maximum extent permitted by law, we are not liable for any loss or damage arising from your use of the
        Site.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Intellectual property</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        Unless stated otherwise, all text, images, and media on the Site are owned by the Site operator or used with
        permission. You may view and share links to pages, but you may not reproduce content commercially without
        permission.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Third-party links</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        The Site may link to third-party websites. We are not responsible for their content or practices.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Changes</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        We may update these Terms at any time by posting a new version on this page.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Contact</h2>
      <p style={{ margin: 0 }}>
        Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </main>
  );
}
