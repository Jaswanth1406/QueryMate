"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="w-full border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/QueryMate_Logo.png"
              alt="QueryMate Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-bold text-xl text-gray-900">QueryMate</span>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="font-medium">
                Home
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost" className="font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="font-medium bg-black hover:bg-gray-800 text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
