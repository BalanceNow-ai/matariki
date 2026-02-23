// If you use the Next.js App Router (recommended path):
// Create: src/app/privacy/page.tsx

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Matariki Yacht website.",
};

const CONTACT_EMAIL = "contact@yourdomain.com"; // TODO: change

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
      <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: "0 0 1rem 0" }}>Privacy Policy</h1>
      <p style={{ margin: "0 0 1.25rem 0", color: "#555" }}>
        Last updated: {new Date().toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <p style={{ margin: "0 0 1.25rem 0" }}>
        This website (the “Site”) shares voyage logs, photos, and tracking information for Matariki. We respect your
        privacy and aim to collect the minimum data needed to run the Site.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Information we collect</h2>
      <ul style={{ margin: "0 0 1.25rem 1.25rem" }}>
        <li style={{ margin: "0.4rem 0" }}>
          <strong>Newsletter subscriptions:</strong> If you subscribe, we collect your email address to send updates.
        </li>
        <li style={{ margin: "0.4rem 0" }}>
          <strong>Usage data:</strong> Basic information such as pages visited, approximate location (from IP), device
          type, and referrer may be collected via standard server logs and/or analytics tools.
        </li>
        <li style={{ margin: "0.4rem 0" }}>
          <strong>Cookies:</strong> The Site may use cookies for essential functionality and to understand how the Site
          is used.
        </li>
      </ul>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>How we use information</h2>
      <ul style={{ margin: "0 0 1.25rem 1.25rem" }}>
        <li style={{ margin: "0.4rem 0" }}>To operate and secure the Site.</li>
        <li style={{ margin: "0.4rem 0" }}>To publish voyage content and (where enabled) vessel tracking.</li>
        <li style={{ margin: "0.4rem 0" }}>To send newsletters if you opt in.</li>
        <li style={{ margin: "0.4rem 0" }}>To improve performance, reliability, and content.</li>
      </ul>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Sharing</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        We do not sell your personal information. We may share limited data with service providers that help run the
        Site (for example hosting, content delivery, analytics, email delivery, and content management). These providers
        process data on our behalf.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Retention</h2>
      <p style={{ margin: "0 0 1.25rem 0" }}>
        Newsletter emails are retained until you unsubscribe or request deletion. Server/analytics logs are retained
        for a limited period to operate and secure the Site.
      </p>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Your choices</h2>
      <ul style={{ margin: "0 0 1.25rem 1.25rem" }}>
        <li style={{ margin: "0.4rem 0" }}>
          <strong>Unsubscribe:</strong> You can unsubscribe from emails using the link in any message.
        </li>
        <li style={{ margin: "0.4rem 0" }}>
          <strong>Cookies:</strong> You can control cookies via your browser settings.
        </li>
        <li style={{ margin: "0.4rem 0" }}>
          <strong>Access/Deletion:</strong> Contact us to request access to or deletion of your subscription data.
        </li>
      </ul>

      <h2 style={{ fontSize: 22, margin: "2rem 0 0.75rem 0" }}>Contact</h2>
      <p style={{ margin: 0 }}>
        For privacy questions or requests, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </main>
  );
}
