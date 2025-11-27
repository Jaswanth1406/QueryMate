// app/api/conversations/route.ts
import { db } from "@/lib/lib";
import { conversations, messages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

// CREATE NEW CONVERSATION
export async function POST(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title } = await req.json();

    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        title: title || "New Conversation",
      })
      .returning();

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET USER CONVERSATIONS
export async function GET(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, session.user.id))
      .orderBy(conversations.createdAt);

    return NextResponse.json({ conversations: userConversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE CONVERSATION TITLE
export async function PUT(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, title } = await req.json();
    if (!id)
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 }
      );

    const [updated] = await db
      .update(conversations)
      .set({ title })
      .where(
        and(eq(conversations.id, id), eq(conversations.userId, session.user.id))
      )
      .returning();

    if (!updated)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE CONVERSATION AND ITS MESSAGES
export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id)
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 }
      );

    // Verify conversation belongs to user first
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, id), eq(conversations.userId, session.user.id))
      )
      .limit(1);

    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );

    // DELETE messages first
    await db.delete(messages).where(eq(messages.conversationId, id));

    // DELETE conversation
    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning();

    if (!deleted)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );

    return NextResponse.json({ message: "Conversation & messages deleted" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}