"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction, setDisabledAction, setRoleAction } from "./actions";
import type { Role } from "@/lib/session";
import type { UserRow } from "@/lib/users";
import { ROLE_LABELS } from "@/lib/rbac";

export function UserManagement({ users, currentUserId }: { users: UserRow[]; currentUserId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function changeRole(userId: number, role: Role) {
    setError(null);
    startTransition(async () => {
      const result = await setRoleAction(userId, role);
      if (!result.ok) setError(result.message ?? "Failed.");
      router.refresh();
    });
  }

  function toggleDisabled(userId: number, disabled: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setDisabledAction(userId, disabled);
      if (!result.ok) setError(result.message ?? "Failed.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-status-problem/30 bg-status-problem/10 px-3 py-2 text-sm text-status-problem">
          {error}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-border-subtle">
        {users.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{user.email}</span>
                {user.id === currentUserId && <span className="text-xs text-text-muted">(you)</span>}
                {!!user.disabled && (
                  <span className="rounded bg-status-problem/10 px-1.5 py-0.5 text-[10px] font-medium text-status-problem">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">Created {new Date(user.created_at).toLocaleDateString()}</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={user.role}
                disabled={pending}
                onChange={(e) => changeRole(user.id, e.target.value as Role)}
                className="rounded-lg border border-border-default bg-bg-base px-2 py-1 text-xs text-text-primary"
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <button
                disabled={pending}
                onClick={() => toggleDisabled(user.id, !user.disabled)}
                className="rounded-lg border border-border-default px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              >
                {user.disabled ? "Enable" : "Disable"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {formOpen ? (
        <CreateUserForm onDone={() => { setFormOpen(false); router.refresh(); }} />
      ) : (
        <button
          onClick={() => setFormOpen(true)}
          className="self-start rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover"
        >
          + Add user
        </button>
      )}
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await createUserAction(formData);
          if (!result.ok) {
            setError(result.message ?? "Failed.");
            return;
          }
          onDone();
        })
      }
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border-subtle bg-bg-base p-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-muted">Email</label>
        <input name="email" type="email" required className="rounded-lg border border-border-default bg-bg-surface px-2 py-1.5 text-sm text-text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-muted">Password (12+ chars)</label>
        <input name="password" type="password" required minLength={12} className="rounded-lg border border-border-default bg-bg-surface px-2 py-1.5 text-sm text-text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-muted">Role</label>
        <select name="role" defaultValue="viewer" className="rounded-lg border border-border-default bg-bg-surface px-2 py-1.5 text-sm text-text-primary">
          <option value="viewer">Viewer</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50">
        {pending ? "Creating..." : "Create"}
      </button>
      {error && <p className="w-full text-xs text-status-problem">{error}</p>}
    </form>
  );
}
