import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Snippet from "@/lib/models/Snippet";
import { getRouteT } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/routing";
import { tenantScoped } from "@/lib/tenantScope";
import SnippetLibrary from "@/components/plugins/SnippetLibrary";
import styles from "@/components/dashboard.module.css";

export const metadata = { title: "Message templates" };

export default async function SnippetsPage({ params }) {
  const { t } = await getRouteT(params);
  const { locale, tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect(localePath(locale, "/login"));
  if (session.user.tenantSlug !== tenantSlug) {
    redirect(localePath(locale, `/t/${session.user.tenantSlug}`));
  }

  await connectDB();
  const snippets = await tenantScoped(Snippet, session.user.tenantId)
    .find()
    .sort({ useCount: -1, updatedAt: -1 })
    .limit(200)
    .select("title body category useCount updatedAt")
    .lean();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("plugins.snippets.label")}</h1>
      <p className={styles.sectionHint}>{t("plugins.snippets.description")}</p>
      <SnippetLibrary initialSnippets={JSON.parse(JSON.stringify(snippets))} />
    </div>
  );
}
