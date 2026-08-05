"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IconOverview,
  IconInbox,
  IconPipeline,
  IconContacts,
  IconEdit,
  IconSparkles,
  IconSettings,
  IconExternalLink,
  IconChart,
  IconDocument,
  IconTable,
  IconPlus,
  IconClose,
} from "@/components/icons";
import styles from "./dashboard.module.css";

export default function DashboardNav({ tenantSlug, unreadLeads = 0, workspaceItems = [] }) {
  const pathname = usePathname();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftType, setDraftType] = useState("doc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const items = [
    { href: `/t/${tenantSlug}`, label: "Overview", Icon: IconOverview, exact: true },
    { href: `/t/${tenantSlug}/leads`, label: "Leads", Icon: IconInbox, badge: unreadLeads },
    { href: `/t/${tenantSlug}/analytics`, label: "Analytics", Icon: IconChart },
    { href: `/t/${tenantSlug}/pipeline`, label: "Pipeline", Icon: IconPipeline },
    { href: `/t/${tenantSlug}/contacts`, label: "Contacts", Icon: IconContacts },
    { href: `/t/${tenantSlug}/site`, label: "Edit landing page", Icon: IconEdit },
    { href: `/t/${tenantSlug}/onboarding`, label: "AI Setup", Icon: IconSparkles },
    { href: `/t/${tenantSlug}/settings`, label: "Settings", Icon: IconSettings },
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
      setError(data.error || "Could not create that page.");
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
              title={`${item.badge} unread ${item.badge === 1 ? "lead" : "leads"}`}
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
        <span>View landing page</span>
      </a>

      <div className={styles.navSectionLabel}>
        <span>Workplace</span>
        {!creating && (
          <button
            type="button"
            className={styles.navSectionAdd}
            onClick={() => setCreating(true)}
            title="New page"
            aria-label="New page"
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
            placeholder="Page name"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && cancelCreate()}
          />
          <div className={styles.navCreateTypes} role="radiogroup" aria-label="Page type">
            {[
              ["doc", "Document", IconDocument],
              ["table", "Table", IconTable],
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
              {busy ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={cancelCreate} aria-label="Cancel">
              <IconClose size={13} />
            </button>
          </div>
        </form>
      )}

      {!creating && workspaceItems.length === 0 && (
        <p className={styles.navEmptyHint}>
          Add a document or table to keep notes and lists alongside your CRM.
        </p>
      )}
    </nav>
  );
}
