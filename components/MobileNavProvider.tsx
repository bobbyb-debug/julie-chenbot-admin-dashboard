"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const MobileNavContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(
  null,
);

/** Shared open/closed state for the mobile off-canvas sidebar (see
 * components/Sidebar.tsx), so the hamburger trigger that opens it
 * (components/MobileMenuButton.tsx, rendered inside TopBar) and the
 * drawer itself (rendered as a sibling of TopBar in
 * app/dashboard/layout.tsx) can agree on it without either needing to
 * be an ancestor of the other. */
export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Closes the drawer on navigation -- otherwise it stays open over
  // the page you just tapped through to. Adjusted during render
  // (React's documented pattern for resetting state when a value
  // changes: https://react.dev/learn/you-might-not-need-an-effect)
  // rather than in a useEffect, which would cause an extra
  // commit-then-recommit render pass for the same result.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav() must be used within <MobileNavProvider>.");
  }
  return ctx;
}
