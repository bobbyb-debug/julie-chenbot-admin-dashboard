export type Status = "healthy" | "attention" | "problem" | "unknown";

const CONFIG: Record<Status, { label: string; icon: string; color: string; bg: string }> = {
  healthy: { label: "Healthy", icon: "●", color: "var(--status-healthy)", bg: "rgba(34,197,94,0.12)" },
  attention: { label: "Attention Needed", icon: "▲", color: "var(--status-attention)", bg: "rgba(234,179,8,0.12)" },
  problem: { label: "Problem", icon: "✕", color: "var(--status-problem)", bg: "rgba(239,68,68,0.12)" },
  unknown: { label: "Unknown", icon: "?", color: "var(--text-muted)", bg: "rgba(107,113,133,0.12)" },
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const cfg = CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span aria-hidden>{cfg.icon}</span>
      {label ?? cfg.label}
    </span>
  );
}
