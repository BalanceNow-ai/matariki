import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommended Gear | Equipment for Offshore Sailing",
  description:
    "Equipment recommendations for offshore sailing, from foul weather gear and safety equipment to electronics and galley essentials.",
};

type GearItem = {
  name: string;
  brand?: string;
  description: string;
  essential: boolean;
  url?: string;
};

type GearCategory = {
  id: string;
  title: string;
  description: string;
  items: GearItem[];
};

const gearCategories: GearCategory[] = [
  {
    id: "foulies",
    title: "Foul Weather Gear",
    description:
      "Quality offshore foul weather gear is the single most important equipment investment for crew. Being warm and dry transforms the experience.",
    items: [
      {
        name: "Offshore Jacket",
        brand: "Musto MPX Pro / Gill OS2",
        description:
          "A proper offshore jacket with high collar, sealed seams, and adjustable cuffs. Bright colors aid visibility. Expect to spend $400-800 NZD for quality.",
        essential: true,
      },
      {
        name: "Offshore Trousers",
        brand: "Musto MPX Pro / Gill OS2",
        description:
          "High-waisted salopettes with reinforced seat and knees. Internal braces essential for offshore work.",
        essential: true,
      },
      {
        name: "Mid-Layer",
        brand: "Musto / Helly Hansen",
        description:
          "Fleece or synthetic insulated mid-layer. Avoid cotton. Multiple light layers beat one heavy layer.",
        essential: true,
      },
      {
        name: "Base Layers",
        brand: "Icebreaker / Smartwool",
        description:
          "Merino wool base layers regulate temperature and resist odor. Essential for multi-day passages.",
        essential: true,
      },
      {
        name: "Seaboots",
        brand: "Dubarry / Gill",
        description:
          "Non-marking soles, good ankle support, and drainage. Leather boots are warmer but take longer to dry.",
        essential: true,
      },
      {
        name: "Sailing Gloves",
        brand: "Gill / Harken",
        description:
          "Full-finger gloves for offshore work. Short-finger for warmer conditions. Have multiple pairs.",
        essential: false,
      },
    ],
  },
  {
    id: "safety",
    title: "Safety Equipment",
    description:
      "Personal safety equipment is provided by the yacht, but some items are worth owning personally.",
    items: [
      {
        name: "Lifejacket / PFD",
        brand: "Spinlock Deckvest / Crewsaver",
        description:
          "275N offshore lifejacket with integrated harness, light, and AIS beacon pocket. The yacht provides these, but some crew prefer their own.",
        essential: true,
      },
      {
        name: "Safety Tether",
        brand: "Spinlock / Kong",
        description:
          "Double-action hook tethers with quick-release. One short (1m) and one long (2m) tether.",
        essential: true,
      },
      {
        name: "Personal AIS Beacon",
        brand: "Ocean Signal MOB1",
        description:
          "Personal AIS beacon that integrates with lifejacket. Transmits position to yacht's AIS and nearby vessels.",
        essential: false,
      },
      {
        name: "PLB (Personal Locator Beacon)",
        brand: "ACR ResQLink / Ocean Signal",
        description:
          "406 MHz satellite beacon registered to individual. Independent of yacht systems. Consider for remote waters.",
        essential: false,
      },
      {
        name: "Knife",
        brand: "Gill / Myerchin",
        description:
          "Blunt-tip sailing knife with marlin spike. Serrated blade cuts line easily. Attach to harness.",
        essential: true,
      },
      {
        name: "Headtorch",
        brand: "Petzl / Black Diamond",
        description:
          "Red light mode essential for night watches. Waterproof rating important. Carry spare batteries.",
        essential: true,
      },
    ],
  },
  {
    id: "electronics",
    title: "Personal Electronics",
    description:
      "Keep electronics to a minimum offshore. Focus on what's genuinely useful.",
    items: [
      {
        name: "Waterproof Phone Case",
        brand: "Aquapac / LifeProof",
        description:
          "IPX8 rated case for your phone. Essential for photos and occasional use. Don't rely on phone for navigation.",
        essential: true,
      },
      {
        name: "Camera",
        brand: "Various",
        description:
          "Waterproof compact or mirrorless with weather sealing. Phones are fine for casual shots. Bring plenty of storage.",
        essential: false,
      },
      {
        name: "E-Reader",
        brand: "Kindle Paperwhite",
        description:
          "Long battery life and easy on eyes for night reading. Load with books before departure.",
        essential: false,
      },
      {
        name: "Watch",
        brand: "G-Shock / Garmin",
        description:
          "Rugged, water-resistant watch with countdown timer for sail trim. Avoid touchscreens offshore.",
        essential: false,
      },
      {
        name: "Portable Charger",
        brand: "Anker / Goal Zero",
        description:
          "20,000mAh+ capacity. Yacht has charging but personal backup is useful. Solar option for extended trips.",
        essential: false,
      },
    ],
  },
  {
    id: "comfort",
    title: "Comfort & Wellness",
    description:
      "Small comforts make a big difference on multi-day passages.",
    items: [
      {
        name: "Seasickness Medication",
        brand: "Stugeron / Scopoderm",
        description:
          "Start medication 12 hours before departure. Stugeron (cinnarizine) or Scopoderm patches. Avoid drowsy antihistamines.",
        essential: true,
      },
      {
        name: "Sunglasses",
        brand: "Oakley / Maui Jim",
        description:
          "Polarized, floating, with retainer strap. UV protection essential. Bring backup pair.",
        essential: true,
      },
      {
        name: "Sunscreen",
        brand: "Any SPF 50+",
        description:
          "Reef-safe, SPF 50+. Reapply frequently. Sun exposure is intense offshore.",
        essential: true,
      },
      {
        name: "Lip Balm",
        brand: "Any with SPF",
        description:
          "SPF rated lip balm. Salt and wind dry lips quickly.",
        essential: true,
      },
      {
        name: "Ear Plugs",
        brand: "Any quality foam",
        description:
          "Essential for sleeping off-watch. Boat noises are constant. Good sleep is critical for safety.",
        essential: true,
      },
      {
        name: "Eye Mask",
        brand: "Any comfortable fit",
        description:
          "Block light for daytime rest. Cabins aren't always dark when you need to sleep.",
        essential: false,
      },
    ],
  },
  {
    id: "bags",
    title: "Bags & Storage",
    description:
      "Soft luggage only. No hard cases. Everything must compress and stow.",
    items: [
      {
        name: "Soft Duffel Bag",
        brand: "Patagonia Black Hole / North Face",
        description:
          "70-90L soft duffel. Compresses when empty. Avoid wheeled bags or hard cases.",
        essential: true,
      },
      {
        name: "Dry Bags",
        brand: "Sea to Summit / Exped",
        description:
          "Assorted sizes for organizing gear. 8L for electronics, 20L for clothes. Roll-top closure.",
        essential: true,
      },
      {
        name: "Deck Bag",
        brand: "Musto / Gill",
        description:
          "Small waterproof bag for watch essentials: snacks, sunscreen, lip balm, headtorch.",
        essential: false,
      },
    ],
  },
];

