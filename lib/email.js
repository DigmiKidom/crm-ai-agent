import { Resend } from "resend";
import { translate } from "@/lib/i18n/translate";
import { getDir, normalizeLocale } from "@/lib/i18n/config";

// Resend will only send from a domain verified in its dashboard. A free
// provider address (gmail.com, outlook.com, …) can't be used as the sender:
// the domain's SPF/DKIM belong to Google, so the send is rejected.
//
// The pattern that gets you a personal inbox for replies is to send *from* the
// verified domain and set reply-to separately — REPLY_TO_EMAIL can be a Gmail
// address, only FROM_EMAIL is constrained.
const FROM_EMAIL = process.env.FROM_EMAIL || "Ceramony <noreply@ceramony.co>";
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || "";

// Mirrors the address in the public marketing footer (components/chrome/Footer.js)
// so "who do I write back to" is the same answer everywhere a user sees it.
const CONTACT_EMAIL = "hello@ceramony.co";

const PRODUCT_NAME = process.env.PRODUCT_NAME || "Ceramony";

// Same palette as DESIGN_TOKENS.md's light theme — email can't read CSS
// custom properties, so these are the literal values.
const CANVAS = "#f1f5f9";
const CARD_BG = "#ffffff";
const INK = "#111827";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const PRIMARY = "#2563eb";

// The app's fixed "chrome" identity (Header/Footer, DESIGN_TOKENS.md's
// "Ceramony brand chrome" section) — dark slate, independent of light/dark
// theme. Reused here so the email reads as the same product as the app,
// rather than the generic light-card-on-grey look most transactional mail
// defaults to.
const CHROME_BG = "#0f172a";
const CHROME_FG = "#e2e8f0";
const CHROME_FG_MUTED = "#94a3b8";

const FONT_LTR = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
// Matches the RTL override in app/globals.css — Segoe UI's Hebrew glyphs read
// better than the system-ui fallback most LTR-first stacks lead with.
const FONT_RTL = "'Segoe UI','Helvetica Neue',Arial,system-ui,-apple-system,sans-serif";

let client;
function getClient() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Base URL used to build every link AND the logo image src below. In
// production this must be the real HTTPS domain — Gmail/Outlook/Apple Mail
// fetch images and follow links from their own servers, not the recipient's
// browser, so a value left at the http://localhost default (or any URL those
// clients can't reach) is why a logo silently fails to render or a link 404s.
export function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The shared email shell.
 *
 * Email clients are roughly 2005-era browsers: no flexbox, no grid, no
 * external or embedded stylesheets that survive Gmail, and Outlook renders
 * through Word. So this is table-based with inline styles throughout, which
 * looks archaic next to the app's CSS but is what actually renders.
 *
 * `locale` drives dir="rtl"/lang, right-aligned body copy, and the RTL font
 * stack — the same three things app/globals.css flips for the live app.
 */
function layout({
  locale = "en",
  title,
  preheader,
  heading,
  intro,
  ctaLabel,
  ctaUrl,
  outro,
  footnote,
  footerNote,
}) {
  const appUrl = getAppUrl();
  const dir = getDir(locale);
  const rtl = dir === "rtl";
  const font = rtl ? FONT_RTL : FONT_LTR;
  const align = rtl ? "right" : "left";
  const tt = (key, vars) => translate(locale, key, vars);

  // A raw URL must stay LTR even inside an RTL document, or the Unicode bidi
  // algorithm reorders its characters visually (the href itself is untouched
  // — this only affects how the text renders).
  const ltrText = (value) => `<span dir="ltr" style="unicode-bidi:embed;">${escapeHtml(value)}</span>`;

  return `<!doctype html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
<!-- Preheader: the grey preview line in the inbox list. Without it, clients
     pull the first visible text, which here would be the logo alt text. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || intro)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
<tr>
<td align="center" style="padding:40px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid ${BORDER};border-radius:16px;">

<!-- Header: fixed dark-slate chrome band, same as the app's own header. -->
<tr>
<td align="center" bgcolor="${CHROME_BG}" style="padding:32px 24px;border-radius:16px 16px 0 0;">
<!-- A raster PNG, not the app's SVG: Gmail and Outlook strip SVG entirely.
     Pre-flattened onto this exact chrome color (not white) so the opaque
     raster edge is invisible against the band behind it, and so email
     clients that force dark mode on light images have nothing near-white to
     invert here. Exported at 2x for retina. -->
<img src="${escapeHtml(appUrl)}/logo/ceramony-email-logo-dark.png"
     width="133" height="26" alt="${escapeHtml(PRODUCT_NAME)}"
     style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">
<div style="margin-top:8px;font-family:${font};font-size:12px;letter-spacing:.02em;color:${CHROME_FG_MUTED};">${escapeHtml(tt("brand.tagline"))}</div>
</td>
</tr>

<!-- Body -->
<tr>
<td bgcolor="${CARD_BG}" dir="${dir}" style="padding:40px 36px;font-family:${font};">

<h1 style="margin:0 0 14px;font-size:21px;line-height:1.35;font-weight:700;color:${INK};text-align:${align};">${escapeHtml(heading)}</h1>

<p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:${MUTED};text-align:${align};">${escapeHtml(intro)}</p>

<!-- Bulletproof, centered button: a table cell with padding and a background,
     not an <a> with padding, which Outlook collapses. -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" bgcolor="${PRIMARY}" style="border-radius:10px;">
<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:.01em;">${escapeHtml(ctaLabel)}</a>
</td>
</tr>
</table>
</td>
</tr>
</table>

${
  outro
    ? `<p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${MUTED};text-align:${align};">${escapeHtml(outro)}</p>`
    : ""
}

