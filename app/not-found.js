import Link from "next/link";
import Logo from "@/components/Logo";
import { getServerT } from "@/lib/i18n/server";
import styles from "./notFound.module.css";

export const metadata = {
  title: "Page not found",
};

/**
 * The app-wide 404.
 *
 * Also what an unauthorized visitor to /admin sees: the proxy rewrites here
 * rather than redirecting to /login, so probing for the admin surface returns
 * exactly what probing for any nonexistent URL returns. That equivalence is
 * the point — this page must stay indistinguishable from a genuine 404, which
 * is why it says nothing about accounts, permissions, or signing in.
 */
export default async function NotFound() {
  const { t } = await getServerT();

  return (
    <div className={styles.wrap}>
      <Logo href="/" markSize={28} />
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t("notFound.title")}</h1>
      <p className={styles.body}>{t("notFound.body")}</p>
      <Link className={styles.action} href="/">
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}
