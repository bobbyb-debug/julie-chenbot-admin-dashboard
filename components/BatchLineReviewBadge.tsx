import type { BatchLineClassification } from "@/lib/batch-review";

const CONFIG: Record<BatchLineClassification, { label: string; className: string }> = {
  new: { label: "New", className: "text-status-healthy bg-status-healthy/10" },
  duplicate: { label: "Duplicate", className: "text-status-problem bg-status-problem/10" },
  possible_duplicate: { label: "Possible Duplicate", className: "text-status-attention bg-status-attention/10" },
  possible_overlap: { label: "Possible Overlap", className: "text-status-attention bg-status-attention/10" },
  contradiction: { label: "Contradiction", className: "text-status-problem bg-status-problem/10" },
  state_new: { label: "New State", className: "text-accent-strong bg-accent/10" },
  state_update: { label: "State Update", className: "text-accent-strong bg-accent/10" },
  state_unchanged: { label: "No Change", className: "text-text-muted bg-bg-elevated" },
};

/** Small classification chip for one Batch Teaching review line -- see
 * lib/batch-review.ts for what each classification means and how it's
 * computed. Shared between the per-line list and anywhere else a
 * classification needs the same visual treatment, so the label/color
 * mapping can't drift between them. */
export function BatchLineReviewBadge({ classification }: { classification: BatchLineClassification }) {
  const cfg = CONFIG[classification];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
