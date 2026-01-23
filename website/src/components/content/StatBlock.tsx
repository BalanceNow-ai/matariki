import { cn } from "@/lib/utils";

interface StatBlockProps {
  value: number | string;
  label: string;
  suffix?: string;
  className?: string;
}

export function StatBlock({ value, label, suffix, className }: StatBlockProps) {
  return (
    <div className={cn("text-center", className)}>
      <div className="font-mono text-3xl md:text-4xl text-salt-white font-light">
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span className="text-copper-accent ml-1">{suffix}</span>}
      </div>
      <div className="text-caption text-mist mt-2">{label}</div>
    </div>
  );
}
