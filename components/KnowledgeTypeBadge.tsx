const CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  fact: { icon: "📌", label: "Fact", color: "#3498db" },
  rule: { icon: "📜", label: "Rule", color: "#2ecc71" },
  correction: { icon: "✏️", label: "Correction", color: "#e67e22" },
  state: { icon: "🎯", label: "State", color: "#9b59b6" },
};

export function KnowledgeTypeBadge({ type }: { type: string }) {
  const cfg = CONFIG[type] ?? { icon: "🧠", label: type, color: "#6b7185" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, background: `color-mix(in srgb, ${cfg.color} 15%, transparent)` }}
    >
      <span aria-hidden>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
