import OnboardingForm from "@/components/OnboardingForm";
import styles from "@/components/dashboard.module.css";

export default async function OnboardingPage({ params }) {
  const { tenantSlug } = await params;

  return (
    <div>
      <h1 className={styles.pageTitle}>Set up with AI</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 520 }}>
        Answer a few questions about your business and the agent will write your landing page
        copy and set up a lead pipeline tailored to your industry.
      </p>
      <OnboardingForm tenantSlug={tenantSlug} />
    </div>
  );
}
