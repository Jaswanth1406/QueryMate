// app/api/chat/route.ts
import { db } from "@/lib/lib";
import { messages, conversations } from "@/lib/schema";
import { streamText } from "ai";
import { gemini } from "@/lib/ai-gemini";
// import { bedrock } from "@/lib/ai-bedrock"; // Uncomment when using Bedrock
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession(req);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { conversationId, message, title } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // If no conversationId provided, create a new conversation
    if (!conversationId) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          userId: session.user.id,
          title: title || "New Chat",
        })
        .returning();
      
      conversationId = newConversation.id;
    } else {
      // Verify conversation belongs to user
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, session.user.id)
          )
        );

      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }

    // Save user message
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: message,
    });

    // Load history
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    const formatted = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content || "",
    }));

    // Call AI
    const response = await streamText({
      model: gemini(process.env.GEMINI_MODEL!),
      // model: bedrock(process.env.BEDROCK_MODEL_ID!), // Switch to Bedrock when ready
      messages: formatted,
    });

    let full = "";

    // Collect the full response
    (async () => {
      for await (const chunk of response.textStream) {
        full += chunk;
      }

      // Save assistant message after stream completes
      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: full,
      });
    })();

    return response.toTextStreamResponse();
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
