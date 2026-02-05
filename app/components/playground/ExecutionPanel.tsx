"use client";

/**
 * ExecutionPanel Component
 * 
 * Displays execution output from E2B sandbox.
 * - Shows stdout/stderr in real-time
 * - Supports streaming output via SSE
 * - Provides clear and copy functionality
 */

import { useState, useRef, useEffect } from "react";
import { 
  PlayIcon, 
  SquareIcon, 
  TrashIcon, 
  CopyIcon, 
  CheckIcon,
  TerminalIcon,
  AlertCircleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Artifact, StreamedExecutionChunk, ExecutionResult } from "@/lib/playground/types";

interface ExecutionPanelProps {
  artifact: Artifact | null;
  onExecute: () => void;
  isExecuting: boolean;
  logs: StreamedExecutionChunk[];
  result?: ExecutionResult | null;
}

export function ExecutionPanel({
  artifact,
  onExecute,
  isExecuting,
  logs,
  result,
}: ExecutionPanelProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);
  
  const handleCopy = async () => {
    const text = logs.map((l) => l.content).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const isBackend = artifact?.artifact_type === "backend" || artifact?.artifact_type === "hybrid";
  
  // Get output text color based on log type
  const getLogColor = (type: string) => {
    switch (type) {
      case "stderr":
      case "error":
        return "text-red-500";
      case "status":
        return "text-blue-500";
      case "done":
        return "text-green-500";
      default:
        return "text-foreground";
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Execution</span>
          {result && (
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded",
                result.success
                  ? "bg-green-500/20 text-green-500"
                  : "bg-red-500/20 text-red-500"
              )}
            >
              {result.success ? "Success" : "Failed"}
            </span>
          )}
          {result?.duration && (
            <span className="text-xs text-muted-foreground">
              {(result.duration / 1000).toFixed(2)}s
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {isBackend && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1"
              onClick={onExecute}
              disabled={!artifact || isExecuting}
            >
              {isExecuting ? (
                <>
                  <SquareIcon className="h-3 w-3" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="h-3 w-3" />
                  <span>Run</span>
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            disabled={logs.length === 0}
            title="Copy output"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            {!artifact ? (
              <p>Generate an artifact first</p>
            ) : isBackend ? (
              <>
                <TerminalIcon className="w-8 h-8 opacity-50" />
                <p>Click &quot;Run&quot; to execute in E2B sandbox</p>
                {artifact.run && (
                  <code className="text-xs bg-zinc-800 px-2 py-1 rounded">
                    {artifact.run}
                  </code>
                )}
              </>
            ) : (
              <>
                <AlertCircleIcon className="w-8 h-8 opacity-50" />
                <p>Frontend code runs in the preview panel</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className={cn("whitespace-pre-wrap", getLogColor(log.type))}>
                {log.type === "status" && (
                  <span className="text-blue-400">[info] </span>
                )}
                {log.type === "error" && (
                  <span className="text-red-400">[error] </span>
                )}
                {log.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
