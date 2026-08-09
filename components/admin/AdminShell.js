"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconChart, IconUsers, IconAlert, IconLock } from "@/components/icons";
import styles from "./admin.module.css";

/**
 * Chrome for the platform admin area.
 *
 * Visually distinct from the tenant dashboard on purpose — a darker, denser
 * bar and a "platform" badge. An admin is often looking at someone else's
 * business here, and the one mistake worth designing against is forgetting
 * whose data is on screen.
 */
const NAV = [
  { href: "/admin/dashboard", key: "admin.nav.overview", Icon: IconChart },
  { href: "/admin/users", key: "admin.nav.users", Icon: IconUsers },
  { href: "/admin/reports", key: "admin.nav.reports", Icon: IconAlert, badge: true },
];

export default function AdminShell({ admin, openReports = 0, children }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <Logo href="/" markSize={22} iconOnly />
          <span className={styles.badge}>
            <IconLock size={11} />
            {t("admin.platformBadge")}
          </span>
        </div>

        <nav className={styles.nav} aria-label={t("admin.nav.label")}>
          {NAV.map(({ href, key, Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={14} />
                {t(key)}
                {badge && openReports > 0 && <span className={styles.navBadge}>{openReports}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={styles.account}>
          <span className={styles.accountEmail}>{admin.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
