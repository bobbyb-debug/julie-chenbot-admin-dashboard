import { AlertTriangle, Inbox, PlugZap, type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-default py-10 text-center">
      <Icon size={22} strokeWidth={1.75} className="text-text-muted" aria-hidden />
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {hint && <p className="max-w-sm text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-status-problem/30 bg-status-problem/5 py-10 text-center">
      <AlertTriangle size={22} strokeWidth={1.75} className="text-status-problem" aria-hidden />
      <p className="text-sm font-medium text-status-problem">{title}</p>
      {detail && <p className="max-w-md text-xs text-text-muted">{detail}</p>}
    </div>
  );
}

export function JulieOfflineState({ detail }: { detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-status-attention/30 bg-status-attention/5 py-10 text-center">
      <PlugZap size={22} strokeWidth={1.75} className="text-status-attention" aria-hidden />
      <p className="text-sm font-medium text-status-attention">Julie is offline</p>
      <p className="max-w-md text-xs text-text-muted">
        {detail ?? "The dashboard can't reach Julie's admin API right now. The dashboard itself is fine — this only affects live data."}
      </p>
    </div>
  );
}
