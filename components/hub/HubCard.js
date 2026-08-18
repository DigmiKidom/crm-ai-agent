import Tooltip from "@/components/chrome/Tooltip";
import { IconArrowRight } from "@/components/icons";
import styles from "./hub.module.css";
import Link from "@/components/i18n/Link";

/**
 * One tile on the Services & Tools Hub. A plain Server Component — nothing
 * here is interactive except the Tooltip and the CTA link, so the hub page
 * stays server-rendered and fast.
 *
 * The whole card is deliberately NOT one big `<a>`: the Tooltip renders a
 * `<button>` trigger, and interactive content can't nest inside an `<a>`
 * (invalid HTML, and confusing focus/click behavior even where a browser
 * tolerates it) — same class of bug already caught once in this app's
 * pipeline board. Only the CTA row at the bottom is the real link.
 *
 * `stat` is a short, live status line ("3 unread", "Free plan", "Not set up
 * yet") computed by the page from real data — never a placeholder number.
 */
export default function HubCard({ Icon, title, description, tooltip, stat, href, ctaLabel }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardIcon}>
          <Icon size={20} />
        </span>
        {tooltip && <Tooltip text={tooltip} />}
      </div>

      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDescription}>{description}</p>

      <div className={styles.cardFooter}>
        <span className={styles.cardStat}>{stat}</span>
        <Link href={href} className={styles.cardCta}>
          {ctaLabel}
          <IconArrowRight size={13} className="dirFlip" />
        </Link>
      </div>
    </div>
  );
}
