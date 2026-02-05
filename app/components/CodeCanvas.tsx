"use client";

/**
 * CodeCanvas Component
 * 
 * ChatGPT-style canvas that appears alongside chat.
 * Shows code preview with resizable split view.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { 
  XIcon, 
  PlayIcon,
  CodeIcon,
  EyeIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  RefreshCwIcon,
  TerminalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Artifact, StreamedExecutionChunk, ExecutionResult } from "@/lib/playground/types";
import { generatePreviewHtml } from "@/lib/playground/utils";

interface CodeCanvasProps {
  artifact: Artifact;
  onClose: () => void;
  onExecute?: () => Promise<void>;
  isExecuting?: boolean;
  executionLogs?: StreamedExecutionChunk[];
  executionResult?: ExecutionResult | null;
}

type TabType = "code" | "preview" | "console";

export function CodeCanvas({
  artifact,
  onClose,
  onExecute,
  isExecuting = false,
  executionLogs = [],
  executionResult,
}: CodeCanvasProps) {
  const isFrontendType = artifact.artifact_type === "frontend" || artifact.artifact_type === "hybrid";
  const isBackendType = artifact.artifact_type === "backend" || artifact.artifact_type === "hybrid";
  
  // Default to "preview" for frontend, "code" for backend
  const [activeTab, setActiveTab] = useState<TabType>(isFrontendType ? "preview" : "code");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const currentFile = artifact.files[selectedFileIndex];
  const isBackend = isBackendType;
  const isFrontend = isFrontendType;
  
  // Generate preview HTML
  const previewHtml = isFrontend ? generatePreviewHtml(artifact) : "";
  
  const handleCopy = async () => {
    if (currentFile) {
      await navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDownload = () => {
    if (currentFile) {
      const blob = new Blob([currentFile.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentFile.path.split("/").pop() || "code.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const handleRefresh = () => {
    setPreviewKey(k => k + 1);
  };
  
  // Get log color
  const getLogColor = (type: string) => {
    switch (type) {
      case "stderr":
      case "error":
        return "text-red-400";
      case "status":
        return "text-blue-400";
      case "done":
        return "text-green-400";
      default:
        return "text-gray-200";
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CodeIcon className="w-4 h-4 text-zinc-400" />
            <span className="font-medium text-sm">
              {artifact.files[0]?.path.split("/").pop() || "Code"}
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
            {artifact.language}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
            onClick={handleCopy}
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            <span className="ml-1.5 text-xs">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
            onClick={handleDownload}
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="ml-1.5 text-xs">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
            onClick={onClose}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-700 bg-zinc-800/50">
        {isFrontend && (
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === "preview"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
            )}
          >
            <EyeIcon className="w-4 h-4" />
            Preview
          </button>
        )}
        <button
          onClick={() => setActiveTab("code")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
            activeTab === "code"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          )}
        >
          <CodeIcon className="w-4 h-4" />
          Code
        </button>
        {isBackend && (
          <button
            onClick={() => setActiveTab("console")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              activeTab === "console"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
            )}
          >
            <TerminalIcon className="w-4 h-4" />
            Console
          </button>
        )}
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Action buttons */}
        {activeTab === "preview" && isFrontend && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
            onClick={handleRefresh}
          >
            <RefreshCwIcon className="w-4 h-4" />
          </Button>
        )}
        {isBackend && (
          <Button
            variant="default"
            size="sm"
            className="h-8 bg-green-600 hover:bg-green-700"
            onClick={onExecute}
            disabled={isExecuting}
          >
            <PlayIcon className="w-4 h-4 mr-1.5" />
            {isExecuting ? "Running..." : "Run"}
          </Button>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Preview Tab */}
        {activeTab === "preview" && isFrontend && (
          <div className="h-full bg-white">
            <iframe
              key={previewKey}
              ref={iframeRef}
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-modals"
              className="w-full h-full border-0"
              title="Preview"
            />
          </div>
        )}
        
        {/* Code Tab */}
        {activeTab === "code" && (
          <div className="h-full flex">
            {/* File list */}
            {artifact.files.length > 1 && (
              <div className="w-48 border-r border-zinc-700 bg-zinc-800/50 overflow-y-auto">
                {artifact.files.map((file, index) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(index)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm truncate transition-colors",
                      index === selectedFileIndex
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    )}
                  >
                    {file.path.split("/").pop()}
                  </button>
                ))}
              </div>
            )}
            
            {/* Code view */}
            <div className="flex-1 overflow-auto">
              <pre className="p-4 text-sm font-mono text-zinc-200 whitespace-pre-wrap">
                <code>{currentFile?.content}</code>
              </pre>
            </div>
          </div>
        )}
        
        {/* Console Tab */}
        {activeTab === "console" && (
          <div className="h-full overflow-auto p-4 font-mono text-sm bg-zinc-950">
            {executionLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <TerminalIcon className="w-12 h-12 mb-4 opacity-50" />
                <p>Click "Run" to execute the code</p>
                {artifact.run && (
                  <code className="mt-2 text-xs bg-zinc-800 px-2 py-1 rounded">
                    {artifact.run}
                  </code>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {executionLogs.map((log, i) => (
                  <div key={i} className={cn("whitespace-pre-wrap", getLogColor(log.type))}>
                    {log.content}
                  </div>
                ))}
                {executionResult && (
                  <div className={cn(
                    "mt-4 pt-4 border-t border-zinc-800",
                    executionResult.success ? "text-green-400" : "text-red-400"
                  )}>
                    {executionResult.success ? "✓ Execution complete" : "✗ Execution failed"}
                    {executionResult.duration && (
                      <span className="text-zinc-500 ml-2">
                        ({(executionResult.duration / 1000).toFixed(2)}s)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Resizable Split Layout
 * Wraps chat and canvas with a draggable divider
 */
interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRightWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export function ResizableSplit({
  left,
  right,
  defaultRightWidth = 500,
  minLeftWidth = 400,
  minRightWidth = 350,
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newRightWidth = containerRect.right - e.clientX;
      
      // Clamp to min/max
      const maxRightWidth = containerRect.width - minLeftWidth;
      const clampedWidth = Math.max(minRightWidth, Math.min(maxRightWidth, newRightWidth));
      
      setRightWidth(clampedWidth);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minLeftWidth, minRightWidth]);
  
  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left panel (chat) */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {left}
      </div>
      
      {/* Resize handle */}
      <div
        className={cn(
          "w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0",
          isDragging && "bg-primary"
        )}
        onMouseDown={handleMouseDown}
      />
      
      {/* Right panel (canvas) */}
      <div 
        className="flex-shrink-0 overflow-hidden border-l"
        style={{ width: rightWidth }}
      >
        {right}
      </div>
    </div>
  );
}
