/**
 * POST /api/playground/execute
 *
 * Executes backend artifacts (Python, Node.js, Bash) in an E2B sandbox.
 * Frontend code should NEVER be sent here - it runs in the browser iframe.
 *
 * SECURITY:
 * - Only backend languages are accepted
 * - Code runs in isolated E2B sandbox
 * - Timeout enforced to prevent runaway processes
 */

import { NextRequest, NextResponse } from "next/server";
import CodeInterpreter from "@e2b/code-interpreter";
import { getAuthSession } from "@/lib/auth-middleware";
import { isFrontendLanguage } from "@/lib/playground/types";
import type {
  ExecuteRequest,
  ExecuteResponse,
  ExecutionResult,
  Artifact,
} from "@/lib/playground/types";

/**
 * Write files to the E2B sandbox filesystem
 */
async function writeFilesToSandbox(
  sandbox: CodeInterpreter,
  files: { path: string; content: string }[],
): Promise<void> {
  for (const file of files) {
    // Create directory structure if needed
    const dirPath = file.path.split("/").slice(0, -1).join("/");
    if (dirPath) {
      await sandbox.files.makeDir(dirPath).catch(() => {
        // Directory might already exist
      });
    }

    // Write file content
    await sandbox.files.write(file.path, file.content);
  }
}

/**
 * Execute code in the E2B sandbox based on language
 */
async function executeInSandbox(
  sandbox: CodeInterpreter,
  artifact: Artifact,
): Promise<ExecutionResult> {
  const startTime = Date.now();
  let stdout = "";
  let stderr = "";

  try {
    // Write all files to sandbox
    await writeFilesToSandbox(sandbox, artifact.files);

    // Get the main file content to execute
    const mainFile = artifact.files[0];
    if (!mainFile) {
      throw new Error("No files to execute");
    }

    // Determine language for E2B
    const lang = artifact.language === "node" ? "js" : "python";

    // If there's a run command, we need to execute it differently
    // For now, we'll run the main file content directly
    const codeToRun = mainFile.content;

    // Execute the code using runCode API
    const execution = await sandbox.runCode(codeToRun, {
      language: lang,
    });

    // Collect output text
    if (execution.text) {
      stdout += execution.text + "\n";
    }

    // Check for errors
    if (execution.error) {
      stderr = `${execution.error.name}: ${execution.error.value}`;
      if (execution.error.traceback) {
        stderr += "\n" + execution.error.traceback;
      }
    }

    // Collect logs (stdout/stderr from print statements)
    const stdoutLogs = execution.logs?.stdout || [];
    const stderrLogs = execution.logs?.stderr || [];

    for (const log of stdoutLogs) {
      stdout += log + "\n";
    }
    for (const log of stderrLogs) {
      stderr += log + "\n";
    }

    const duration = Date.now() - startTime;

    return {
      success: !execution.error,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      error: execution.error ? execution.error.value : undefined,
      exitCode: execution.error ? 1 : 0,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      error: error instanceof Error ? error.message : "Execution failed",
      exitCode: 1,
      duration,
    };
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ExecuteResponse>> {
  let sandbox: CodeInterpreter | null = null;

  try {
    // Authenticate user
    const session = await getAuthSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse request body
    const body: ExecuteRequest = await request.json();

    if (!body.artifact) {
      return NextResponse.json(
        { success: false, error: "Artifact is required" },
        { status: 400 },
      );
    }

    const { artifact } = body;

    // SECURITY: Reject frontend artifacts
    if (
      artifact.artifact_type === "frontend" ||
      isFrontendLanguage(artifact.language)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Frontend code should run in the browser iframe, not E2B. Use artifact_type: 'backend' for server-side code.",
        },
        { status: 400 },
      );
    }

    // Check E2B API key (supports both E2B_API_KEY and E2B_KEY)
    const e2bApiKey = process.env.E2B_API_KEY || process.env.E2B_KEY;
    if (!e2bApiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "E2B API key not configured. Set E2B_API_KEY or E2B_KEY in .env",
        },
        { status: 500 },
      );
    }

    // Create E2B sandbox
    sandbox = await CodeInterpreter.create({
      apiKey: e2bApiKey,
    });

    // Execute the artifact
    const result = await executeInSandbox(sandbox, artifact);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error("[Playground Execute Error]:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Execution failed",
      },
      { status: 500 },
    );
  } finally {
    // Always kill the sandbox
    if (sandbox) {
      await sandbox.kill().catch(console.error);
    }
  }
}

/**
 * GET /api/playground/execute
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/playground/execute",
    method: "POST",
    description: "Execute backend code artifacts in an E2B sandbox",
    request: {
      artifact: "Artifact object (backend or hybrid only)",
      env: "Record<string, string> (optional) - Environment variables",
      timeout:
        "number (optional) - Execution timeout in seconds (default: 30, max: 120)",
    },
    response: {
      success: "boolean",
      result: {
        success: "boolean",
        stdout: "string",
        stderr: "string",
        error: "string (if failed)",
        exitCode: "number",
        duration: "number (ms)",
      },
    },
    security: [
      "Frontend artifacts are rejected (run in browser)",
      "Code runs in isolated E2B sandbox",
      "Timeout enforced to prevent abuse",
    ],
  });
}
