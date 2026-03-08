import { cn } from "@/lib/utils";
import { Container } from "./Container";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  background?: "default" | "dark" | "gradient";
  id?: string;
  fullWidth?: boolean;
}

export function Section({
  children,
  className,
  containerClassName,
  background = "default",
  id,
  fullWidth = false,
}: SectionProps) {
  const bgClasses = {
    default: "",
    dark: "bg-midnight-blue",
    gradient: "gradient-ocean",
  };

  return (
    <section
      id={id}
      className={cn("py-16 md:py-24", bgClasses[background], className)}
    >
      {fullWidth ? (
        children
      ) : (
        <Container className={containerClassName}>{children}</Container>
      )}
    </section>
  );
}
