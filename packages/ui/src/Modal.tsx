import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full rounded-2xl border border-hairline bg-surface-card shadow-2xl shadow-slate-950/20",
          sizeClasses[size],
        )}
      >
        <div className="flex items-start justify-between border-b border-hairline px-6 py-4">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-ink-strong">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-ink-soft">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-hairline px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}