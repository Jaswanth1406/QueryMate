// app/api/analytics/route.ts
import { db } from "@/lib/lib";
import { messages, conversations, user } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user data with token usage
    const [userData] = await db
      .select({
        tokensUsedGemini: user.tokensUsedGemini,
        requestsUsedGemini: user.requestsUsedGemini,
        tokenResetAt: user.tokenResetAt,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId));

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Total conversations
    const totalConversations = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    // Total messages
    const userConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    const conversationIds = userConversations.map((c) => c.id);

    let totalMessages = 0;
    const messagesByRole = { user: 0, assistant: 0 };
    const messagesByModel: Record<string, number> = {};
    let totalTokensAllTime = 0;
    const messagesByHour = Array(24).fill(0);
    const messagesByDay: Record<string, number> = {};

    if (conversationIds.length > 0) {
      // Get all messages for user's conversations
      const allMessages = await db
        .select({
          role: messages.role,
          model: messages.model,
          tokensUsed: messages.tokensUsed,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(
          sql`${messages.conversationId} IN (${sql.join(
            conversationIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        );

      totalMessages = allMessages.length;

      // Process messages
      allMessages.forEach((msg) => {
        // Count by role
        if (msg.role === "user") messagesByRole.user++;
        if (msg.role === "assistant") messagesByRole.assistant++;

        // Count by model
        const modelName = msg.model || "unknown";
        messagesByModel[modelName] = (messagesByModel[modelName] || 0) + 1;

        // Sum tokens
        if (msg.tokensUsed) {
          totalTokensAllTime += msg.tokensUsed;
        }

        // Messages by hour
        if (msg.createdAt) {
          const hour = new Date(msg.createdAt).getHours();
          messagesByHour[hour]++;

          // Messages by day
          const day = new Date(msg.createdAt).toISOString().split("T")[0];
          messagesByDay[day] = (messagesByDay[day] || 0) + 1;
        }
      });
    }

    // Average conversation length
    const avgConversationLength =
      totalConversations[0].count > 0
        ? Math.round(totalMessages / totalConversations[0].count)
        : 0;

    // Peak usage hour
    const peakHour = messagesByHour.indexOf(Math.max(...messagesByHour));

    // Most recent conversations with message count
    const recentConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(5);

    const recentWithCounts = await Promise.all(
      recentConversations.map(async (conv) => {
        const [msgCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(eq(messages.conversationId, conv.id));

        return {
          ...conv,
          messageCount: msgCount.count,
        };
      }),
    );

    // Format messages by day for chart (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });

    const activityData = last30Days.map((day) => ({
      date: day,
      messages: messagesByDay[day] || 0,
    }));

    return NextResponse.json({
      analytics: {
        overview: {
          totalConversations: totalConversations[0].count,
          totalMessages,
          totalTokensAllTime,
          totalTokensToday: userData.tokensUsedGemini,
          requestsToday: userData.requestsUsedGemini,
          avgConversationLength,
        },
        messagesByRole,
        messagesByModel,
        timeAnalytics: {
          messagesByHour,
          peakHour,
          activityData,
        },
        recentConversations: recentWithCounts,
        accountAge: {
          createdAt: userData.createdAt,
          daysActive: Math.floor(
            (Date.now() - new Date(userData.createdAt).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        },
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch analytics",
      },
      { status: 500 },
    );
  }
}
