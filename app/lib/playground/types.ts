/**
 * TypeScript types for the Hybrid LLM Code Execution System
 * Defines the schema for artifacts, execution results, and API contracts
 */

// ============================================================================
// ARTIFACT TYPES - Core schema for LLM output
// ============================================================================

export type ArtifactType = "frontend" | "backend" | "hybrid";

export type ArtifactLanguage =
  | "html"
  | "css"
  | "javascript"
  | "react"
  | "vue"
  | "python"
  | "node"
  | "bash";

export interface ArtifactFile {
  /** Relative path for the file (e.g., "index.html", "src/app.py") */
  path: string;
  /** Full content of the file */
  content: string;
}

/**
 * STRICT LLM Output Schema
 * The LLM MUST output this exact structure (not Markdown)
 */
export interface Artifact {
  /** Determines execution environment */
  artifact_type: ArtifactType;
  /** Primary language of the artifact */
  language: ArtifactLanguage;
  /** Array of files to create */
  files: ArtifactFile[];
  /** Command to run (for backend/hybrid artifacts) */
  run: string | null;
}

// ============================================================================
// EXECUTION TYPES - Results from sandbox execution
// ============================================================================

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  exitCode?: number;
  /** If backend exposes a port, the proxied URL */
  proxyUrl?: string;
  /** Execution duration in milliseconds */
  duration?: number;
}

export interface StreamedExecutionChunk {
  type: "stdout" | "stderr" | "error" | "done" | "status";
  content: string;
  timestamp: number;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/** POST /api/playground/generate - Request body */
export interface GenerateRequest {
  /** User's prompt describing what to build */
  prompt: string;
  /** Optional context from previous artifacts */
  context?: string;
  /** Preferred language/framework hints */
  preferences?: {
    framework?: "react" | "vue" | "vanilla";
    backend?: "python" | "node";
  };
}

/** POST /api/playground/generate - Response body */
export interface GenerateResponse {
  success: boolean;
  artifact?: Artifact;
  error?: string;
  /** Token usage info */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** POST /api/playground/execute - Request body */
export interface ExecuteRequest {
  /** The artifact to execute */
  artifact: Artifact;
  /** Optional environment variables for the sandbox */
  env?: Record<string, string>;
  /** Timeout in seconds (default: 30) */
  timeout?: number;
}

/** POST /api/playground/execute - Response body */
export interface ExecuteResponse {
  success: boolean;
  result?: ExecutionResult;
  error?: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface PlaygroundState {
  /** Current artifact being worked on */
  artifact: Artifact | null;
  /** Currently selected file in the editor */
  selectedFile: string | null;
  /** Execution output log */
  executionLog: StreamedExecutionChunk[];
  /** Is generation in progress */
  isGenerating: boolean;
  /** Is execution in progress */
  isExecuting: boolean;
  /** Error message to display */
  error: string | null;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileTreeNode[];
  language?: ArtifactLanguage;
}

// ============================================================================
// PREVIEW TYPES
// ============================================================================

export interface PreviewConfig {
  /** Whether to auto-refresh on code changes */
  autoRefresh: boolean;
  /** Delay before refreshing (ms) */
  refreshDelay: number;
  /** Whether to show console output in preview */
  showConsole: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Languages that run in the browser (iframe) */
export const FRONTEND_LANGUAGES: ArtifactLanguage[] = [
  "html",
  "css",
  "javascript",
  "react",
  "vue",
];

/** Languages that run in E2B sandbox */
export const BACKEND_LANGUAGES: ArtifactLanguage[] = ["python", "node", "bash"];

/** Check if a language runs in the browser */
export function isFrontendLanguage(lang: ArtifactLanguage): boolean {
  return FRONTEND_LANGUAGES.includes(lang);
}

/** Check if a language runs in E2B */
export function isBackendLanguage(lang: ArtifactLanguage): boolean {
  return BACKEND_LANGUAGES.includes(lang);
}
