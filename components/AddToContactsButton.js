"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconContacts, IconCheck } from "@/components/icons";
import { buildVCard, vcardFilename } from "@/lib/vcard";
import styles from "./dashboard.module.css";

/**
 * "Add to contacts" — saves a lead into the owner's own phone or address book.
 *
 * Three paths, tried in order, because no single one works everywhere:
 *
 *  1. navigator.share with a .vcf file attached. On iOS and Android this
 *     opens the native share sheet with "Add to Contacts" in it — one tap,
 *     straight into the phone's address book.
 *  2. A blob download. Desktop browsers, and mobile browsers whose share
 *     sheet won't take files. macOS and Windows both open a .vcf with the
 *     system contacts app.
 *  3. Navigating to the server route. Last resort, and the one that saves
 *     iOS Safari when a blob URL misbehaves — Safari hands a served .vcf
 *     directly to Contacts.
 *
 * The card is built in the browser from data the page already has, so the
 * common case costs no request at all.
 */
export default function AddToContactsButton({
  lead,
  businessName = "",
  compact = false,
  onSaved,
}) {
  const t = useT();
  const [state, setState] = useState("idle"); // idle | working | done

  async function handleClick() {
    setState("working");

    const vcard = buildVCard(lead, {
      businessName,
      labels: { captured: t("leads.vcardCaptured"), via: t("leads.vcardVia") },
    });
    const filename = vcardFilename(lead.name);

    try {
      const file = new File([vcard], filename, { type: "text/vcard" });

      // canShare({ files }) is the only reliable test — plenty of browsers
      // define navigator.share but refuse file payloads, and calling share()
      // on those throws rather than degrading.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: lead.name });
        markSaved();
        return;
      }

      const url = URL.createObjectURL(new Blob([vcard], { type: "text/vcard" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoked on a delay: revoking synchronously can cancel the download in
      // Safari before it has actually read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      markSaved();
    } catch (err) {
      // AbortError means the person opened the share sheet and dismissed it.
      // That's a decision, not a failure — don't fall back and don't claim
      // it was saved.
      if (err?.name === "AbortError") {
        setState("idle");
        return;
      }
      // assign() rather than `location.href = …`: identical behaviour, but
      // it's a method call rather than a write to a value outside the
      // component, which is what react-hooks/immutability flags.
      window.location.assign(`/api/leads/${lead._id}/vcard`);
      markSaved();
    }
  }

  function markSaved() {
    setState("done");
    // Recording the save is what clears the "new unsaved contact" badge, and
    // it also counts as activity on the lead — see the follow-up engine.
    fetch(`/api/leads/${lead._id}/contact-saved`, { method: "POST" })
      .then(() => onSaved?.())
      .catch(() => {
        // The contact is already in their phone; a failed bookkeeping call
        // shouldn't produce an error the person can't act on. The badge
        // simply reappears on the next load.
      });
  }

  const label = state === "done" ? t("leads.contactSaved") : t("leads.addToContacts");

  return (
    <button
      type="button"
      className={compact ? styles.contactChip : `${styles.linkButton} ${styles.iconLabel}`}
      onClick={handleClick}
      disabled={state === "working"}
      title={label}
      aria-label={`${label}: ${lead.name}`}
    >
      {state === "done" ? <IconCheck size={13} /> : <IconContacts size={13} />}
      {!compact && label}
    </button>
  );
}
