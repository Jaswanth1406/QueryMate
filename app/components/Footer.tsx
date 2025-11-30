"use client";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-2">
            <Image
              src="/QueryMate_Logo.png"
              alt="QueryMate Logo"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="text-gray-600 text-sm">
              © {new Date().getFullYear()} QueryMate. All rights reserved.
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link
              href="/privacy"
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="hover:text-gray-900 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
