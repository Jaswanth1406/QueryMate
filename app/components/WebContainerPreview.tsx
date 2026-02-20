"use client";

/**
 * WebContainerPreview Component
 *
 * Renders a live preview of React code using StackBlitz WebContainers.
 * Supports real npm package installation and proper ES modules.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2Icon,
  AlertCircleIcon,
  RefreshCwIcon,
  TerminalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  runInWebContainer,
  isWebContainerSupported,
  type WebContainerStatus,
} from "@/lib/playground/webcontainer";

interface WebContainerPreviewProps {
  code: string;
  css?: string;
  dependencies?: Record<string, string>;
  className?: string;
  onError?: (error: string) => void;
}

interface ConsoleLog {
  type: "stdout" | "stderr";
  content: string;
  timestamp: number;
}

/**
 * Strip ANSI escape codes and spinner characters from terminal output
 */
function stripAnsiCodes(str: string): string {
  return (
    str
      // ANSI CSI sequences (e.g., \x1B[32m, \x1B[0K, \x1B[1;1H)
      // eslint-disable-next-line no-control-regex
      .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "")
      // ANSI OSC sequences
      // eslint-disable-next-line no-control-regex
      .replace(/\x1B\][^\x07]*\x07/g, "")
      // Bracketed sequences without escape char (e.g., [1G, [0K, [32m)
      .replace(/\[\d+;?\d*[A-Za-z]/g, "")
      .replace(/\[[0-9;]*m/g, "")
      // Spinner characters on their own lines
      .replace(/^[\\|/-]\s*$/gm, "")
      // Carriage returns and cursor movements
      .replace(/\r/g, "")
      // Collapse multiple blank lines into one
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function WebContainerPreview({
  code,
  css = "",
  dependencies = {},
  className,
  onError,
}: WebContainerPreviewProps) {
  const [status, setStatus] = useState<WebContainerStatus>({
    stage: "idle",
    message: "Ready to start",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const teardownRef = useRef<(() => Promise<void>) | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isStartingRef = useRef(false); // Guard against double execution (React StrictMode)

  // Check WebContainer support on mount
  useEffect(() => {
    setIsSupported(isWebContainerSupported());
  }, []);

  // Handle output logs
  const handleOutput = useCallback(
    (type: "stdout" | "stderr", data: string) => {
      // Strip ANSI escape codes for clean display
      const cleanData = stripAnsiCodes(data);
      if (!cleanData.trim()) return; // Skip empty lines

      setConsoleLogs((prev) => [
        ...prev,
        { type, content: cleanData, timestamp: Date.now() },
      ]);
    },
    [],
  );

  // Start the WebContainer
  const startContainer = useCallback(async () => {
    // Guard against double execution (React StrictMode)
    if (isStartingRef.current) {
      return;
    }
    isStartingRef.current = true;

    // Cleanup previous instance
    if (teardownRef.current) {
      await teardownRef.current();
      teardownRef.current = null;
    }

    setConsoleLogs([]);
    setPreviewUrl(null);

    try {
      const { teardown } = await runInWebContainer(
        code,
        css,
        dependencies,
        setStatus,
        (url) => {
          setPreviewUrl(url);
        },
        handleOutput,
      );
      teardownRef.current = teardown;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setStatus({ stage: "error", message: errorMsg });
      onError?.(errorMsg);
    } finally {
      isStartingRef.current = false;
    }
  }, [code, css, dependencies, handleOutput, onError]);

  // Auto-start on mount
  useEffect(() => {
    if (isSupported && code) {
      startContainer();
    }

    return () => {
      teardownRef.current?.();
    };
  }, []); // Only run once on mount

  // Restart when code changes significantly
  const handleRestart = useCallback(() => {
    isStartingRef.current = false; // Allow restart
    startContainer();
  }, [startContainer]);

  // Render unsupported state
  if (!isSupported) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full bg-zinc-900 text-white p-6",
          className,
        )}
      >
        <AlertCircleIcon className="w-12 h-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          WebContainers Not Supported
        </h3>
        <p className="text-sm text-zinc-400 text-center max-w-md">
          WebContainers require Cross-Origin Isolation (COOP/COEP headers).
          Please ensure your server is configured with the proper headers.
        </p>
        <code className="mt-4 text-xs bg-zinc-800 p-3 rounded">
          Cross-Origin-Embedder-Policy: require-corp{"\n"}
          Cross-Origin-Opener-Policy: same-origin
        </code>
      </div>
    );
  }

  // Render loading/error states
  if (status.stage !== "ready" && !previewUrl) {
    return (
      <div
        className={cn("flex flex-col h-full bg-zinc-900 text-white", className)}
      >
        {/* Status header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            {status.stage === "error" ? (
              <AlertCircleIcon className="w-5 h-5 text-red-500" />
            ) : (
              <Loader2Icon className="w-5 h-5 text-blue-500 animate-spin" />
            )}
            <div>
              <p className="text-sm font-medium capitalize">{status.stage}</p>
              <p className="text-xs text-zinc-400">{status.message}</p>
            </div>
          </div>
          {status.stage === "error" && (
            <div className="flex items-center gap-2">
              {status.message.includes("refresh") ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleRestart}>
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Console output - always visible during loading */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-4 font-mono text-xs">
          <div className="text-zinc-500 mb-2">📋 Console Output:</div>
          {consoleLogs.length === 0 ? (
            <div className="text-zinc-600">Waiting for output...</div>
          ) : (
            consoleLogs.map((log, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap",
                  log.type === "stderr" ? "text-red-400" : "text-zinc-300",
                )}
              >
                {log.content}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Render preview
  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-zinc-400 hover:text-white"
            onClick={() => setShowConsole(!showConsole)}
          >
            <TerminalIcon className="w-3 h-3 mr-1" />
            Console
            {showConsole ? (
              <ChevronDownIcon className="w-3 h-3 ml-1" />
            ) : (
              <ChevronUpIcon className="w-3 h-3 ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-zinc-400 hover:text-white"
            onClick={handleRestart}
          >
            <RefreshCwIcon className="w-3 h-3 mr-1" />
            Restart
          </Button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 relative">
        {previewUrl && (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0"
            title="WebContainer Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        )}
      </div>

      {/* Console panel */}
      {showConsole && (
        <div className="h-48 border-t border-zinc-700 bg-zinc-950 overflow-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <span className="text-xs text-zinc-400 font-medium">Console</span>
            <button
              onClick={() => setConsoleLogs([])}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>
          <div className="p-3 font-mono text-xs">
            {consoleLogs.length === 0 ? (
              <span className="text-zinc-600">No output</span>
            ) : (
              consoleLogs.map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    "whitespace-pre-wrap",
                    log.type === "stderr" ? "text-red-400" : "text-zinc-300",
                  )}
                >
                  {log.content}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
