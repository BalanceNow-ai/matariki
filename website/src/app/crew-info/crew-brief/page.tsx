"use client";

import Link from "next/link";

export default function CrewBriefPage() {
  return (
    <>
      {/* Print-friendly styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt;
            line-height: 1.5;
          }
          .print-page {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          h1 {
            font-size: 24pt !important;
          }
          h2 {
            font-size: 16pt !important;
            page-break-after: avoid;
          }
          h3 {
            font-size: 13pt !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
        @page {
          margin: 2cm;
        }
      `}</style>

      {/* Download/Print Header - Hidden in print */}
      <div className="no-print bg-deep-ocean sticky top-0 z-50 border-b border-slate-water">
        <div className="container-site py-4 flex items-center justify-between">
          <Link
            href="/crew-info"
            className="text-mist hover:text-salt-white transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Crew Info
          </Link>
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-copper-accent text-white rounded hover:bg-copper-accent/90 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="print-page bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-8 py-12 text-gray-900">
          {/* Header */}
          <header className="text-center mb-12 pb-8 border-b-2 border-gray-200">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
              Matariki III
            </h1>
            <p className="text-xl text-gray-600 mb-4">Crew Brief</p>
            <p className="text-sm text-gray-500">Oyster 68</p>
          </header>

          {/* Welcome */}
          <section className="mb-10">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Welcome
            </h2>
            <p className="mb-4 text-gray-700 leading-relaxed">
              Welcome to Matariki III. This brief covers the essentials you need
              to know before joining the boat for an offshore passage.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Matariki III is an Oyster 68 set up for serious cruising and
              passagemaking. She is a capable offshore yacht with a strong
              culture of safety, teamwork, and looking after one another.
            </p>
          </section>

          {/* What to Bring */}
          <section className="mb-10">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              What to Bring
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Essential</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Soft bag or duffel</li>
                  <li>• Wet weather gear</li>
                  <li>• Warm layers</li>
                  <li>• Sun hat and sunglasses</li>
                  <li>• Sunscreen</li>
                  <li>• Non-marking shoes or sea boots</li>
                  <li>• Personal medication</li>
                  <li>• Toiletries</li>
                  <li>• Refillable water bottle</li>
                  <li>• Headlamp</li>
                  <li>• Phone charger</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Do Not Bring</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Hard suitcases</li>
                  <li>• Black-soled or marking shoes</li>
                  <li>• Excess clothing</li>
                  <li>• Loose jewellery</li>
                  <li>• Fragile items</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Already Onboard */}
          <section className="mb-10 bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold text-gray-900 mb-3">Already Onboard</h3>
            <p className="text-sm text-gray-700 mb-3">
              Matariki carries the essential offshore safety gear:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div>• Lifejackets / PFDs</div>
              <div>• Tethers</div>
              <div>• Jacklines</div>
              <div>• Liferaft</div>
              <div>• Grab bag</div>
              <div>• EPIRB</div>
              <div>• PLBs / AIS beacons</div>
              <div>• Flares</div>
              <div>• Medical kit</div>
              <div>• VHF radios</div>
            </div>
          </section>

          {/* Page Break for Print */}
          <div className="page-break"></div>

          {/* Safety Rules */}
          <section className="mb-10">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Core Safety Rules
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-bold text-copper-accent">1.</span>
                <p className="text-gray-700">
                  No one goes onto the foredeck alone
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-copper-accent">2.</span>
                <p className="text-gray-700">
                  No one uses the duckboard without two people on deck and a
                  harness on
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-copper-accent">3.</span>
                <p className="text-gray-700">
                  PFD and harness rules must be followed
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-copper-accent">4.</span>
                <p className="text-gray-700">
                  Soft sea shoes or sea boots only
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-copper-accent">5.</span>
                <p className="text-gray-700">
                  Watch the boom, power winches and running rigging
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-copper-accent">6.</span>
                <p className="text-gray-700 font-medium">If in doubt, ask</p>
              </div>
            </div>
          </section>

          {/* Emergency Awareness */}
          <section className="mb-10">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Emergency Awareness
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-bold text-gray-900">Man Overboard</h3>
                <p className="text-gray-700">
                  Shout &ldquo;Man Overboard&rdquo;, hit the MOB button, keep
                  pointing, throw the lifebuoy and Dan buoy, get help on deck.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Fire</h3>
                <p className="text-gray-700">
                  Shout &ldquo;Fire&rdquo; and state location. Use nearest
                  extinguisher if safe.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Flooding</h3>
                <p className="text-gray-700">
                  Alert skipper immediately. Stay calm. Assist with pumps and
                  damage control.
                </p>
              </div>
            </div>
          </section>

          {/* Call the Skipper */}
          <section className="mb-10 bg-amber-50 p-6 rounded-lg border border-amber-200">
            <h3 className="font-bold text-gray-900 mb-3">
              Call the Skipper Immediately If:
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Any collision risk</li>
              <li>• Landfall within 5 nautical miles</li>
              <li>• A need to reef</li>
              <li>• Major change in wind or sea state</li>
              <li>• Any emergency (fire, flooding, MOB, injury)</li>
              <li>• Any system failure</li>
            </ul>
          </section>

          {/* Life Onboard */}
          <section className="mb-10">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              Life Onboard
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Life onboard is collaborative. Everyone helps — whether that
                means helming, trimming sails, keeping lookout, washing dishes,
                or making tea for the next watch.
              </p>
              <p>
                When underway, a formal watchkeeping routine is used. Watch
                handovers matter. Position, course, weather, traffic, sail plan,
                and anything unusual should be communicated clearly.
              </p>
              <p>
                The best crews are calm, tidy, helpful and communicative. If
                this is your first offshore passage, expect a learning curve —
                but also expect moments of real satisfaction, teamwork, and
                beauty.
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t-2 border-gray-200 text-center text-sm text-gray-500">
            <p className="font-serif text-lg text-gray-700 mb-2">
              Matariki III
            </p>
            <p>Oyster 68 • matarikiyacht.com</p>
          </footer>
        </div>
      </div>
    </>
  );
}
