"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/Card";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import {
  batchApplyAction,
  batchPlanAction,
  stateApplyAction,
  statePlanAction,
} from "../actions";
import type { ApplyResponse, PlanResponse } from "@/lib/julie-types";

type Mode = "batch" | "state";

const PLACEHOLDERS: Record<Mode, string> = {
  batch: `FACT: Yash has won several competitions.\nRULE: Never invent live-feed information.\nSTATE: HOH = Yash\nSTATE: NOMINEES = Angela, Dee`,
  state: `HOH: Yash\nNOMINEES: Angela, Haley, Kamu\nVETO_WINNER: Yash`,
};

export function TeachWorkspace({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function switchMode(next: Mode) {
    setMode(next);
    setPlan(null);
    setApplyResult(null);
    setError(null);
    setText("");
  }

  function preview() {
    setError(null);
    setApplyResult(null);
    startTransition(async () => {
      const result =
        mode === "batch" ? await batchPlanAction(text) : await statePlanAction(text, reason || undefined);

      if (!result.ok || !result.data) {
        setError(result.message ?? "Failed to build preview.");
        setPlan(null);
        return;
      }

      setPlan(result.data);
      setSelected(new Set(result.data.valid.map((line) => line.line_number)));
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
    if (!plan) return;
    setError(null);
    startTransition(async () => {
      const lineNumbers = Array.from(selected);
      const result =
        mode === "batch"
          ? await batchApplyAction(text, lineNumbers)
          : await stateApplyAction(text, reason || undefined, lineNumbers);

      if (!result.ok || !result.data) {
        setError(result.message ?? "Failed to apply changes.");
        return;
      }

      setApplyResult(result.data);
      setPlan(null);
      setText("");
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
            ? "One FACT:, RULE:, or STATE: instruction per line. A STATE line here records taught knowledge but does not immediately change live Game State -- use Update State for that."
            : 'One "TOPIC: value" per line, e.g. "HOH: Yash". Recognized topics (HOH, NOMINEES, VETO_WINNER, HAVE_NOTS) update live Game State immediately.'
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
            onClick={preview}
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
        <Card title="✅ Applied" className="border-status-healthy/40">
          <p className="text-sm text-text-secondary">
            Wrote {applyResult.written.length} item(s).
            {applyResult.applied_topics && applyResult.applied_topics.length > 0 && (
              <> Live state changed: {applyResult.applied_topics.join(", ")}.</>
            )}
          </p>
        </Card>
      )}

      {plan && (
        <Card title="Review" subtitle="Select or deselect lines, then apply. Nothing changes until you do.">
          {plan.conflicts.length > 0 && (
            <div className="mb-4 rounded-lg border border-status-attention/30 bg-status-attention/5 p-3">
              <p className="mb-2 text-xs font-medium text-status-attention">⚠️ Potential changes</p>
              <ul className="flex flex-col gap-1 text-xs text-text-secondary">
                {plan.conflicts.map((c, i) => (
                  <li key={i}>
                    <strong>{c.topic}</strong>: {c.current_value ?? "(not set)"} → {c.new_value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.valid.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing valid to apply.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {plan.valid.map((line) => (
                <li key={line.line_number} className="flex items-start gap-3 rounded-lg border border-border-subtle p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(line.line_number)}
                    onChange={() => toggleLine(line.line_number)}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {line.type && <KnowledgeTypeBadge type={line.type} />}
                      {line.topic && (
                        <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                          {line.topic}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-primary">{line.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {plan.invalid.length > 0 && (
            <div className="mt-4 rounded-lg border border-status-problem/30 bg-status-problem/5 p-3">
              <p className="mb-1 text-xs font-medium text-status-problem">❌ Could not parse</p>
              <ul className="flex flex-col gap-1 text-xs text-text-secondary">
                {plan.invalid.map((line) => (
                  <li key={line.line_number}>
                    Line {line.line_number}: {line.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setPlan(null)}
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
