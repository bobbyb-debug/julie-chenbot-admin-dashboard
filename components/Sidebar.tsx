"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Gamepad2,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@/lib/session";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/game-state", label: "Game State", icon: Gamepad2 },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: Sparkles },
  { href: "/dashboard/sources", label: "Sources", icon: Radio },
  { href: "/dashboard/diagnostics", label: "Diagnostics", icon: Wrench },
  { href: "/dashboard/discord", label: "Discord", icon: MessageSquare },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  julieOnline,
  engineRunning,
  role,
  environment,
}: {
  julieOnline: boolean | null;
  engineRunning: boolean | null;
  role: Role;
  environment: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col border-r border-border-subtle bg-bg-surface p-3">
      <div className="mb-4 px-2 pt-2">
        <div className="text-sm font-semibold uppercase tracking-wide text-text-primary">
          Julie ChenBot
        </div>
        <div className="text-[11px] font-medium uppercase tracking-widest text-accent-strong">
          Admin Control Room
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-accent/15 font-medium text-accent-strong"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <Icon size={16} strokeWidth={2} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-3 text-xs">
        <StatusRow label="API" ok={julieOnline} />
        <StatusRow label="Bot" ok={engineRunning} />
        <div className="flex items-center justify-between px-2 text-text-muted">
          <span>Environment</span>
          <span className="font-mono text-[11px] text-text-secondary">{environment}</span>
        </div>
        <div className="flex items-center justify-between px-2 text-text-muted">
          <span>Role</span>
          <span className="text-text-secondary">{ROLE_LABELS[role]}</span>
        </div>
      </div>
    </nav>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean | null }) {
  const color = ok === null ? "var(--text-muted)" : ok ? "var(--status-healthy)" : "var(--status-problem)";
  const text = ok === null ? "unknown" : ok ? "online" : "offline";
  return (
    <div className="flex items-center justify-between px-2 text-text-muted">
      <span>{label}</span>
      <span className="flex items-center gap-1.5 text-text-secondary">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
        {text}
      </span>
    </div>
  );
}
