import { BookOpen, HelpCircle, PenSquare, ScrollText, Target, type LucideIcon } from "lucide-react";

const CONFIG: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  fact: { icon: BookOpen, label: "Fact", color: "#3498db" },
  rule: { icon: ScrollText, label: "Rule", color: "#2ecc71" },
  correction: { icon: PenSquare, label: "Correction", color: "#e67e22" },
  state: { icon: Target, label: "State", color: "#9b59b6" },
};

export function KnowledgeTypeBadge({ type }: { type: string }) {
  const cfg = CONFIG[type] ?? { icon: HelpCircle, label: type, color: "#6b7185" };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, background: `color-mix(in srgb, ${cfg.color} 15%, transparent)` }}
    >
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      {cfg.label}
    </span>
  );
}
