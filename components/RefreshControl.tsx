"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Periodic + manual refresh for monitoring pages. Re-runs the current
 * route's server components (router.refresh()) rather than a full page
 * reload, pauses the automatic interval while the tab is hidden (no
 * point hammering the API for a tab nobody's looking at), and shows
 * "Last updated Xs ago" so a moderator can tell stale data from fresh. */
export function RefreshControl({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => Date.now());
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doRefresh = () => {
    setPending(true);
    router.refresh();
    setLastRefreshedAt(Date.now());
    if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    pendingTimeout.current = setTimeout(() => setPending(false), 600);
  };

  useEffect(() => {
    const clockId = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(clockId);
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(doRefresh, intervalMs);
    };
    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  const secondsAgo = Math.max(0, Math.round((nowTick - lastRefreshedAt) / 1000));
  const label = secondsAgo < 2 ? "just now" : `${secondsAgo}s ago`;

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span>Updated {label}</span>
      <button
        onClick={doRefresh}
        disabled={pending}
        aria-label="Refresh now"
        title="Refresh now"
        className="rounded-md border border-border-default p-1 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary disabled:opacity-50"
      >
        <RefreshCw size={13} strokeWidth={2} className={pending ? "animate-spin" : ""} aria-hidden />
      </button>
    </div>
  );
}
