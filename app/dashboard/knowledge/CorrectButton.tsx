"use client";

import { useState, useTransition, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PenSquare } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { teachAction } from "./actions";

type Step = "compose" | "review";

/** Shared correction entry point for both the Knowledge list and a
 * knowledge item's detail page -- same component, same mutation
 * (teachAction, the existing single-item teach/correct server action
 * already used elsewhere in this file), so the two entry points can
 * never drift apart.
 *
 * Writes a NEW `correction`-type knowledge item with `supersedes` set
 * to the original -- KnowledgeStore.teach() (production/knowledge.py,
 * JulieChenBot repo) auto-deactivates the original as part of that
 * same write. The original is never mutated in place, never deleted,
 * and stays reachable via the Deactivated filter with a "Superseded
 * by" link on its detail page -- this is the same reviewed knowledge
 * architecture every other teach path already uses, not a new one. */
export function CorrectButton({
  itemId,
  originalContent,
  compact = false,
}: {
  itemId: number;
  originalContent: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("compose");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function openModal(e: MouseEvent) {
    // Rows in the Knowledge list wrap this button's list item in a
    // <Link> -- stop the click from also triggering navigation.
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  function reset() {
    setOpen(false);
    setStep("compose");
    setContent("");
    setNote("");
    setError(null);
  }

  function goToReview(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setStep("review");
  }

  function apply() {
    startTransition(async () => {
      const result = await teachAction({
        type: "correction",
        content: content.trim(),
        supersedes: itemId,
        note: note.trim() || undefined,
      });

      if (!result.ok) {
        const message = result.message ?? "Failed to submit correction.";
        setError(message);
        toast.push(message, "error");
        return;
      }

      toast.push(`Correction applied -- #${itemId} superseded.`, "success");
      router.refresh();
      reset();
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        title="Correct this item"
        aria-label={compact ? `Correct knowledge #${itemId}` : undefined}
        className={
          compact
            ? "rounded-lg border border-border-default p-1.5 text-text-muted hover:border-accent/40 hover:text-accent-strong"
            : "flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-accent-strong"
        }
      >
        <PenSquare size={compact ? 13 : 12} aria-hidden />
        {!compact && "Correct"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={reset}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="correct-dialog-title"
            className="w-full max-w-lg rounded-xl border border-border-default bg-bg-elevated p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="correct-dialog-title"
              className="flex items-center gap-1.5 text-sm font-semibold text-text-primary"
            >
              <PenSquare size={14} aria-hidden /> Correct knowledge #{itemId}
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Writes a new, reviewed Correction that supersedes the original -- the original
              is preserved (deactivated, not deleted or overwritten) and stays available via
              the Deactivated filter.
            </p>

            {step === "compose" ? (
              <form onSubmit={goToReview} className="mt-4 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary">Original</label>
                  <p className="mt-1 rounded-lg border border-border-subtle bg-bg-base p-2.5 text-sm text-text-muted line-through">
                    {originalContent}
                  </p>
                </div>
                <div>
                  <label htmlFor="correction-content" className="text-xs font-medium text-text-secondary">
                    Correction
                  </label>
                  <textarea
                    id="correction-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="What should this actually say?"
                    className="mt-1 w-full rounded-lg border border-border-default bg-bg-base p-2.5 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor="correction-note" className="text-xs font-medium text-text-secondary">
                    Reason (optional)
                  </label>
                  <input
                    id="correction-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. confirmed via live feed replay"
                    className="mt-1 w-full rounded-lg border border-border-default bg-bg-base px-2.5 py-2 text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div className="mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!content.trim()}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
                  >
                    Review Correction
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-lg border border-status-attention/30 bg-status-attention/5 p-3">
                  <p className="text-xs font-medium text-status-attention">Review before applying</p>
                  <div className="mt-2 flex items-start gap-2 text-sm">
                    <span className="text-text-muted line-through">{originalContent}</span>
                    <ArrowRight size={14} className="mt-0.5 shrink-0 text-text-muted" aria-hidden />
                    <span className="text-text-primary">{content}</span>
                  </div>
                  {note && (
                    <p className="mt-2 text-xs text-text-secondary">
                      <span className="text-text-muted">Reason: </span>
                      {note}
                    </p>
                  )}
                </div>
                {error && <p className="text-xs text-status-problem">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setStep("compose")}
                    className="rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
                  >
                    Back
                  </button>
                  <button
                    onClick={apply}
                    disabled={pending}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
                  >
                    {pending ? "Applying..." : "Apply Correction"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
