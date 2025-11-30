"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Zap, Globe, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">
                Powered by Advanced AI
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-6">
              Your Intelligent
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Chat Assistant
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Experience seamless conversations with multiple AI models. Get
              instant answers, creative ideas, and intelligent assistance — all
              in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 mb-16">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="font-semibold bg-black hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl"
                >
                  Get Started Free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold px-8 py-6 text-lg rounded-xl border-2"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Natural Conversations
                </h3>
                <p className="text-gray-600 text-sm">
                  Chat naturally with AI that understands context and delivers
                  meaningful responses.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
                <p className="text-gray-600 text-sm">
                  Get instant responses powered by cutting-edge AI models for
                  maximum efficiency.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Globe className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  Multiple AI Models
                </h3>
                <p className="text-gray-600 text-sm">
                  Choose from Google Gemini, Perplexity, and more AI models to
                  suit your needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
