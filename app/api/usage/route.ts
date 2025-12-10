// app/api/usage/route.ts
import { db } from "@/lib/lib";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userData] = await db
      .select({
        tokensUsedGemini: user.tokensUsedGemini,
        requestsUsedGemini: user.requestsUsedGemini,
        tokenResetAt: user.tokenResetAt,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if we need to reset (new day)
    const now = new Date();
    const resetAt = new Date(userData.tokenResetAt);
    const needsReset =
      now.getDate() !== resetAt.getDate() ||
      now.getMonth() !== resetAt.getMonth() ||
      now.getFullYear() !== resetAt.getFullYear();

    // Note: Limits vary by model. These are approximate averages.
    // Flash: 250k tokens/day, 20 requests/day
    // Flash Lite: 250k tokens/day, 20 requests/day
    const usage = needsReset
      ? {
          gemini: {
            tokensUsed: 0,
            tokensLimit: 250000, // Average limit
            requestsUsed: 0,
            requestsLimit: 20, // Average limit
          },
          perplexity: {
            unlimited: true,
          },
        }
      : {
          gemini: {
            tokensUsed: userData.tokensUsedGemini,
            tokensLimit: 250000, // Average limit
            requestsUsed: userData.requestsUsedGemini,
            requestsLimit: 20, // Average limit
          },
          perplexity: {
            unlimited: true,
          },
        };

    // Calculate next reset time (midnight)
    const nextReset = new Date(now);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);

    return NextResponse.json({
      usage,
      resetsAt: nextReset.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
