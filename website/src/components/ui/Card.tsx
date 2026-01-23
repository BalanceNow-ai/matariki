import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({ children, className, hoverable = true }: CardProps) {
  return (
    <div
      className={cn(
        "card rounded-lg overflow-hidden",
        !hoverable && "[&]:hover:transform-none [&]:hover:shadow-none",
        className
      )}
    >
      {children}
    </div>
  );
}
