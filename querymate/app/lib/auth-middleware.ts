// lib/auth-middleware.ts
import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function getAuthSession(request: Request) {
  // Try to get token from Authorization header first (for frontend)
  const authHeader = request.headers.get("Authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // If token found in Authorization header, inject it into cookies for better-auth
  if (token) {
    const modifiedHeaders = new Headers(request.headers);
    const existingCookie = modifiedHeaders.get("Cookie") || "";
    const tokenCookie = `better-auth.session_token=${token}`;
    
    if (existingCookie) {
      modifiedHeaders.set("Cookie", `${existingCookie}; ${tokenCookie}`);
    } else {
      modifiedHeaders.set("Cookie", tokenCookie);
    }

    return await auth.api.getSession({ headers: modifiedHeaders });
  }

  // Otherwise, use the original request (cookie-based auth)
  return await auth.api.getSession({ headers: request.headers });
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
