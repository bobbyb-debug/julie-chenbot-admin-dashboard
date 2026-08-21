"use client";

import { Menu } from "lucide-react";
import { useMobileNav } from "./MobileNavProvider";

/** Hamburger trigger for the off-canvas sidebar on narrow viewports --
 * hidden at md+ where the sidebar is always visible (see
 * components/Sidebar.tsx). Lives in TopBar so it's available on every
 * dashboard page without each page needing to render it itself. */
export function MobileMenuButton() {
  const { setOpen } = useMobileNav();

  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Open navigation menu"
      className="shrink-0 rounded-lg p-1.5 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary md:hidden"
    >
      <Menu size={20} aria-hidden />
    </button>
  );
}
