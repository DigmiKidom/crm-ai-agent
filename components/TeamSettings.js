"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { INVITABLE_ROLES } from "@/lib/roles";
import { IconPlus, IconTrash } from "./icons";
import styles from "./dashboard.module.css";

// Rendered only for owner/admin viewers — see app/t/[tenantSlug]/settings/page.js,
// which redirects anyone else away from this whole page before this ever
// mounts. The API routes underneath are the real enforcement (requireTenantRole),
// this is just the UI following the same rule.
export default function TeamSettings({ members, initialInvites }) {
  const t = useT();
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState(null);

  async function handleInvite(e) {
    e.preventDefault();
    setError("");
    setSending(true);

    const res = await fetch("/api/tenant/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);

    if (!res.ok) {
      setError(data.error || t("settings.team.inviteFailed"));
      return;
    }

    setInvites((current) => [
      { _id: `${email}-${Date.now()}`, email, role, createdAt: new Date().toISOString() },
      ...current,
    ]);
    setEmail("");
    setRole("member");
  }

  async function handleRevoke(id) {
    setRevokingId(id);
    const res = await fetch(`/api/tenant/invites/${id}`, { method: "DELETE" });
    setRevokingId(null);
    if (res.ok) {
      setInvites((current) => current.filter((i) => i._id !== id));
    }
  }

  return (
    <section className={styles.detailCard}>
      <h2 className={styles.sectionTitle}>{t("settings.team.title")}</h2>
      <p className={styles.sectionHint}>{t("settings.team.hint")}</p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("settings.team.name")}</th>
            <th>{t("settings.team.email")}</th>
            <th>{t("settings.team.role")}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m._id}>
              <td>{m.name || "—"}</td>
              <td>{m.email}</td>
              <td>{t(`roles.${m.role}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {invites.length > 0 && (
        <>
          <h3 className={styles.sectionTitle} style={{ fontSize: "0.9rem", marginTop: 20 }}>
            {t("settings.team.pendingInvites")}
          </h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("settings.team.email")}</th>
                <th>{t("settings.team.role")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite._id}>
                  <td>{invite.email}</td>
                  <td>{t(`roles.${invite.role}`)}</td>
                  <td>
                    <button
                      type="button"
                      className={`${styles.linkButton} ${styles.iconLabel}`}
                      onClick={() => handleRevoke(invite._id)}
                      disabled={revokingId === invite._id}
                    >
                      <IconTrash size={13} />
                      {t("settings.team.revoke")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <form onSubmit={handleInvite} style={{ marginTop: 20 }}>
        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}
        <div className={styles.fieldRow}>
          <div className={styles.detailField} style={{ flex: 2 }}>
            <label htmlFor="inviteEmail">{t("settings.team.inviteEmail")}</label>
            <input
              id="inviteEmail"
              type="email"
              required
              placeholder={t("settings.ph.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="inviteRole">{t("settings.team.inviteRole")}</label>
            <select id="inviteRole" value={role} onChange={(e) => setRole(e.target.value)}>
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={sending}>
          <IconPlus size={14} />
          {sending ? t("settings.team.sending") : t("settings.team.sendInvite")}
        </button>
      </form>
    </section>
  );
}