<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};text-align:${align};">
${escapeHtml(tt("email.pasteLink"))}<br>
<!-- word-break matters: a long token in a narrow mobile client otherwise
     forces the whole card to scroll sideways. -->
<a href="${escapeHtml(ctaUrl)}" style="color:${PRIMARY};word-break:break-all;">${ltrText(ctaUrl)}</a>
</p>

${
  footnote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:24px;border-top:1px solid ${BORDER};"><p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${MUTED};text-align:${align};">${escapeHtml(footnote)}</p></td></tr></table>`
    : ""
}

</td>
</tr>

<!-- Footer: dark-slate chrome band again, mirroring the header. -->
<tr>
<td align="center" bgcolor="${CHROME_BG}" dir="${dir}" style="padding:24px 24px 28px;font-family:${font};border-radius:0 0 16px 16px;">

<p style="margin:0 0 10px;font-size:12px;line-height:1.7;color:${CHROME_FG_MUTED};text-align:center;">
${escapeHtml(footerNote || tt("email.footerReceived", { productName: PRODUCT_NAME }))}
</p>

<p style="margin:0;font-size:12px;line-height:1.9;color:${CHROME_FG_MUTED};text-align:center;">
<a href="mailto:${CONTACT_EMAIL}" style="color:${CHROME_FG};text-decoration:none;">${ltrText(CONTACT_EMAIL)}</a>
&nbsp;·&nbsp;
<a href="${escapeHtml(appUrl)}/terms" style="color:${CHROME_FG};text-decoration:none;">${escapeHtml(tt("footer.terms"))}</a>
&nbsp;·&nbsp;
<a href="${escapeHtml(appUrl)}" style="color:${CHROME_FG};text-decoration:none;">${ltrText(appUrl.replace(/^https?:\/\//, ""))}</a>
</p>

<p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:${CHROME_FG_MUTED};opacity:.75;">
${ltrText(`© ${new Date().getFullYear()} ${PRODUCT_NAME}.`)} ${escapeHtml(tt("footer.rights"))}
</p>

</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

/**
 * Plain-text twin of the HTML above.
 *
 * Sending HTML with no text alternative is a well-known spam signal, and some
 * clients and screen readers prefer the text part outright — so every send
 * carries both. Hebrew renders right-to-left here automatically (the
 * Unicode bidi algorithm handles plain text on its own); no locale-specific
 * formatting is needed.
 */
function plainText({ heading, intro, ctaLabel, ctaUrl, outro, footnote }) {
  // Built as blocks joined by a blank line, rather than a line array — an
  // array of lines needs empty-string separators, and dropping the unset
  // optional fields then strips those separators too.
  return [
    heading,
    intro,
    `${ctaLabel}: ${ctaUrl}`,
    outro,
    footnote,
    `— ${PRODUCT_NAME}\n${getAppUrl()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function send({ to, subject, locale = "en", ...content }) {
  const resend = getClient();
  const loc = normalizeLocale(locale);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    // Only set when configured — Resend rejects an empty string here.
    ...(REPLY_TO_EMAIL ? { replyTo: REPLY_TO_EMAIL } : {}),
    html: layout({ title: subject, locale: loc, ...content }),
    text: plainText(content),
  });

  if (error) {
    throw new Error(error.message || `Resend failed to send: ${subject}`);
  }
}

export async function sendPasswordResetEmail(to, resetUrl, locale = "en") {
  const t = (key, vars) => translate(locale, key, vars);
  await send({
    to,
    locale,
    subject: t("email.reset.subject"),
    preheader: t("email.preheaderReset", { productName: PRODUCT_NAME }),
    heading: t("email.reset.heading"),
    intro: t("email.reset.intro"),
    ctaLabel: t("email.reset.cta"),
    ctaUrl: resetUrl,
    outro: t("email.reset.outro"),
    footnote: t("email.reset.footnote"),
  });
}

