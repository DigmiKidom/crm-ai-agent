import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import LedgerEntry from "@/lib/models/LedgerEntry";
import Tenant from "@/lib/models/Tenant";
import { getRouteT } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/routing";
import { tenantScoped } from "@/lib/tenantScope";
import LedgerView from "@/components/plugins/LedgerView";
import styles from "@/components/dashboard.module.css";

export const metadata = { title: "Income & expenses" };

export default async function FinancesPage({ params }) {
  const { t } = await getRouteT(params);
  const { locale, tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect(localePath(locale, "/login"));
  if (session.user.tenantSlug !== tenantSlug) {
    redirect(localePath(locale, `/t/${session.user.tenantSlug}`));
  }

  await connectDB();
  const tenantId = session.user.tenantId;
  const [entries, tenant] = await Promise.all([
    tenantScoped(LedgerEntry, tenantId)
      .find()
      .sort({ date: -1, createdAt: -1 })
      .limit(500)
      .select("date description type amount createdAt")
      .lean(),
    // The tenant's own currency, so totals read in the money the business
    // actually deals in rather than a hardcoded symbol.
    Tenant.findById(tenantId).select("currency").lean(),
  ]);

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("plugins.finances.label")}</h1>
      <p className={styles.sectionHint}>{t("plugins.finances.description")}</p>
      <LedgerView
        initialEntries={JSON.parse(JSON.stringify(entries))}
        currency={tenant?.currency || "ILS"}
      />
    </div>
  );
}
