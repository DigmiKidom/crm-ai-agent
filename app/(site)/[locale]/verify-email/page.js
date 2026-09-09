import { auth } from "@/auth";
import { getRouteT } from "@/lib/i18n/server";
import Logo from "@/components/Logo";
import VerifyEmailPanel from "./VerifyEmailPanel";
import styles from "./page.module.css";

/**
 * The waiting room between signing up and getting into the CRM.
 *
 * proxy.js is what actually keeps an unverified account out of /t/* and
 * routes it here; this page only has to explain the situation and give the
 * two things someone stuck at it needs — another email, and a way out.
 *
 * Deliberately reachable only with a session: resending the link requires
 * knowing whose link it is, and an anonymous version of this page would be an
 * open "does this address have an account?" oracle.
 */
export default async function VerifyEmailPage({ params }) {
  const { t } = await getRouteT(params);
  const session = await auth();
  const email = session?.user?.email || "";
  const tenantSlug = session?.user?.tenantSlug || "";

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Logo href={null} markSize={30} />
        </div>

        <h1 className={styles.title}>{t("auth.verifyPageTitle")}</h1>
        {/* The address is echoed back because the commonest reason this page
            is a dead end is a typo in it — seeing "…@gmial.com" is what tells
            someone to sign out and start again rather than keep resending. */}
        <p className={styles.subtitle}>
          {t("auth.verifyPageIntro")}{" "}
          <strong className={styles.email} dir="ltr">
            {email}
          </strong>
        </p>

        <VerifyEmailPanel tenantSlug={tenantSlug} />
      </div>
    </div>
  );
}
