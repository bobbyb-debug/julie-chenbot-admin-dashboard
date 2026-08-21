"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Card } from "@/components/Card";
import { IconTitle } from "@/components/IconTitle";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import { BatchLineReviewBadge } from "@/components/BatchLineReviewBadge";
import { useToast } from "@/components/ToastProvider";
import { defaultSelectedLines } from "@/lib/batch-review";
import {
  batchApplyAction,
  batchPlanAction,
  stateApplyAction,
  statePlanAction,
  type BatchPreview,
} from "../actions";
import type { ApplyResponse } from "@/lib/julie-types";

type Mode = "batch" | "state";

const PLACEHOLDERS: Record<Mode, string> = {
  batch: `FACT: Yash has won several competitions.\nRULE: Never invent live-feed information.\nSTATE: HOH = Yash\nSTATE: NOMINEES = Angela, Dee`,
  state: `HOH: Yash\nNOMINEES: Angela, Haley, Kamu\nVETO_WINNER: Yash`,
};

/** Human-readable summary chips above the review list, e.g. "12 new ·
 * 3 possible duplicates · 1 contradiction" -- only non-zero buckets
 * are shown, and the numbers are always the real counts for whatever
 * was just pasted (see lib/batch-review.ts summarizeBatchReview()). */
function ReviewSummaryBar({ summary }: { summary: BatchPreview["summary"] }) {
  const parts: { singular: string; plural: string; count: number; className: string }[] = [
    { singular: "new entry", plural: "new entries", count: summary.new, className: "text-status-healthy" },
    { singular: "state update", plural: "state updates", count: summary.stateUpdates, className: "text-accent-strong" },
    { singular: "unchanged state", plural: "unchanged states", count: summary.stateUnchanged, className: "text-text-muted" },
    { singular: "possible duplicate", plural: "possible duplicates", count: summary.possibleDuplicates, className: "text-status-attention" },
    { singular: "possible overlap", plural: "possible overlaps", count: summary.possibleOverlaps, className: "text-status-attention" },
    { singular: "contradiction", plural: "contradictions", count: summary.contradictions, className: "text-status-problem" },
  ].filter((p) => p.count > 0);

  if (parts.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {parts.map((p) => (
        <span key={p.singular} className={`font-medium ${p.className}`}>
          {p.count} {p.count === 1 ? p.singular : p.plural}
        </span>
      ))}
    </div>
  );
}

