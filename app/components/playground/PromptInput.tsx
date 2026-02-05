"use client";

/**
 * PromptInput Component
 * 
 * Input field for entering prompts to generate code artifacts.
 * Includes framework/language preferences and submit functionality.
 */

import { useState, useRef } from "react";
import { 
  SparklesIcon, 
  SettingsIcon,
  Loader2Icon,
  SendIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PromptInputProps {
  onSubmit: (prompt: string, preferences?: { framework?: string; backend?: string }) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function PromptInput({ onSubmit, isGenerating, disabled }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState<string | undefined>();
  const [backend, setBackend] = useState<string | undefined>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating || disabled) return;
    
    onSubmit(prompt.trim(), {
      framework,
      backend,
    });
    
    setPrompt("");
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };
  
  // Example prompts
  const examples = [
    "Create a React counter component with increment/decrement buttons",
    "Build a Python script that fetches weather data",
    "Create an interactive todo list with local storage",
    "Write a Node.js server that returns random quotes",
    "Build a CSS animation of a bouncing ball",
  ];
  
  return (
    <div className="border-t bg-background p-4">
      {/* Example prompts */}
      {!prompt && (
        <div className="mb-4 flex flex-wrap gap-2">
          {examples.slice(0, 3).map((example, i) => (
            <button
              key={i}
              onClick={() => setPrompt(example)}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}
      
      {/* Input area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || disabled}
            placeholder="Describe what you want to build..."
            className={cn(
              "w-full min-h-[48px] max-h-[200px] resize-none rounded-lg",
              "border bg-background px-4 py-3 pr-24",
              "text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            rows={1}
          />
          
          {/* Preferences button */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isGenerating}
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Frontend
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFramework("react")}>
                  <span className={cn(framework === "react" && "font-medium")}>
                    React {framework === "react" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFramework("vue")}>
                  <span className={cn(framework === "vue" && "font-medium")}>
                    Vue {framework === "vue" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFramework("vanilla")}>
                  <span className={cn(framework === "vanilla" && "font-medium")}>
                    Vanilla JS {framework === "vanilla" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Backend
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setBackend("python")}>
                  <span className={cn(backend === "python" && "font-medium")}>
                    Python {backend === "python" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBackend("node")}>
                  <span className={cn(backend === "node" && "font-medium")}>
                    Node.js {backend === "node" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setFramework(undefined); setBackend(undefined); }}>
                  Clear preferences
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              size="icon"
              className="h-8 w-8"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating || disabled}
            >
              {isGenerating ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Active preferences display */}
      {(framework || backend) && (
        <div className="mt-2 flex gap-2">
          {framework && (
            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
              {framework}
            </span>
          )}
          {backend && (
            <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">
              {backend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
