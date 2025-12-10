"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { getModel, Provider } from "@/lib/models";
import { Info } from "lucide-react";

interface ModelInfoModalProps {
  currentModel: string;
}

export default function ModelInfoModal({ currentModel }: ModelInfoModalProps) {
  const [open, setOpen] = useState(false);
  const modelConfig = getModel(currentModel);

  if (!modelConfig) return null;

  const getProviderCapabilities = (provider: Provider) => {
    switch (provider) {
      case "google":
        return {
          capabilities: [
            "Code Execution (E2B Sandbox)",
            "Web Search",
            "File Inputs (Images, PDFs)",
          ],
          color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        };
      case "perplexity":
        return {
          capabilities: ["Web Search", "File Inputs (Images, PDFs)"],
          color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        };
      case "groq":
        return {
          capabilities: ["Text Generation Only"],
          color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        };
      default:
        return { capabilities: [], color: "" };
    }
  };

  const providerInfo = getProviderCapabilities(modelConfig.provider);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{modelConfig.name}</span>
            <Badge variant="outline" className="text-xs">
              {modelConfig.provider.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {modelConfig.description && (
            <div>
              <p className="text-sm text-muted-foreground">
                {modelConfig.description}
              </p>
            </div>
          )}

          {/* Capabilities */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {providerInfo.capabilities.map((capability) => (
                <Badge
                  key={capability}
                  variant="outline"
                  className={providerInfo.color}
                >
                  {capability}
                </Badge>
              ))}
            </div>
          </div>

          {/* Rate Limits */}
          {modelConfig.limits && (
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Rate Limits (Free Tier)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {modelConfig.limits.rpm && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      Requests/Min
                    </p>
                    <p className="text-lg font-semibold">
                      {modelConfig.limits.rpm}
                    </p>
                  </div>
                )}
                {modelConfig.limits.rpd && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      Requests/Day
                    </p>
                    <p className="text-lg font-semibold">
                      {modelConfig.limits.rpd}
                    </p>
                  </div>
                )}
                {modelConfig.limits.tpm && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tokens/Min</p>
                    <p className="text-lg font-semibold">
                      {modelConfig.limits.tpm >= 1000000
                        ? `${(modelConfig.limits.tpm / 1000000).toFixed(1)}M`
                        : modelConfig.limits.tpm >= 1000
                          ? `${(modelConfig.limits.tpm / 1000).toFixed(0)}K`
                          : modelConfig.limits.tpm}
                    </p>
                  </div>
                )}
                {modelConfig.limits.tpd && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tokens/Day</p>
                    <p className="text-lg font-semibold">
                      {modelConfig.limits.tpd >= 1000000
                        ? `${(modelConfig.limits.tpd / 1000000).toFixed(1)}M`
                        : modelConfig.limits.tpd >= 1000
                          ? `${(modelConfig.limits.tpd / 1000).toFixed(0)}K`
                          : modelConfig.limits.tpd}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!modelConfig.limits && (
            <div className="text-sm text-muted-foreground italic">
              No rate limit information available for this model.
            </div>
          )}

          {/* Token Usage Support */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${
                modelConfig.supportsTokenUsage ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span>
              {modelConfig.supportsTokenUsage
                ? "Token usage tracking enabled"
                : "Token usage tracking not available"}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
