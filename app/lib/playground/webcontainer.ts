/**
 * WebContainer Manager
 *
 * Handles StackBlitz WebContainer lifecycle for running real Node.js
 * environment in the browser with actual npm package installation.
 */

import { WebContainer } from "@webcontainer/api";

export interface WebContainerFile {
  name: string;
  content: string;
}

export interface WebContainerStatus {
  stage: "idle" | "booting" | "installing" | "starting" | "ready" | "error";
  message: string;
  progress?: number;
}

export interface WebContainerInstance {
  container: WebContainer;
  url: string | null;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __webcontainer_instance?: WebContainer;
    __webcontainer_boot_promise?: Promise<WebContainer>;
  }
}

// Use window to persist instance across HMR reloads
// This prevents "Only a single WebContainer instance can be booted" error
const getPersistedInstance = (): WebContainer | null => {
  if (typeof window !== "undefined" && window.__webcontainer_instance) {
    return window.__webcontainer_instance;
  }
  return null;
};

const setPersistedInstance = (instance: WebContainer): void => {
  if (typeof window !== "undefined") {
    window.__webcontainer_instance = instance;
  }
};

const getPersistedPromise = (): Promise<WebContainer> | null => {
  if (typeof window !== "undefined" && window.__webcontainer_boot_promise) {
    return window.__webcontainer_boot_promise;
  }
  return null;
};

const setPersistedPromise = (promise: Promise<WebContainer>): void => {
  if (typeof window !== "undefined") {
    window.__webcontainer_boot_promise = promise;
  }
};

// Module-level variables (fallback for non-browser environments)
let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let activeProcess: { kill: () => void } | null = null;

/**
 * Get or boot the WebContainer instance (singleton pattern)
 * Uses window persistence to survive HMR reloads
 */
export async function getWebContainer(): Promise<WebContainer> {
  // Check persisted instance first (survives HMR)
  const persisted = getPersistedInstance();
  if (persisted) {
    webContainerInstance = persisted;
    return persisted;
  }

  // Return existing module-level instance if available
  if (webContainerInstance) {
    return webContainerInstance;
  }

  // Check for in-progress boot (persisted)
  const persistedPromise = getPersistedPromise();
  if (persistedPromise) {
    try {
      webContainerInstance = await persistedPromise;
      setPersistedInstance(webContainerInstance);
      return webContainerInstance;
    } catch {
      // Boot failed, continue to retry
    }
  }

  // Wait for existing boot if in progress
  if (bootPromise) {
    try {
      webContainerInstance = await bootPromise;
      setPersistedInstance(webContainerInstance);
      return webContainerInstance;
    } catch {
      // Boot failed, reset and retry
      bootPromise = null;
    }
  }

  try {
    bootPromise = WebContainer.boot();
    setPersistedPromise(bootPromise);
    webContainerInstance = await bootPromise;
    setPersistedInstance(webContainerInstance);
    return webContainerInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If already booted error, the instance might exist but we lost reference
    // This can happen with hot module replacement
    if (
      errorMessage.includes("Only a single WebContainer instance can be booted")
    ) {
      // Check persisted again (might have been set by another module)
      const retryPersisted = getPersistedInstance();
      if (retryPersisted) {
        webContainerInstance = retryPersisted;
        return retryPersisted;
      }
      // Can't recover - need page refresh
      throw new Error("WebContainer session expired. Please refresh the page.");
    }

    // Reset state for other errors
    bootPromise = null;
    throw error;
  }
}

/**
 * Check if WebContainer is already booted
 */
export function isWebContainerBooted(): boolean {
  return webContainerInstance !== null || getPersistedInstance() !== null;
}

/**
 * Kill any active process and clear container state
 */
export async function cleanupWebContainer(): Promise<void> {
  if (activeProcess) {
    try {
      activeProcess.kill();
    } catch {
      // Ignore errors during cleanup
    }
    activeProcess = null;
  }
}

/**
 * Check if WebContainer is supported in this browser
 */
export function isWebContainerSupported(): boolean {
  // WebContainers require SharedArrayBuffer which needs cross-origin isolation
  return typeof SharedArrayBuffer !== "undefined";
}

/**
 * Generate package.json for a React/Vite project
 */
