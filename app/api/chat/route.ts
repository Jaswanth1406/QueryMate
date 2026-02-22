// app/api/chat/route.ts
import { db } from "@/lib/lib";
import { messages, conversations, user } from "@/lib/schema";
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
import { Buffer } from "buffer";

function getFileSupport(
  mimeType: string,
  provider: string,
): {
  supported: boolean;
  type: "image" | "pdf" | "text" | "audio" | "document" | "unsupported";
} {
  if (mimeType.startsWith("image/")) {
    return { supported: true, type: "image" };
  }

  if (
    mimeType === "application/pdf" &&
    (provider === "google" || provider === "perplexity")
  ) {
    return { supported: true, type: "pdf" };
  }

  if (
    (mimeType === "application/msword" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document") &&
    provider === "google"
  ) {
    return { supported: true, type: "document" };
  }

  if (
    (mimeType === "audio/wav" ||
      mimeType === "audio/mp3" ||
      mimeType === "audio/mpeg") &&
    provider === "google"
  ) {
    return { supported: true, type: "audio" };
  }

  if (mimeType === "text/plain" || mimeType.startsWith("text/")) {
    return { supported: true, type: "text" };
  }

  return { supported: false, type: "unsupported" };
}

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

function checkLimits(
  userData: UserData,
  modelConfig: { provider: string; limits?: { tpd?: number; rpd?: number } },
) {
  if (modelConfig.provider === "google" && modelConfig.limits) {
    const dailyTokenLimit = modelConfig.limits.tpd || 1_000_000;
    const dailyRequestLimit = modelConfig.limits.rpd || 100;

    if (userData.tokensUsedGemini >= dailyTokenLimit) {
      return {
        exceeded: true,
        message: `Daily token limit reached (${dailyTokenLimit.toLocaleString()} tokens/day).`,
      };
    }
    if (userData.requestsUsedGemini >= dailyRequestLimit) {
      return {
        exceeded: true,
        message: `Daily request limit reached (${dailyRequestLimit} requests/day).`,
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

    const formData = await req.formData();

    let conversationId = formData.get("conversationId") as string | null;
    const message = formData.get("message") as string;
    const title = formData.get("title") as string | null;
    const model = (formData.get("model") as string) || "gemini-2.5-flash";
    const useSearch = formData.get("useSearch") === "true";
    const useCanvas = formData.get("useCanvas") === "true";

    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        files.push(value);
      }
    }

    const userMessage = message;
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

    const limitCheck = checkLimits(userData, modelConfig);
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

    // Build file metadata for storage
    const fileMetadata: Array<{
      name: string;
      type: string;
      size: number;
    }> = [];

    // Save user message with file metadata if present
    const dbMessageContent =
      files.length > 0
        ? JSON.stringify({
            text: userMessage,
            files: files.map((f) => ({
              name: f.name,
              type: f.type,
              size: f.size,
            })),
          })
        : userMessage;

    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: dbMessageContent,
      model: null,
      tokensUsed: null,
    });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // Build multimodal content for the CURRENT message only
    let userMessageContent:
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image"; image: string | ArrayBuffer | Uint8Array | Buffer }
          | {
              type: "file";
              mediaType: string;
              data: string | ArrayBuffer | Uint8Array | Buffer;
            }
        >;

    const provider = modelConfig.provider;

    if (files.length > 0) {
      const parts: Array<
        | { type: "text"; text: string }
        | { type: "image"; image: Buffer }
        | { type: "file"; mediaType: string; data: Buffer }
      > = [];
      parts.push({ type: "text", text: userMessage });

      for (const file of files) {
        const mimeType = file.type;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileSupport = getFileSupport(mimeType, provider);

        fileMetadata.push({
          name: file.name,
          type: mimeType,
          size: file.size,
        });

        if (fileSupport.type === "image") {
          parts.push({
            type: "image",
            image: buffer,
          });
        } else if (
          fileSupport.type === "pdf" ||
          fileSupport.type === "document" ||
          fileSupport.type === "audio"
        ) {
          // ✅ Correct property: mediaType (not mimeType)
          parts.push({
            type: "file",
            mediaType: mimeType,
            data: buffer,
          });
        } else if (fileSupport.type === "text") {
          const textContent = buffer.toString("utf-8");
          parts.push({
            type: "text",
            text: `\n\n[Content from file: ${file.name}]\n${textContent}\n[End of file content]\n`,
          });
        }
      }

      userMessageContent = parts;
    } else {
      userMessageContent = userMessage;
    }

    // Format history: ALWAYS string content (AI SDK requirement)
    const formattedHistory = history.slice(0, -1).map((m) => {
      let textContent: unknown = m.content ?? "";

      // Try to unwrap JSON { text, files } structure
      if (typeof textContent === "string") {
        try {
          const parsed = JSON.parse(textContent);
          if (parsed && typeof parsed.text === "string") {
            textContent = parsed.text;
          }
        } catch {
          // Not JSON, keep as is
        }
      }

      if (typeof textContent !== "string") {
        textContent = JSON.stringify(textContent);
      }

      return {
        role: m.role as "user" | "assistant",
        content: textContent as string,
      };
    });

    // Remove the old formatted array usage
    const formatted = [
      ...formattedHistory,
      {
        role: "user" as const,
        content: userMessageContent,
      },
    ];

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

    // Canvas mode: generate complete, renderable code
    if (useCanvas) {
      systemPrompt = `You are in Canvas Mode for live code preview.

## IMPORTANT: DETECT THE USER'S INTENT
- If the user asks for a **UI, app, component, website, game, dashboard, form, calculator**, or anything visual/interactive → generate a **React component** (jsx).
- If the user asks for **Python code**, a script, an algorithm, data processing, or mentions Python → generate **Python code** (python).
- If the user asks for **JavaScript/TypeScript** code (non-React), Node.js, or a script → generate that language.
- If the user asks for **any other language** (C, Java, Go, Rust, SQL, etc.) → generate code in that language.
- When in doubt and the request is ambiguous, prefer React if it could be a visual/interactive app, otherwise match the language they mentioned.

## OUTPUT FORMAT - EXTREMELY IMPORTANT:
You MUST wrap your code in a markdown code fence with the correct language tag:
- For React/UI: \`\`\`jsx
- For Python: \`\`\`python
- For JavaScript: \`\`\`javascript
- For TypeScript: \`\`\`typescript
- For other languages: \`\`\`<language>

NEVER output raw code without the code fence wrapper. The preview system ONLY detects code inside markdown code blocks.

---

## WHEN GENERATING REACT (jsx) CODE:

### CRITICAL: ALWAYS USE TAILWIND CSS FOR STYLING
Your code MUST look professional with proper styling. Use Tailwind CSS classes on EVERY element.

### MANDATORY RULES:
1. Generate ONE complete code block only (jsx or tsx)
2. ALWAYS include ALL import statements at the top:
   - import { useState, useEffect, ... } from 'react';
   - import any external packages you use
3. ALWAYS export the component: export default function ComponentName()
4. Use Tailwind classes on EVERY element (no unstyled HTML)
5. NO separate CSS files
6. If using external npm packages, add this comment at the VERY TOP of your code:
   // DEPENDENCIES: package1, package2

### MANDATORY STYLING REQUIREMENTS:
- Every container: Use bg-*, p-*, m-*, rounded-*, shadow-* classes
- Every button: Use bg-*, hover:bg-*, text-*, px-*, py-*, rounded-* classes  
- Every input: Use border, rounded-*, p-*, focus:ring-*, focus:border-* classes
- Layout: Use flex, grid, gap-*, items-center, justify-center, min-h-screen
- Typography: Use text-*, font-*, leading-*, tracking-*

### EXAMPLE - Calculator with PROPER styling:
\`\`\`jsx
// DEPENDENCIES: framer-motion
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);

  const handleNumber = (num) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op) => {
    setPrevValue(parseFloat(display));
    setOperator(op);
    setDisplay('0');
  };

  const calculate = () => {
    const current = parseFloat(display);
    let result = 0;
    switch(operator) {
      case '+': result = prevValue + current; break;
      case '-': result = prevValue - current; break;
      case '*': result = prevValue * current; break;
      case '/': result = prevValue / current; break;
    }
    setDisplay(String(result));
    setPrevValue(null);
    setOperator(null);
  };

  const clear = () => { setDisplay('0'); setPrevValue(null); setOperator(null); };
  const buttons = ['7','8','9','/','4','5','6','*','1','2','3','-','0','C','=','+'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 w-80">
        <div className="bg-gray-800 rounded-2xl p-4 mb-4 text-right">
          <div className="text-gray-400 text-sm h-6">{prevValue} {operator}</div>
          <div className="text-white text-4xl font-light tracking-wider">{display}</div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn) => (
            <motion.button
              key={btn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (btn === 'C') clear();
                else if (btn === '=') calculate();
                else if (['+','-','*','/'].includes(btn)) handleOperator(btn);
                else handleNumber(btn);
              }}
              className={\`p-4 rounded-xl text-xl font-semibold \${
                ['+','-','*','/'].includes(btn)
                  ? 'bg-orange-500 hover:bg-orange-400 text-white'
                  : btn === '=' ? 'bg-green-500 hover:bg-green-400 text-white'
                  : btn === 'C' ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }\`}
            >
              {btn}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
\`\`\`

### KEY POINTS (React):
- ALWAYS start with imports (import { useState } from 'react')
- ALWAYS use export default function ComponentName()
- **ALWAYS use Unicode/emoji characters instead of icon packages**: ✕ ← → ÷ × + − = ⌫ 🔍 📋 ❌ ✅ ⚡ 🎵 📁 ⬆️ ⬇️ ☀️ 🌙 💡 🗑️ ✏️ 📤 📥 ❤️ ⭐ 🔔 👤 🏠 ⚙️ etc.
- **NEVER import react-icons** — the AI frequently hallucinates icon names that don't exist (e.g. MdDivide, FaPlusMinus). Use Unicode/emoji or inline SVG instead.
- If you absolutely need icons, create simple inline SVG components
- Make it look PROFESSIONAL with Tailwind gradients, shadows, and hover effects

---

## WHEN GENERATING NON-REACT CODE (Python, JS, etc.):

### Rules for non-React code:
1. Write clean, well-commented, complete code
2. Use the correct language tag in the code fence (\`\`\`python, \`\`\`javascript, etc.)
3. Include example usage or a main block where appropriate (e.g., \`if __name__ == "__main__":\` for Python)
4. Add brief explanatory text before the code block if helpful
5. The code should be ready to run as-is

### Python example:
\`\`\`python
def check_odd_even(number):
    """Check if a number is odd or even."""
    if number % 2 == 0:
        return f"{number} is EVEN"
    else:
        return f"{number} is ODD"

if __name__ == "__main__":
    num = int(input("Enter a number: "))
    print(check_odd_even(num))
\`\`\`

---

Generate COMPLETE, working code. Do NOT ask questions — just write the code.
REMEMBER: ALWAYS wrap code in \`\`\`language code fences. No raw code outside of code blocks.
Match the language to what the user asked for.`;
    } else if (provider === "google") {
      systemPrompt += " with access to tools. ";

      if (useSearch) {
        systemPrompt +=
          "Use the google_search tool to find current information when the user asks about recent events, news, weather, or anything that requires up-to-date information. ";
      }

      systemPrompt +=
        "\n\nYou have access to the executeCode tool for running Python or JavaScript code.\n\n" +
        "USE executeCode ONLY when:\n" +
        "- User explicitly asks to write, run, or execute code\n" +
        "- User requests calculations requiring computation (e.g., 'calculate fibonacci of 100', 'find prime numbers up to 1000')\n" +
        "- User asks for data analysis, processing, or visualization\n" +
        "- Complex mathematical operations that benefit from code\n\n" +
        "DO NOT use executeCode for:\n" +
        "- Explaining concepts, features, or answering informational questions\n" +
        "- Simple arithmetic (e.g., '2+2' can be answered directly as 4)\n" +
        "- Providing definitions or general knowledge\n" +
        "- Normal conversation\n\n" +
        "Example:\n" +
        "✓ 'calculate factorial of 50' → use executeCode\n" +
        "✓ 'generate fibonacci sequence up to 1000' → use executeCode\n" +
        "✗ 'explain what is fibonacci' → answer directly\n" +
        "✗ 'what is gemini 2.5 flash' → answer directly\n\n" +
        "To use executeCode:\n" +
        "1. Pass the code as a string in the 'code' parameter (no markdown, no backticks)\n" +
        "2. Optionally specify 'language' as 'python' or 'javascript'\n" +
        "3. Explain the results to the user after execution";
    } else {
      systemPrompt += ".";
    }

    // Build tools object with code execution + optional search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {};

    // Only add tools for Google (Groq has validation issues with custom tools)
    // IMPORTANT: Don't add executeCode in Canvas mode - we want AI to output code, not execute it
    if (provider === "google" && !useCanvas) {
      tools.executeCode = codeExecutionToolGoogle;

      if (useSearch) {
        tools.google_search = google.tools.googleSearch({});
      }
    } else if (provider === "google" && useCanvas && useSearch) {
      // In canvas mode, only add search if enabled (no code execution)
      tools.google_search = google.tools.googleSearch({});
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
    let lastToolCallArgs: { code?: string; language?: string } | null = null;

    // Use fullStream to capture text, tool calls, and tool results
    for await (const part of response.fullStream) {
      if (part.type === "text-delta") {
        full += part.text;
      } else if (part.type === "tool-call") {
        console.log("Tool called:", part.toolName);
        // Store the tool call arguments to display the code later
        if (part.toolName === "executeCode") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args = (part as any).args as {
            code?: string;
            language?: string;
          };
          lastToolCallArgs = args;
          console.log(
            "Stored tool call args:",
            lastToolCallArgs?.code?.substring(0, 100),
          );
        }
      } else if (part.type === "tool-result") {
        console.log(
          "Tool result received, lastToolCallArgs:",
          lastToolCallArgs?.code?.substring(0, 50),
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolResult = part as any;

        // The result could be in .output or .result depending on AI SDK version
        const result = (toolResult.output || toolResult.result) as
          | {
              output?: string | null;
              error?: string | null;
              logs?: string[];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              results?: Array<{ type: string; data: any }>;
            }
          | undefined;

        // Try to get args from tool result if not already captured
        if (!lastToolCallArgs && toolResult.args) {
          lastToolCallArgs = toolResult.args as {
            code?: string;
            language?: string;
          };
          console.log(
            "Got args from tool result:",
            lastToolCallArgs?.code?.substring(0, 50),
          );
        }

        // Append the code that was executed
        if (lastToolCallArgs?.code) {
          const lang = lastToolCallArgs.language || "python";
          const cleanCode = lastToolCallArgs.code
            .replace(/^```(?:python|javascript|js)?\n?/gm, "")
            .replace(/```$/gm, "")
            .trim();
          full += `\n\n\`\`\`${lang}\n${cleanCode}\n\`\`\`\n`;
          console.log("Added code to response");
        } else {
          console.log("No code args found to add");
        }

        // Append tool results to the response
        full += "\n**Code Execution Result:**\n";

        if (result?.error) {
          full += `\n❌ **Error:** ${result.error}\n`;
        }

        if (result?.output) {
          full += `\n\`\`\`\n${result.output}\n\`\`\`\n`;
        }

        if (result?.logs && result.logs.length > 0) {
          full += `\n**Output:**\n\`\`\`\n${result.logs.join("").trim()}\n\`\`\`\n`;
        }

        if (result?.results && result.results.length > 0) {
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

    // Check for rate limit error
    const errorMessage = e instanceof Error ? e.message : String(e);
    const isRateLimit =
      errorMessage.includes("quota") ||
      errorMessage.includes("429") ||
      errorMessage.includes("rate") ||
      errorMessage.includes("RESOURCE_EXHAUSTED");

    if (isRateLimit) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Please wait a moment and try again, or try a different model.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
