// app/api/chat/route.ts
import { db } from "@/lib/lib";
import { messages, conversations, user, TOKEN_LIMITS } from "@/lib/schema";
import { streamText, generateText } from "ai";
import { gemini } from "@/lib/ai-gemini";
import { perplexity } from "@/lib/ai-perplexity";
import { groq } from "@/lib/ai-groq";
import { getModel } from "@/lib/models";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

async function checkAndResetDailyTokens(userId: string) {
  const [userData] = await db.select().from(user).where(eq(user.id, userId));
  if (!userData) return null;

  const now = new Date();
  const resetAt = new Date(userData.tokenResetAt);
  if (
    now.getDate() !== resetAt.getDate() ||
    now.getMonth() !== resetAt.getMonth() ||
    now.getFullYear() !== resetAt.getFullYear()
  ) {
    await db
      .update(user)
      .set({
        tokensUsedGemini: 0,
        requestsUsedGemini: 0,
        tokenResetAt: now,
      })
      .where(eq(user.id, userId));

    return {
      ...userData,
      tokensUsedGemini: 0,
      requestsUsedGemini: 0,
      tokenResetAt: now,
    };
  }

  return userData;
}

interface UserData {
  tokensUsedGemini: number;
  requestsUsedGemini: number;
}

function checkLimits(userData: UserData, provider: string) {
  if (provider === "google") {
    if (userData.tokensUsedGemini >= TOKEN_LIMITS.gemini.dailyTokens) {
      return {
        exceeded: true,
        message: `Daily token limit reached for Gemini.`,
      };
    }
    if (userData.requestsUsedGemini >= TOKEN_LIMITS.gemini.dailyRequests) {
      return {
        exceeded: true,
        message: `Daily request limit reached for Gemini.`,
      };
    }
  }
  return { exceeded: false, message: "" };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    let { conversationId } = body;
    const {
      message,
      prompt,
      title,
      model = "gemini-2.5-flash",
      files = [],
    } = body;

    const userMessage = message || prompt;
    if (!userMessage)
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );

    const modelConfig = getModel(model);
    if (!modelConfig)
      return NextResponse.json(
        { error: "Invalid model selected" },
        { status: 400 },
      );

    const userData = await checkAndResetDailyTokens(session.user.id);
    if (!userData)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const limitCheck = checkLimits(userData, modelConfig.provider);
    if (limitCheck.exceeded)
      return NextResponse.json({ error: limitCheck.message }, { status: 429 });

    // Create conversation if needed
    if (!conversationId) {
      try {
        const newConversation = await db
          .insert(conversations)
          .values({ userId: session.user.id, title: title || "New Chat" })
          .returning();

        if (!newConversation || !newConversation[0]) {
          return NextResponse.json(
            { error: "Failed to create conversation" },
            { status: 500 },
          );
        }

        conversationId = newConversation[0].id;
      } catch (err) {
        console.error("Conversation creation error:", err);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 },
        );
      }
    } else {
      // Verify existing conversation belongs to user
      const convExists = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, session.user.id),
          ),
        );

      if (!convExists.length) {
        return NextResponse.json(
          { error: "Conversation not found or inaccessible" },
          { status: 404 },
        );
      }
    }

    // Save user message (raw text only)
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: userMessage,
      model: null,
      tokensUsed: null,
    });

    // Check if this is the first message in conversation
    const messageCount = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    if (messageCount.length === 1) {
      // Generate title using LLM (use a fast model for title generation)
      try {
        const titleGen = await streamText({
          model: gemini("gemini-2.5-flash"),
          messages: [
            {
              role: "user",
              content: `Generate a very short 3-word title for this message. Output ONLY the title, nothing else: "${userMessage}"`,
            },
          ],
        });

        let generatedTitle = "";
        for await (const chunk of titleGen.textStream) {
          generatedTitle += chunk;
        }

        // Clean up the title and limit length
        generatedTitle = generatedTitle.replace(/['"]/g, "").trim();

        // Truncate title if it's too long (max 30 characters)
        if (generatedTitle.length > 30) {
          generatedTitle = generatedTitle.substring(0, 27) + "...";
        }

        // Update conversation with generated title
        if (generatedTitle) {
          await db
            .update(conversations)
            .set({ title: generatedTitle })
            .where(eq(conversations.id, conversationId));
        }
      } catch (titleError) {
        console.error("Error generating title:", titleError);
      }
    }

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted: any[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image"; image: string };

    let currentMessageContent: string | ContentPart[] = userMessage;

    const provider = modelConfig.provider;

    // ✅ GEMINI — supports: TEXT, IMAGE ONLY
    if (provider === "google") {
      const parts: ContentPart[] = [{ type: "text", text: userMessage }];

      for (const f of files) {
        if (f.type.startsWith("image/")) {
          parts.push({
            type: "image",
            image: f.data,
          });
        } else if (f.type === "application/pdf") {
          const base64 = f.data.split(",")[1];
          parts.push({
            type: "text",
            text: `PDF attached (base64):\n${base64}`,
          });
        } else {
          parts.push({
            type: "text",
            text: `File attached: ${f.name} (${f.type})`,
          });
        }
      }

      currentMessageContent = parts;
    }

    // ✅ PERPLEXITY — FULL MULTIMODAL SUPPORT
    else if (provider === "perplexity") {
      // Perplexity expects multimodal as separate message content, not array in same message
      let msg = userMessage;
      for (const f of files) {
        if (f.type.startsWith("image/")) {
          msg += `\n[Image attached: ${f.name}]`;
        } else if (f.type === "application/pdf") {
          msg += `\n[PDF attached: ${f.name}]`;
        } else {
          msg += `\n[File attached: ${f.name} (${f.type})]`;
        }
      }
      currentMessageContent = msg;
    }

    // ✅ GROQ — no multimodal → append filenames
    else {
      let msg = userMessage;
      for (const f of files) {
        msg += `\n\n[Attached: ${f.name} (${f.type})]`;
      }
      currentMessageContent = msg;
    }

    // Update the last message in formatted array (which is the user message we just saved)
    if (
      formatted.length > 0 &&
      formatted[formatted.length - 1].role === "user"
    ) {
      formatted[formatted.length - 1].content = currentMessageContent;
    }

    if (provider === "perplexity") {
      const { text, sources } = await generateText({
        model: perplexity(modelConfig.modelId),
        messages: formatted,
      });

      let final = text;

      if (sources?.length) {
        final += "\n\n---\nSources:\n";
        let i = 1;
        for (const s of sources) {
          const sourceTitle =
            (s as unknown as Record<string, unknown>).title ||
            (s as unknown as Record<string, unknown>).url ||
            "Unknown Source";
          final += `${i}. ${sourceTitle}\n`;
          i++;
        }
      }

      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: final,
        model,
        tokensUsed: null,
      });

      return new Response(final, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    const llm = (() => {
      if (provider === "google") return gemini(modelConfig.modelId);
      if (provider === "groq") return groq(modelConfig.modelId);
      return gemini(modelConfig.modelId);
    })();

    const response = await streamText({
      model: llm,
      messages: formatted,
    });

    let full = "";

    // Wait for the stream to complete and save message
    for await (const chunk of response.textStream) full += chunk;

    const usage = await response.usage;
    const totalTokens = usage?.totalTokens || 0;

    // Save assistant message
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: full,
      model,
      tokensUsed: totalTokens,
    });

    if (provider === "google") {
      await db
        .update(user)
        .set({
          tokensUsedGemini: sql`${user.tokensUsedGemini} + ${totalTokens}`,
          requestsUsedGemini: sql`${user.requestsUsedGemini} + 1`,
        })
        .where(eq(user.id, session.user.id));
    }

    return new Response(full, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
