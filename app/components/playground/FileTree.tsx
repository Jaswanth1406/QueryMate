"use client";

/**
 * FileTree Component
 *
 * Displays a hierarchical file tree for the artifact files.
 * Supports folder expansion/collapse and file selection.
 */

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/lib/playground/types";

interface FileTreeProps {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

// Get icon color based on file extension
function getFileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();

  const colorMap: Record<string, string> = {
    html: "text-orange-500",
    htm: "text-orange-500",
    css: "text-blue-500",
    scss: "text-pink-500",
    js: "text-yellow-500",
    jsx: "text-cyan-500",
    ts: "text-blue-600",
    tsx: "text-blue-400",
    py: "text-green-500",
    json: "text-yellow-600",
    md: "text-gray-500",
    vue: "text-emerald-500",
    sh: "text-gray-600",
  };

  return colorMap[ext || ""] || "text-gray-400";
}

function TreeNode({ node, depth, selectedPath, onSelectFile }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;

  const handleClick = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer rounded-md transition-colors",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10 text-primary",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/collapse icon for folders */}
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}

        {/* File/folder icon */}
        {isFolder ? (
          isExpanded ? (
            <FolderOpenIcon className="w-4 h-4 text-amber-500" />
          ) : (
            <FolderIcon className="w-4 h-4 text-amber-500" />
          )
        ) : (
          <FileIcon className={cn("w-4 h-4", getFileIconColor(node.name))} />
        )}

        {/* Name */}
        <span className="truncate">{node.name}</span>
      </div>

      {/* Render children if folder is expanded */}
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ nodes, selectedPath, onSelectFile }: FileTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No files generated yet
      </div>
    );
  }

  return (
    <div className="py-2">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
