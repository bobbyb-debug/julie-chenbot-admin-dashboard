export interface TimestampFormatOptions {
  /** IANA timezone (e.g. "America/Chicago", "UTC"). Omit to use the
   * runtime's own local timezone -- the browser's, when this runs
   * client-side (see components/Timestamp.tsx), which is what makes
   * conversion "automatic" for every viewer without hardcoding one
   * zone. Tests pass this explicitly so assertions never depend on
   * whatever timezone happens to be set on the machine running them. */
  timeZone?: string;
  locale?: string;
}

/** Formats an ISO timestamp (with "Z" or an explicit offset -- both
 * are unambiguous, so `new Date()` parses either as the single
 * instant it represents) into a short local date/time string.
 *
 * Parses the instant exactly once and lets Intl (via
 * Date#toLocaleString) do the UTC -> target-timezone conversion --
 * there is no manual offset math here to accidentally double-apply.
 * Never call this with an already-converted/local-looking string;
 * API timestamps must stay UTC end to end (see docs/API.md) and this
 * function is the one and only place that converts for display. */
export function formatTimestamp(
  value: string | null | undefined,
  options: TimestampFormatOptions = {},
): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(options.locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone,
  });
}

/** Relative time ("5m ago") is computed purely from epoch millisecond
 * differences, so -- unlike formatTimestamp -- it carries no timezone
 * dependency at all; the same "5m ago" is correct everywhere. `now`
 * defaults to the real clock but can be pinned in tests for a
 * deterministic result. */
export function formatRelative(
  value: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const seconds = Math.round((now - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatTimestamp(value);
}
