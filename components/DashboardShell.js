"use client";

import { useEffect, useState } from "react";
import SignOutButton from "./SignOutButton";
import VerifyEmailBanner from "./VerifyEmailBanner";
import DashboardNav from "./DashboardNav";
import Logo from "./Logo";
import { IconMenu, IconClose } from "./icons";
import styles from "./dashboard.module.css";

// Wraps the sidebar + main content in a client component so the mobile
// drawer (open/closed) can be stateful, while the layout itself
// (app/t/[tenantSlug]/layout.js) stays a server component doing the data
// fetching. Above the 780px breakpoint this renders exactly what used to be
// inline in the layout — the drawer mechanics are inert at desktop widths.
export default function DashboardShell({
  tenantSlug,
  tenantName,
  logoMediaId,
  unreadLeads,
  workspaceItems,
  emailVerified,
  children,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Prevents the page behind the drawer from scrolling while it's open.
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const brandMark = logoMediaId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/media/${logoMediaId}`} alt="" className={styles.brandLogo} />
  ) : (
    <Logo href={null} markSize={24} iconOnly />
  );

  return (
    <div className={styles.shell}>
      <div className={styles.mobileTopBar}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <IconMenu size={20} />
        </button>
        <a href={`/t/${tenantSlug}/settings`} className={styles.mobileBrand}>
          {logoMediaId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/media/${logoMediaId}`} alt="" className={styles.mobileBrandLogo} />
          ) : (
            <Logo href={null} markSize={20} iconOnly />
          )}
          <span>{tenantName || tenantSlug}</span>
        </a>
      </div>

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
            aria-label="Close menu"
          >
            <IconClose size={18} />
          </button>
        </div>
        <a href={`/t/${tenantSlug}/settings`} className={styles.brand} title="Company settings">
          {brandMark}
          <span className={styles.brandTenant}>{tenantName || tenantSlug}</span>
        </a>
        <DashboardNav tenantSlug={tenantSlug} unreadLeads={unreadLeads} workspaceItems={workspaceItems} />
        <SignOutButton className={styles.signOutButton} />
      </aside>

      <main className={styles.main}>
        {!emailVerified && <VerifyEmailBanner />}
        {children}
      </main>
    </div>
  );
}
