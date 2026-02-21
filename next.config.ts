import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Required headers for WebContainers (Cross-Origin Isolation)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            // Use 'credentialless' instead of 'require-corp' so that
            // cross-origin iframes (WebContainer preview) can load
            // without needing CORP headers, while still enabling
            // crossOriginIsolated (SharedArrayBuffer) for WebContainers.
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
