"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import styles from "./chrome.module.css";

// Routes that must never receive the product chrome:
//
//   /t/*      the dashboard, which renders its own slim header inside
//             DashboardShell so the header can drive the sidebar drawer
//   /pages/*  a tenant's public landing page — it carries that tenant's
//   /l/*      branding, colours and font, so Ceramony's own header/footer
//             would be actively wrong there
const BARE_PREFIXES = ["/t/", "/pages/", "/l/"];

function isBareRoute(pathname) {
  return BARE_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)
  );
}

/**
 * Decides whether the current route gets the marketing Header/Footer.
 *
 * This lives in a client component reading `usePathname()` rather than in the
 * root layout reading `cookies()`/`headers()`, because any dynamic API used in
 * the root layout opts *every* route into dynamic rendering — including the
 * ISR-cached tenant landing pages (`revalidate = 60`).
 */
export default function SiteChrome({ children }) {
  const pathname = usePathname() || "/";

  if (isBareRoute(pathname)) {
    return children;
  }

  return (
    <div className={styles.siteLayout}>
      <Header variant="public" />
      <main id="main-content" className={styles.siteMain}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
