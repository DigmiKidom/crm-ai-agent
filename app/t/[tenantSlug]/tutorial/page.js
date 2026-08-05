import TutorialGuide from "@/components/tutorial/TutorialGuide";
import styles from "@/components/dashboard.module.css";

export default async function TutorialPage({ params }) {
  const { tenantSlug } = await params;

  return (
    <div>
      <h1 className={styles.pageTitle}>Getting started</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 560 }}>
        A quick tour of how leads flow from your landing page into your dashboard.
      </p>

      <TutorialGuide tenantSlug={tenantSlug} />
    </div>
  );
}
