// lib/ai-gemini.ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});
