import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getServerT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import User from "@/lib/models/User";
import Invite from "@/lib/models/Invite";
import SettingsForm from "@/components/SettingsForm";
import TeamSettings from "@/components/TeamSettings";
import BillingSettings from "@/components/BillingSettings";
import DomainSettings from "@/components/DomainSettings";
import { hasRole } from "@/lib/roles";
import { IconExternalLink } from "@/components/icons";
import styles from "@/components/dashboard.module.css";

export default async function SettingsPage({ params }) {
  const { t } = await getServerT();
  const { tenantSlug } = await params;

  // Settings changes the tenant's own configuration — team management lives
  // here too — so it's owner/admin only. The API routes underneath enforce
  // this independently (requireTenantRole); this redirect just keeps a
  // member from landing on a page whose every action would 403.
  const session = await auth();
  if (!hasRole(session?.user?.role, "admin")) redirect(`/t/${tenantSlug}`);

  await connectDB();
  const [tenant, members, invites] = await Promise.all([
    Tenant.findOne({ slug: tenantSlug }).lean(),
    User.find({ tenantId: session.user.tenantId }).select("name email role").sort({ createdAt: 1 }).lean(),
    Invite.find({ tenantId: session.user.tenantId, acceptedAt: null })
      .select("email role createdAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("settings.title")}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 560 }}>
        Your company profile, logo, and branding. Everything here feeds your dashboard and your
        public landing page at <code>/pages/{tenantSlug}</code>.
      </p>

      <div className={styles.tutorialCard}>
        <div className={styles.tutorialCardText}>
          <h2>{t("settings.newHere")}</h2>
          <p>
            A quick walkthrough of how leads flow from your landing page into your dashboard —
            takes about two minutes.
          </p>
        </div>
        <div className={styles.tutorialCardActions}>
          <a
            href={`/t/${tenantSlug}/tutorial`}
            className={styles.iconLabel}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--primary)",
              borderRadius: 8,
              background: "var(--surface)",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            View tutorial <IconExternalLink size={14} />
          </a>
        </div>
      </div>

      <SettingsForm tenant={JSON.parse(JSON.stringify(tenant))} />

      <div style={{ marginTop: 24 }}>
        <TeamSettings
          members={JSON.parse(JSON.stringify(members))}
          initialInvites={JSON.parse(JSON.stringify(invites))}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <Suspense fallback={null}>
          <BillingSettings plan={tenant.plan} hasSubscription={Boolean(tenant.stripeCustomerId)} />
        </Suspense>
      </div>

      <div style={{ marginTop: 24 }}>
        <DomainSettings initialDomain={tenant.customDomain?.hostname ? JSON.parse(JSON.stringify(tenant.customDomain)) : null} />
      </div>
    </div>
  );
}