export async function sendVerificationEmail(to, verifyUrl, locale = "en") {
  const t = (key, vars) => translate(locale, key, vars);
  await send({
    to,
    locale,
    subject: t("email.verify.subject"),
    preheader: t("email.preheaderVerify", { productName: PRODUCT_NAME }),
    heading: t("email.verify.heading"),
    intro: t("email.verify.intro"),
    ctaLabel: t("email.verify.cta"),
    ctaUrl: verifyUrl,
    outro: t("email.verify.outro"),
    footnote: t("email.verify.footnote"),
  });
}

/**
 * Fired from the public lead-capture endpoint when the tenant has
 * notifications.emailOnNewLead switched on in Settings. `leadName` comes
 * straight off an unauthenticated public form, but it's safe here — every
 * field this lands in (subject/heading/intro) goes through the same
 * escapeHtml() the rest of layout() already applies.
 *
 * `locale` has no reliable source for this send: the recipient is the
 * tenant's own contact/owner, not whoever submitted the public form, and no
 * per-user or per-tenant language preference is persisted anywhere yet. It
 * defaults to English at the call site (app/api/leads/route.js) until that
 * exists.
 */
export async function sendNewLeadNotificationEmail(to, { leadName, tenantName, leadUrl }, locale = "en") {
  const t = (key, vars) => translate(locale, key, vars);
  await send({
    to,
    locale,
    subject: t("email.newLead.subject", { leadName }),
    preheader: t("email.preheaderNewLead", { leadName, tenantName }),
    heading: t("email.newLead.heading"),
    intro: t("email.newLead.intro", { leadName, tenantName }),
    ctaLabel: t("email.newLead.cta"),
    ctaUrl: leadUrl,
    outro: t("email.newLead.outro"),
    footerNote: t("email.footerReceivedLead", { tenantName }),
  });
}

/**
 * `locale` here is the *inviting admin's* current locale (their dashboard's
 * ceramony_locale cookie), passed by app/api/tenant/invites/route.js — used
 * as a best-effort stand-in for the invitee's own preference, since the
 * invitee has no account or cookie with this app yet and there's nothing
 * else to go on.
 */
export async function sendTeamInviteEmail(to, { tenantName, inviterName, role, acceptUrl }, locale = "en") {
  const t = (key, vars) => translate(locale, key, vars);
  await send({
    to,
    locale,
    subject: t("email.invite.subject", { inviterName, tenantName, productName: PRODUCT_NAME }),
    preheader: t("email.preheaderInvite", { inviterName, tenantName, productName: PRODUCT_NAME }),
    heading: t("email.invite.heading", { tenantName, productName: PRODUCT_NAME }),
    intro: t(role === "admin" ? "email.invite.introAdmin" : "email.invite.introMember", { inviterName }),
    ctaLabel: t("email.invite.cta"),
    ctaUrl: acceptUrl,
    outro: t("email.invite.outro"),
    footnote: t("email.invite.footnote"),
    footerNote: t("email.footerReceivedInvite", { inviterName, productName: PRODUCT_NAME }),
  });
}

/**
 * Not yet wired to a scheduler — there's no cron/queue in this codebase that
 * calls it. It exists so the template is ready the moment one is added (a
 * Vercel Cron route scanning Meeting.startAt would be the natural fit,
 * alongside a `reminderSentAt` field on Meeting to avoid double-sends).
 * `meetingType` should be one of MEETING_TYPES (lib/meetingConstants.js) —
 * its label is pulled from the same calendar.type.* dictionary the Calendar
 * UI already uses, so the wording never drifts between the two.
 */
export async function sendMeetingReminderEmail(
  to,
  { meetingTitle, meetingType, startAt, location, leadName, detailUrl },
  locale = "en"
) {
  const t = (key, vars) => translate(locale, key, vars);
  const when = new Date(startAt);
  const date = when.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  const time = when.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const typeLabel = t(`calendar.type.${meetingType || "meeting"}`);

  const intro = leadName
    ? t("email.meetingReminder.introWithLead", { type: typeLabel, leadName, meetingTitle, date, time })
    : t("email.meetingReminder.intro", { meetingTitle, date, time });

  await send({
    to,
    locale,
    subject: t("email.meetingReminder.subject", { meetingTitle, time }),
    preheader: t("email.preheaderMeetingReminder", { meetingTitle, time }),
    heading: t("email.meetingReminder.heading"),
    intro,
    ctaLabel: t("email.meetingReminder.cta"),
    ctaUrl: detailUrl,
    outro: location ? t("email.meetingReminder.outroLocation", { location }) : undefined,
    footnote: t("email.meetingReminder.footnote"),
  });
}
