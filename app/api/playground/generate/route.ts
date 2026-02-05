/**
 * POST /api/playground/generate
 * 
 * Calls the LLM to generate a structured code artifact from a user prompt.
 * Returns JSON artifact (not Markdown).
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAuthSession } from "@/lib/auth-middleware";
import { parseArtifact } from "@/lib/playground/utils";
import { ARTIFACT_SYSTEM_PROMPT, createUserPrompt } from "@/lib/playground/prompts";
import type { GenerateRequest, GenerateResponse } from "@/lib/playground/types";

// Create Google provider with explicit API key from GOOGLE_API_KEY env var
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

// Use Gemini 2.5 Flash for artifact generation (good at following JSON schemas)
const model = google("gemini-2.5-flash");

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  try {
    // Authenticate user
    const session = await getAuthSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateRequest = await request.json();
    
    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Create enhanced prompt with preferences
    const userPrompt = createUserPrompt(body.prompt, body.preferences);

    // Generate artifact using LLM with low temperature for consistent JSON output
    const { text, usage } = await generateText({
      model,
      system: ARTIFACT_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3, // Lower temperature for more consistent JSON output
    });

    // Parse the LLM output into a structured artifact
    const artifact = parseArtifact(text);

    if (!artifact) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to generate valid artifact. Please try again." 
        },
        { status: 500 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      artifact,
      usage: usage ? {
        promptTokens: usage.inputTokens || 0,
        completionTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
      } : undefined,
    });

  } catch (error) {
    console.error("[Playground Generate Error]:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/playground/generate
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/playground/generate",
    method: "POST",
    description: "Generate code artifacts from natural language prompts",
    request: {
      prompt: "string (required) - Description of what to build",
      context: "string (optional) - Previous artifact context",
      preferences: {
        framework: "react | vue | vanilla (optional)",
        backend: "python | node (optional)",
      },
    },
    response: {
      success: "boolean",
      artifact: "Artifact object (see types.ts)",
      error: "string (if failed)",
      usage: "Token usage stats",
    },
  });
}
