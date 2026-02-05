"use client";

/**
 * CodeEditor Component
 * 
 * Simple code editor with syntax highlighting.
 * Uses a textarea with monospace font for MVP.
 * Can be replaced with Monaco Editor for production.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getEditorLanguage } from "@/lib/playground/utils";
import { CopyIcon, CheckIcon, UndoIcon, RedoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeEditorProps {
  code: string;
  language: string;
  filePath: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({
  code,
  language,
  filePath,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([code]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Update history when code changes
  const handleChange = useCallback((newCode: string) => {
    onChange(newCode);
    
    // Add to history (debounced conceptually)
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newCode);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [onChange, historyIndex]);
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      handleChange(newCode);
      
      // Restore cursor position
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
    
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }
    
    // Ctrl/Cmd + Shift + Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
      e.preventDefault();
      handleRedo();
    }
  };
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [code]);
  
  const editorLanguage = getEditorLanguage(filePath);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{filePath}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {editorLanguage}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Shift+Z)"
          >
            <RedoIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className="select-none text-right pr-4 pt-4 pb-4 pl-4 bg-muted/20 text-muted-foreground text-xs font-mono leading-6 border-r">
            {code.split("\n").map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          
          {/* Code textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className={cn(
              "flex-1 p-4 bg-transparent resize-none outline-none",
              "font-mono text-sm leading-6 whitespace-pre",
              "placeholder:text-muted-foreground",
              readOnly && "cursor-default"
            )}
            spellCheck={false}
            placeholder="// Your code here..."
          />
        </div>
      </div>
    </div>
  );
}
