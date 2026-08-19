import type { LucideIcon } from "lucide-react";

/** A small icon + text pairing for Card titles, replacing decorative
 * emoji with a consistent, restrained icon set. */
export function IconTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon size={14} strokeWidth={2.25} aria-hidden />
      {children}
    </span>
  );
}
