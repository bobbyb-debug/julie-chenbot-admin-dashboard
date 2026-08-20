"use client";

import { useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { reactivateAction } from "../actions";

/** Reverses a previous Deactivate for this exact item, in place --
 * no confirm dialog (per the existing Deactivate/Reactivate UX split:
 * Deactivate stays behind a confirmation, Reactivate is a direct
 * action, matching how low-risk/reversible this one is). Identical
 * implementation used from both the Knowledge list (compact) and a
 * detail page (full). Once reactivated, the item's `active` flips
 * back to true and visibleKnowledgeActions() (lib/knowledge-actions.ts)
 * then shows Correct + Deactivate for it again -- there is no separate
 * "correct a deactivated item" action. */
export function ReactivateButton({
  itemId,
  compact = false,
}: {
  itemId: number;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function reactivate(e: MouseEvent) {
    // List rows wrap this button in a <Link> -- stop the click from
    // also triggering navigation.
    e.preventDefault();
    e.stopPropagation();
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
      title="Reactivate this item"
      aria-label={compact ? `Reactivate knowledge #${itemId}` : undefined}
      className={
        compact
          ? "rounded-lg border border-border-default p-1.5 text-text-muted hover:border-accent/40 hover:text-accent-strong disabled:opacity-50"
          : "rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent-strong hover:bg-accent/10 disabled:opacity-50"
      }
    >
      {compact ? <RotateCcw size={13} aria-hidden /> : pending ? "Reactivating..." : "Reactivate"}
    </button>
  );
}
