import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "sailing" | "hunting" | "diving" | "fishing" | "general";
  size?: "sm" | "md";
  className?: string;
}

const variantColors = {
  default: "bg-slate-water/80 text-mist",
  sailing: "bg-slate-water/80 text-foam",
  hunting: "bg-sea-green/80 text-foam",
  diving: "bg-midnight-blue/80 text-foam",
  fishing: "bg-brass/80 text-deep-ocean",
  general: "bg-storm-grey/80 text-foam",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center uppercase tracking-wider backdrop-blur-sm",
        variantColors[variant],
        size === "sm" ? "px-2 py-1 text-[0.65rem]" : "px-3 py-1.5 text-xs",
        className
      )}
    >
      {children}
    </span>
  );
}
