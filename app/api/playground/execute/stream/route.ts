/**
 * POST /api/playground/execute/stream
 *
 * Streams execution output in real-time from E2B sandbox.
 * Uses Server-Sent Events (SSE) for streaming.
 */

import { NextRequest } from "next/server";
import CodeInterpreter from "@e2b/code-interpreter";
import { getAuthSession } from "@/lib/auth-middleware";
import { isFrontendLanguage } from "@/lib/playground/types";
import type { ExecuteRequest } from "@/lib/playground/types";

/**
 * Write files to the E2B sandbox filesystem
 */
async function writeFilesToSandbox(
  sandbox: CodeInterpreter,
  files: { path: string; content: string }[],
): Promise<void> {
  for (const file of files) {
    const dirPath = file.path.split("/").slice(0, -1).join("/");
    if (dirPath) {
      await sandbox.files.makeDir(dirPath).catch(() => {});
    }
    await sandbox.files.write(file.path, file.content);
  }
}

export async function POST(request: NextRequest) {
  // Authenticate user
  const session = await getAuthSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: ExecuteRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.artifact) {
    return new Response(JSON.stringify({ error: "Artifact is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { artifact } = body;

  // SECURITY: Reject frontend artifacts
  if (
    artifact.artifact_type === "frontend" ||
    isFrontendLanguage(artifact.language)
  ) {
    return new Response(
      JSON.stringify({ error: "Frontend code runs in browser, not E2B" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Supports both E2B_API_KEY and E2B_KEY
  const e2bApiKey = process.env.E2B_API_KEY || process.env.E2B_KEY;
  if (!e2bApiKey) {
    return new Response(
      JSON.stringify({
        error: "E2B API key not configured. Set E2B_API_KEY or E2B_KEY in .env",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let sandbox: CodeInterpreter | null = null;

      const sendEvent = (type: string, content: string) => {
        const data = JSON.stringify({ type, content, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        sendEvent("status", "Creating sandbox...");

        sandbox = await CodeInterpreter.create({
          apiKey: e2bApiKey,
        });

        sendEvent("status", "Writing files...");
        await writeFilesToSandbox(sandbox, artifact.files);

        // Get the main file content to execute
        const mainFile = artifact.files[0];
        if (!mainFile) {
          throw new Error("No files to execute");
        }

        // Determine language for E2B
        const lang = artifact.language === "node" ? "js" : "python";

        sendEvent("status", `Executing ${artifact.language} code...`);

        // Execute using runCode API
        const execution = await sandbox.runCode(mainFile.content, {
          language: lang,
        });

        // Send output
        if (execution.text) {
          sendEvent("stdout", execution.text);
        }

        // Send logs
        const stdoutLogs = execution.logs?.stdout || [];
        const stderrLogs = execution.logs?.stderr || [];

        for (const log of stdoutLogs) {
          sendEvent("stdout", log);
        }
        for (const log of stderrLogs) {
          sendEvent("stderr", log);
        }

        // Send error if any
        if (execution.error) {
          sendEvent(
            "error",
            `${execution.error.name}: ${execution.error.value}`,
          );
          if (execution.error.traceback) {
            sendEvent("stderr", execution.error.traceback);
          }
        }

        sendEvent(
          "done",
          execution.error ? "Execution failed" : "Execution complete",
        );
      } catch (error) {
        sendEvent(
          "error",
          error instanceof Error ? error.message : "Execution failed",
        );
        sendEvent("done", "Execution failed");
      } finally {
        if (sandbox) {
          await sandbox.kill().catch(console.error);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
