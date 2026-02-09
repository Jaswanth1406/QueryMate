/**
 * Utility functions for the Playground system
 */

import type {
  Artifact,
  ArtifactFile,
  FileTreeNode,
  ArtifactLanguage,
} from "./types";

/**
 * Parse LLM output into an Artifact object
 * Handles potential JSON parsing issues
 */
export function parseArtifact(output: string): Artifact | null {
  try {
    // Try to extract JSON from the output
    let jsonStr = output.trim();

    // Sometimes LLM wraps JSON in markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Find JSON object boundaries
    const startIdx = jsonStr.indexOf("{");
    const endIdx = jsonStr.lastIndexOf("}");

    if (startIdx !== -1 && endIdx !== -1) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1);
    }

    const artifact = JSON.parse(jsonStr) as Artifact;

    // Validate required fields
    if (!artifact.artifact_type || !artifact.language || !artifact.files) {
      console.error("Invalid artifact: missing required fields");
      return null;
    }

    // Validate files array
    if (!Array.isArray(artifact.files) || artifact.files.length === 0) {
      console.error("Invalid artifact: files must be a non-empty array");
      return null;
    }

    // Validate each file
    for (const file of artifact.files) {
      if (!file.path || typeof file.content !== "string") {
        console.error("Invalid artifact: each file must have path and content");
        return null;
      }
    }

    return artifact;
  } catch (error) {
    console.error("Failed to parse artifact:", error);
    return null;
  }
}

/**
 * Build a file tree structure from flat file list
 */
export function buildFileTree(files: ArtifactFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          language: isFile ? getLanguageFromPath(currentPath) : undefined,
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }

      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    }
  }

  // Sort: folders first, then alphabetically
  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined,
      }));
  };

  return sortNodes(root);
}

/**
 * Detect language from file path/extension
 */
export function getLanguageFromPath(path: string): ArtifactLanguage {
  const ext = path.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "html":
    case "htm":
      return "html";
    case "css":
    case "scss":
    case "sass":
      return "css";
    case "js":
      return "javascript";
    case "jsx":
    case "tsx":
      return "react";
    case "vue":
      return "vue";
    case "py":
      return "python";
    case "ts":
    case "mjs":
    case "cjs":
      return "node";
    case "sh":
    case "bash":
      return "bash";
    default:
      return "javascript";
  }
}

/**
 * Generate a complete HTML document for iframe preview
 * Handles React, Vue, and vanilla HTML/CSS/JS
 */
