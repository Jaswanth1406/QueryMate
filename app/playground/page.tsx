"use client";

/**
 * Playground Page
 * 
 * Claude Artifacts-style code playground with:
 * - LLM-powered code generation (structured JSON artifacts)
 * - Live iframe preview for frontend code
 * - E2B sandbox execution for backend code
 * - File tree navigation
 * - Code editor with syntax highlighting
 * - Real-time execution output streaming
 */

import { useCallback, useMemo } from "react";
import { 
  PanelLeftIcon, 
  PanelRightIcon,
  CodeIcon,
  EyeIcon,
  TerminalIcon,
  SparklesIcon,
  AlertCircleIcon,
  XIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileTree,
  CodeEditor,
  PreviewPanel,
  ExecutionPanel,
  PromptInput,
} from "@/components/playground";
import { usePlayground } from "@/hooks/usePlayground";
import Link from "next/link";

export default function PlaygroundPage() {
  const {
    artifact,
    selectedFile,
    fileTree,
    executionLogs,
    executionResult,
    isGenerating,
    isExecuting,
    error,
    generateArtifact,
    selectFile,
    updateFileContent,
    executeArtifact,
    clearError,
  } = usePlayground();
  
  // Get current file content
  const currentFile = useMemo(() => {
    if (!artifact || !selectedFile) return null;
    return artifact.files.find((f) => f.path === selectedFile);
  }, [artifact, selectedFile]);
  
  // Handle code changes
  const handleCodeChange = useCallback((code: string) => {
    if (selectedFile) {
      updateFileContent(selectedFile, code);
    }
  }, [selectedFile, updateFileContent]);
  
  // Determine which panels to show
  const showPreview = artifact?.artifact_type === "frontend" || artifact?.artifact_type === "hybrid";
  const showExecution = artifact?.artifact_type === "backend" || artifact?.artifact_type === "hybrid";
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">QueryMate</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <CodeIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Playground</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {artifact && (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground">Type:</span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded",
                artifact.artifact_type === "frontend" && "bg-blue-500/20 text-blue-500",
                artifact.artifact_type === "backend" && "bg-green-500/20 text-green-500",
                artifact.artifact_type === "hybrid" && "bg-purple-500/20 text-purple-500",
              )}>
                {artifact.artifact_type}
              </span>
              <span className="text-xs text-muted-foreground">Lang:</span>
              <span className="text-xs font-medium">{artifact.language}</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircleIcon className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearError}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Tree */}
        <aside className="w-56 border-r bg-muted/20 flex flex-col">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <PanelLeftIcon className="w-4 h-4" />
              Files
            </h3>
          </div>
          <div className="flex-1 overflow-auto">
            <FileTree
              nodes={fileTree}
              selectedPath={selectedFile}
              onSelectFile={selectFile}
            />
          </div>
        </aside>
        
        {/* Center - Code Editor */}
        <main className="flex-1 flex flex-col min-w-0">
          {currentFile ? (
            <CodeEditor
              code={currentFile.content}
              language={artifact?.language || "javascript"}
              filePath={currentFile.path}
              onChange={handleCodeChange}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center space-y-4">
                <CodeIcon className="w-16 h-16 mx-auto text-muted-foreground/50" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">No File Selected</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {artifact
                      ? "Select a file from the sidebar to view and edit its contents."
                      : "Enter a prompt below to generate code artifacts."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* Right Panel - Preview or Execution */}
        <aside className="w-[400px] border-l flex flex-col">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2",
                "border-b-2 transition-colors",
                showPreview
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <EyeIcon className="w-4 h-4" />
              Preview
            </button>
            <button
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2",
                "border-b-2 transition-colors",
                showExecution && !showPreview
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <TerminalIcon className="w-4 h-4" />
              Console
            </button>
          </div>
          
          {/* Panel Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview for frontend/hybrid */}
            {(showPreview || !artifact) && (
              <div className="flex-1">
                <PreviewPanel artifact={artifact} />
              </div>
            )}
            
            {/* Execution for backend/hybrid */}
            {showExecution && (
              <div className={cn("border-t", showPreview ? "h-1/2" : "flex-1")}>
                <ExecutionPanel
                  artifact={artifact}
                  onExecute={executeArtifact}
                  isExecuting={isExecuting}
                  logs={executionLogs}
                  result={executionResult}
                />
              </div>
            )}
            
            {/* Default execution panel for backend-only */}
            {!showPreview && !showExecution && artifact && (
              <ExecutionPanel
                artifact={artifact}
                onExecute={executeArtifact}
                isExecuting={isExecuting}
                logs={executionLogs}
                result={executionResult}
              />
            )}
          </div>
        </aside>
      </div>
      
      {/* Prompt Input */}
      <PromptInput
        onSubmit={generateArtifact}
        isGenerating={isGenerating}
      />
    </div>
  );
}
