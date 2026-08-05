import styles from "./minimal.module.css";
import shared from "../shared/shared.module.css";
import LeadForm from "../default/LeadForm";
import HeroBackground from "../shared/HeroBackground";
import { TenantLogo, BrandFooter } from "../shared/Branding";
import { LandingIcon } from "@/lib/landingIcons";

export default function LandingTemplate({ tenant }) {
  const { name, slug, theme, landingPage } = tenant;

  const themeVars = {
    "--tenant-primary": theme?.primaryColor || "#2563eb",
    "--tenant-accent": theme?.accentColor || "#111827",
    "--tenant-font": theme?.fontFamily || "system-ui, sans-serif",
  };

  const backgrounds = landingPage?.backgroundMediaIds || [];
  const hasPhoto = backgrounds.length > 0;

  return (
    <div className={styles.page} style={themeVars}>
      {/* Minimal is a light, editorial layout — with a photo the hero inverts
          to light-on-dark, so the type stays legible over the image. */}
      <section className={`${styles.hero} ${hasPhoto ? styles.heroWithPhoto : ""}`}>
        <HeroBackground mediaIds={backgrounds} overlay={landingPage?.backgroundOverlay ?? 0.55} />

        <div className={`${shared.heroContent} ${styles.heroInner}`}>
          <TenantLogo tenant={tenant} align="left" />
          <div className={styles.eyebrow}>{tenant.profile?.tagline || name}</div>
          <h1 className={styles.headline}>{landingPage?.headline || `Grow ${name}`}</h1>
          <p className={styles.subheadline}>
            {landingPage?.subheadline || "Tell your visitors why they should reach out."}
          </p>
          <a className={styles.ctaButton} href="#lead-form">
            {landingPage?.ctaLabel || "Get in touch"} &rarr;
          </a>
        </div>
      </section>

      <div className={styles.divider} />

      {landingPage?.features?.length > 0 && (
        <section className={styles.features}>
          {landingPage.features.map((feature, i) => (
            <div className={styles.featureCard} key={i}>
              {feature.icon && (
                <span className={styles.featureIcon}>
                  <LandingIcon name={feature.icon} size={22} strokeWidth={1.5} />
                </span>
              )}
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className={styles.formSection} id="lead-form">
        <h2>{landingPage?.ctaLabel || "Get in touch"}</h2>
        <LeadForm tenantSlug={slug} ctaLabel={landingPage?.ctaLabel} styles={styles} />
      </section>

      <footer className={styles.footer}>
        <BrandFooter tenant={tenant} />
      </footer>
    </div>
  );
}
