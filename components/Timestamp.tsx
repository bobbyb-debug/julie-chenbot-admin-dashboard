"use client";

import { useSyncExternalStore } from "react";
import { formatTimestamp } from "@/lib/format";

function subscribe() {
  // No real external store to subscribe to -- this only exists to
  // give useSyncExternalStore a snapshot that legitimately differs
  // between server and client (see useIsClient below), so there is
  // nothing to notify a listener about; the noop unsubscribe is the
  // required shape.
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** True only once this render has actually happened in the browser.
 * Deliberately built on useSyncExternalStore rather than
 * `useEffect(() => setMounted(true))`: that effect-driven version
 * causes the exact same cascading extra render this hook does, but
 * flagged by eslint-plugin-react-hooks as a setState-in-effect
 * anti-pattern, whereas useSyncExternalStore's getServerSnapshot /
 * getSnapshot split is the API React documents for this. */
function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

/** Renders an absolute timestamp in the *viewer's* local timezone.
 *
 * Every page that shows one of these is a Next.js Server Component
 * (see app/dashboard/**\/page.tsx) rendered on Railway, not in the
 * viewer's browser. `formatTimestamp()` with no explicit timeZone
 * resolves to whatever machine runs it -- so calling it directly from
 * a server component silently formats in the *server's* timezone
 * (UTC on Railway), not the admin's. That's the bug this component
 * fixes: it only formats once rendering has actually happened in the
 * browser, so `toLocaleString()` picks up the browser's real local
 * timezone automatically (no hardcoded America/Chicago, no
 * server-side guess), and the instant is parsed and converted exactly
 * once -- no manual offset math that could double-apply.
 *
 * Renders a blank placeholder for the one server-rendered pass rather
 * than formatting in the server's zone and correcting it after
 * hydration -- a brief blank span is a fair trade for never showing
 * the wrong timezone at all, even momentarily. */
export function Timestamp({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const isClient = useIsClient();

  return (
    <span className={className} suppressHydrationWarning>
      {isClient ? formatTimestamp(value) : " "}
    </span>
  );
}
