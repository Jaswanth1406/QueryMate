// app/api/chat/route.ts
import { db } from "@/lib/lib";
import { messages, conversations, user, TOKEN_LIMITS } from "@/lib/schema";
import { streamText, generateText } from "ai";
import { gemini } from "@/lib/ai-gemini";
import { perplexity } from "@/lib/ai-perplexity";
import { groq } from "@/lib/ai-groq";
import { google } from "@ai-sdk/google";
import { MODELS, getModel } from "@/lib/models";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

// Helper to check and reset daily tokens (Gemini only)
async function checkAndResetDailyTokens(userId: string) {
  const [userData] = await db.select().from(user).where(eq(user.id, userId));

  if (!userData) return null;

  const now = new Date();
  const resetAt = new Date(userData.tokenResetAt);

  // Check if we need to reset (new day)
  if (
    now.getDate() !== resetAt.getDate() ||
    now.getMonth() !== resetAt.getMonth() ||
    now.getFullYear() !== resetAt.getFullYear()
  ) {
    // Reset daily tokens
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

// Helper to check if user has exceeded limits (Gemini only for now)
function checkLimits(
  userData: {
    tokensUsedGemini: number;
    requestsUsedGemini: number;
  },
  provider: string,
): { exceeded: boolean; message: string } {
  // Only check limits for Google models (they return token usage)
  if (provider === "google") {
    if (userData.tokensUsedGemini >= TOKEN_LIMITS.gemini.dailyTokens) {
      return {
        exceeded: true,
        message: `Daily token limit reached for Gemini (${TOKEN_LIMITS.gemini.dailyTokens.toLocaleString()} tokens). Resets at midnight.`,
      };
    }
    if (userData.requestsUsedGemini >= TOKEN_LIMITS.gemini.dailyRequests) {
      return {
        exceeded: true,
        message: `Daily request limit reached for Gemini (${TOKEN_LIMITS.gemini.dailyRequests} requests). Resets at midnight.`,
      };
    }
  }

  return { exceeded: false, message: "" };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { conversationId } = body as { conversationId?: string };
    const {
      message,
      title,
      model = "gemini-2.5-flash", // Default model
      useSearch = false,
      files = [],
    } = body as {
      message?: string;
      title?: string;
      model?: string;
      useSearch?: boolean;
      files?: Array<{ name: string; type: string; data: string }>;
    };

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    // Validate model exists in our config
    const modelConfig = getModel(model);
    if (!modelConfig) {
      return NextResponse.json(
        { error: "Invalid model selected" },
        { status: 400 },
      );
    }

    // Check and reset daily tokens if needed
    const userData = await checkAndResetDailyTokens(session.user.id);
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has exceeded limits
    const limitCheck = checkLimits(userData, modelConfig.provider);
    if (limitCheck.exceeded) {
      return NextResponse.json({ error: limitCheck.message }, { status: 429 });
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
            eq(conversations.userId, session.user.id),
          ),
        );

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 },
        );
      }
    }

    // Save user message
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: message,
      model: null,
      tokensUsed: null,
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

    // Helper to get the AI model instance from config
    function getAIModel(config: NonNullable<typeof modelConfig>) {
      switch (config.provider) {
        case "google":
          return gemini(config.modelId);
        case "perplexity":
          return perplexity(config.modelId);
        case "groq":
          return groq(config.modelId);
        default:
          return gemini(config.modelId);
      }
    }

    if (isFirstMessage) {
      // Generate title using LLM (use a fast model for title generation)
      try {
        const titleModelConfig = MODELS["gemini-2.0-flash"] || modelConfig;
        const titleModel = getAIModel(titleModelConfig!);

        const titleGen = await streamText({
          model: titleModel,
          messages: [
            {
              role: "user",
              content: `Generate a very short 3-word title for this message. Output ONLY the title, nothing else: "${message}"`,
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
        // Title generation failed, but continue with the chat
      }
    }

    // Build history messages from database
    const formatted: {
      role: "user" | "assistant";
      content: string | ContentPart[];
    }[] = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content || "",
    }));

    // Content part types for multimodal messages
    type TextPart = { type: "text"; text: string };
    type ImagePart = {
      type: "image";
      source: { type: "base64"; mediaType: string; data: string };
    };
    type FilePart = {
      type: "file";
      data: Buffer;
      mediaType: string;
      filename: string;
    };
    type ContentPart = TextPart | ImagePart | FilePart;

    // Build current message content - handle files based on provider capabilities
    let currentMessageContent: string | ContentPart[] = message;
    const hasImages =
      files.length > 0 && files.some((f) => f.type.startsWith("image/"));
    const hasPDFs =
      files.length > 0 && files.some((f) => f.type === "application/pdf");
    const hasOtherFiles =
      files.length > 0 &&
      files.some(
        (f) => !f.type.startsWith("image/") && f.type !== "application/pdf",
      );

    if (modelConfig.provider === "google") {
      // For Google, support images and PDFs via multimodal format
      currentMessageContent = [
        {
          type: "text",
          text: message,
        },
      ];

      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          const base64Data = file.data.split(",")[1] || file.data; // Remove data:image/png;base64, prefix
          (currentMessageContent as ContentPart[]).push({
            type: "image",
            source: {
              type: "base64",
              mediaType: file.type,
              data: base64Data,
            },
          });
        } else if (file.type === "application/pdf") {
          const base64Data = file.data.split(",")[1] || file.data; // Remove data:application/pdf;base64, prefix
          (currentMessageContent as ContentPart[]).push({
            type: "file",
            data: Buffer.from(base64Data, "base64"),
            mediaType: "application/pdf",
            filename: file.name,
          });
        } else {
          // Other files - mention in text
          const textContent = (
            currentMessageContent as ContentPart[]
          )[0] as TextPart;
          textContent.text += `\n\n[File Attached: ${file.name} (${file.type})]`;
        }
      });
    } else if (modelConfig.provider === "perplexity") {
      // For Perplexity, support images and PDFs via file format
      currentMessageContent = [
        {
          type: "text",
          text: message,
        },
      ];

      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          const base64Data = file.data.split(",")[1] || file.data; // Remove data:image/png;base64, prefix
          (currentMessageContent as ContentPart[]).push({
            type: "file",
            data: Buffer.from(base64Data, "base64"),
            mediaType: file.type,
            filename: file.name,
          });
        } else if (file.type === "application/pdf") {
          const base64Data = file.data.split(",")[1] || file.data;
          (currentMessageContent as ContentPart[]).push({
            type: "file",
            data: Buffer.from(base64Data, "base64"),
            mediaType: "application/pdf",
            filename: file.name,
          });
        } else {
          // Other files - mention in text for Perplexity
          const textContent = (
            currentMessageContent as ContentPart[]
          )[0] as TextPart;
          textContent.text += `\n\n[File Attached: ${file.name} (${file.type})]`;
        }
      });
    } else {
      // For other providers (Groq), no file support - mention files in text only
      if (hasImages || hasPDFs || hasOtherFiles) {
        let messageWithFiles = message;
        files.forEach((file) => {
          messageWithFiles += `\n\n[File Attached: ${file.name} (${file.type})]`;
        });
        currentMessageContent = messageWithFiles;
      }
    }

    // Add current message to formatted array
    if (
      formatted.length > 0 &&
      formatted[formatted.length - 1].role === "user"
    ) {
      formatted[formatted.length - 1].content = currentMessageContent;
    } else {
      formatted.push({
        role: "user",
        content: currentMessageContent,
      });
    }

    // Select AI model based on user choice
    const selectedModel = getAIModel(modelConfig);

    // Store final variables for use in async operations
    const finalConversationId = conversationId;
    const finalModel = model;
    const finalProvider = modelConfig.provider;
    const supportsTokenUsage = modelConfig.supportsTokenUsage;
    const userId = session.user.id;

    // Prepare tools for Google models with search
    const tools =
      modelConfig.provider === "google" && useSearch
        ? {
            google_search: google.tools.googleSearch({}),
          }
        : undefined;

    // Build messages for the AI provider
    // Ensure content format matches provider capabilities
    const messagesToUse = formatted.map((msg) => {
      // For Groq and other non-file-supporting providers, convert array to string
      if (
        modelConfig.provider !== "google" &&
        modelConfig.provider !== "perplexity" &&
        Array.isArray(msg.content)
      ) {
        const textParts = (msg.content as ContentPart[])
          .filter((item) => item.type === "text")
          .map((item) => (item as TextPart).text);
        return {
          ...msg,
          content: textParts.join("\n"),
        };
      }
      return msg;
    });

    // For Perplexity, use generateText to get sources
    if (modelConfig.provider === "perplexity") {
      const { text, sources } = await generateText({
        model: selectedModel,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messagesToUse as any,
      });

      let finalContent = text;

      // Append sources if available
      if (sources && sources.length > 0) {
        finalContent += "\n\n---\n\n**Sources:**\n\n";
        const uniqueSources = new Map<string, string>();

        sources.forEach(
          (source: { url?: string; link?: string; title?: string }) => {
            const url = source.url || source.link;
            if (url && !uniqueSources.has(url)) {
              uniqueSources.set(url, source.title || url);
            }
          },
        );

        let sourceIndex = 1;
        uniqueSources.forEach((title: string, url: string) => {
          finalContent += `[${sourceIndex}] ${title}\n`;
          finalContent += `    ${url}\n\n`;
          sourceIndex++;
        });
      }

      // Save assistant message with sources
      await db.insert(messages).values({
        conversationId: finalConversationId,
        role: "assistant",
        content: finalContent,
        model: finalModel,
        tokensUsed: null,
      });

      // Return as text stream response like other models
      return new Response(finalContent, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Call AI
    const systemPrompt = tools
      ? "You have access to web search. Use the google_search tool to find current information when the user asks about recent events, news, weather, or anything that requires up-to-date information. Always search for the most relevant and current information."
      : undefined;

    try {
      const response = await streamText({
        model: selectedModel,
        system: systemPrompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messagesToUse as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: tools as any,
      });

      let full = "";

      // Collect the full response and track tokens
      (async () => {
        try {
          for await (const chunk of response.textStream) {
            full += chunk;
          }

          // Get token usage from the response (if supported)
          const usage = await response.usage;
          const totalTokens = supportsTokenUsage ? usage?.totalTokens || 0 : 0;

          // Save assistant message with token info
          await db.insert(messages).values({
            conversationId: finalConversationId,
            role: "assistant",
            content: full,
            model: finalModel,
            tokensUsed: totalTokens,
          });

          // Update user's token usage (Google models that support token tracking)
          if (finalProvider === "google" && totalTokens > 0) {
            await db
              .update(user)
              .set({
                tokensUsedGemini: sql`${user.tokensUsedGemini} + ${totalTokens}`,
                requestsUsedGemini: sql`${user.requestsUsedGemini} + 1`,
              })
              .where(eq(user.id, userId));
          }
        } catch (streamError) {
          console.error("Error processing stream:", streamError);
          // Still save what we got
          if (full) {
            await db.insert(messages).values({
              conversationId: finalConversationId,
              role: "assistant",
              content: full || "Error generating response. Please try again.",
              model: finalModel,
              tokensUsed: null,
            });
          }
        }
      })();

      return response.toTextStreamResponse();
    } catch (aiError) {
      console.error("AI Error Details:", aiError);
      const errorMessage =
        aiError instanceof Error ? aiError.message : String(aiError);
      throw new Error(`AI Generation Error: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error in chat route:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Full error:", error);
    return NextResponse.json(
      { error: `Chat error: ${errorMessage}` },
      { status: 500 },
    );
  }
}
