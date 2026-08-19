"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { julie, type CreateKnowledgeInput } from "@/lib/julie-client";
import type { ApplyResponse, PlanResponse } from "@/lib/julie-types";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}

export async function teachAction(input: {
  type: string;
  content: string;
  topic?: string;
  note?: string;
  supersedes?: number;
}): Promise<ActionResult> {
  const session = await requireSession("moderator");

  const body: CreateKnowledgeInput = {
    type: input.type,
    content: input.content,
    author_id: session.sub,
    topic: input.topic || null,
    note: input.note || null,
    supersedes: input.supersedes ?? null,
  };

  try {
    const item = await julie.createKnowledge(body);
    recordAudit(session, {
      action: "teach_knowledge",
      object: `knowledge#${item.id}`,
      detail: `${item.type}: ${item.content}`,
      result: "success",
    });
    revalidatePath("/dashboard/knowledge");
    revalidatePath("/dashboard/game-state");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to teach knowledge.";
    recordAudit(session, { action: "teach_knowledge", detail: message, result: "failure" });
    return { ok: false, message };
  }
}

export async function forgetAction(itemId: number): Promise<ActionResult> {
  const session = await requireSession("moderator");

  try {
    const result = await julie.forgetKnowledge(itemId);
    recordAudit(session, {
      action: "forget_knowledge",
      object: `knowledge#${itemId}`,
      result: result.forgotten ? "success" : "failure",
      detail: result.forgotten ? undefined : "already inactive or not found",
    });
    revalidatePath("/dashboard/knowledge");
    revalidatePath(`/dashboard/knowledge/${itemId}`);
    revalidatePath("/dashboard/game-state");
    return { ok: result.forgotten };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to deactivate knowledge.";
    recordAudit(session, { action: "forget_knowledge", object: `knowledge#${itemId}`, detail: message, result: "failure" });
    return { ok: false, message };
  }
}

export async function batchPlanAction(text: string): Promise<ActionResult<PlanResponse>> {
  await requireSession("moderator");
  try {
    const plan = await julie.batchPlan(text);
    return { ok: true, data: plan };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to build preview." };
  }
}

export async function batchApplyAction(
  text: string,
  lineNumbers: number[],
): Promise<ActionResult<ApplyResponse>> {
  const session = await requireSession("moderator");
  try {
    const result = await julie.batchApply(text, session.sub, lineNumbers);
    recordAudit(session, {
      action: "batch_teach",
      detail: `${result.written.length} item(s) written`,
      result: "success",
    });
    revalidatePath("/dashboard/knowledge");
    revalidatePath("/dashboard/game-state");
    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply batch.";
    recordAudit(session, { action: "batch_teach", detail: message, result: "failure" });
    return { ok: false, message };
  }
}

export async function statePlanAction(text: string, reason?: string): Promise<ActionResult<PlanResponse>> {
  await requireSession("moderator");
  try {
    const plan = await julie.statePlan(text, reason);
    return { ok: true, data: plan };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to build preview." };
  }
}

export async function stateApplyAction(
  text: string,
  reason: string | undefined,
  lineNumbers: number[],
): Promise<ActionResult<ApplyResponse>> {
  const session = await requireSession("moderator");
  try {
    const result = await julie.stateApply(text, session.sub, reason, lineNumbers);
    recordAudit(session, {
      action: "state_update",
      detail: `${result.applied_topics?.join(", ") || "no live state change"} (${result.written.length} item(s))`,
      result: "success",
    });
    revalidatePath("/dashboard/knowledge");
    revalidatePath("/dashboard/game-state");
    return { ok: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply state update.";
    recordAudit(session, { action: "state_update", detail: message, result: "failure" });
    return { ok: false, message };
  }
}
