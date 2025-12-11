// app/api/conversations/[id]/export-pdf/route.ts
import { db } from "@/lib/lib";
import { conversations, messages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.user.id),
        ),
      );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    // Get messages
    const convMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    // Return data for client-side PDF generation
    return NextResponse.json({
      conversation: {
        title: conversation.title || "Untitled Conversation",
        createdAt: conversation.createdAt,
      },
      messages: convMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        model: msg.model,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error("Export PDF error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
