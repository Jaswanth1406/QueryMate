// lib/models.ts
// Model configuration for all supported AI providers

export type Provider = "google" | "perplexity" | "groq";

export interface ModelConfig {
  id: string;
  name: string;
  provider: Provider;
  modelId: string; // The actual model ID to pass to the SDK
  description?: string;
  // Rate limits (free tier)
  limits?: {
    rpm?: number; // Requests per minute
    rpd?: number; // Requests per day
    tpm?: number; // Tokens per minute
    tpd?: number; // Tokens per day
  };
  // Whether this model returns token usage
  supportsTokenUsage: boolean;
}

export const MODELS: Record<string, ModelConfig> = {
  // Google Gemini Models (using stable version names)
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    modelId: "gemini-2.5-flash",
    description: "Fast and efficient",
    limits: {
      rpm: 5,
      rpd: 20,
      tpm: 250000,
    },
    supportsTokenUsage: true,
  },
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    modelId: "gemini-2.5-flash-lite",
    description: "Ultra fast, cost-efficient",
    limits: {
      rpm: 10,
      rpd: 20,
      tpm: 250000,
    },
    supportsTokenUsage: true,
  },
  // Perplexity Models
  sonar: {
    id: "sonar",
    name: "Sonar",
    provider: "perplexity",
    modelId: "sonar",
    description: "Web-connected AI search",
    supportsTokenUsage: false,
  },
  "sonar-pro": {
    id: "sonar-pro",
    name: "Sonar Pro",
    provider: "perplexity",
    modelId: "sonar-pro",
    description: "Advanced web-connected AI",
    supportsTokenUsage: false,
  },

  // Groq Models (Free Tier)
  "llama-3.3-70b": {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
    description: "Versatile large model",
    limits: {
      rpm: 30,
      rpd: 1000,
      tpm: 12000,
      tpd: 100000,
    },
    supportsTokenUsage: false,
  },
  "llama-3.1-8b": {
    id: "llama-3.1-8b",
    name: "Llama 3.1 8B",
    provider: "groq",
    modelId: "llama-3.1-8b-instant",
    description: "Fast instant responses",
    limits: {
      rpm: 30,
      rpd: 14400,
      tpm: 6000,
      tpd: 500000,
    },
    supportsTokenUsage: false,
  },
  "llama-4-scout": {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    provider: "groq",
    modelId: "meta-llama/llama-4-scout-17b-16e-instruct",
    description: "Latest Llama 4 model",
    limits: {
      rpm: 30,
      rpd: 1000,
      tpm: 30000,
      tpd: 500000,
    },
    supportsTokenUsage: false,
  },
  "llama-4-maverick": {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "groq",
    modelId: "meta-llama/llama-4-maverick-17b-128e-instruct",
    description: "Extended context Llama 4",
    limits: {
      rpm: 30,
      rpd: 1000,
      tpm: 6000,
      tpd: 500000,
    },
    supportsTokenUsage: false,
  },
  "qwen3-32b": {
    id: "qwen3-32b",
    name: "Qwen 3 32B",
    provider: "groq",
    modelId: "qwen/qwen3-32b",
    description: "Alibaba's Qwen model",
    limits: {
      rpm: 60,
      rpd: 1000,
      tpm: 6000,
      tpd: 500000,
    },
    supportsTokenUsage: false,
  },
  "kimi-k2": {
    id: "kimi-k2",
    name: "Kimi K2",
    provider: "groq",
    modelId: "moonshotai/kimi-k2-instruct",
    description: "Moonshot AI model",
    limits: {
      rpm: 60,
      rpd: 1000,
      tpm: 10000,
      tpd: 300000,
    },
    supportsTokenUsage: false,
  },
};

// Group models by provider for UI
export const MODEL_GROUPS: Record<
  Provider,
  { name: string; icon: string; models: string[] }
> = {
  google: {
    name: "Google",
    icon: "🧠",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  },
  perplexity: {
    name: "Perplexity",
    icon: "🔍",
    models: ["sonar", "sonar-pro"],
  },
  groq: {
    name: "Groq",
    icon: "⚡",
    models: [
      "llama-3.3-70b",
      "llama-3.1-8b",
      "llama-4-scout",
      "llama-4-maverick",
      "qwen3-32b",
      "kimi-k2",
    ],
  },
};

export function getModel(modelId: string): ModelConfig | undefined {
  return MODELS[modelId];
}

export function getModelsByProvider(provider: Provider): ModelConfig[] {
  return MODEL_GROUPS[provider].models.map((id) => MODELS[id]);
}
