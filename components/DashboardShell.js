"use client";

import { useEffect, useState } from "react";
import SignOutButton from "./SignOutButton";
import VerifyEmailBanner from "./VerifyEmailBanner";
import DashboardNav from "./DashboardNav";
import Logo from "./Logo";
import Header from "./chrome/Header";
import { IconClose } from "./icons";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./dashboard.module.css";

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Prevents the page behind the drawer from scrolling while it's open.
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape closes the drawer — matching the backdrop and close-button
  // affordances, so there are three consistent ways out.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
        menuOpen={open}
        onMenuToggle={() => setOpen((v) => !v)}
        tenantSlug={tenantSlug}
        user={user}
      />

      <div className={styles.shellBody}>
        {open && (
          <div
            className={styles.sidebarBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside className={styles.sidebar} data-open={open}>
          <div className={styles.sidebarCloseRow}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() => setOpen(false)}
              aria-label={t("nav.closeMenu")}
            >
              <IconClose size={18} />
            </button>
          </div>
          <a href={`/t/${tenantSlug}/settings`} className={styles.brand} title={t("sidebar.companySettings")}>
            {brandMark}
            <span className={styles.brandTenant}>{tenantName || tenantSlug}</span>
          </a>
          <DashboardNav
            tenantSlug={tenantSlug}
            unreadLeads={unreadLeads}
            workspaceItems={workspaceItems}
            role={role}
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
