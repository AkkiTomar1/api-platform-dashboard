import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "gray" | "green" | "red" | "amber" | "violet" | "blue";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  green:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function Badge({ children, tone = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}