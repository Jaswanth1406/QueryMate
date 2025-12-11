"use client";
import { createAuthClient } from "better-auth/react";
import { showToast } from "@/lib/toastify";

const client = createAuthClient();

export const useSession = client.useSession;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ApiResult = { error?: unknown; data?: unknown };
const hasError = (x: unknown): x is { error: unknown } =>
  typeof x === "object" && x !== null && "error" in x;

const extractErrorText = (e: unknown): string => {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    // Check for Arcjet-style error: { error: "message", status: 400 }
    if ("error" in e) {
      const err = (e as { error?: unknown }).error;
      if (typeof err === "string") return err;
    }
    // Check for standard error: { message: "..." }
    if ("message" in e) {
      const msg = (e as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
};

export const signUp = {
  async email({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResult> {
    if (!name?.trim()) {
      showToast("error", "Name is required.");
      return { error: "Name is required." };
    }
    if (!emailRegex.test(email)) {
      showToast("error", "Invalid email address.");
      return { error: "Invalid email address." };
    }
    if (!password || password.length < 6) {
      showToast("error", "Password must be at least 6 characters.");
      return { error: "Password must be at least 6 characters." };
    }

    try {
      const resp = (await client.signUp.email({
        name,
        email,
        password,
      })) as unknown as ApiResult;
      if (hasError(resp) && resp.error) {
        const textError = extractErrorText(resp.error);
        showToast("error", textError);
        return { error: textError };
      }
      showToast("success", "Account created successfully!");
      return { data: resp };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      showToast("error", message);
      return { error: message };
    }
  },
  github: async (): Promise<ApiResult> => {
    try {
      const resp = (await client.signIn.social({
        provider: "github",
        callbackURL: "/chat",
      })) as unknown as ApiResult;
      if (hasError(resp) && resp.error) {
        const textError = extractErrorText(resp.error);
        showToast("error", textError);
        return { error: textError };
      }
      showToast("success", "Signed in with GitHub!");
      return { data: resp };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      showToast("error", message);
      return { error: message };
    }
  },
  google: async (): Promise<ApiResult> => {
    try {
      const resp = (await client.signIn.social({
        provider: "google",
      })) as unknown as ApiResult;
      if (hasError(resp) && resp.error) {
        const textError = extractErrorText(resp.error);
        showToast("error", textError);
        return { error: textError };
      }
      showToast("success", "Signed in with Google!");
      return { data: resp };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      showToast("error", message);
      return { error: message };
    }
  },
};

export const signIn = {
  async email({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<ApiResult> {
    if (!emailRegex.test(email)) {
      showToast("error", "Invalid email address.");
      return { error: "Invalid email address." };
    }
    if (!password || password.length < 6) {
      showToast("error", "Password must be at least 6 characters.");
      return { error: "Password must be at least 6 characters." };
    }

    try {
      const resp = (await client.signIn.email({
        email,
        password,
      })) as unknown as ApiResult;
      if (hasError(resp) && resp.error) {
        const textError = extractErrorText(resp.error);
        showToast("error", textError);
        return { error: textError };
      }
      showToast("success", "Signed in successfully!");
      return { data: resp };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      showToast("error", message);
      return { error: message };
    }
  },
  github: async (): Promise<ApiResult> => {
    try {
      const resp = (await client.signIn.social({
        provider: "github",
        callbackURL: "/chat",
      })) as unknown as ApiResult;
      if (hasError(resp) && resp.error) {
        const textError = extractErrorText(resp.error);
        showToast("error", textError);
        return { error: textError };
      }
      showToast("success", "Signed in with GitHub!");
      return { data: resp };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      showToast("error", message);
      return { error: message };
    }
  },
  google: async (): Promise<ApiResult> => {
    try {
      const resp = (await client.signIn.social({
        provider: "google",
        callbackURL: "/chat",
      })) as unknown as ApiResult;
      if (hasError(resp) && resp.error) {
        const textError = extractErrorText(resp.error);
        showToast("error", textError);
        return { error: textError };
      }
      showToast("success", "Signed in with Google!");
      return { data: resp };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      showToast("error", message);
      return { error: message };
    }
  },
};

export const signOut = async (): Promise<ApiResult> => {
  try {
    await client.signOut();
    showToast("success", "Signed out successfully!");
    return { data: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err);
    showToast("error", message);
    return { error: message };
  }
};
