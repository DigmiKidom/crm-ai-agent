import styles from "./dashboard.module.css";
import { IconWhatsApp } from "./SocialIcons";
import { leadWhatsappUrl } from "@/lib/socialLinks";

/**
 * One-click WhatsApp outreach for a single lead.
 *
 * Opens the owner's own WhatsApp with the message already typed — it never
 * sends anything. That distinction is the whole design: the owner still reads
 * and edits before pressing send, so a template that reads slightly wrong for
 * one lead costs a moment, not a customer.
 *
 * No hooks and no "use client" on purpose, so the same component works in the
 * server-rendered leads table and inside the client-side pipeline board.
 * Everything it needs — the label, the template, the company name — is passed
 * in by whichever parent has access to a translator.
 *
 * Renders nothing when the lead has no phone number, rather than a disabled
 * button: a row that simply has no icon reads as "no number on file", where a
 * greyed-out one reads as "something is broken".
 */
export default function LeadWhatsAppLink({
  lead,
  template,
  companyName,
  label,
  size = 16,
  withLabel = false,
}) {
  const href = leadWhatsappUrl(lead, { template, companyName });
  if (!href) return null;

  return (
    <a
      className={withLabel ? styles.whatsappButton : styles.whatsappIconLink}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      title={label}
      // Inside the pipeline board every card is draggable; without this the
      // browser starts dragging the link instead of following it. Declarative
      // rather than an onClick handler, which is what keeps this component
      // usable from a server component.
      draggable={false}
    >
      <IconWhatsApp size={size} />
      {withLabel && <span>{label}</span>}
    </a>
  );
}
