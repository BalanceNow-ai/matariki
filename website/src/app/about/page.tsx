import Image from "next/image";
import { Header, Footer, Section } from "@/components/layout";
import { SectionLabel, Button, MissingContent } from "@/components/ui";
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
  // Fetch crew from Sanity only - no mock data fallback
  let crew: CrewMember[] = [];

  try {
    const sanityCrew = await client.fetch<SanityCrew[]>(
      CREW_QUERY,
      {},
      fetchOptions
    );

    if (sanityCrew && sanityCrew.length > 0) {
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <SectionLabel number="01" label="The Crew" />
            <Button href="/about/crew-orientation" variant="ghost" size="sm">
              New Crew? Start Here
            </Button>
          </div>
          {crew.length > 0 ? (
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
                      <MissingContent label="No photo" size="sm" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-h3 text-salt-white mb-1">{member.name}</h3>
                    <p className="text-copper-accent text-sm mb-3">{member.role || <span className="text-red-400">Role missing</span>}</p>
                    <p className="text-mist leading-relaxed">{member.bio || <span className="text-red-400">Bio missing</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-water/30 rounded-lg py-12">
              <MissingContent label="No crew members in Sanity" size="lg" />
            </div>
          )}
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
