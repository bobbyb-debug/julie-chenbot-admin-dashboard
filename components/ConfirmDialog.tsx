"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

/** A real modal confirmation dialog, not an inline "Are you sure?" --
 * always states exactly what the action will do. Used for anything
 * that deactivates/changes knowledge or game state. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl border border-border-default bg-bg-elevated p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-problem/15 text-status-problem">
              <AlertTriangle size={16} aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-sm font-semibold text-text-primary">
              {title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
            {error && <p className="mt-2 text-xs text-status-problem">{error}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
              destructive ? "bg-status-problem hover:opacity-90" : "bg-accent hover:bg-accent-strong"
            }`}
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
