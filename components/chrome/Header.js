"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Logo from "@/components/Logo";
import LanguageToggle from "./LanguageToggle";
import AvatarMenu from "./AvatarMenu";
import { useLocale, useRoutePath } from "@/components/i18n/LocaleProvider";
import { IconClose, IconMenu } from "@/components/icons";
import styles from "./chrome.module.css";
import Link from "@/components/i18n/Link";

/**
 * The one header component, in two shapes.
 *
 * - `variant="public"`  — marketing and auth screens: full nav, language
 *   toggle, and either sign-in links or the account menu. Renders itself from
 *   the client session.
 * - `variant="app"`     — inside the dashboard shell: a slim bar that owns the
 *   mobile drawer trigger and takes its user data as props, because the shell's
 *   server layout has already loaded it.
 *
 * Both are sticky, both share one stylesheet, and both stay on the fixed slate
 * chrome palette regardless of the dashboard's light/dark setting.
 */
export default function Header({
  variant = "public",
  onMenuToggle,
  menuOpen = false,
  user,
  tenantSlug,
}) {
  const { t } = useLocale();
  const pathname = useRoutePath();
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const isApp = variant === "app";

  // Session is only needed for the public variant; the app variant is handed
  // its user by the server layout. `required: false` keeps this from
  // redirecting anonymous marketing-page visitors.
  const { data: session, status } = useSession({ required: false });

  // The header gains a border and a stronger backdrop once the page scrolls,
  // so it separates from content without carrying a permanent shadow.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isApp) return undefined;
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen, isApp]);

  const sessionUser = user ?? session?.user;
  const activeTenantSlug = tenantSlug ?? sessionUser?.tenantSlug ?? null;
  const isAuthed = Boolean(sessionUser);

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/#features", label: t("nav.features") },
    { href: "/terms", label: t("nav.terms") },
  ];

  function isActive(href) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("#")[0]) && href !== "/";
  }

  return (
    <header
      className={`${styles.header} ${isApp ? styles.headerApp : ""}`}
      data-scrolled={scrolled || undefined}
    >
      <div className={`${styles.headerInner} ${isApp ? styles.headerInnerApp : ""}`}>
        {/* ── Leading slot ── */}
        <div className={styles.headerLead}>
          {isApp ? (
            <button
              type="button"
              // `menuTriggerDrawerOnly` hides this above the drawer
              // breakpoint. Without it the button rendered at every width,
              // including desktop — where the sidebar is permanently visible
              // and toggling `data-open` does nothing, so it was a control
              // that looked live and did nothing when pressed.
              className={`${styles.menuTrigger} ${styles.menuTriggerDrawerOnly}`}
              onClick={onMenuToggle}
              aria-expanded={menuOpen}
              aria-controls="dashboard-drawer"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            >
              {menuOpen ? <IconClose size={19} /> : <IconMenu size={19} />}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.menuTrigger} ${styles.menuTriggerMobileOnly}`}
              onClick={() => setNavOpen((v) => !v)}
              aria-expanded={navOpen}
              aria-label={navOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            >
              {navOpen ? <IconClose size={19} /> : <IconMenu size={19} />}
            </button>
          )}

          <Link
            href={isAuthed && activeTenantSlug ? `/t/${activeTenantSlug}` : "/"}
            className={styles.brand}
            aria-label={t("brand.name")}
          >
            <Logo href={null} markSize={26} />
            <span className={styles.brandTagline}>{t("brand.tagline")}</span>
          </Link>
        </div>

        {/* ── Centre nav (public only) ── */}
        {!isApp && (
          <nav className={styles.nav} aria-label={t("nav.mainNavigation")}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.navLink}
                data-active={isActive(link.href) || undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* ── Trailing slot ── */}
        <div className={styles.headerTrail}>
          <LanguageToggle />

          {isAuthed ? (
            <AvatarMenu
              name={sessionUser.name}
              email={sessionUser.email}
              avatarMediaId={sessionUser.avatarMediaId}
              tenantSlug={activeTenantSlug}
            />
          ) : (
            // `status === "loading"` on the first client render — showing the
            // auth links optimistically avoids a layout shift for the common
            // (logged-out) case on marketing pages.
            !isApp && (
              <div className={styles.authLinks} data-pending={status === "loading" || undefined}>
                <Link href="/login" className={styles.ghostButton}>
                  {t("nav.login")}
                </Link>
                <Link href="/signup" className={styles.accentButton}>
                  {t("nav.signup")}
                </Link>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Mobile nav sheet (public only) ── */}
      {!isApp && navOpen && (
        <>
          <div
            className={styles.mobileNavBackdrop}
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <nav className={styles.mobileNav} aria-label={t("nav.mainNavigation")}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.mobileNavLink}
                data-active={isActive(link.href) || undefined}
                // Closed here rather than in a pathname effect: a cross-page
                // link remounts the header anyway, and a same-page hash link
                // (/#features) never changes the pathname at all — so the
                // effect would have left the sheet open in the one case that
                // actually needed closing.
                onClick={() => setNavOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {!isAuthed && (
              <div className={styles.mobileNavActions}>
                <Link href="/login" className={styles.ghostButton}>
                  {t("nav.login")}
                </Link>
                <Link href="/signup" className={styles.accentButton}>
                  {t("nav.signup")}
                </Link>
              </div>
            )}
          </nav>
        </>
      )}
    </header>
  );
}
