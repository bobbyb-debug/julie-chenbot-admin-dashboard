type Severity = "debug" | "info" | "notice" | "warning" | "important" | "critical";

const LABELS: Record<Severity, string> = {
  debug: "Debug",
  info: "Info",
  notice: "Notice",
  warning: "Warning",
  important: "Important",
  critical: "Critical",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const key = (severity as Severity) in LABELS ? (severity as Severity) : "info";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color: `var(--severity-${key})`,
        background: `color-mix(in srgb, var(--severity-${key}) 15%, transparent)`,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: `var(--severity-${key})` }}
        aria-hidden
      />
      {LABELS[key]}
    </span>
  );
}
