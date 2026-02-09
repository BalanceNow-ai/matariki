type MissingContentProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function MissingContent({
  label = "Content missing",
  size = "md",
  className = ""
}: MissingContentProps) {
  const sizeClasses = {
    sm: "p-2",
    md: "p-4",
    lg: "p-8",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} ${className}`}>
      <svg
        className={`${iconSizes[size]} text-red-500`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      <span className={`${textSizes[size]} text-red-400 mt-1 text-center`}>
        {label}
      </span>
    </div>
  );
}
