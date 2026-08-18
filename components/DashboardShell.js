"use client";

import { useEffect, useRef, useState } from "react";
import SignOutButton from "./SignOutButton";
import VerifyEmailBanner from "./VerifyEmailBanner";
import DashboardNav from "./DashboardNav";
import Logo from "./Logo";
import Header from "./chrome/Header";
import { IconClose } from "./icons";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./dashboard.module.css";
import Link from "@/components/i18n/Link";

// Wraps the sidebar + main content in a client component so the mobile
// drawer (open/closed) can be stateful, while the layout itself
// (app/t/[tenantSlug]/layout.js) stays a server component doing the data
// fetching.
//
// The shell is a column: a sticky product Header spans the full width, and
// the sidebar + main content sit below it. The header owns the drawer trigger
// (it replaced the old bespoke `.mobileTopBar`), which is why `open` lives
// here and is passed down rather than being header-local state.
export default function DashboardShell({
  tenantSlug,
  tenantName,
  logoMediaId,
  unreadLeads,
  workspaceItems,
  emailVerified,
  role,
  user,
  children,
}) {
  const t = useT();
  // Two intentionally separate booleans: this one drives the off-canvas nav
  // drawer only. The profile popover keeps its own state inside AvatarMenu
  // (via useMenu) — the two are never read from or toggled by a shared
  // function, so opening one can't ever be mistaken for the other.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    // Prevents the page behind the drawer from scrolling while it's open.
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Escape closes the drawer — matching the backdrop and close-button
  // affordances, so there are three consistent ways out.
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  // Move focus into the drawer when it opens, and back to the trigger when it
  // closes. Without this a keyboard or screen-reader user opens the menu and
  // their focus is still behind it, on the page they were trying to leave —
  // the nav is visible but unreachable, which is the same trap as not having
  // a menu at all.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const firstLink = drawerRef.current?.querySelector("a, button");
    firstLink?.focus();
  }, [isMobileMenuOpen]);

  // The nav links are plain <a> tags (full navigation), so on a normal click
  // the page reload already resets this state. bfcache breaks that: Safari
  // and Chrome can restore the exact prior JS state — drawer open, body
  // scroll locked — when the user hits Back/Forward instead of re-running
  // this component's mount logic. `pageshow` with `persisted: true` is the
  // one reliable signal that happened, so force the drawer shut then.
  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) setIsMobileMenuOpen(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const brandMark = logoMediaId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/media/${logoMediaId}`} alt="" className={styles.brandLogo} />
  ) : (
    <Logo href={null} markSize={24} iconOnly />
  );

  return (
    <div className={styles.shell}>
      <Header
        variant="app"
        menuOpen={isMobileMenuOpen}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        tenantSlug={tenantSlug}
        user={user}
      />

      <div className={styles.shellBody}>
        {isMobileMenuOpen && (
          <div
            className={styles.sidebarBackdrop}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          id="dashboard-drawer"
          className={styles.sidebar}
          data-open={isMobileMenuOpen}
          ref={drawerRef}
          // Only a dialog while it IS one. Above the breakpoint this is a
          // permanent sidebar, and announcing it as a modal dialog there
          // would be a lie to a screen reader.
          role={isMobileMenuOpen ? "dialog" : undefined}
          aria-modal={isMobileMenuOpen ? "true" : undefined}
          aria-label={isMobileMenuOpen ? t("sidebar.navigation") : undefined}
        >
          <div className={styles.sidebarCloseRow}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label={t("nav.closeMenu")}
            >
              <IconClose size={18} />
            </button>
          </div>
          <Link
            href={`/t/${tenantSlug}/settings`}
            className={styles.brand}
            title={t("sidebar.companySettings")}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {brandMark}
            <span className={styles.brandTenant}>{tenantName || tenantSlug}</span>
          </Link>
          <DashboardNav
            tenantSlug={tenantSlug}
            unreadLeads={unreadLeads}
            workspaceItems={workspaceItems}
            role={role}
            onNavigate={() => setIsMobileMenuOpen(false)}
          />
          <SignOutButton className={styles.signOutButton} />
        </aside>

        <main id="main-content" className={styles.main}>
          {!emailVerified && <VerifyEmailBanner />}
          {children}
        </main>
      </div>
    </div>
  );
}
