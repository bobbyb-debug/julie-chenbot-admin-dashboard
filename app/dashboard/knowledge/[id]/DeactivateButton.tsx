"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { forgetAction } from "../actions";

/** Deactivate trigger + confirmation -- identical implementation used
 * from both the Knowledge list (compact) and a detail page (full). */
export function DeactivateButton({
  itemId,
  compact = false,
}: {
  itemId: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  function openDialog(e: MouseEvent) {
    // List rows wrap this button in a <Link> -- stop the click from
    // also triggering navigation.
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  function confirm() {
    startTransition(async () => {
      const result = await forgetAction(itemId);
      if (!result.ok) {
        const message = result.message ?? "Failed to deactivate.";
        setError(message);
        toast.push(message, "error");
        return;
      }
      toast.push(`Deactivated knowledge #${itemId}.`, "success");
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={openDialog}
        title="Deactivate this item"
        aria-label={compact ? `Deactivate knowledge #${itemId}` : undefined}
        className={
          compact
            ? "rounded-lg border border-border-default p-1.5 text-text-muted hover:border-status-problem/40 hover:text-status-problem"
            : "rounded-lg border border-status-problem/40 px-3 py-1.5 text-xs font-medium text-status-problem hover:bg-status-problem/10"
        }
      >
        {compact ? <Ban size={13} aria-hidden /> : "Deactivate"}
      </button>
      <ConfirmDialog
        open={open}
        title={`Deactivate knowledge item #${itemId}?`}
        description="This will remove it from Julie's active learned knowledge. Its history is preserved and can be reviewed later -- this is not a permanent delete."
        confirmLabel="Deactivate"
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={() => {
          setOpen(false);
          setError(null);
        }}
      />
    </>
  );
}
