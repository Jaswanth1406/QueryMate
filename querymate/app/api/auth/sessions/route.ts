// app/api/auth/sessions/route.ts
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

export async function GET(req: Request) {
  try {
    const session = await getAuthSession(req);
    
    if (!session) {
      return NextResponse.json({ 
        user: null,
        session: null 
      }, { status: 401 });
    }

    return NextResponse.json({
      user: session.user,
      session: session.session
    });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
