import styles from "./bold.module.css";
import LeadForm from "../default/LeadForm";

export default function LandingTemplate({ tenant }) {
  const { name, slug, theme, landingPage } = tenant;

  const themeVars = {
    "--tenant-primary": theme?.primaryColor || "#2563eb",
    "--tenant-accent": theme?.accentColor || "#111827",
    "--tenant-font": theme?.fontFamily || "system-ui, sans-serif",
  };

  return (
    <div className={styles.page} style={themeVars}>
      <section className={styles.hero}>
        <h1 className={styles.headline}>{landingPage?.headline || `Grow ${name}`}</h1>
        <p className={styles.subheadline}>
          {landingPage?.subheadline || "Tell your visitors why they should reach out."}
        </p>
        <a className={styles.ctaButton} href="#lead-form">
          {landingPage?.ctaLabel || "Get in touch"}
        </a>
      </section>

      {landingPage?.features?.length > 0 && (
        <section className={styles.features}>
          {landingPage.features.map((feature, i) => (
            <div className={styles.featureCard} key={i}>
              <div className={styles.featureIcon} />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </section>
      )}

      <section className={styles.formSection} id="lead-form">
        <div className={styles.formCard}>
          <h2>{landingPage?.ctaLabel || "Get in touch"}</h2>
          <LeadForm tenantSlug={slug} ctaLabel={landingPage?.ctaLabel} styles={styles} />
        </div>
      </section>

      <footer className={styles.footer}>
        {name} — powered by CRM AI Agent
      </footer>
    </div>
  );
}