export default function GearPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Gear" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">Recommended Gear</h1>
              <p className="text-mist leading-relaxed text-lg">
                Equipment recommendations for offshore sailing, from foul
                weather gear and safety equipment to personal comforts.
              </p>
            </div>
          </div>
        </section>

        {/* Introduction */}
        <Section>
          <div className="max-w-3xl">
            <p className="text-mist leading-relaxed mb-6">
              The gear list below reflects what we've found works well aboard an
              Oyster 68 in New Zealand and Pacific waters. Quality matters more
              than quantity — a good offshore jacket will last a decade and make
              every passage more comfortable.
            </p>
            <p className="text-mist leading-relaxed">
              Items marked as <span className="text-copper-accent">essential</span>{" "}
              are genuinely important for safety and comfort. Everything else is
              nice to have but not critical.
            </p>
          </div>
        </Section>

        {/* Gear Categories */}
        {gearCategories.map((category, index) => (
          <Section
            key={category.id}
            background={index % 2 === 1 ? "dark" : undefined}
          >
            <SectionLabel
              number={(index + 1).toString().padStart(2, "0")}
              label={category.title}
              className="mb-4"
            />
            <p className="text-mist mb-8 max-w-3xl">{category.description}</p>

            <div className="grid gap-4">
              {category.items.map((item) => (
                <div
                  key={item.name}
                  className="bg-midnight-blue/50 border border-slate-water/30 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-salt-white font-medium">
                        {item.name}
                      </h3>
                      {item.brand && (
                        <p className="text-copper-accent text-sm">
                          {item.brand}
                        </p>
                      )}
                    </div>
                    {item.essential && (
                      <span className="text-xs px-2 py-1 rounded bg-copper-accent/20 text-copper-accent">
                        Essential
                      </span>
                    )}
                  </div>
                  <p className="text-mist text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        ))}

        {/* Packing Tips */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Tips" className="mb-8" />
            <h2 className="text-h2 text-salt-white mb-6">Packing Advice</h2>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">01</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">Pack light.</strong> Space
                  aboard is limited. Bring half of what you think you need.
                  Laundry happens.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">02</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">No cotton.</strong>{" "}
                  Synthetic and merino only. Cotton holds moisture and loses
                  insulation when wet.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">03</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">Layers, not bulk.</strong>{" "}
                  Multiple thin layers beat one thick jacket. Conditions change.
                  Adapt.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">04</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">
                    Test gear before departure.
                  </strong>{" "}
                  Wear new foulies in the shower. Verify everything works before
                  leaving the dock.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">05</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">
                    Soft bags only.
                  </strong>{" "}
                  Hard cases don't fit through hatches. Duffels compress and
                  stow.
                </p>
              </li>
            </ul>
          </div>
        </Section>

        {/* Navigation */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/resources">All Resources</Button>
            <Button href="/resources/crew-orientation" variant="ghost">
              New Crew Orientation
            </Button>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
