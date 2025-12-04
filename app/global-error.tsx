//app/global-error.tsx

"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong!
              </h1>

              <p className="text-gray-600 mb-6">
                We encountered an unexpected error. Please try again or contact
                support if the problem persists.
              </p>

              {error.digest && (
                <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-50 p-3 rounded">
                  Error ID: {error.digest}
                </p>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => reset()}
                  className="w-full bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition font-medium"
                >
                  Try again
                </button>

                <Link
                  href="/"
                  className="w-full block bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Go back home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
