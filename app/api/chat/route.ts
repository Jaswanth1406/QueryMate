// app/api/chat/route.ts
import { db } from "@/lib/lib";
import { messages, conversations } from "@/lib/schema";
import { streamText } from "ai";
import { gemini } from "@/lib/ai-gemini";
import { bedrock } from "@/lib/ai-bedrock";
import { perplexity } from "@/lib/ai-perplexity";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-middleware";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession(req);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { conversationId, message, title, model = "gemini" } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Validate model
    const validModels = ["gemini", "perplexity", "bedrock"];
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: "Invalid model selected" },
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

    // Generate title for first message
    const messageCount = history.length;
    const isFirstMessage = messageCount === 1;

    if (isFirstMessage) {
      // Generate title using LLM
      const titleModel = 
        model === "gemini" ? gemini(process.env.GEMINI_MODEL!) :
        model === "perplexity" ? perplexity(process.env.PERPLEXITY_MODEL!) :
        bedrock(process.env.BEDROCK_MODEL_ID!);

      const titleGen = await streamText({
        model: titleModel,
        messages: [
          { 
            role: "system", 
            content: "Summarize the user's message into a short 3 word title. Output ONLY 3 words, no quotes or punctuation." 
          },
          { role: "user", content: message }
        ]
      });

      let generatedTitle = "";
      for await (const chunk of titleGen.textStream) {
        generatedTitle += chunk;
      }

      // Clean up the title and limit length
      generatedTitle = generatedTitle.replace(/['"]/g, "").trim();
      
      // Truncate title if it's too long (max 30 characters)
      if (generatedTitle.length > 30) {
        generatedTitle = generatedTitle.substring(0, 20) + "...";
      }

      // Update conversation with generated title
      await db
        .update(conversations)
        .set({ title: generatedTitle })
        .where(eq(conversations.id, conversationId));
    }

    const formatted = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content || "",
    }));

    // Select AI model based on user choice
    const selectedModel = 
      model === "gemini" ? gemini(process.env.GEMINI_MODEL!) :
      model === "perplexity" ? perplexity(process.env.PERPLEXITY_MODEL!) :
      bedrock(process.env.BEDROCK_MODEL_ID!);

    // Call AI
    const response = await streamText({
      model: selectedModel,
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