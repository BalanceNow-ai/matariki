import { Section } from "@/components/layout";
import { SectionLabel, Button } from "@/components/ui";

/** "Apply to crew" call to action for the /crew-info pages. */
export function ApplyToCrewCta() {
  return (
    <Section background="gradient">
      <div className="max-w-3xl mx-auto text-center">
        <SectionLabel label="Join the crew" className="justify-center mb-6" />
        <h2 className="text-h2 text-salt-white mb-4">Want to sail with us?</h2>
        <p className="text-mist leading-relaxed mb-8">
          See the upcoming passages and how selection works, then apply for the legs that suit you.
        </p>
        <Button href="/crew" size="lg">
          Apply to crew
        </Button>
      </div>
    </Section>
  );
}
