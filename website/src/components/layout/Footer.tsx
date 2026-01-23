import Link from "next/link";
import { Container } from "./Container";

const navigation = {
  main: [
    { name: "Track", href: "/track" },
    { name: "Log", href: "/log" },
    { name: "Gallery", href: "/gallery" },
    { name: "Yacht", href: "/yacht" },
    { name: "About", href: "/about" },
  ],
  voyages: [
    { name: "Fiordland 2026", href: "/voyages/fiordland-2026" },
    { name: "Bay of Islands 2025", href: "/voyages/bay-of-islands-2025" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-midnight-blue border-t border-white/5">
      <Container>
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="inline-block">
                <span className="font-display text-2xl text-salt-white">
                  Matariki III
                </span>
              </Link>
              <p className="mt-4 text-sm text-mist leading-relaxed">
                Following the voyages of an Oyster 68 around New Zealand and the
                Pacific. Join us for sailing adventures, hunting expeditions,
                and underwater exploration.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-caption text-copper-accent mb-4">
                Navigation
              </h3>
              <ul className="space-y-3">
                {navigation.main.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-mist hover:text-salt-white transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Voyages */}
            <div>
              <h3 className="text-caption text-copper-accent mb-4">Voyages</h3>
              <ul className="space-y-3">
                {navigation.voyages.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-mist hover:text-salt-white transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="text-caption text-copper-accent mb-4">Connect</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://instagram.com/matariki3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-mist hover:text-salt-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://youtube.com/@matariki3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-mist hover:text-salt-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    YouTube
                  </a>
                </li>
                <li>
                  <Link
                    href="/subscribe"
                    className="text-sm text-mist hover:text-salt-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Newsletter
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-storm-grey">
            &copy; {new Date().getFullYear()} Matariki III. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-storm-grey hover:text-mist transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-storm-grey hover:text-mist transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
