"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  IconOverview,
  IconGrid,
  IconInbox,
  IconPipeline,
  IconContacts,
  IconEdit,
  IconSparkles,
  IconSettings,
  IconUser,
  IconFileText,
  IconExternalLink,
  IconChart,
  IconCalendar,
  IconDocument,
  IconTable,
  IconPlus,
  IconClose,
  IconTarget,
} from "@/components/icons";
import { hasRole } from "@/lib/roles";
import styles from "./dashboard.module.css";

export default function DashboardNav({ tenantSlug, unreadLeads = 0, workspaceItems = [], role }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftType, setDraftType] = useState("doc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const items = [
    { href: `/t/${tenantSlug}`, label: t("sidebar.overview"), Icon: IconOverview, exact: true },
    { href: `/t/${tenantSlug}/hub`, label: t("sidebar.hub"), Icon: IconGrid },
    { href: `/t/${tenantSlug}/leads`, label: t("sidebar.leads"), Icon: IconInbox, badge: unreadLeads },
    { href: `/t/${tenantSlug}/calendar`, label: t("sidebar.calendar"), Icon: IconCalendar },
    { href: `/t/${tenantSlug}/analytics`, label: t("sidebar.analytics"), Icon: IconChart },
    { href: `/t/${tenantSlug}/pipeline`, label: t("sidebar.pipeline"), Icon: IconPipeline },
    { href: `/t/${tenantSlug}/closed-deals`, label: t("sidebar.closedDeals"), Icon: IconTarget },
    { href: `/t/${tenantSlug}/contacts`, label: t("sidebar.contacts"), Icon: IconContacts },
    { href: `/t/${tenantSlug}/site`, label: t("sidebar.editLandingPage"), Icon: IconEdit },
    { href: `/t/${tenantSlug}/cv`, label: t("cv.title"), Icon: IconFileText },
    { href: `/t/${tenantSlug}/onboarding`, label: t("sidebar.aiSetup"), Icon: IconSparkles },
    { href: `/t/${tenantSlug}/profile`, label: t("account.profile"), Icon: IconUser },
    // Settings (including team management) is where every tenant-level config
    // change lives, so it's hidden for a "member" the same way the routes
    // underneath it are role-gated (see lib/roles.js) — not just redirected
    // on arrival, but never offered in the first place.
    ...(hasRole(role, "admin")
      ? [{ href: `/t/${tenantSlug}/settings`, label: t("sidebar.settings"), Icon: IconSettings }]
      : []),
  ];

  function isActive(item) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function cancelCreate() {
    setCreating(false);
    setDraftTitle("");
    setDraftType("doc");
    setError("");
  }

  async function handleCreate(e) {
    e.preventDefault();
    const title = draftTitle.trim();
    if (!title) return;

    setBusy(true);
    setError("");

    const res = await fetch("/api/workspace/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type: draftType }),
    });

    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error || t("sidebar.createFailed"));
      return;
    }

    cancelCreate();
    // refresh() re-runs the layout so the new page shows up in this list;
    // push() then opens it.
    router.refresh();
    router.push(`/t/${tenantSlug}/w/${data.item._id}`);
  }

  return (
    <nav className={styles.navTable}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={`${styles.navRow} ${isActive(item) ? styles.navRowActive : ""}`}
        >
          <item.Icon size={18} className={styles.navRowIcon} />
          <span>{item.label}</span>
          {item.badge > 0 && (
            <span
              className={styles.navBadge}
              title={
                item.badge === 1
                  ? t("sidebar.unreadOne", { count: item.badge })
                  : t("sidebar.unreadMany", { count: item.badge })
              }
            >
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </a>
      ))}

      <a
        href={`/pages/${tenantSlug}`}
        target="_blank"
        rel="noreferrer"
        className={styles.navRow}
      >
        <IconExternalLink size={18} className={styles.navRowIcon} />
        <span>{t("sidebar.viewLandingPage")}</span>
      </a>

      <div className={styles.navSectionLabel}>
        <span>{t("sidebar.workplace")}</span>
        {!creating && (
          <button
            type="button"
            className={styles.navSectionAdd}
            onClick={() => setCreating(true)}
            title={t("sidebar.newPage")}
            aria-label={t("sidebar.newPage")}
          >
            <IconPlus size={14} />
          </button>
        )}
      </div>

      {workspaceItems.map((item) => {
        const href = `/t/${tenantSlug}/w/${item.id}`;
        const Icon = item.type === "table" ? IconTable : IconDocument;
        return (
          <a
            key={item.id}
            href={href}
            className={`${styles.navRow} ${pathname === href ? styles.navRowActive : ""}`}
            title={item.title}
          >
            <Icon size={18} className={styles.navRowIcon} />
            <span className={styles.navRowTruncate}>{item.title}</span>
          </a>
        );
      })}

      {creating && (
        <form className={styles.navCreate} onSubmit={handleCreate}>
          <input
            autoFocus
            placeholder={t("sidebar.pageName")}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && cancelCreate()}
          />
          <div className={styles.navCreateTypes} role="radiogroup" aria-label={t("sidebar.pageType")}>
            {[
              ["doc", t("sidebar.document"), IconDocument],
              ["table", t("sidebar.table"), IconTable],
            ].map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={draftType === value}
                className={`${styles.navCreateType} ${
                  draftType === value ? styles.navCreateTypeActive : ""
                }`}
                onClick={() => setDraftType(value)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          {error && <span className={styles.navCreateError}>{error}</span>}
          <div className={styles.navCreateActions}>
            <button type="submit" disabled={busy || !draftTitle.trim()}>
              {busy ? t("sidebar.creating") : t("sidebar.create")}
            </button>
            <button type="button" onClick={cancelCreate} aria-label={t("common.cancel")}>
              <IconClose size={13} />
            </button>
          </div>
        </form>
      )}

      {!creating && workspaceItems.length === 0 && (
        <p className={styles.navEmptyHint}>{t("sidebar.emptyHint")}</p>
      )}
    </nav>
  );
}
