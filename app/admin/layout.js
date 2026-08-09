import { notFound } from "next/navigation";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import AdminShell from "@/components/admin/AdminShell";
import TwoFactorGate from "@/components/admin/TwoFactorGate";
import { getSuperAdminPageContext } from "@/lib/adminSession";
import { getServerLocale } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import PageReport from "@/lib/models/PageReport";

export const metadata = {
  title: "Admin",
  // Belt and braces alongside the 404s: nothing under /admin should ever
  // appear in a search index, including any error page rendered on the way.
  robots: { index: false, follow: false },
};

/**
 * Every admin page renders inside this layout, so the authorization check
 * here covers the whole subtree — a new page added under /admin is protected
 * by existing, not by the author remembering to guard it.
 *
 * This is the third of three independent checks (proxy → layout → each API
 * route). They're redundant on purpose: the proxy reads a JWT that can be
 * stale, and a page that renders data is not the same trust boundary as a
 * route that changes it.
 */
export default async function AdminLayout({ children }) {
  const ctx = await getSuperAdminPageContext();
  // notFound(), not redirect("/login"): an unauthorized visitor sees exactly
  // what they'd see for any URL that doesn't exist.
  if (!ctx) notFound();

  const locale = await getServerLocale();

  // An admin who hasn't enrolled in 2FA can reach the enrolment screen and
  // nothing else. Checked here rather than per page so there's no route that
  // can be reached around it.
  if (!ctx.admin.twoFactorEnabled) {
    return (
      <LocaleProvider locale={locale}>
        <TwoFactorGate />
      </LocaleProvider>
    );
  }

  let openReports = 0;
  try {
    await connectDB();
    openReports = await PageReport.countDocuments({ status: "open" });
  } catch {
    // A badge count is not worth failing the whole admin surface over.
  }

  return (
    <LocaleProvider locale={locale}>
      <AdminShell admin={ctx.admin} openReports={openReports}>
        {children}
      </AdminShell>
    </LocaleProvider>
  );
}
