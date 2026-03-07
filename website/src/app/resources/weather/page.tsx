import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weather Resources | Forecasting & Planning Tools",
  description:
    "Weather forecasting tools, GRIB file sources, and meteorological resources for passage planning in New Zealand and Pacific waters.",
};

type WeatherResource = {
  name: string;
  url: string;
  description: string;
  category: "forecast" | "grib" | "routing" | "local";
  free: boolean;
};

const weatherResources: WeatherResource[] = [
  // Forecasting Tools
  {
    name: "PredictWind",
    url: "https://www.predictwind.com",
    description:
      "Industry-leading weather routing and forecasting for sailors. Offers multiple weather models, departure planning, and route optimization. The offshore version provides GRIB files via satellite.",
    category: "forecast",
    free: false,
  },
  {
    name: "Windy.com",
    url: "https://www.windy.com",
    description:
      "Excellent free visual weather tool showing wind, waves, pressure, and precipitation overlays on a global map. Multiple models available including ECMWF, GFS, and ICON.",
    category: "forecast",
    free: true,
  },
  {
    name: "Passage Weather",
    url: "https://www.passageweather.com",
    description:
      "Free GRIB-based forecasts optimized for sailors, showing wind, waves, and pressure charts. Good for quick visual overview of offshore conditions.",
    category: "forecast",
    free: true,
  },
  {
    name: "Ventusky",
    url: "https://www.ventusky.com",
    description:
      "Beautiful weather visualization tool similar to Windy, with wind flow animations, multiple layers, and model comparison features.",
    category: "forecast",
    free: true,
  },
  // GRIB Sources
  {
    name: "SailDocs",
    url: "http://www.saildocs.com",
    description:
      "Email-based GRIB file service essential for offshore sailing. Request weather data via satellite email (Iridium, SSB) when away from internet. Free to use.",
    category: "grib",
    free: true,
  },
  {
    name: "OpenCPN + GRIB Plugin",
    url: "https://opencpn.org",
    description:
      "Open-source chart plotter with excellent GRIB visualization. Download GRIB files from multiple sources and overlay on your charts.",
    category: "grib",
    free: true,
  },
  {
    name: "LuckGrib",
    url: "https://luckgrib.com",
    description:
      "Mac/iOS GRIB viewer and download tool. Excellent for downloading weather data before departure. One-time purchase.",
    category: "grib",
    free: false,
  },
  {
    name: "Expedition Marine",
    url: "https://www.expeditionmarine.com",
    description:
      "Professional-grade weather routing and GRIB software used by racing and expedition yachts. Steep learning curve but powerful.",
    category: "routing",
    free: false,
  },
  // NZ Specific
  {
    name: "MetService Marine",
    url: "https://www.metservice.com/marine",
    description:
      "New Zealand's official marine forecast. Essential for coastal NZ waters. Includes coastal waters, high seas forecasts, and weather warnings.",
    category: "local",
    free: true,
  },
  {
    name: "MetService MetConnect",
    url: "https://www.metconnect.co.nz",
    description:
      "Premium marine forecasts for NZ waters with higher resolution models and more frequent updates. Subscription required.",
    category: "local",
    free: false,
  },
  {
    name: "MetVUW",
    url: "http://metvuw.com",
    description:
      "Victoria University of Wellington's weather maps. Excellent rain radar and synoptic charts for New Zealand, updated frequently.",
    category: "local",
    free: true,
  },
  {
    name: "Fiji Met Service",
    url: "https://www.met.gov.fj",
    description:
      "Official forecasts for Fiji and surrounding Pacific waters. Essential for passages north from New Zealand.",
    category: "local",
    free: true,
  },
];

const categories = [
  {
    id: "forecast",
    label: "Forecasting Tools",
    description: "Visual weather forecasting platforms for passage planning",
  },
  {
    id: "grib",
    label: "GRIB Files & Viewers",
    description: "Download and visualize numerical weather model data",
  },
  {
    id: "routing",
    label: "Weather Routing",
    description: "Route optimization based on weather forecasts",
  },
  {
    id: "local",
    label: "Regional Services",
    description: "Official meteorological services for NZ and Pacific",
  },
];

export default function WeatherResourcesPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="Weather" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">
                Weather Resources
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                Forecasting tools, GRIB file sources, and meteorological
                services for passage planning in New Zealand and Pacific waters.
              </p>
            </div>
          </div>
        </section>

        {/* Introduction */}
        <Section>
          <div className="max-w-3xl">
            <p className="text-mist leading-relaxed mb-6">
              Good weather routing is the difference between a comfortable
              passage and a survival exercise. The resources below range from
              free visual forecasting tools to professional routing software.
              For offshore passages, we typically use a combination of
              PredictWind for routing, Windy for visualization, and MetService
              for New Zealand coastal waters.
            </p>
            <p className="text-mist leading-relaxed">
              When offshore beyond internet range, SailDocs provides GRIB files
              via email through our Iridium satellite phone — an essential
              service for multi-day passages.
            </p>
          </div>
        </Section>

        {/* Resources by Category */}
        {categories.map((category, index) => (
          <Section
            key={category.id}
            background={index % 2 === 1 ? "dark" : undefined}
          >
            <SectionLabel
              number={(index + 1).toString().padStart(2, "0")}
              label={category.label}
              className="mb-4"
            />
            <p className="text-mist mb-8">{category.description}</p>

            <div className="grid gap-6">
              {weatherResources
                .filter((r) => r.category === category.id)
                .map((resource) => (
                  <a
                    key={resource.name}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-midnight-blue/50 border border-slate-water/30 rounded-lg p-6 hover:border-copper-accent/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-salt-white font-medium group-hover:text-copper-accent transition-colors">
                        {resource.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          resource.free
                            ? "bg-sea-green/20 text-sea-green"
                            : "bg-slate-water/50 text-mist"
                        }`}
                      >
                        {resource.free ? "Free" : "Paid"}
                      </span>
                    </div>
                    <p className="text-mist text-sm leading-relaxed">
                      {resource.description}
                    </p>
                    <span className="inline-block mt-4 text-copper-accent text-sm">
                      {resource.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  </a>
                ))}
            </div>
          </Section>
        ))}

        {/* Tips */}
        <Section background="dark">
          <div className="max-w-3xl">
            <SectionLabel label="Tips" className="mb-8" />
            <h2 className="text-h2 text-salt-white mb-6">
              Weather Planning Best Practices
            </h2>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">01</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">
                    Compare multiple models.
                  </strong>{" "}
                  GFS, ECMWF, and ICON often disagree. When models converge,
                  confidence is higher; when they diverge, be cautious.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">02</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">
                    Watch the trends, not just the forecast.
                  </strong>{" "}
                  A deteriorating forecast is more concerning than a stable one,
                  even if the numbers look similar.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">03</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">
                    Download GRIBs before departure.
                  </strong>{" "}
                  Have at least 5 days of weather data downloaded before leaving
                  port. Satellite data requests can be slow.
                </p>
              </li>
              <li className="flex gap-4">
                <span className="text-copper-accent font-mono text-sm">04</span>
                <p className="text-mist leading-relaxed">
                  <strong className="text-salt-white">
                    Know your weather windows.
                  </strong>{" "}
                  For passages around NZ, high pressure systems typically
                  provide 2-4 day windows of favorable conditions.
                </p>
              </li>
            </ul>
          </div>
        </Section>

        {/* Navigation */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/resources">All Resources</Button>
            <Button href="/track" variant="ghost">
              View Current Position
            </Button>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
