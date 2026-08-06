import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getServerT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import ProfileForm from "@/components/ProfileForm";
import styles from "@/components/dashboard.module.css";

export default async function ProfilePage({ params }) {
  const { t } = await getServerT();
  const { tenantSlug } = await params;

  // Same belt-and-suspenders check every other dashboard route does: the proxy
  // already gates /t/*, but each server-rendered route re-verifies directly.
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.tenantSlug !== tenantSlug) redirect(`/t/${session.user.tenantSlug}`);

  await connectDB();
  const user = await User.findById(session.user.id)
    .select("name email title phone role avatarMediaId")
    .lean();

  if (!user) redirect("/login");

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("profile.title")}</h1>
      <p style={{ color: "var(--muted)", marginTop: -16, marginBottom: 24, fontSize: "0.9rem" }}>
        {t("profile.subtitle")}
      </p>

      <ProfileForm
        user={{
          name: user.name || "",
          email: user.email,
          title: user.title || "",
          phone: user.phone || "",
          avatarMediaId: user.avatarMediaId ? user.avatarMediaId.toString() : null,
        }}
      />
    </div>
  );
}
