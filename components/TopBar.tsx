import { logoutAction } from "@/app/dashboard/actions";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@/lib/session";

export function TopBar({
  email,
  role,
  julieOnline,
}: {
  email: string;
  role: Role;
  julieOnline: boolean | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-5">
      <div className="flex items-center gap-2 text-sm">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background:
              julieOnline === null
                ? "var(--text-muted)"
                : julieOnline
                  ? "var(--status-healthy)"
                  : "var(--status-problem)",
          }}
          aria-hidden
        />
        <span className="text-text-secondary">
          Julie is{" "}
          <span className="font-medium text-text-primary">
            {julieOnline === null ? "checking..." : julieOnline ? "online" : "offline"}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-xs leading-tight">
          <div className="font-medium text-text-primary">{email}</div>
          <div className="text-text-muted">{ROLE_LABELS[role]}</div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-border-default px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
