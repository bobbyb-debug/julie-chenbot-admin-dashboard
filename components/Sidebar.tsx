"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/dashboard/game-state", label: "Game State", icon: "🎮" },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: "🧠" },
  { href: "/dashboard/sources", label: "Sources", icon: "📡" },
  { href: "/dashboard/activity", label: "Activity", icon: "📋" },
  { href: "/dashboard/diagnostics", label: "Diagnostics", icon: "🔧" },
  { href: "/dashboard/discord", label: "Discord", icon: "💬" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col gap-1 border-r border-border-subtle bg-bg-surface p-3">
      <div className="mb-4 px-2 pt-2">
        <div className="text-sm font-semibold tracking-tight text-text-primary">Julie ChenBot</div>
        <div className="text-xs text-text-muted">Control Room</div>
      </div>

      {NAV.map((item) => {
        const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
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
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