export function generatePackageJson(
  dependencies: Record<string, string> = {},
): string {
  const defaultDeps = {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
  };

  const defaultDevDeps = {
    "@vitejs/plugin-react": "^4.2.1",
    vite: "^5.0.0",
  };

  return JSON.stringify(
    {
      name: "canvas-preview",
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        ...defaultDeps,
        ...dependencies,
      },
      devDependencies: defaultDevDeps,
    },
    null,
    2,
  );
}

/**
 * Generate vite.config.js for React project
 */
export function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Let Vite auto-select an available port
    strictPort: false,
  },
})
`;
}

/**
 * Generate index.html for React project
 */
export function generateIndexHtml(title: string = "Preview"): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

/**
 * Generate main.jsx entry point
 */
export function generateMainJsx(_componentName: string = "App"): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
}

/**
 * Wrap component code to ensure it has a default export
 * Handles cases where AI generates just a function without export
 */
export function wrapComponentCode(code: string): string {
  // If already has export default, return as-is
  if (/export\s+default\s+/.test(code)) {
    return code;
  }

  // Find the main component name (function ComponentName or const ComponentName)
  const funcMatch = code.match(
    /(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*(?:\(|=)/m,
  );

  if (funcMatch) {
    const componentName = funcMatch[1];

    // Check if it's already exported inline: export function X or export const X
    if (
      new RegExp(`export\\s+(?:function|const)\\s+${componentName}`).test(code)
    ) {
      // Change to default export
      return code.replace(
        new RegExp(`export\\s+((?:function|const)\\s+${componentName})`),
        "export default $1",
      );
    }

    // Add export default at the end
    return code + `\n\nexport default ${componentName};`;
  }

  // Fallback: wrap entire code in a default export function
  return `export default function App() {
  return (
    <>
      {/* Could not detect component structure */}
      <div>Preview Error: Could not find React component</div>
    </>
  );
}
`;
}

/**
 * Tailwind directives - always needed at top of CSS
 */
const TAILWIND_DIRECTIVES = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

/**
 * Generate default index.css with Tailwind
 */
export function generateIndexCss(customCss: string = ""): string {
  const baseCss = `/* Custom styles */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;

  // Always include Tailwind directives, then add custom CSS
  if (customCss.trim()) {
    // Remove any existing @tailwind directives from custom CSS to avoid duplicates
    const cleanedCustomCss = customCss
      .replace(/@tailwind\s+(base|components|utilities);?\s*/g, "")
      .trim();
    return (
      TAILWIND_DIRECTIVES + "\n" + baseCss + "\n" + cleanedCustomCss + "\n"
    );
  }

  return TAILWIND_DIRECTIVES + "\n" + baseCss;
}

/**
 * Generate tailwind.config.js
 */
export function generateTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
}

/**
 * Generate postcss.config.js for Tailwind
 */
export function generatePostCssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
}

/**
 * Parse dependencies from code (extract from import statements)
 */
export function parseDependenciesFromCode(code: string): string[] {
  const deps: Set<string> = new Set();

  // Match import statements: import X from 'package' or import 'package'
  const importRegex =
    /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"./][^'"]*)['"]/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];
    // Get base package name (handle scoped packages like @org/pkg)
    const basePkg = pkg.startsWith("@")
      ? pkg.split("/").slice(0, 2).join("/")
      : pkg.split("/")[0];

    // Exclude react and react-dom (always included)
    if (basePkg !== "react" && basePkg !== "react-dom") {
      deps.add(basePkg);
    }
  }

  return Array.from(deps);
}

/**
 * Convert FileSystemTree format for WebContainer
 */
export function createFileSystemTree(
  files: WebContainerFile[],
): Record<string, any> {
  const tree: Record<string, any> = {};

  for (const file of files) {
    const parts = file.name.split("/");
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!current[dir]) {
        current[dir] = { directory: {} };
      }
      current = current[dir].directory;
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = {
      file: {
        contents: file.content,
      },
    };
  }

  return tree;
}

/**
 * Main function to run a React project in WebContainer
 */
