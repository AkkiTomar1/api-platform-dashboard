import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "./cn";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ className, ...props }, ref) {
    return (
      <div className={cn("relative w-full max-w-xs", className)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          ref={ref}
          type="search"
          className="h-10 w-full rounded-lg border border-hairline bg-surface-card pl-9 pr-3 text-sm text-ink-strong placeholder:text-ink-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          {...props}
        />
      </div>
    );
  },
);