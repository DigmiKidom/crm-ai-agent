import Link from "next/link";
import { LOCALE_META, normalizeLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/routing";
import { translate } from "@/lib/i18n/translate";
import styles from "./notFound.module.css";

/**
 * The body of the 404 page, rendered by app/global-not-found.js.
 *
 * Takes its locale as a prop rather than reading context: it renders detached
 * from the route tree, where there is no LocaleProvider above it and no route
 * segment to read — see the note in global-not-found.js.
 */
export default function NotFoundView({ locale }) {
  const code = normalizeLocale(locale);
  const t = (key) => translate(code, key);

  return (
    <div className={styles.wrap} lang={LOCALE_META[code].htmlLang}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t("notFound.title")}</h1>
      <p className={styles.body}>{t("notFound.body")}</p>
      <Link className={styles.action} href={localePath(code, "/")}>
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}
