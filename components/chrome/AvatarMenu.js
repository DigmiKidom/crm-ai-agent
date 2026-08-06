"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import Avatar from "./Avatar";
import useMenu from "./useMenu";
import {
  IconChevronDown,
  IconExternalLink,
  IconLogout,
  IconSettings,
  IconUser,
} from "@/components/icons";
import styles from "./chrome.module.css";

/**
 * Avatar button + account dropdown. Keyboard handling, dismissal, and focus
 * management all come from useMenu, so this stays purely presentational.
 */
export default function AvatarMenu({
  name,
  email,
  avatarMediaId,
  tenantSlug,
  compact = false,
}) {
  const { t } = useLocale();
  const { open, close, menuProps, triggerProps, rootRef } = useMenu();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({ callbackUrl: "/login" });
    } catch {
      // signOut only rejects if the network drops; re-enable so the user can
      // retry rather than being stuck on a dead "Signing out…" label.
      setSigningOut(false);
    }
  }

  const displayName = name || email || "";

  // Every link is tenant-scoped, so with no tenant on the session the menu
  // collapses to just the sign-out action rather than rendering dead hrefs.
  const links = tenantSlug
    ? [
        {
          key: "profile",
          href: `/t/${tenantSlug}/profile`,
          Icon: IconUser,
          label: t("account.profile"),
        },
        {
          key: "settings",
          href: `/t/${tenantSlug}/settings`,
          Icon: IconSettings,
          label: t("account.settings"),
        },
        {
          key: "site",
          href: `/pages/${tenantSlug}`,
          Icon: IconExternalLink,
          label: t("account.viewSite"),
          external: true,
        },
      ]
    : [];

  return (
    <div className={styles.avatarMenu} ref={rootRef}>
      <button
        type="button"
        {...triggerProps}
        className={styles.avatarButton}
        aria-label={t("account.menu")}
      >
        <Avatar
          mediaId={avatarMediaId}
          name={name}
          email={email}
          size={30}
          alt={t("account.avatarAlt")}
        />
        {!compact && <span className={styles.avatarButtonName}>{displayName}</span>}
        <IconChevronDown
          size={14}
          className={styles.avatarChevron}
          data-open={open || undefined}
        />
      </button>

      {open && (
        <div {...menuProps} className={styles.menu} aria-label={t("account.menu")}>
          <div className={styles.menuHeader}>
            <span className={styles.menuHeaderLabel}>{t("account.signedInAs")}</span>
            <span className={styles.menuHeaderName}>{displayName}</span>
            {name && email && (
              // Emails stay LTR even in a Hebrew UI — see globals.css.
              <span className={`${styles.menuHeaderEmail} ltr`}>{email}</span>
            )}
          </div>

          {links.length > 0 && (
            <div className={styles.menuGroup}>
              {links.map((link) => (
                <a
                  key={link.key}
                  role="menuitem"
                  href={link.href}
                  className={styles.menuItem}
                  onClick={() => close()}
                  {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  <link.Icon size={16} className={styles.menuItemIcon} />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          )}

          <div className={styles.menuGroup}>
            <button
              role="menuitem"
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <IconLogout size={16} className={styles.menuItemIcon} />
              <span>{signingOut ? t("common.loading") : t("account.signOut")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
