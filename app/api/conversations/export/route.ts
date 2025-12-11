// app/api/conversations/export/route.ts
import { db } from "@/lib/lib";
import { conversations, messages } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all conversations for the user
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, session.user.id))
      .orderBy(conversations.createdAt);

    // Get all messages for these conversations
    const exportData = await Promise.all(
      userConversations.map(async (conv) => {
        const convMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(messages.createdAt);

        return {
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt,
          messages: convMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            model: msg.model,
            tokensUsed: msg.tokensUsed,
            createdAt: msg.createdAt,
          })),
        };
      }),
    );

    const exportObj = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      conversations: exportData,
    };

    return NextResponse.json(exportObj, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="querymate-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