export function TeachWorkspace({ initialMode }: { initialMode: Mode }) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<BatchPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function switchMode(next: Mode) {
    setMode(next);
    setPreview(null);
    setApplyResult(null);
    setError(null);
    setText("");
  }

  function runPreview() {
    setError(null);
    setApplyResult(null);
    startTransition(async () => {
      const result =
        mode === "batch" ? await batchPlanAction(text) : await statePlanAction(text, reason || undefined);

      if (!result.ok || !result.data) {
        const message = result.message ?? "Failed to build preview.";
        setError(message);
        setPreview(null);
        toast.push(message, "error");
        return;
      }

      setPreview(result.data);
      setSelected(new Set(defaultSelectedLines(result.data.reviews)));
    });
  }

  function toggleLine(lineNumber: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lineNumber)) next.delete(lineNumber);
      else next.add(lineNumber);
      return next;
    });
  }

  function apply() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const lineNumbers = Array.from(selected);
      const result =
        mode === "batch"
          ? await batchApplyAction(text, lineNumbers)
          : await stateApplyAction(text, reason || undefined, lineNumbers);

      if (!result.ok || !result.data) {
        const message = result.message ?? "Failed to apply changes.";
        setError(message);
        toast.push(message, "error");
        return;
      }

      setApplyResult(result.data);
      setPreview(null);
      setText("");
      toast.push(
        mode === "batch"
          ? `Taught ${result.data.written.length} item(s).`
          : `Updated ${result.data.written.length} item(s).${
              result.data.applied_topics?.length
                ? ` Official state changed: ${result.data.applied_topics.join(", ")}.`
                : ""
            }`,
        "success",
      );
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
        <ModeTab label="Batch Teaching" active={mode === "batch"} onClick={() => switchMode("batch")} />
        <ModeTab label="Update State" active={mode === "state"} onClick={() => switchMode("state")} />
      </div>

      <Card
        title={mode === "batch" ? "Paste facts, rules, and state" : "Set current game state"}
        subtitle={
          mode === "batch"
            ? "One FACT:, RULE:, or STATE: instruction per line -- a STATE line here takes effect immediately, same as Update State. Use Update State when you're only setting HOH, Nominees, Veto Winner, Veto Used, or Have-Nots; use Batch Teaching for a mixed paste of facts, rules, and state together."
            : 'One "TOPIC: value" per line, e.g. "HOH: Yash". These become Julie\'s official game facts immediately -- /hoh, /nominees, and /veto reflect them right away, and automated live-feed parsing can never overwrite what you set here.'
        }
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDERS[mode]}
          rows={6}
          className="w-full rounded-lg border border-border-default bg-bg-base p-3 font-mono text-sm text-text-primary outline-none focus:border-accent"
        />

        {mode === "state" && (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional) -- e.g. Diamond Veto ceremony"
            className="mt-3 w-full rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
        )}

        <div className="mt-3 flex justify-end">
          <button
            onClick={runPreview}
            disabled={pending || !text.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {pending ? "Working..." : "Preview Changes"}
          </button>
        </div>
      </Card>

      {error && (
        <p className="rounded-lg border border-status-problem/30 bg-status-problem/10 px-3 py-2 text-sm text-status-problem">
          {error}
        </p>
      )}

      {applyResult && (
        <Card title={<IconTitle icon={CheckCircle2}>Applied</IconTitle>} className="border-status-healthy/40">
          <p className="text-sm text-text-secondary">
            Wrote {applyResult.written.length} item(s).
            {applyResult.applied_topics && applyResult.applied_topics.length > 0 && (
              <> Official state changed: {applyResult.applied_topics.join(", ")}.</>
            )}
          </p>
        </Card>
      )}

      {preview && (
        <Card
          title="Review"
          subtitle="Select or deselect lines, then apply. Nothing changes until you do -- new and state-change lines are pre-selected; duplicates, overlaps, and contradictions are not."
        >
          <ReviewSummaryBar summary={preview.summary} />

          {preview.plan.conflicts.length > 0 && (
            <div className="mb-4 rounded-lg border border-status-attention/30 bg-status-attention/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-status-attention">
                <AlertTriangle size={13} aria-hidden /> Potential state changes
              </p>
              <ul className="flex flex-col gap-1 text-xs text-text-secondary">
                {preview.plan.conflicts.map((c, i) => (
                  <li key={i}>
                    <strong>{c.topic}</strong>: {c.current_value ?? "(not set)"} → {c.new_value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.plan.valid.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing valid to apply.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {preview.plan.valid.map((line) => {
                const review = preview.reviews.find((r) => r.line_number === line.line_number);
                return (
                  <li key={line.line_number} className="flex items-start gap-3 rounded-lg border border-border-subtle p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(line.line_number)}
                      onChange={() => toggleLine(line.line_number)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {line.type && <KnowledgeTypeBadge type={line.type} />}
                        {line.topic && (
                          <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                            {line.topic}
                          </span>
                        )}
                        {review && <BatchLineReviewBadge classification={review.classification} />}
                      </div>
                      <p className="mt-1 text-sm text-text-primary">{line.content}</p>

                      {review?.previousValue !== undefined && review.previousValue !== null && (
                        <p className="mt-1 text-xs text-text-muted">
                          Current value: <span className="text-text-secondary">{review.previousValue}</span>
                        </p>
                      )}

                      {mode === "batch" && review?.isDedicatedField && (
                        <p className="mt-1 text-xs text-accent-strong">
                          {line.topic} has a dedicated field on Update State -- this line takes effect
                          immediately either way, Update State is just the more direct workflow for it.
                        </p>
                      )}

                      {review?.matchedContent && (
                        <p className="mt-1 text-xs text-text-muted">
                          {review.matchedItemId ? (
                            <>
                              Similar to{" "}
                              <a
                                href={`/dashboard/knowledge/${review.matchedItemId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent-strong hover:underline"
                              >
                                Knowledge #{review.matchedItemId}
                              </a>
                              :{" "}
                            </>
                          ) : (
                            <>Same as line {review.matchedLineNumber} above: </>
                          )}
                          <span className="italic text-text-secondary">&ldquo;{review.matchedContent}&rdquo;</span>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {preview.plan.invalid.length > 0 && (
            <div className="mt-4 rounded-lg border border-status-problem/30 bg-status-problem/5 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-status-problem">
                <XCircle size={13} aria-hidden /> Could not parse
              </p>
              <ul className="flex flex-col gap-1 text-xs text-text-secondary">
                {preview.plan.invalid.map((line) => (
                  <li key={line.line_number}>
                    Line {line.line_number}: {line.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setPreview(null)}
              className="rounded-lg border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              disabled={pending || selected.size === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
            >
              {pending ? "Applying..." : `Apply ${selected.size} Selected`}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
        active ? "bg-accent/20 text-accent-strong" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}
