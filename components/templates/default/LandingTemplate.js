import styles from "./default.module.css";
import shared from "../shared/shared.module.css";
import { resolveLandingCopy } from "@/lib/landingCopy";
import LeadForm from "./LeadForm";
import HeroBackground from "../shared/HeroBackground";
import Gallery from "../shared/Gallery";
import { TenantLogo, BrandFooter, cardAccent } from "../shared/Branding";
import { LandingIcon } from "@/lib/landingIcons";
import ABHeadline from "../shared/ABHeadline";
import TeamSection from "../shared/TeamSection";
import CtaLink from "../shared/CtaLink";
import SocialBar from "../shared/SocialBar";
import FaqSection from "../shared/FaqSection";

export default function LandingTemplate({ tenant }) {
  const { slug, theme, landingPage } = tenant;
  // Language, direction, and every visitor-facing string in one place.
  const copy = resolveLandingCopy(tenant);

  const themeVars = {
    "--tenant-primary": theme?.primaryColor || "#2563eb",
    "--tenant-accent": theme?.accentColor || "#111827",
    "--tenant-font": theme?.fontFamily || "system-ui, sans-serif",
  };

  const backgrounds = landingPage?.backgroundMediaIds || [];
  const hasPhoto = backgrounds.length > 0;
  const gallery = landingPage?.galleryMediaIds || [];

  return (
    <main className={styles.page} style={themeVars}>
      {/* With a photo the hero drops its solid colour block and lets the
          image plus overlay carry the background instead. */}
      <section className={`${styles.hero} ${hasPhoto ? styles.heroWithPhoto : ""}`}>
        <HeroBackground mediaIds={backgrounds} overlay={landingPage?.backgroundOverlay ?? 0.55} />

        <div className={shared.heroContent}>
          <TenantLogo tenant={tenant} />
          <ABHeadline
            tenantSlug={slug}
            headlineA={landingPage?.headline || copy.headlineFallback}
            headlineB={landingPage?.headlineVariantB || ""}
            className={styles.headline}
          />
          <p className={styles.subheadline}>
            {copy.subheadline}
          </p>
          <CtaLink tenantSlug={slug} className={styles.ctaButton} href="#lead-form">
            {copy.ctaLabel}
          </CtaLink>

          {/* Sits directly under the CTA: a visitor who isn't ready to fill
              in a form will often still tap WhatsApp. */}
          {copy.showSocialInHero && (
            <SocialBar links={copy.socialLinks} variant="hero" label={copy.socialLabel} />
          )}
        </div>
      </section>

      {landingPage?.features?.length > 0 && (
        <section className={styles.features}>
          {landingPage.features.map((feature, i) => {
            const accent = cardAccent(feature, styles);
            return (
            <div className={`${styles.featureCard} ${accent.className}`} style={accent.style} key={i}>
              {feature.icon && (
                <span className={styles.featureIcon}>
                  <LandingIcon name={feature.icon} size={26} />
                </span>
              )}
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
            );
          })}
        </section>
      )}

      {gallery.length > 0 && (
        <section className={styles.gallerySection}>
          <h2>{copy.galleryHeading}</h2>
          <Gallery
            mediaIds={gallery}
            columns={landingPage?.galleryColumns || 3}
            label={copy.galleryHeading}
            altPattern={copy.galleryPhotoAlt}
          />
        </section>
      )}

      {landingPage?.showTeamSection && (
        <TeamSection
          members={tenant.teamMembers || []}
          heading={copy.teamHeading}
          viewCvLabel={copy.viewCvLabel}
        />
      )}

      {/* Above the form on purpose — an unanswered question is a reason not
          to submit it. */}
      <FaqSection items={copy.faq} heading={copy.faqHeading} />

      <section className={styles.formSection} id="lead-form">
        <div className={styles.formCard}>
          <h2>{copy.contactHeading}</h2>
          <LeadForm
            tenantSlug={slug}
            ctaLabel={copy.ctaLabel}
            labels={copy.formLabels}
            fields={copy.fields}
            styles={styles}
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <BrandFooter
          tenant={tenant}
          poweredByLabel={copy.poweredByLabel}
          socialLabel={copy.socialLabel}
          reportLabels={copy.report}
        />
      </footer>
    </main>
  );
}
