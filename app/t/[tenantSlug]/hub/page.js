import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Contact from "@/lib/models/Contact";
import Resume from "@/lib/models/Resume";
import Meeting from "@/lib/models/Meeting";
import { getServerT } from "@/lib/i18n/server";
import { hasRole } from "@/lib/roles";
import HubCard from "@/components/hub/HubCard";
import {
  IconSparkles,
  IconEdit,
  IconInbox,
  IconPipeline,
  IconContacts,
  IconCalendar,
  IconChart,
  IconFileText,
  IconFlame,
  IconSettings,
} from "@/components/icons";
import dash from "@/components/dashboard.module.css";
import styles from "@/components/hub/hub.module.css";

export default async function ServicesHubPage({ params }) {
  const { t } = await getServerT();
  const { tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.tenantSlug !== tenantSlug) redirect(`/t/${session.user.tenantSlug}`);

  const tenantId = session.user.tenantId;
  const isAdmin = hasRole(session.user.role, "admin");

  await connectDB();

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [tenant, totalLeads, unreadLeads, contactsCount, hasResume, upcomingMeetings] = await Promise.all([
    Tenant.findById(tenantId).select("industry notifications plan currency").lean(),
    Lead.countDocuments({ tenantId }),
    Lead.countDocuments({ tenantId, read: false }),
    Contact.countDocuments({ tenantId }),
    Resume.exists({ tenantId, userId: session.user.id }),
    Meeting.countDocuments({ tenantId, startAt: { $gte: now, $lt: sevenDaysOut } }),
  ]);

  const base = `/t/${tenantSlug}`;

  const cards = [
    {
      Icon: IconSparkles,
      title: t("hub.aiGenerator.title"),
      description: t("hub.aiGenerator.description"),
      tooltip: t("hub.aiGenerator.tooltip"),
      stat: tenant?.industry ? t("hub.aiGenerator.statConfigured") : t("hub.aiGenerator.statNotConfigured"),
      href: `${base}/onboarding`,
      ctaLabel: t("hub.aiGenerator.cta"),
    },
    {
      Icon: IconEdit,
      title: t("hub.landingPage.title"),
      description: t("hub.landingPage.description"),
      tooltip: t("hub.landingPage.tooltip"),
      stat: t("hub.landingPage.stat"),
      href: `${base}/site`,
      ctaLabel: t("hub.landingPage.cta"),
    },
    {
      Icon: IconInbox,
      title: t("hub.leads.title"),
      description: t("hub.leads.description"),
      tooltip: t("hub.leads.tooltip"),
      stat:
        unreadLeads > 0
          ? t(unreadLeads === 1 ? "sidebar.unreadOne" : "sidebar.unreadMany", { count: unreadLeads })
          : t("hub.leads.statCaughtUp"),
      href: `${base}/leads`,
      ctaLabel: t("hub.leads.cta"),
    },
    {
      Icon: IconPipeline,
      title: t("hub.pipeline.title"),
      description: t("hub.pipeline.description"),
      tooltip: t("hub.pipeline.tooltip"),
      stat: t("hub.pipeline.stat", { count: totalLeads }),
      href: `${base}/pipeline`,
      ctaLabel: t("hub.pipeline.cta"),
    },
    {
      Icon: IconContacts,
      title: t("hub.contacts.title"),
      description: t("hub.contacts.description"),
      tooltip: t("hub.contacts.tooltip"),
      stat: t("hub.contacts.stat", { count: contactsCount }),
      href: `${base}/contacts`,
      ctaLabel: t("hub.contacts.cta"),
    },
    {
      Icon: IconCalendar,
      title: t("hub.calendar.title"),
      description: t("hub.calendar.description"),
      tooltip: t("hub.calendar.tooltip"),
      stat:
        upcomingMeetings > 0
          ? t("hub.calendar.statUpcoming", { count: upcomingMeetings })
          : t("hub.calendar.statNone"),
      href: `${base}/calendar`,
      ctaLabel: t("hub.calendar.cta"),
    },
    {
      Icon: IconChart,
      title: t("hub.analytics.title"),
      description: t("hub.analytics.description"),
      tooltip: t("hub.analytics.tooltip"),
      stat: t("hub.analytics.stat", { count: totalLeads }),
      href: `${base}/analytics`,
      ctaLabel: t("hub.analytics.cta"),
    },
    {
      Icon: IconFileText,
      title: t("hub.cv.title"),
      description: t("hub.cv.description"),
      tooltip: t("hub.cv.tooltip"),
      stat: hasResume ? t("hub.cv.statReady") : t("hub.cv.statNotStarted"),
      href: `${base}/cv`,
      ctaLabel: t("hub.cv.cta"),
    },
    {
      Icon: IconFlame,
      title: t("hub.automation.title"),
      description: t("hub.automation.description"),
      tooltip: t("hub.automation.tooltip"),
      stat: tenant?.notifications?.emailOnNewLead
        ? t("hub.automation.statOn")
        : t("hub.automation.statOff"),
      href: `${base}/settings`,
      ctaLabel: t("hub.automation.cta"),
    },
    // Team & billing changes tenant-wide configuration, so it's hidden for a
    // "member" the same way the Settings nav entry itself is — not just
    // redirected on arrival, never offered in the first place.
    ...(isAdmin
      ? [
          {
            Icon: IconSettings,
            title: t("hub.billing.title"),
            description: t("hub.billing.description"),
            tooltip: t("hub.billing.tooltip"),
            stat: t(tenant?.plan === "pro" ? "settings.billing.currentPlanPro" : "settings.billing.currentPlanFree"),
            href: `${base}/settings`,
            ctaLabel: t("hub.billing.cta"),
          },
        ]
      : []),
  ];

  return (
    <div>
      <h1 className={dash.pageTitle}>{t("hub.title")}</h1>
      <p className={styles.intro}>{t("hub.intro")}</p>

      <div className={styles.grid}>
        {cards.map((card) => (
          <HubCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
