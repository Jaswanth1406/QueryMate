// lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./lib";
import { user, session, account, verification } from "./schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    "http://localhost:3000",
    "https://query-mate-sable.vercel.app",
  ],

  advanced: {
    useSecureCookies: false,
    crossSubDomainCookies: {
      enabled: false,
    },
    disableCSRFCheck: true, // Add this for Postman testing
  },

  api: {
    basePath: "/api/auth",
  },

  plugins: [nextCookies()],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: process.env.BETTER_AUTH_URL
        ? `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`
        : "http://localhost:3000/api/auth/callback/google",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectURI: process.env.BETTER_AUTH_URL
        ? `${process.env.BETTER_AUTH_URL}/api/auth/callback/github`
        : "http://localhost:3000/api/auth/callback/github",
    },
  },
});
