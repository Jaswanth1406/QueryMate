"use client";

/**
 * usePlayground Hook
 * 
 * Custom hook that manages all playground state and API interactions.
 * Handles artifact generation, code editing, and E2B execution.
 */

import { useState, useCallback } from "react";
import type { 
  Artifact, 
  ArtifactFile, 
  StreamedExecutionChunk, 
  ExecutionResult,
  GenerateResponse,
  FileTreeNode
} from "@/lib/playground/types";
import { buildFileTree } from "@/lib/playground/utils";

interface UsePlaygroundReturn {
  // State
  artifact: Artifact | null;
  selectedFile: string | null;
  fileTree: FileTreeNode[];
  executionLogs: StreamedExecutionChunk[];
  executionResult: ExecutionResult | null;
  isGenerating: boolean;
  isExecuting: boolean;
  error: string | null;
  
  // Actions
  generateArtifact: (prompt: string, preferences?: { framework?: string; backend?: string }) => Promise<void>;
  selectFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  executeArtifact: () => Promise<void>;
  clearLogs: () => void;
  clearError: () => void;
  setArtifact: (artifact: Artifact | null) => void;
}

export function usePlayground(): UsePlaygroundReturn {
  // Core state
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  
  // Execution state
  const [executionLogs, setExecutionLogs] = useState<StreamedExecutionChunk[]>([]);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  
  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Generate a new artifact from a prompt
   */
  const generateArtifact = useCallback(async (
    prompt: string,
    preferences?: { framework?: string; backend?: string }
  ) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, preferences }),
      });
      
      const data: GenerateResponse = await response.json();
      
      if (!data.success || !data.artifact) {
        throw new Error(data.error || "Failed to generate artifact");
      }
      
      // Update artifact and file tree
      setArtifact(data.artifact);
      const tree = buildFileTree(data.artifact.files);
      setFileTree(tree);
      
      // Auto-select first file
      if (data.artifact.files.length > 0) {
        setSelectedFile(data.artifact.files[0].path);
      }
      
      // Clear previous execution state
      setExecutionLogs([]);
      setExecutionResult(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, []);
  
  /**
   * Select a file for editing
   */
  const selectFile = useCallback((path: string) => {
    setSelectedFile(path);
  }, []);
  
  /**
   * Update file content in the artifact
   */
  const updateFileContent = useCallback((path: string, content: string) => {
    if (!artifact) return;
    
    const updatedFiles = artifact.files.map((file) =>
      file.path === path ? { ...file, content } : file
    );
    
    setArtifact({
      ...artifact,
      files: updatedFiles,
    });
  }, [artifact]);
  
  /**
   * Execute backend artifact in E2B sandbox with streaming
   */
  const executeArtifact = useCallback(async () => {
    if (!artifact) return;
    
    setIsExecuting(true);
    setExecutionLogs([]);
    setExecutionResult(null);
    setError(null);
    
    try {
      // Use streaming endpoint
      const response = await fetch("/api/playground/execute/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Execution failed");
      }
      
      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setExecutionLogs((prev) => [...prev, data]);
              
              if (data.type === "done") {
                setExecutionResult({
                  success: data.content === "Execution complete",
                  stdout: "",
                  stderr: "",
                });
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
      setExecutionResult({
        success: false,
        stdout: "",
        stderr: "",
        error: err instanceof Error ? err.message : "Execution failed",
      });
    } finally {
      setIsExecuting(false);
    }
  }, [artifact]);
  
  /**
   * Clear execution logs
   */
  const clearLogs = useCallback(() => {
    setExecutionLogs([]);
    setExecutionResult(null);
  }, []);
  
  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // State
    artifact,
    selectedFile,
    fileTree,
    executionLogs,
    executionResult,
    isGenerating,
    isExecuting,
    error,
    
    // Actions
    generateArtifact,
    selectFile,
    updateFileContent,
    executeArtifact,
    clearLogs,
    clearError,
    setArtifact,
  };
}
