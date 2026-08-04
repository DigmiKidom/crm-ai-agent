import { Resend } from "resend";

// Resend's shared "onboarding@resend.dev" sender works out of the box for
// testing without verifying a domain, but only delivers to the email address
// on the Resend account itself. Once a domain is verified in the Resend
// dashboard, set FROM_EMAIL (e.g. "CRM AI Agent <noreply@yourdomain.com>")
// to send to any recipient.
const FROM_EMAIL = process.env.FROM_EMAIL || "CRM AI Agent <onboarding@resend.dev>";

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

export async function sendPasswordResetEmail(to, resetUrl) {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your password",
    html: `
      <p>Someone requested a password reset for this account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
  if (error) {
    throw new Error(error.message || "Resend failed to send the password reset email.");
  }
}

export async function sendVerificationEmail(to, verifyUrl) {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your email",
    html: `
      <p>Welcome! Please confirm your email address to finish setting up your account.</p>
      <p><a href="${verifyUrl}">Click here to verify your email</a>. This link expires in 24 hours.</p>
    `,
  });
  if (error) {
    throw new Error(error.message || "Resend failed to send the verification email.");
  }
}
