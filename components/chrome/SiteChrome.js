"use client";

import { useRoutePath } from "@/components/i18n/LocaleProvider";
import Header from "./Header";
import Footer from "./Footer";
import styles from "./chrome.module.css";

// Routes inside the localised tree that must never receive the product
// chrome: the dashboard renders its own slim header inside DashboardShell so
// the header can drive the sidebar drawer.
//
// The tenant landing pages used to be listed here too. They now live under a
// separate root layout (app/(public)) which never mounts SiteChrome at all —
// a structural guarantee rather than a prefix someone has to keep in sync.
const BARE_PREFIXES = ["/t/"];

function isBareRoute(routePath) {
  return BARE_PREFIXES.some(
    (prefix) => routePath === prefix.slice(0, -1) || routePath.startsWith(prefix)
  );
}

/**
 * Decides whether the current route gets the marketing Header/Footer.
 *
 * Still a client component reading the pathname rather than a server one
 * reading headers(): a dynamic API in the root layout would opt every route
 * under it into dynamic rendering.
 */
export default function SiteChrome({ children }) {
  // The path with its locale segment removed, so /he/t/acme and /en/t/acme
  // are the same route as far as this decision goes.
  const routePath = useRoutePath();

  if (isBareRoute(routePath)) {
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
