"use client";

import { marked } from "marked";
import { memo, useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyIcon, CheckIcon, EyeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "./CanvasContext";

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

// Code block component with copy button and optional preview
function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "";
  const canvas = useCanvas();

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const handlePreview = useCallback(() => {
    if (canvas) {
      canvas.showPreview(children, language);
    }
  }, [canvas, children, language]);

  // Check if this code is previewable/executable
  // Frontend: HTML, CSS, JS, JSX, TSX, React (preview in browser)
  // Backend: Python, TypeScript, Node (run in E2B sandbox)
  const isPreviewable = [
    "html",
    "css",
    "javascript",
    "js",
    "jsx",
    "tsx",
    "react",
    "typescript",
    "ts",
    "python",
    "py",
  ].includes(language.toLowerCase());

  // Backend languages show "Run" button, frontend shows "Preview"
  const isBackendLanguage = ["python", "py", "typescript", "ts"].includes(
    language.toLowerCase(),
  );

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-zinc-800 dark:bg-zinc-900 text-zinc-400 text-xs px-4 py-2 rounded-t-lg">
        <span>{language || "code"}</span>
        <div className="flex items-center gap-1">
          {/* Preview/Run button - only show when canvas is open and code is previewable */}
          {canvas?.isCanvasOpen && isPreviewable && (
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-zinc-700 transition-colors",
                isBackendLanguage
                  ? "text-green-400 hover:text-green-300"
                  : "text-blue-400 hover:text-blue-300",
              )}
              onClick={handlePreview}
            >
              <EyeIcon className="h-3 w-3" />
              {isBackendLanguage ? "Run" : "Preview"}
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-zinc-700 transition-colors"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckIcon className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="h-3 w-3" />
                Copy code
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="bg-zinc-900 dark:bg-zinc-950 p-4 rounded-b-lg overflow-x-auto text-sm !mt-0">
        <code className={cn("text-zinc-100", className)}>{children}</code>
      </pre>
    </div>
  );
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              {...props}
              className="text-lg font-semibold mt-4 mb-2 text-foreground"
            />
          ),
          h2: (props) => (
            <h2
              {...props}
              className="text-base font-semibold mt-4 mb-2 text-foreground"
            />
          ),
          h3: (props) => (
            <h3
              {...props}
              className="text-sm font-semibold mt-3 mb-1 text-foreground"
            />
          ),
          p: (props) => (
            <p {...props} className="mb-3 text-foreground leading-relaxed" />
          ),
          ul: (props) => (
            <ul {...props} className="list-disc pl-5 mb-3 text-foreground" />
          ),
          ol: (props) => (
            <ol {...props} className="list-decimal pl-5 mb-3 text-foreground" />
          ),
          li: (props) => <li {...props} className="mb-1 text-foreground" />,
          strong: (props) => (
            <strong {...props} className="font-semibold text-foreground" />
          ),
          em: (props) => <em {...props} className="italic text-foreground" />,
          // Code blocks with copy button
          pre: ({ children }) => {
            return <>{children}</>;
          },
          code: ({ className, children }) => {
            const isInline = !className;
            const codeString = String(children).replace(/\n$/, "");

            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                  {children}
                </code>
              );
            }

            return <CodeBlock className={className}>{codeString}</CodeBlock>;
          },
          // Table styling
          table: (props) => (
            <div className="overflow-x-auto my-4">
              <table
                {...props}
                className="min-w-full border-collapse border border-border rounded-lg"
              />
            </div>
          ),
          thead: (props) => <thead {...props} className="bg-muted/50" />,
          tbody: (props) => <tbody {...props} />,
          tr: (props) => <tr {...props} className="border-b border-border" />,
          th: (props) => (
            <th
              {...props}
              className="px-4 py-2 text-left font-semibold text-foreground border border-border"
            />
          ),
          td: (props) => (
            <td
              {...props}
              className="px-4 py-2 text-foreground border border-border"
            />
          ),
          // Links
          a: (props) => (
            <a
              {...props}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // Blockquote
          blockquote: (props) => (
            <blockquote
              {...props}
              className="border-l-4 border-muted-foreground/30 pl-4 italic my-3 text-muted-foreground"
            />
          ),
          // Horizontal rule
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  },
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return (
      <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
        ))}
      </div>
    );
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
