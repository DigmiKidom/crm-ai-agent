import { Resend } from "resend";

// Resend will only send from a domain verified in its dashboard. A free
// provider address (gmail.com, outlook.com, …) can't be used as the sender:
// the domain's SPF/DKIM belong to Google, so the send is rejected.
//
// The pattern that gets you a personal inbox for replies is to send *from* the
// verified domain and set reply-to separately — REPLY_TO_EMAIL can be a Gmail
// address, only FROM_EMAIL is constrained.
const FROM_EMAIL = process.env.FROM_EMAIL || "Ceramony <noreply@ceramony.co>";
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || "";

const PRODUCT_NAME = process.env.PRODUCT_NAME || "Ceramony";
const BRAND_COLOR = "#2563eb";
const INK = "#111827";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const CANVAS = "#f4f5f7";

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
 */
function layout({ title, heading, intro, ctaLabel, ctaUrl, outro, footnote }) {
  const appUrl = getAppUrl();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
<!-- Preheader: the grey preview line in the inbox list. Without it, clients
     pull the first visible text, which here would be the heading again. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(intro)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
<tr>
<td align="center" style="padding:32px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">

<tr>
<td style="padding:0 4px 16px;">
<!-- A raster PNG, not the app's SVG: Gmail and Outlook strip SVG entirely.
     Exported at 2x and flattened onto white, since transparent marks invert
     badly in clients that force their own dark background.
     The styled alt text is deliberate — most clients block images by default
     on first receipt, so this is what a new signup actually sees. -->
<img src="${escapeHtml(appUrl)}/logo/ceramony-email-logo.png"
     width="132" height="26" alt="${escapeHtml(PRODUCT_NAME)}"
     style="display:block;border:0;outline:none;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${INK};">
</td>
</tr>

<tr>
<td style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;font-weight:600;color:${INK};">${escapeHtml(heading)}</h1>

<p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:${MUTED};">${escapeHtml(intro)}</p>

<!-- Bulletproof button: a table cell with padding and a background, not an
     <a> with padding, which Outlook collapses. -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" bgcolor="${BRAND_COLOR}" style="border-radius:8px;">
<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
</td>
</tr>
</table>

${
  outro
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">${escapeHtml(outro)}</p>`
    : ""
}

<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">
Or paste this link into your browser:<br>
<!-- word-break matters: a long token in a narrow mobile client otherwise
     forces the whole card to scroll sideways. -->
<a href="${escapeHtml(ctaUrl)}" style="color:${BRAND_COLOR};word-break:break-all;">${escapeHtml(ctaUrl)}</a>
</p>

${
  footnote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:24px;border-top:1px solid ${BORDER};margin-top:24px;"><p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">${escapeHtml(footnote)}</p></td></tr></table>`
    : ""
}

</td>
</tr>

<tr>
<td align="center" style="padding:20px 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${MUTED};">
<a href="${escapeHtml(appUrl)}" style="color:${MUTED};text-decoration:none;">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a>
<br>
<!-- Transactional mail is exempt from an unsubscribe link, but saying why it
     arrived is what keeps people from marking it as spam. -->
You received this because you have a ${escapeHtml(PRODUCT_NAME)} account.
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
 * carries both.
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

async function send({ to, subject, ...content }) {
  const resend = getClient();

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    // Only set when configured — Resend rejects an empty string here.
    ...(REPLY_TO_EMAIL ? { replyTo: REPLY_TO_EMAIL } : {}),
    html: layout({ title: subject, ...content }),
    text: plainText(content),
  });

  if (error) {
    throw new Error(error.message || `Resend failed to send: ${subject}`);
  }
}

export async function sendPasswordResetEmail(to, resetUrl) {
  await send({
    to,
    subject: "Reset your password",
    heading: "Reset your password",
    intro:
      "Someone asked to reset the password for this account. Choose a new one using the button below.",
    ctaLabel: "Set a new password",
    ctaUrl: resetUrl,
    outro: "This link expires in 1 hour and can only be used once.",
    footnote:
      "If you didn't request this, you can safely ignore this email — your password won't change.",
  });
}

export async function sendVerificationEmail(to, verifyUrl) {
  await send({
    to,
    subject: "Verify your email",
    heading: "Confirm your email address",
    intro:
      "Welcome aboard. Confirm your email address to finish setting up your account and start collecting leads.",
    ctaLabel: "Verify my email",
    ctaUrl: verifyUrl,
    outro: "This link expires in 24 hours.",
    footnote: "If you didn't create an account, you can safely ignore this email.",
  });
}

/**
 * Fired from the public lead-capture endpoint when the tenant has
 * notifications.emailOnNewLead switched on in Settings. `leadName` comes
 * straight off an unauthenticated public form, but it's safe here — every
 * field this lands in (subject/title/intro) goes through the same
 * escapeHtml() the rest of layout() already applies.
 */
export async function sendNewLeadNotificationEmail(to, { leadName, tenantName, leadUrl }) {
  await send({
    to,
    subject: `New lead: ${leadName}`,
    heading: "You have a new lead",
    intro: `${leadName} just came in through ${tenantName}'s landing page.`,
    ctaLabel: "View lead",
    ctaUrl: leadUrl,
    outro: "You can turn these email notifications off anytime in Settings.",
  });
}

export async function sendTeamInviteEmail(to, { tenantName, inviterName, role, acceptUrl }) {
  await send({
    to,
    subject: `${inviterName} invited you to join ${tenantName} on ${PRODUCT_NAME}`,
    heading: `Join ${tenantName} on ${PRODUCT_NAME}`,
    intro: `${inviterName} invited you to join their team as ${role === "admin" ? "an admin" : "a member"}. Create your account to get started.`,
    ctaLabel: "Accept invite",
    ctaUrl: acceptUrl,
    outro: "This link expires in 7 days and can only be used once.",
    footnote: "If you weren't expecting this, you can safely ignore this email.",
  });
}
