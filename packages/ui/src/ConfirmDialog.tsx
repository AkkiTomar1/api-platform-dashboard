import { type ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onCancel} size="sm">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-strong">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-ink-soft">{description}</p>
          ) : null}
        </div>
        {children ? <div className="text-sm">{children}</div> : null}
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const ConfirmModal = ConfirmDialog;