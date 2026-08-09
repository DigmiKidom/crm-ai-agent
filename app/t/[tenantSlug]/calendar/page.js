import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Contact from "@/lib/models/Contact";
import { getServerT } from "@/lib/i18n/server";
import CalendarView from "@/components/calendar/CalendarView";
import styles from "@/components/dashboard.module.css";

export default async function CalendarPage({ params }) {
  const { t } = await getServerT();
  const { tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.tenantSlug !== tenantSlug) redirect(`/t/${session.user.tenantSlug}`);

  await connectDB();
  // Only what the linker in EventForm needs to search and display — not the
  // full records. Capped at 500 each: enough for how this list is actually
  // used (type-to-filter), and the same kind of ceiling
  // test/workspace.MAX_ROWS/formFields use elsewhere rather than loading an
  // unbounded list into one client-side array.
  const [leads, contacts] = await Promise.all([
    Lead.find({ tenantId: session.user.tenantId })
      .select("name")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
    Contact.find({ tenantId: session.user.tenantId })
      .select("name")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
  ]);

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("calendar.title")}</h1>
      <CalendarView
        tenantSlug={tenantSlug}
        leads={JSON.parse(JSON.stringify(leads))}
        contacts={JSON.parse(JSON.stringify(contacts))}
      />
    </div>
  );
}
