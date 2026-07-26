import type { Metadata } from "next";

/**
 * robots.txt asks crawlers not to visit these pages; this tells any that
 * arrive anyway not to index them. Both are needed — robots.txt governs
 * crawling, not indexing, and a linked-to page can be indexed without ever
 * being fetched.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function DiagnosticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
