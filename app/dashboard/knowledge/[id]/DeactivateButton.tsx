"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { forgetAction } from "../actions";

export function DeactivateButton({ itemId }: { itemId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-status-problem/40 px-3 py-1.5 text-xs font-medium text-status-problem hover:bg-status-problem/10"
      >
        Deactivate
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-status-problem">{error}</span>}
      <span className="text-xs text-text-secondary">Deactivate this item?</span>
      <button
        onClick={() =>
          startTransition(async () => {
            const result = await forgetAction(itemId);
            if (!result.ok) {
              setError(result.message ?? "Failed.");
              return;
            }
            router.refresh();
            setConfirming(false);
          })
        }
        disabled={pending}
        className="rounded-lg bg-status-problem px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Working..." : "Confirm"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-border-default px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
      >
        Cancel
      </button>
    </div>
  );
}
