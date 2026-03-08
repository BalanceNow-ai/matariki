import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What to Bring | Crew Info",
  description:
    "A practical packing guide for joining Matariki III. What to bring, what not to bring, and what is already onboard.",
};

export default function WhatToBringPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Crew Info" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">
                What to Bring on Matariki III
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                Pack for a practical offshore sailing boat, not for a marina
                holiday. Keep it light, keep it soft, and bring things you are
                happy getting wet, salty or dirty.
              </p>
            </div>
          </div>
        </section>

        {/* Bring */}
        <Section>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-sea-green/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-sea-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-h2 text-salt-white">Bring</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Soft bag or duffel — not a hard suitcase",
                "Wet weather gear",
                "Warm layers",
                "Sun hat",
                "Sunglasses",
                "Sunscreen",
                "Flat non-marking shoes or sea boots",
                "Personal medication",
                "Toiletries",
                "Refillable water bottle",
                "Headlamp",
                "Phone charger / charging cable",
                "A small number of practical changes of clothes",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-mist leading-relaxed"
                >
                  <span className="text-sea-green mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Optional */}
        <Section background="dark">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-copper-accent/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-copper-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-h2 text-salt-white">Optional</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Your own lifejacket if you strongly prefer it",
                "Seasickness remedies you know work for you",
                "Eye mask",
                "Ear plugs",
                "Lightweight sailing gloves",
                "Camera",
                "Binoculars",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-mist leading-relaxed"
                >
                  <span className="text-copper-accent mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Do Not Bring */}
        <Section>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-h2 text-salt-white">Do Not Bring</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Hard suitcases",
                "Black-soled or marking shoes",
                "Excess clothing",
                "Loose jewellery",
                "Fragile items that cannot handle saltwater",
                "More gear than you can comfortably keep tidy in a small cabin space",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-mist leading-relaxed"
                >
                  <span className="text-red-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Already Onboard */}
        <Section background="dark">
          <div className="max-w-3xl">
            <div className="p-6 bg-midnight-blue border border-copper-accent/30 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-copper-accent/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-copper-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h2 className="text-h3 text-salt-white">Already Onboard</h2>
              </div>
              <p className="text-mist leading-relaxed mb-6">
                Matariki carries the essential offshore safety gear onboard,
                including:
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  "Lifejackets / PFDs",
                  "Tethers",
                  "Jacklines and strong points",
                  "Liferaft",
                  "Grab bag",
                  "EPIRB",
                  "Personal locator beacons / AIS beacons",
                  "Rescue sling and heaving line",
                  "Flares",
                  "Medical kit",
                  "HF and handheld VHF radios",
                  "Emergency steering gear",
                  "Anchors and core safety equipment",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-mist text-sm"
                  >
                    <svg
                      className="w-4 h-4 text-copper-accent flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-mist leading-relaxed mt-6 text-sm">
                Please assume that the boat is already equipped with the key
                safety systems required for offshore sailing. The things you
                need to bring are mostly personal clothing, footwear,
                medications, and comfort items.
              </p>
            </div>
          </div>
        </Section>

        {/* Final Advice */}
        <Section>
          <div className="max-w-3xl">
            <SectionLabel label="Advice" className="mb-6" />
            <h2 className="text-h2 text-salt-white mb-6">Final Packing Advice</h2>
            <div className="space-y-4">
              <p className="text-mist leading-relaxed">
                Pack light. Soft bags are much easier to stow than hard luggage.
                Bring practical layers rather than bulky clothing, and choose
                gear that works when wet.
              </p>
              <p className="text-mist leading-relaxed">
                If you are unsure whether to bring something, the best test is
                simple: will it be genuinely useful onboard?
              </p>
            </div>
          </div>
        </Section>

        {/* Navigation */}
        <Section background="dark">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/crew-info/safety-on-matariki">
              Safety on Matariki
            </Button>
            <Button href="/crew-info/life-onboard" variant="ghost">
              Life Onboard
            </Button>
            <Button href="/crew-info" variant="ghost">
              All Crew Info
            </Button>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
