"use client";

/**
 * PreviewPanel Component
 *
 * Renders frontend artifacts in a sandboxed iframe.
 * - Uses srcDoc for secure content injection
 * - Supports auto-refresh on code changes
 * - Provides refresh and fullscreen controls
 *
 * SECURITY:
 * - sandbox attribute restricts iframe capabilities
 * - allow-scripts enables JS execution (required)
 * - Content is sanitized before rendering
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  RefreshCwIcon,
  MaximizeIcon,
  MinimizeIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  generatePreviewHtml,
  sanitizeHtml,
  debounce,
} from "@/lib/playground/utils";
import type { Artifact } from "@/lib/playground/types";

interface PreviewPanelProps {
  artifact: Artifact | null;
  autoRefresh?: boolean;
  refreshDelay?: number;
}

export function PreviewPanel({
  artifact,
  autoRefresh = true,
  refreshDelay = 500,
}: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  // Generate preview HTML when artifact changes
  const updatePreview = useCallback(() => {
    if (!artifact) {
      setPreviewHtml("");
      setError(null);
      return;
    }

    // Only preview frontend artifacts
    if (artifact.artifact_type === "backend") {
      setPreviewHtml("");
      setError("Backend artifacts run in E2B sandbox. Click 'Run' to execute.");
      return;
    }

    try {
      const html = generatePreviewHtml(artifact);
      const sanitized = sanitizeHtml(html);
      setPreviewHtml(sanitized);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate preview",
      );
      setPreviewHtml("");
    }
  }, [artifact]);

  // Debounced preview update for auto-refresh
  const debouncedUpdate = useCallback(
    () => debounce(updatePreview, refreshDelay)(),
    [updatePreview, refreshDelay],
  );

  // Update preview when artifact changes
  useEffect(() => {
    if (autoRefresh) {
      debouncedUpdate();
    }
    // Note: updatePreview is called via the button, not in effect to avoid setState in effect
  }, [artifact, autoRefresh, debouncedUpdate]);

  // Manual refresh
  const handleRefresh = () => {
    updatePreview();
    setKey((k) => k + 1); // Force iframe re-render
  };

  // Toggle fullscreen
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Open in new tab
  const handleOpenExternal = () => {
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Empty state
  if (!artifact) {
    return (
      <div className="flex flex-col h-full bg-muted/20">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Generate an artifact to see preview</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full bg-muted/20">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
          <AlertTriangleIcon className="w-12 h-12 text-amber-500" />
          <p className="text-sm text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-white dark:bg-zinc-900",
        isFullscreen && "fixed inset-0 z-50",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {artifact.language}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            title="Refresh preview"
          >
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleOpenExternal}
            title="Open in new tab"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <MinimizeIcon className="h-4 w-4" />
            ) : (
              <MaximizeIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          key={key}
          ref={iframeRef}
          srcDoc={previewHtml}
          sandbox="allow-scripts allow-modals"
          className="w-full h-full border-0 bg-white"
          title="Code Preview"
        />
      </div>
    </div>
  );
}
