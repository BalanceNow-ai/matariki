import type { Metadata } from "next";

/**
 * Admin tooling must never be indexed. robots.ts also disallows /admin/, but
 * that governs crawling rather than indexing, so both are needed.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
