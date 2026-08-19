import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { listAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { isJulieConfigured } from "@/lib/julie-client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, hasRole } from "@/lib/rbac";
import { listUsers } from "@/lib/users";
import { UserManagement } from "./UserManagement";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession("viewer");
  const isAdmin = hasRole(session.role, "admin");

  const audit = listAudit(50);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted">Users, permissions, configuration, and audit history.</p>
      </div>

      <Card title="Your Access">
        <p className="text-sm text-text-primary">{ROLE_LABELS[session.role]}</p>
        <p className="mt-1 text-xs text-text-muted">{ROLE_DESCRIPTIONS[session.role]}</p>
      </Card>

      {isAdmin && (
        <Card title="Users" subtitle="Roles: Viewer (read-only), Moderator (teach/correct), Admin (full access)">
          <UserManagement users={listUsers()} currentUserId={session.sub} />
        </Card>
      )}

      {isAdmin && (
        <Card title="Configuration" subtitle="Presence only -- values are never shown here">
          <ul className="flex flex-col gap-1.5 text-sm">
            <ConfigRow name="JULIE_API_URL + JULIE_API_KEY" ok={isJulieConfigured()} />
            <ConfigRow name="SESSION_SECRET" ok={Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)} />
          </ul>
        </Card>
      )}

      <Card title="Audit Log" subtitle="Every dashboard action that changed production data or account access">
        {audit.length === 0 ? (
          <EmptyState title="No audit entries yet" />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {audit.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-sm">
                <div>
                  <span className="font-medium text-text-primary">{entry.actor_email}</span>{" "}
                  <span className="text-text-secondary">{entry.action.replace(/_/g, " ")}</span>
                  {entry.object && <span className="text-text-muted"> · {entry.object}</span>}
                  {entry.detail && <p className="text-xs text-text-muted">{entry.detail}</p>}
                </div>
                <div className="shrink-0 text-right text-xs">
                  <span className={entry.result === "success" ? "text-status-healthy" : "text-status-problem"}>
                    {entry.result}
                  </span>
                  <p className="text-text-muted">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ConfigRow({ name, ok }: { name: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="font-mono text-xs text-text-secondary">{name}</span>
      <span className={ok ? "text-status-healthy" : "text-status-problem"}>{ok ? "✓ Set" : "✕ Missing"}</span>
    </li>
  );
}
