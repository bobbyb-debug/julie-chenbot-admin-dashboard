import { logoutAction } from "@/app/dashboard/actions";
import { MobileMenuButton } from "@/components/MobileMenuButton";
import { RefreshControl } from "@/components/RefreshControl";
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
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-bg-surface px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <MobileMenuButton />
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
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
        <span className="truncate text-text-secondary">
          Julie is{" "}
          <span className="font-medium text-text-primary">
            {julieOnline === null ? "checking..." : julieOnline ? "online" : "offline"}
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <RefreshControl />
        <div className="hidden text-right text-xs leading-tight sm:block">
          <div className="max-w-[12rem] truncate font-medium text-text-primary" title={email}>
            {email}
          </div>
          <div className="text-text-muted">{ROLE_LABELS[role]}</div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-border-default px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-bg-hover hover:text-text-primary sm:px-3"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
