"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { reactivateAction } from "../actions";

/** Reverses a previous Deactivate for this exact item -- no confirm
 * dialog (per the existing Deactivate/Reactivate UX split: Deactivate
 * stays behind a confirmation, Reactivate is a direct action, matching
 * how ephemeral/low-risk this one is to reverse again if needed). */
export function ReactivateButton({ itemId }: { itemId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function reactivate() {
    startTransition(async () => {
      const result = await reactivateAction(itemId);
      if (!result.ok) {
        toast.push(result.message ?? "Failed to reactivate.", "error");
        return;
      }
      toast.push(`Reactivated knowledge #${itemId}.`, "success");
      router.refresh();
    });
  }

  return (
    <button
      onClick={reactivate}
      disabled={pending}
      className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent-strong hover:bg-accent/10 disabled:opacity-50"
    >
      {pending ? "Reactivating..." : "Reactivate"}
    </button>
  );
}
