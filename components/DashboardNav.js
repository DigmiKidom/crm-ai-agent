"use client";

import { usePathname } from "next/navigation";
import {
  IconOverview,
  IconInbox,
  IconPipeline,
  IconContacts,
  IconEdit,
  IconSparkles,
  IconExternalLink,
} from "@/components/icons";
import styles from "./dashboard.module.css";

export default function DashboardNav({ tenantSlug }) {
  const pathname = usePathname();

  const items = [
    { href: `/t/${tenantSlug}`, label: "Overview", Icon: IconOverview, exact: true },
    { href: `/t/${tenantSlug}/leads`, label: "Leads", Icon: IconInbox },
    { href: `/t/${tenantSlug}/pipeline`, label: "Pipeline", Icon: IconPipeline },
    { href: `/t/${tenantSlug}/contacts`, label: "Contacts", Icon: IconContacts },
    { href: `/t/${tenantSlug}/site`, label: "Edit landing page", Icon: IconEdit },
    { href: `/t/${tenantSlug}/onboarding`, label: "AI Setup", Icon: IconSparkles },
  ];

  function isActive(item) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        </a>
      ))}
      <a
        href={`/l/${tenantSlug}`}
        target="_blank"
        rel="noreferrer"
        className={styles.navRow}
      >
        <IconExternalLink size={18} className={styles.navRowIcon} />
        <span>View landing page</span>
      </a>
    </nav>
  );
}
