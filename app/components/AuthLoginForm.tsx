"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/better-auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  EyeOpenIcon,
  EyeClosedIcon,
  GitHubLogoIcon,
} from "@radix-ui/react-icons";
import { FcGoogle } from "react-icons/fc";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getErrorText = (e: unknown): string => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object" && "message" in e) {
      const msg = (e as { message?: unknown }).message;
      return typeof msg === "string" ? msg : JSON.stringify(e);
    }
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await signIn.email({ email, password });

      if (response?.error) {
        setError(getErrorText(response.error));
      } else if (response?.data) {
        router.push("/chat");
      } else {
        setError("Unknown error during login. See console.");
      }
    } catch {
      setError("Login failed. Please try again.");
    }
    setLoading(false);
  }

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <h2 className="text-3xl font-bold mb-2 text-center text-gray-900 dark:text-white">
        Welcome back
      </h2>
      <p className="mb-6 text-center text-gray-500 dark:text-gray-400">
        Enter your credentials to access your account
      </p>
      <div className="mb-3">
        <label className="block font-medium mb-1 dark:text-gray-200">
          Email:{" "}
          <span className="font-normal text-xs text-gray-400 dark:text-gray-500 ml-1">
            eg. email@example.com
          </span>
        </label>
        <Input
          required
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          suppressHydrationWarning
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>
      <div className="mb-3 relative">
        <label className="block font-medium mb-1 dark:text-gray-200">
          Password:{" "}
          <span className="font-normal text-xs text-gray-400 dark:text-gray-500 ml-1">
            eg. ••••••
          </span>
        </label>
        <Input
          required
          type={showPass ? "text" : "password"}
          placeholder="Password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          suppressHydrationWarning
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        <button
          type="button"
          className="absolute top-8 right-3 text-gray-400 dark:text-gray-500 focus:outline-none"
          onClick={() => setShowPass((s) => !s)}
          tabIndex={-1}
        >
          {showPass ? <EyeOpenIcon /> : <EyeClosedIcon />}
        </button>
      </div>
      {error && (
        <div
          className="text-red-500 dark:text-red-400 mb-2"
          data-testid="error-message"
        >
          {error}
        </div>
      )}
      <Button
        type="submit"
        className="w-full bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white py-2 rounded mb-4 font-bold shadow hover:shadow-lg transition"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <div className="my-4 text-center text-gray-400 dark:text-gray-500 font-medium text-xs">
        OR CONTINUE WITH
      </div>
      <div className="flex gap-4 mb-4">
        <Button
          type="button"
          variant="outline"
          className="w-1/2 flex items-center gap-2 justify-center border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-gray-400 shadow dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={() => signIn.github()}
        >
          <GitHubLogoIcon /> Github
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-1/2 flex items-center gap-2 justify-center border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-gray-400 shadow dark:text-gray-200 dark:hover:bg-gray-700"
          onClick={() => signIn.google()}
        >
          <FcGoogle className="w-5 h-5" /> Google
        </Button>
      </div>
      <div className="text-center mt-2 text-sm dark:text-gray-300">
        Don&apos;t have an account?{" "}
        <a
          href="/auth/signup"
          className="text-gray-900 dark:text-white font-semibold underline hover:text-gray-700 dark:hover:text-gray-300"
        >
          Sign up
        </a>
      </div>
    </form>
  );
}
