import { cn } from "@/lib/utils";
import { forwardRef, useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-caption text-mist mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 bg-midnight-blue/50 border border-mist/20 text-salt-white placeholder:text-storm-grey",
            "focus:outline-none focus:border-copper-accent transition-colors",
            error && "border-warning-red",
            className
          )}
          {...props}
        />
        {error && <p className="mt-2 text-xs text-warning-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
