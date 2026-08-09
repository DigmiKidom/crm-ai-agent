import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Tenant from "@/lib/models/Tenant";
import { verifyCode, consumeRecoveryCode } from "@/lib/twoFactor";

/**
 * Second factor for an account that has 2FA enabled. Accepts either a live
 * TOTP code or one of the single-use recovery codes, and reports back what to
 * persist so the accepted credential can't be used twice:
 *
 *   - a TOTP step is recorded as `lastUsedStep`, and verifyCode() refuses
 *     anything at or below it, so a code captured mid-window is dead;
 *   - a recovery code is removed from the stored list outright.
 */
function verifySecondFactor(user, submitted) {
  const input = String(submitted || "").trim();
  if (!input) return { ok: false };

  const step = verifyCode(user.twoFactor.secret, input, {
    minStep: user.twoFactor.lastUsedStep || 0,
  });
  if (step) {
    return { ok: true, set: { "twoFactor.lastUsedStep": step } };
  }

  const remaining = consumeRecoveryCode(user.twoFactor.recoveryCodes, input);
  if (remaining) {
    return { ok: true, set: { "twoFactor.recoveryCodes": remaining } };
  }

  return { ok: false };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Only ever required for an account with 2FA switched on — currently
        // platform admins. Blank on every ordinary sign-in.
        totp: { label: "Authentication code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select(
          "+passwordHash +twoFactor.secret +twoFactor.recoveryCodes +twoFactor.lastUsedStep"
        );
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // A suspended account fails exactly like a wrong password — same
        // null, same generic error on the login screen. Saying "your account
        // is suspended" here would confirm the address exists to anyone
        // guessing, and the people who need to know already have an email.
        if (user.suspendedAt) return null;

        if (user.twoFactor?.enabled) {
          const outcome = verifySecondFactor(user, credentials.totp);
          if (!outcome.ok) return null;
          // Persist whatever the check consumed — the used time-step, or the
          // spent recovery code — so neither can be replayed.
          await User.updateOne({ _id: user._id }, { $set: outcome.set });
        }

        const tenant = await Tenant.findById(user.tenantId);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          tenantId: user.tenantId.toString(),
          tenantSlug: tenant?.slug ?? "",
          role: user.role,
          platformRole: user.platformRole || "none",
          emailVerified: !!user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only defined on initial sign-in; persist the fields we
      // need onto the token so every request has tenant/role without a DB hit.
      if (user) {
        token.userId = user.id;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.role = user.role;
        token.platformRole = user.platformRole;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.tenantSlug = token.tenantSlug;
      session.user.role = token.role;
      // Present on the session for the proxy's cheap first-pass check only.
      // Every admin route re-reads the live User document before trusting it
      // (see lib/adminSession.js) — a JWT is only reissued at sign-in, so
      // revoking someone's admin access must not wait for their token to
      // expire.
      session.user.platformRole = token.platformRole || "none";
      session.user.emailVerified = token.emailVerified;
      return session;
    },
  },
});
