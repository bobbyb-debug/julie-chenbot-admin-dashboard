import { getDb } from "./db.ts";

export interface AuditEntry {
  id: number;
  actor_email: string;
  actor_role: string;
  action: string;
  object: string | null;
  detail: string | null;
  result: "success" | "failure";
  created_at: string;
}

export interface AuditActor {
  email: string;
  role: string;
}

export function recordAudit(
  actor: AuditActor,
  entry: {
    action: string;
    object?: string;
    detail?: string;
    result: "success" | "failure";
  },
): void {
  getDb()
    .prepare(
      `INSERT INTO audit_log (actor_email, actor_role, action, object, detail, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      actor.email,
      actor.role,
      entry.action,
      entry.object ?? null,
      entry.detail ?? null,
      entry.result,
      new Date().toISOString(),
    );
}

export function listAudit(limit = 200): AuditEntry[] {
  const rows = getDb()
    .prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?")
    .all(limit) as unknown as AuditEntry[];

  // node:sqlite rows aren't plain objects -- rebuild them plainly so
  // they're safe to pass across any Server -> Client boundary.
  return rows.map((row) => ({
    id: row.id,
    actor_email: row.actor_email,
    actor_role: row.actor_role,
    action: row.action,
    object: row.object,
    detail: row.detail,
    result: row.result,
    created_at: row.created_at,
  }));
}
