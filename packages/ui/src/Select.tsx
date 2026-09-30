import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { FormField } from "./FormField";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  required?: boolean;
  error?: string;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, required, error, id, className, options, children, ...props },
  ref,
) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <FormField label={label} htmlFor={selectId} required={required} error={error}>
      <select
        ref={ref}
        id={selectId}
        className={cn(
          "h-10 w-full cursor-pointer rounded-lg border border-hairline bg-surface-card px-3 text-sm text-ink-strong",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25",
          error ? "border-red-500" : "",
          className,
        )}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    </FormField>
  );
});