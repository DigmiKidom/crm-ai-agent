"use client";

import Logo from "@/components/Logo";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./chrome.module.css";

/**
 * Marketing/auth footer: three link columns, the brand lockup with the
 * Ceramony tagline, and the copyright line.
 *
 * The year is computed at render rather than hardcoded. Because this is a
 * client component the value comes from the visitor's clock, which avoids the
 * classic "site still says 2024 in January" bug without needing a rebuild.
 */
export default function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  const columns = [
    {
      key: "product",
      title: t("footer.product"),
      links: [
        { href: "/#features", label: t("footer.landingPages") },
        { href: "/#crm", label: t("footer.crm") },
        { href: "/#analytics", label: t("footer.analytics") },
        { href: "/#ai", label: t("footer.aiAgents") },
      ],
    },
    {
      key: "company",
      title: t("footer.company"),
      links: [
        { href: "/#about", label: t("footer.about") },
        { href: "mailto:hello@ceramony.co", label: t("footer.contact") },
      ],
    },
    {
      key: "legal",
      title: t("footer.legal"),
      links: [{ href: "/terms", label: t("footer.terms") }],
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Logo href="/" markSize={28} />
          {/* The tagline is the brand promise, so it gets the accent gradient
              treatment here rather than being plain muted text. */}
          <p className={styles.footerTagline}>
            CeRAmony — <span className={styles.footerTaglineAccent}>{t("brand.tagline")}</span>
          </p>
          <p className={styles.footerBlurb}>{t("footer.builtWith")}</p>
        </div>

        <div className={styles.footerColumns}>
          {columns.map((column) => (
            <nav key={column.key} className={styles.footerColumn} aria-label={column.title}>
              <h2 className={styles.footerColumnTitle}>{column.title}</h2>
              <ul className={styles.footerLinkList}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={styles.footerLink}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className={styles.footerBar}>
        <p className={styles.footerCopyright}>
          © {year} Ceramony. {t("footer.rights")}
        </p>
        <a href="/terms" className={styles.footerBarLink}>
          {t("footer.terms")}
        </a>
      </div>
    </footer>
  );
}
