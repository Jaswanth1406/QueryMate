// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import arcjet, {
  type BotOptions,
  detectBot,
  type EmailOptions,
  protectSignup,
  shield,
  slidingWindow,
  type SlidingWindowRateLimitOptions,
} from "@arcjet/next";
import ip from "@arcjet/ip";
import { NextResponse } from "next/server";

// Initialize Arcjet with shield protection
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userIdOrIp"],
  rules: [shield({ mode: "LIVE" })],
});

const botSettings = { mode: "LIVE", allow: [] } satisfies BotOptions;

const restrictiveRateLimitSettings = {
  mode: "LIVE",
  max: 3,
  interval: "10m",
} satisfies SlidingWindowRateLimitOptions<[]>;

const laxRateLimitSettings = {
  mode: "LIVE",
  max: 60,
  interval: "1m",
} satisfies SlidingWindowRateLimitOptions<[]>;

const emailSettings = {
  mode: "LIVE",
  block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
} satisfies EmailOptions;

const authHandlers = toNextJsHandler(auth);
export const { GET } = authHandlers;

export async function POST(req: Request) {
  // Clone for Arcjet check (we need to read body)
  const bodyText = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = null;
  }

  // Reconstruct the request with the body for Better Auth
  const clonedReq = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: bodyText,
  });

  const decision = await checkArcjet(req, body);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    } else if (decision.reason.isBot()) {
      return NextResponse.json(
        { error: "Bot activity detected. Request denied." },
        { status: 403 }
      );
    } else if (decision.reason.isEmail()) {
      let message: string;
      if (decision.reason.emailTypes.includes("DISPOSABLE")) {
        message = "Disposable email addresses are not allowed.";
      } else if (decision.reason.emailTypes.includes("INVALID")) {
        message = "Invalid email address.";
      } else if (decision.reason.emailTypes.includes("NO_MX_RECORDS")) {
        message = "Email domain has no MX records.";
      } else {
        message = "Email address is not allowed.";
      }
      return NextResponse.json({ error: message }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Request denied." }, { status: 403 });
    }
  }

  return authHandlers.POST(clonedReq);
}

async function checkArcjet(req: Request, clonedBody: unknown) {
  const url = new URL(req.url);
  const session = await auth.api.getSession({ headers: req.headers });

  const clientIp = ip(req, { platform: "vercel" });
  const userIdOrIp = session?.user?.id || clientIp || "127.0.0.1";
  // Better Auth uses /api/auth/sign-up/email
  const isSignUp =
    url.pathname.includes("/sign-up/email") ||
    url.pathname.includes("/signup/email");
  const isSignIn =
    url.pathname.includes("/sign-in/email") ||
    url.pathname.includes("/signin/email");

  if (isSignUp || isSignIn) {
    if (
      clonedBody &&
      typeof clonedBody === "object" &&
      "email" in clonedBody &&
      typeof clonedBody.email === "string"
    ) {
      return aj
        .withRule(
          protectSignup({
            email: emailSettings,
            bots: botSettings,
            rateLimit: restrictiveRateLimitSettings,
          })
        )
        .protect(req, { email: clonedBody.email, userIdOrIp });
    } else {
      // Auth email endpoint but no valid email in body – apply restrictive rate limit
      return aj
        .withRule(detectBot(botSettings))
        .withRule(slidingWindow(restrictiveRateLimitSettings))
        .protect(req, { userIdOrIp });
    }
  }

  // Default: lax rate limit for other auth endpoints
  return aj
    .withRule(detectBot(botSettings))
    .withRule(slidingWindow(laxRateLimitSettings))
    .protect(req, { userIdOrIp });
}