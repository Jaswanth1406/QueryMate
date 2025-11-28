import { createPerplexity } from "@ai-sdk/perplexity";

export const perplexity = createPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY ?? "",
});