export async function runInWebContainer(
  appCode: string,
  cssCode: string = "",
  additionalDeps: Record<string, string> = {},
  onStatus: (status: WebContainerStatus) => void,
  onServerReady: (url: string) => void,
  onOutput: (type: "stdout" | "stderr", data: string) => void,
): Promise<{ teardown: () => Promise<void> }> {
  // Check support
  if (!isWebContainerSupported()) {
    onStatus({
      stage: "error",
      message:
        "WebContainers require Cross-Origin Isolation. Headers not configured.",
    });
    throw new Error("WebContainers not supported - requires COOP/COEP headers");
  }

  // Cleanup any previous processes
  await cleanupWebContainer();
  onOutput("stdout", "🔄 Preparing WebContainer...\n");

  onStatus({ stage: "booting", message: "Starting WebContainer..." });

  // Get or boot container
  const container = await getWebContainer();

  onStatus({ stage: "booting", message: "Preparing project files..." });

  // Parse dependencies from code
  const parsedDeps = parseDependenciesFromCode(appCode);
  const allDeps: Record<string, string> = { ...additionalDeps };

  // Add parsed deps with latest version
  for (const dep of parsedDeps) {
    if (!allDeps[dep]) {
      allDeps[dep] = "latest";
    }
  }

  // Check if using Tailwind
  const usesTailwind =
    appCode.includes("className=") || cssCode.includes("@tailwind");
  if (usesTailwind) {
    allDeps["tailwindcss"] = "^3.4.0";
    allDeps["postcss"] = "^8.4.35";
    allDeps["autoprefixer"] = "^10.4.17";
  }

  // Prepare files
  const files: WebContainerFile[] = [
    { name: "package.json", content: generatePackageJson(allDeps) },
    { name: "vite.config.js", content: generateViteConfig() },
    { name: "index.html", content: generateIndexHtml() },
    { name: "src/main.jsx", content: generateMainJsx() },
    { name: "src/App.jsx", content: wrapComponentCode(appCode) },
    { name: "src/index.css", content: generateIndexCss(cssCode) },
  ];

  // Add Tailwind config if needed
  if (usesTailwind) {
    files.push({
      name: "tailwind.config.js",
      content: generateTailwindConfig(),
    });
    files.push({ name: "postcss.config.js", content: generatePostCssConfig() });
  }

  // Mount files
  const fileTree = createFileSystemTree(files);
  await container.mount(fileTree);

  // Log what packages will be installed
  const depsToInstall = Object.keys(allDeps);
  onOutput("stdout", "\n📁 Project files mounted\n");
  onOutput(
    "stdout",
    `\n📦 Packages to install: ${depsToInstall.length > 0 ? depsToInstall.join(", ") : "react, react-dom (default)"}\n`,
  );

  onStatus({
    stage: "installing",
    message: "Running npm install...",
    progress: 0,
  });
  onOutput("stdout", "\n⏳ Running npm install...\n\n");

  // Install dependencies
  const installProcess = await container.spawn("npm", ["install"]);

  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput("stdout", data);
        // Try to parse progress from npm output
        if (data.includes("added")) {
          onStatus({ stage: "installing", message: data.trim(), progress: 90 });
        }
      },
    }),
  );

  const installExitCode = await installProcess.exit;

  if (installExitCode !== 0) {
    onOutput("stderr", "\n❌ npm install failed\n");
    onStatus({ stage: "error", message: "Failed to install dependencies" });
    throw new Error("npm install failed");
  }

  onOutput("stdout", "\n✅ Dependencies installed successfully\n");
  onStatus({ stage: "starting", message: "Starting Vite dev server..." });
  onOutput("stdout", "\n🚀 Starting dev server...\n");

  // Start dev server
  const devProcess = await container.spawn("npm", ["run", "dev"]);

  // Track active process for cleanup
  activeProcess = devProcess;

  // Track if server ready was already called
  let serverReadyCalled = false;

  devProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput("stdout", data);
        // Note: We don't extract URL from console output because localhost URLs
        // don't work outside WebContainer. We rely on server-ready event instead.
      },
    }),
  );

  // Listen for server-ready event - this provides the actual embeddable URL
  container.on("server-ready", (port, url) => {
    if (!serverReadyCalled) {
      serverReadyCalled = true;
      onOutput("stdout", `\n✅ Server ready at port ${port}\n`);
      onStatus({ stage: "ready", message: `Server running on port ${port}` });
      onServerReady(url);
    }
  });

  // Return teardown function
  return {
    teardown: async () => {
      activeProcess = null;
      devProcess.kill();
    },
  };
}
