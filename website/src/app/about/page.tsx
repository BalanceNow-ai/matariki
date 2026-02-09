import Image from "next/image";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";
import { crew as mockCrew } from "@/lib/data/mock";
import { client, projectId, dataset, fetchOptions } from "@/sanity/client";
import { CREW_QUERY } from "@/sanity/queries";
import imageUrlBuilder from "@sanity/image-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Meet the crew of Matariki III and learn about our sailing adventures.",
};

// Force dynamic rendering to always fetch fresh crew data from Sanity
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any;

type SanityCrew = {
  _id: string;
  name: string;
  role?: string;
  bio?: string;
  photo?: SanityImageSource;
};

type CrewMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo?: SanityImageSource | string;
};

// Helper to check if photo is a Sanity image object
const isSanityImage = (photo: SanityImageSource | string | undefined): photo is SanityImageSource => {
  return photo !== undefined && typeof photo === "object" && photo !== null && "asset" in photo;
};

const urlFor = (source: SanityImageSource) =>
  projectId && dataset
    ? imageUrlBuilder({ projectId, dataset }).image(source)
    : null;

export default async function AboutPage() {
  // Fetch crew from Sanity with fallback to mock data
  let crew: CrewMember[] = mockCrew;
  let dataSource = "mock";

  try {
    const sanityCrew = await client.fetch<SanityCrew[]>(
      CREW_QUERY,
      {},
      fetchOptions
    );

    console.log("[About] Sanity crew fetch:", sanityCrew?.length ?? 0, "members found");

    if (sanityCrew && sanityCrew.length > 0) {
      dataSource = "sanity";
      crew = sanityCrew.map((member) => ({
        id: member._id,
        name: member.name,
        role: member.role || "",
        bio: member.bio || "",
        photo: member.photo,
      }));
    }
  } catch (error) {
    console.error("[About] Failed to fetch crew from Sanity:", error);
  }

  console.log("[About] Using", dataSource, "data -", crew.length, "crew members");
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-midnight-blue">
          <div className="container-site">
            <div className="max-w-3xl">
              <SectionLabel label="About" className="mb-4" />
              <h1 className="text-h1 text-salt-white mb-6">
                The Story Behind the Voyage
              </h1>
              <p className="text-mist leading-relaxed text-lg">
                Matariki III represents a lifelong dream of blue-water sailing, combining
                a passion for the sea with a love of New Zealand's wild coastline and
                the adventures it offers.
              </p>
            </div>
          </div>
        </section>

        {/* Crew Section */}
        <Section>
          <SectionLabel number="01" label="The Crew" className="mb-8" />
          <div className="grid md:grid-cols-2 gap-12">
            {crew.map((member) => (
              <div key={member.id} className="flex gap-6">
                <div className="w-32 h-32 rounded-lg bg-slate-water/50 flex-shrink-0 overflow-hidden">
                  {isSanityImage(member.photo) ? (
                    <Image
                      src={urlFor(member.photo)?.width(256).height(256).url() || ""}
                      alt={member.name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-mist/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-h3 text-salt-white mb-1">{member.name}</h3>
                  <p className="text-copper-accent text-sm mb-3">{member.role}</p>
                  <p className="text-mist leading-relaxed">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Our Mission */}
        <Section background="dark">
          <div className="max-w-3xl mx-auto text-center">
            <SectionLabel label="Our Mission" className="justify-center mb-8" />
            <h2 className="text-h2 text-salt-white mb-6">
              Why We Sail
            </h2>
            <p className="text-mist leading-relaxed mb-6">
              The sea has always called to us. There's something about the rhythm of the waves,
              the challenge of navigation, and the reward of reaching a remote anchorage that
              feeds the soul in ways that life ashore never could.
            </p>
            <p className="text-mist leading-relaxed mb-6">
              Matariki III allows us to pursue our passions — sailing, hunting, diving, and
              fishing — while exploring some of the most spectacular coastline on Earth.
              From the towering fiords of the South Island to the pristine islands of the Pacific,
              every voyage brings new discoveries.
            </p>
            <p className="text-mist leading-relaxed">
              This website is our way of sharing those adventures with family, friends, and
              fellow sailing enthusiasts. We hope our log entries, photographs, and position
              updates give you a glimpse into life aboard and perhaps inspire your own
              voyaging dreams.
            </p>
          </div>
        </Section>

        {/* Contact */}
        <Section>
          <div className="max-w-xl mx-auto text-center">
            <SectionLabel label="Get in Touch" className="justify-center mb-8" />
            <h2 className="text-h3 text-salt-white mb-4">
              Want to Connect?
            </h2>
            <p className="text-mist mb-8">
              Follow our adventures on social media or subscribe to our newsletter
              for updates from the sea.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button href="/subscribe">
                Subscribe to Newsletter
              </Button>
              <Button href="https://instagram.com/sailingmatariki" variant="ghost">
                Follow on Instagram
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
