"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconWhatsApp } from "@/components/SocialIcons";
import { whatsappUrl } from "@/lib/socialLinks";
import { followUpMessage } from "@/lib/followUp";
import styles from "./dashboard.module.css";

/**
 * "Quick follow-up" — opens WhatsApp with a chase message already typed.
 *
 * Zero cost per click: the message is string interpolation over the tenant's
 * own template, not a generated one. It also opens the owner's WhatsApp
 * rather than sending anything, so they read it before it goes.
 *
 * Clicking counts as activity: the reminder clears and the quiet-period clock
 * restarts. That records that they reached out — not that the lead replied,
 * which we can't see — so an unanswered message goes quiet again after
 * another full interval, which is the right behaviour.
 */
export default function QuickFollowUpButton({ lead, template, compact = false }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!lead?.phone) return null;

  const message = followUpMessage(template || t("leads.followUpDefaultMessage"), lead.name);
  const href = whatsappUrl(lead.phone, message);
  if (!href) return null;

  async function handleClick(event) {
    // Let the browser open WhatsApp in the new tab as it normally would; the
    // bookkeeping happens alongside it. Not preventDefault + manual open,
    // which mobile Safari treats as a popup and blocks.
    setBusy(true);
    try {
      await fetch(`/api/leads/${lead._id}/follow-up`, { method: "POST" });
      router.refresh();
    } catch {
      // The message is already open in front of them. A failed bookkeeping
      // call means the reminder reappears, which is the safe direction to
      // fail in.
    } finally {
      setBusy(false);
    }
    void event;
  }

  const label = t("leads.quickFollowUp");

  return (
    <a
      className={compact ? styles.followUpChip : `${styles.linkButton} ${styles.iconLabel}`}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={handleClick}
      aria-label={`${label}: ${lead.name}`}
      title={label}
      aria-busy={busy || undefined}
      draggable={false}
    >
      <IconWhatsApp size={13} />
      {!compact && label}
    </a>
  );
}
