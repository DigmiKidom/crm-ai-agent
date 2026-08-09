import styles from "./shared.module.css";
import { SocialIcon } from "@/components/SocialIcons";

/**
 * The tenant's social and quick-messaging buttons.
 *
 * Two variants of the same data, because they're doing two different jobs:
 *
 *   hero   — solid, high-contrast pills in each platform's own brand colour,
 *            sitting directly under the CTA. This is a call to action.
 *   footer — quiet monochrome circles that inherit the footer's colour. This
 *            is a directory.
 *
 * `links` comes pre-resolved from lib/landingCopy.js (resolveSocialLinks), so
 * there's no "is this one filled in" logic here: anything in the array is
 * meant to render, and an empty array renders nothing at all.
 *
 * Server component — no state, no handlers. Every link is a plain <a>, which
 * is also why WhatsApp works on a phone: the wa.me href opens the installed
 * app directly, no JavaScript involved.
 */
export default function SocialBar({ links = [], variant = "footer", label }) {
  if (!links.length) return null;

  const isHero = variant === "hero";

  return (
    <nav
      className={isHero ? styles.socialHero : styles.socialFooter}
      aria-label={label}
    >
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noreferrer noopener"
          className={isHero ? styles.socialHeroLink : styles.socialFooterLink}
          // Brand colour fills the hero pill and tints the footer circle on
          // hover. Passed as a variable rather than a background so the CSS
          // decides how much of it to use per variant.
          style={{ "--social-brand": link.brandColor }}
          // Not a hardcoded English string: the label is the platform's own
          // name, which is the same in every language.
          aria-label={link.label}
          title={link.label}
        >
          <SocialIcon platform={link.key} size={isHero ? 19 : 17} />
          {isHero && <span className={styles.socialHeroLabel}>{link.label}</span>}
        </a>
      ))}
    </nav>
  );
}
