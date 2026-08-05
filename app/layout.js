import Script from "next/script";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata = {
  title: "CRM AI Agent",
  description: "AI-generated CRM and landing pages for capturing leads.",
};

// Runs before hydration so the dashboard never flashes light-then-dark. The
// dark tokens themselves are scoped to the dashboard shell (see
// dashboard.module.css), so setting this attribute on <html> here is safe
// even though it's app-wide — it's a no-op outside the dashboard.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
