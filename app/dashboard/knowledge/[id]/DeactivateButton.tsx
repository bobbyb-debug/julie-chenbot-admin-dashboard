"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { forgetAction } from "../actions";

export function DeactivateButton({ itemId }: { itemId: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

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
        onClick={() => setOpen(true)}
        className="rounded-lg border border-status-problem/40 px-3 py-1.5 text-xs font-medium text-status-problem hover:bg-status-problem/10"
      >
        Deactivate
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
