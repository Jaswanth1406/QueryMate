//app/not-found.tsx

"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 4v2m0-14a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>

          <p className="text-gray-600 mb-8">
            Sorry, the page you&apos;re looking for doesn&apos;t exist. It might
            have been moved or deleted.
          </p>

          <div className="space-y-3">
            <Link
              href="/"
              className="w-full block bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition font-medium"
            >
              Go back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
