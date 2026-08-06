"use client";

import Logo from "@/components/Logo";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./page.module.css";

// A client component purely so it can translate. It fetches nothing, so this
// costs no server round trip — and it keeps the route statically renderable,
// which reading the locale cookie on the server would not.
export default function Home() {
  const t = useT();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.logoRow}>
          <Logo href={null} markSize={36} />
        </div>
        <h1 className={styles.title}>{t("home.title")}</h1>
        <p className={styles.subtitle}>{t("home.subtitle")}</p>
        <div className={styles.ctas}>
          <a className={styles.primary} href="/signup">
            {t("home.getStarted")}
          </a>
          <a className={styles.secondary} href="/login">
            {t("home.logIn")}
          </a>
        </div>
      </div>
    </div>
  );
}