export function generatePreviewHtml(artifact: Artifact): string {
  const { language, files } = artifact;

  // Find main files
  const htmlFile = files.find((f) => f.path.endsWith(".html"));
  const cssFiles = files.filter((f) => f.path.endsWith(".css"));
  const jsFiles = files.filter(
    (f) =>
      f.path.endsWith(".js") ||
      f.path.endsWith(".jsx") ||
      f.path.endsWith(".ts") ||
      f.path.endsWith(".tsx"),
  );

  // Combine CSS
  const combinedCss = cssFiles.map((f) => f.content).join("\n");

  if (language === "react") {
    return generateReactPreview(htmlFile?.content, combinedCss, jsFiles);
  }

  if (language === "vue") {
    return generateVuePreview(htmlFile?.content, combinedCss, files);
  }

  // Vanilla HTML/CSS/JS
  if (htmlFile) {
    // Inject CSS and JS into existing HTML
    let html = htmlFile.content;

    // Inject CSS before </head>
    if (combinedCss) {
      const styleTag = `<style>\n${combinedCss}\n</style>`;
      html = html.replace("</head>", `${styleTag}\n</head>`);
    }

    // Inject JS before </body>
    const combinedJs = jsFiles
      .filter((f) => !f.path.endsWith(".jsx"))
      .map((f) => f.content)
      .join("\n");

    if (combinedJs) {
      const scriptTag = `<script>\n${combinedJs}\n</script>`;
      html = html.replace("</body>", `${scriptTag}\n</body>`);
    }

    return html;
  }

  // No HTML file - generate one
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
${combinedCss}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
${jsFiles
  .filter((f) => !f.path.endsWith(".jsx"))
  .map((f) => f.content)
  .join("\n")}
  </script>
</body>
</html>`;
}

/**
 * Generate React preview with CDN dependencies
 */
function generateReactPreview(
  existingHtml: string | undefined,
  css: string,
  jsFiles: ArtifactFile[],
): string {
  // Find React components (JSX/TSX files)
  let jsxFiles = jsFiles.filter(
    (f) => f.path.endsWith(".jsx") || f.path.endsWith(".tsx"),
  );

  // Fallback: if no JSX/TSX files, use all JS/TS files (they might contain JSX)
  if (jsxFiles.length === 0) {
    jsxFiles = jsFiles;
  }

  const regularJs = jsFiles.filter(
    (f) =>
      !f.path.endsWith(".jsx") &&
      !f.path.endsWith(".tsx") &&
      !f.path.endsWith(".ts"),
  );

  // Combine all JSX into one
  let jsxCode = jsxFiles.map((f) => f.content).join("\n\n");
  const jsCode = regularJs.length > 0 && jsxFiles !== jsFiles ? regularJs.map((f) => f.content).join("\n") : "";

  // Extract the component name - try multiple patterns
  // 1. export default function ComponentName
  // 2. export default ComponentName
  // 3. function ComponentName (without export, common names)
  let componentName = "App";
  
  const exportDefaultMatch = jsxCode.match(
    /export\s+default\s+(?:function\s+)?(\w+)/,
  );
  if (exportDefaultMatch) {
    componentName = exportDefaultMatch[1];
  } else {
    // Look for common React component function declarations (PascalCase)
    const functionMatch = jsxCode.match(
      /function\s+([A-Z][a-zA-Z0-9]*)\s*\(/,
    );
    if (functionMatch) {
      componentName = functionMatch[1];
    } else {
      // Look for arrow function components: const App = () =>
      const arrowMatch = jsxCode.match(
        /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\([^)]*\)\s*=>/,
      );
      if (arrowMatch) {
        componentName = arrowMatch[1];
      }
    }
  }

  // Detect which React hooks are used in the code (even without imports)
  const reactHooks = [
    "useState",
    "useEffect",
    "useCallback",
    "useMemo",
    "useRef",
    "useContext",
    "useReducer",
    "useLayoutEffect",
    "useImperativeHandle",
    "useDebugValue",
    "useDeferredValue",
    "useTransition",
    "useId",
    "useSyncExternalStore",
    "useInsertionEffect",
  ];
  
  const usedHooks = reactHooks.filter((hook) => {
    // Check if hook is used as a function call (e.g., useState( or useState<)
    const regex = new RegExp(`\\b${hook}\\s*[(<]`);
    return regex.test(jsxCode);
  });

  // Check if hooks are already imported/defined (any of these patterns means we don't need to add hooksSetup)
  const hasHooksImport = 
    /const\s*\{[^}]*\}\s*=\s*React/.test(jsxCode) ||                          // const { useState } = React
    /import\s*\{[^}]*\}\s*from\s*['"]react['"]/.test(jsxCode) ||              // import { useState } from 'react'
    /import\s+React\s*,\s*\{[^}]*\}\s*from\s*['"]react['"]/.test(jsxCode);    // import React, { useState } from 'react'

  // Transform the code for browser compatibility:
  // 1. Replace "import { useState } from 'react'" with destructuring from React global
  // 2. Remove export default statements
  jsxCode = jsxCode
    // Handle: import { useState, useEffect } from "react" or 'react'
    .replace(/import\s*\{([^}]+)\}\s*from\s*['"]react['"];?/g, (_, imports) => {
      const hooks = imports
        .split(",")
        .map((h: string) => h.trim())
        .filter(Boolean);
      return `const { ${hooks.join(", ")} } = React;`;
    })
    // Handle: import React from "react"
    .replace(/import\s+React\s+from\s*['"]react['"];?/g, "")
    // Handle: import React, { useState } from "react"
    .replace(
      /import\s+React\s*,\s*\{([^}]+)\}\s*from\s*['"]react['"];?/g,
      (_, imports) => {
        const hooks = imports
          .split(",")
          .map((h: string) => h.trim())
          .filter(Boolean);
        return `const { ${hooks.join(", ")} } = React;`;
      },
    )
    // Remove: export default function ComponentName - keep just function ComponentName
    .replace(/export\s+default\s+function\s+/g, "function ")
    // Remove: export default ComponentName (standalone)
    .replace(/export\s+default\s+(\w+)\s*;?$/gm, "")
    // Remove any remaining export statements
    .replace(/export\s+/g, "");

  // Add hooks destructuring at the top if hooks are used but not imported
  let hooksSetup = "";
  if (usedHooks.length > 0 && !hasHooksImport) {
    hooksSetup = `const { ${usedHooks.join(", ")} } = React;\n\n`;
  }

  if (existingHtml) {
    // User provided HTML, enhance it
    return existingHtml;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    .error-container { padding: 20px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; margin: 20px; }
    .error-title { color: #dc2626; font-weight: bold; margin-bottom: 8px; }
    .error-message { color: #991b1b; font-family: monospace; white-space: pre-wrap; }
${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="error-display" style="display:none;"></div>
  ${jsCode ? `<script>\n${jsCode}\n</script>` : ""}
  <script>
    // Global error handler
    window.onerror = function(message, source, lineno, colno, error) {
      const errorDiv = document.getElementById('error-display');
      errorDiv.style.display = 'block';
      errorDiv.innerHTML = '<div class="error-container"><div class="error-title">JavaScript Error</div><div class="error-message">' + message + '</div></div>';
      return true;
    };
  </script>
  <script type="text/babel" data-presets="react,typescript">
${hooksSetup}${jsxCode}

// Auto-render the component
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(${componentName}));
} catch (error) {
  document.getElementById('error-display').style.display = 'block';
  document.getElementById('error-display').innerHTML = '<div class="error-container"><div class="error-title">Render Error</div><div class="error-message">' + error.message + '</div></div>';
}
  </script>
</body>
</html>`;
}

/**
 * Generate Vue preview with CDN dependencies
 */
function generateVuePreview(
  existingHtml: string | undefined,
  css: string,
  files: ArtifactFile[],
): string {
  const jsFiles = files.filter((f) => f.path.endsWith(".js"));

  // For Vue SFC, we'd need a more complex setup
  // For now, support Vue 3 Options API in script tags
  const vueCode = jsFiles.map((f) => f.content).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue Preview</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; }
${css}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
${vueCode}
  </script>
</body>
</html>`;
}

/**
 * Sanitize HTML for safe iframe rendering
 * Removes potentially dangerous elements while keeping functionality
 */
export function sanitizeHtml(html: string): string {
  // Remove script src pointing to file:// URLs
  html = html.replace(/<script[^>]*src=["']file:\/\/[^"']*["'][^>]*>/gi, "");

  // Remove meta refresh redirects
  html = html.replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, "");

  return html;
}

/**
 * Get syntax highlighting language for Monaco/CodeMirror
 */
export function getEditorLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    json: "json",
    md: "markdown",
    sh: "shell",
    bash: "shell",
    vue: "html",
  };

  return languageMap[ext || ""] || "plaintext";
}

/**
 * Debounce function for preview updates
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
