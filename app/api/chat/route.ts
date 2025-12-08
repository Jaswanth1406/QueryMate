// app/api/chat/route.ts
import { db } from "@/lib/lib";
import { messages, conversations, user, TOKEN_LIMITS } from "@/lib/schema";
import { streamText, generateText } from "ai";
import { gemini } from "@/lib/ai-gemini";
import { perplexity } from "@/lib/ai-perplexity";
import { groq } from "@/lib/ai-groq";
import { google } from "@ai-sdk/google";
import { getModel } from "@/lib/models";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";
import CodeInterpreter from "@e2b/code-interpreter";
import { z } from "zod";

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

// 🔧 E2B CODE EXECUTION TOOL (Google only)
async function executeCodeInSandbox(args: {
  code: string;
  language?: "python" | "javascript";
}) {
  const { code, language } = args;
  console.log("🔧 executeCode called with:", { code, language });

  const lang = language || "python";

  console.log("🔧 Using language:", lang, "Code type:", typeof code);

  // Validate code parameter
  if (!code || typeof code !== "string") {
    console.error("❌ Invalid code parameter:", code);
    return {
      output: null,
      error: `Invalid tool call. The 'code' parameter is required and must be a string.`,
      logs: [],
      results: [],
    };
  }

  console.log("✅ Code validation passed, creating sandbox...");

  const sandbox = await CodeInterpreter.create({
    apiKey: process.env.E2B_KEY,
  });
  try {
    // Strip backticks and code block markers if present
    const cleanCode = code
      .replace(/^```(?:python|javascript|js)?\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    console.log(
      "✨ Cleaned code:",
      cleanCode.substring(0, 100) + (cleanCode.length > 100 ? "..." : ""),
    );

    // Validate cleaned code
    if (!cleanCode) {
      return {
        output: null,
        error: "Code is empty after cleaning",
        logs: [],
        results: [],
      };
    }

    console.log("⚡ Running code in E2B sandbox...");

    const execution = await sandbox.runCode(cleanCode, {
      language: lang === "javascript" ? "js" : "python",
    });

    console.log("✅ Execution completed:", {
      hasText: !!execution.text,
      hasError: !!execution.error,
      hasLogs: !!execution.logs,
      logsStdout: execution.logs?.stdout,
      logsStderr: execution.logs?.stderr,
      resultsCount: execution.results?.length || 0,
    });

    // Combine stdout and stderr from logs
    const stdoutLogs = execution.logs?.stdout || [];
    const stderrLogs = execution.logs?.stderr || [];
    const allLogs = [...stdoutLogs, ...stderrLogs];

    return {
      output: execution.text || null,
      error: execution.error ? execution.error.value : null,
      logs: allLogs,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results: execution.results.map((r: any) => ({
        type: r.text ? "text" : r.png ? "image" : "data",
        data: r.text || r.png || r.json,
      })),
    };
  } catch (err) {
    console.error("❌ Execution error:", err);
    return {
      output: null,
      error: err instanceof Error ? err.message : String(err),
      logs: [],
      results: [],
    };
  } finally {
    await sandbox.kill();
    console.log("🗑️ Sandbox cleaned up");
  }
}

// Google tool definition
const codeExecutionToolGoogle = {
  description:
    "Execute Python or JavaScript code in a secure sandbox. Returns the output, errors, and logs from execution.",
  parameters: z.object({
    code: z
      .string()
      .describe(
        "The code to execute. Must be valid Python or JavaScript code without markdown formatting.",
      ),
    language: z
      .enum(["python", "javascript"])
      .optional()
      .describe(
        "The programming language of the code. Defaults to python if not specified.",
      ),
  }),
  execute: executeCodeInSandbox,
};

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
      useSearch = false,
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

      // Check if this is the first message in conversation and generate title
      const messageCount = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      if (messageCount.length === 2) {
        // 2 messages means first user message + first assistant response
        try {
          const { text: generatedTitle } = await generateText({
            model: perplexity(modelConfig.modelId),
            messages: [
              {
                role: "user",
                content: `Generate a very short 3-word title for this message. Output ONLY the title, nothing else: "${userMessage}"`,
              },
            ],
          });

          // Clean up the title and limit length
          let cleanTitle = generatedTitle.replace(/['"]/g, "").trim();

          // Truncate title if it's too long (max 30 characters)
          if (cleanTitle.length > 30) {
            cleanTitle = cleanTitle.substring(0, 27) + "...";
          }

          // Update conversation with generated title
          if (cleanTitle) {
            await db
              .update(conversations)
              .set({ title: cleanTitle })
              .where(eq(conversations.id, conversationId));
          }
        } catch (titleError) {
          console.error("Error generating title:", titleError);
        }
      }

      return new Response(final, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    const llm = (() => {
      if (provider === "google") return gemini(modelConfig.modelId);
      if (provider === "groq") return groq(modelConfig.modelId);
      return gemini(modelConfig.modelId);
    })();

    // Build system prompt with tool instructions (Google only)
    let systemPrompt = "You are a helpful AI assistant";

    if (provider === "google") {
      systemPrompt += " with access to tools. ";

      if (useSearch) {
        systemPrompt +=
          "Use the google_search tool to find current information when the user asks about recent events, news, weather, or anything that requires up-to-date information. ";
      }

      systemPrompt +=
        "\n\nIMPORTANT: When the user asks for calculations, code execution, data processing, or programming tasks, you MUST use the executeCode tool.\n" +
        "To use executeCode:\n" +
        "1. Write the code you want to execute\n" +
        "2. Pass it to the executeCode tool with the 'code' parameter\n" +
        "3. The code parameter must contain the actual code as a string (no markdown, no backticks)\n" +
        "4. Optionally specify 'language' as 'python' or 'javascript'\n" +
        "5. The tool will execute the code and return the output\n" +
        "6. After receiving results, explain them to the user\n\n" +
        "Example: If user asks 'calculate 2+2', call executeCode with code='print(2+2)' and language='python'";
    } else {
      systemPrompt += ".";
    }

    // Build tools object with code execution + optional search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {};

    // Only add tools for Google (Groq has validation issues with custom tools)
    if (provider === "google") {
      tools.executeCode = codeExecutionToolGoogle;

      if (useSearch) {
        tools.google_search = google.tools.googleSearch({});
      }
    }

    // Only pass tools if we have any defined
    const hasTools = Object.keys(tools).length > 0;

    const response = await streamText({
      model: llm,
      system: systemPrompt,
      messages: formatted,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(hasTools ? { tools: tools as any } : {}),
    });

    let full = "";
    let hasToolCalls = false;

    // Use fullStream to capture text, tool calls, and tool results
    for await (const part of response.fullStream) {
      if (part.type === "text-delta") {
        full += part.text;
      } else if (part.type === "tool-call") {
        hasToolCalls = true;
        console.log("Tool called:", part.toolName);
      } else if (part.type === "tool-result") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (part as any).output as {
          output?: string | null;
          error?: string | null;
          logs?: string[];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results?: Array<{ type: string; data: any }>;
        };

        // Append tool results to the response
        full += "\n\n**Code Execution Result:**\n";

        if (result.error) {
          full += `\n❌ **Error:** ${result.error}\n`;
        }

        if (result.output) {
          full += `\n\`\`\`\n${result.output}\n\`\`\`\n`;
        }

        if (result.logs && result.logs.length > 0) {
          full += `\n**Output:**\n\`\`\`\n${result.logs.join("").trim()}\n\`\`\`\n`;
        }

        if (result.results && result.results.length > 0) {
          for (const res of result.results) {
            if (res.type === "image" && typeof res.data === "string") {
              full += `\n![Generated Image](data:image/png;base64,${res.data})\n`;
            } else if (res.type === "text") {
              full += `\n${res.data}\n`;
            }
          }
        }
      }
    }

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

    // Check if this is the first message in conversation and generate title
    const messageCount = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    if (messageCount.length === 2) {
      // 2 messages means first user message + first assistant response
      try {
        const titleGen = await streamText({
          model: llm,
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
