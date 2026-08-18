"use client";

import NextLink from "next/link";
import { localeHref } from "@/lib/i18n/routing";
import { useLocale } from "./LocaleProvider";

/**
 * next/link with the current locale prefixed onto app-relative hrefs.
 *
 * Every internal link in the localised tree goes through this rather than
 * spelling out `/${locale}/...` at each call site — a missed prefix would
 * bounce the user through the proxy's redirect and silently drop them back
 * into whatever language their cookie remembers, which is precisely the
 * inconsistency this routing change exists to remove.
 *
 * Hrefs that must not carry a locale (/api, a tenant's /pages/<slug>) are
 * passed through untouched; see UNLOCALIZED_PREFIXES in lib/i18n/routing.js.
 */
export default function Link({ href, ...rest }) {
  const { locale } = useLocale();

  let target = href;
  if (typeof href === "string") {
    target = localeHref(locale, href);
  } else if (href && typeof href === "object" && typeof href.pathname === "string") {
    target = { ...href, pathname: localeHref(locale, href.pathname) };
  }

  return <NextLink href={target} {...rest} />;
}
