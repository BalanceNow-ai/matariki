import { cn } from "@/lib/utils";

interface SectionLabelProps {
  number?: string;
  label: string;
  withLine?: boolean;
  className?: string;
}

export function SectionLabel({
  number,
  label,
  withLine = false,
  className,
}: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        withLine && "section-label-line",
        className
      )}
    >
      <span className="text-caption text-copper-accent">
        {number && <span className="mr-2">{number} —</span>}
        {label}
      </span>
    </div>
  );
}
