"use client";

import { useState, useEffect, useRef } from "react";
import {
  GlobeIcon,
  PlusIcon,
  MicIcon,
  MicOffIcon,
  CornerDownLeftIcon,
  StopCircleIcon,
} from "lucide-react";
import { MemoizedMarkdown } from "./MemoizedMarkdown";
import { mutateConversations, mutateUsage } from "./ChatSidebar";
import { MODELS, MODEL_GROUPS, type Provider } from "@/lib/models";
import ModelInfoModal from "./ModelInfoModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  imageUrls?: string[];
  files?: Array<{ name: string; type: string; size: number }>;
};

// Helper functions for model capabilities
const supportsFiles = (modelId: string): boolean => {
  // Files support for Google (Gemini) and Perplexity models only
  // Groq models do not support file attachments
  const model = MODELS[modelId as keyof typeof MODELS];
  if (!model) return false;
  return model.provider === "google" || model.provider === "perplexity";
};

const supportsSearch = (modelId: string): boolean => {
  // Search supported for Google models only
  return modelId.startsWith("gemini-");
};

const STARTER_SUGGESTIONS = [
  "Explain quantum computing",
  "Write a poem about AI",
  "Help me debug my code",
  "What's the weather like?",
];

function TypingIndicator({ isSearching }: { isSearching?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce"
          style={{ animationDelay: "120ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "240ms" }}
        />
      </div>
      <span>{isSearching ? "Searching…" : "Thinking…"}</span>
    </div>
  );
}

export default function ChatBox({
  conversationId,
  setConversationId,
  chatTitle,
}: {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  chatTitle?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<string>("gemini-2.5-flash");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [useSearch, setUseSearch] = useState(false);
  const [currentConvId, setCurrentConvId] = useState<string | null>(
    conversationId,
  );
  const [isLoading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef<string>(""); // Store text before speech started
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldStopRef = useRef(false);

  // Sync conversationId prop to local state
  useEffect(() => {
    setCurrentConvId(conversationId);
  }, [conversationId]);

  const hasHistory = conversationId !== null && messages.length > 0;

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Changed to false - stops after each phrase
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Show the combined transcript (base + current speech)
          const currentTranscript = finalTranscript || interimTranscript;
          const base = baseTextRef.current;
          const separator = base && !base.endsWith(" ") ? " " : "";
          setInput(base + separator + currentTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Save current text as base before starting speech
      baseTextRef.current = input;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadHistory(id: string) {
      const res = await fetch(`/api/messages?conversationId=${id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (isMounted) {
        // Parse messages to extract file metadata from JSON content
        const parsedMessages =
          data.messages?.map(
            (msg: { content: string; role: string; id?: string }) => {
              try {
                const parsed = JSON.parse(msg.content);
                if (parsed && typeof parsed.text === "string" && parsed.files) {
                  return {
                    role: msg.role,
                    content: parsed.text,
                    files: parsed.files,
                  };
                }
              } catch {
                // Not JSON, regular message
              }
              return {
                role: msg.role,
                content: msg.content,
              };
            },
          ) || [];

        setMessages(
          parsedMessages.length
            ? parsedMessages
            : [{ role: "assistant", content: chatTitle || "Chat started." }],
        );
      }
    }

    if (!conversationId) {
      setMessages([]);
      return;
    }
    loadHistory(conversationId);

    return () => {
      isMounted = false;
    };
  }, [conversationId, chatTitle]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Store file metadata for display
    const fileMetadata = attachedFiles.map((f) => ({
      name: f.name,
      type: f.type,
      size: f.size,
    }));

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmed,
        files: fileMetadata.length > 0 ? fileMetadata : undefined,
      },
    ]);
    setInput("");

    // Build FormData for file uploads
    const formData = new FormData();
    formData.append("message", trimmed);
    formData.append("model", selectedModel);
    formData.append("useSearch", useSearch ? "true" : "false");
    if (currentConvId) formData.append("conversationId", currentConvId);

    attachedFiles.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    setAttachedFiles([]);
    setLoading(true);
    shouldStopRef.current = false;

    // Create AbortController for cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Manual fetch with FormData for file uploads
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        body: formData,
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      // Stream response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        try {
          while (!shouldStopRef.current) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            full += chunk;

            // Update messages immediately during streaming
            setMessages((prev) => {
              const updated = [...prev];
              if (
                updated.length &&
                updated[updated.length - 1].role === "assistant"
              ) {
                updated[updated.length - 1].content = full;
              } else {
                updated.push({ role: "assistant", content: full });
              }
              return updated;
            });
          }

          // Clean up reader
          reader.releaseLock();
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            console.log("Stream cancelled by user");
          } else {
            throw error;
          }
        }
      }

      mutateUsage();
      mutateConversations();

      // Fetch new conversation if needed
      if (!currentConvId) {
        const convRes = await fetch("/api/conversations", {
          credentials: "include",
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          const list = convData.conversations || [];
          if (list.length) {
            const newest = list[list.length - 1];
            setConversationId(newest.id);
            setCurrentConvId(newest.id);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request cancelled by user");
        return;
      }

      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Unable to connect. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      shouldStopRef.current = false;
    }
  }

  function stop() {
    shouldStopRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }

  function handleNewChat() {
    setConversationId(null);
    setCurrentConvId(null);
    setMessages([]);
    setInput("");
    setAttachedFiles([]);
    setUseSearch(false);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const showCenterPrompt = !hasHistory && !isLoading && messages.length === 0;

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        sendMessage(input);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4">
          {showCenterPrompt ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] text-center px-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-2 sm:mb-3 text-foreground">
                What would you like to know?
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-8">
                Choose a model and ask anything to get started.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {STARTER_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setInput(suggestion);
                      sendMessage(suggestion);
                    }}
                    suppressHydrationWarning
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex w-full",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[95%] sm:max-w-[85%]",
                      msg.role === "user"
                        ? "bg-secondary rounded-2xl px-3 sm:px-4 py-2 sm:py-3"
                        : "",
                    )}
                  >
                    {msg.role === "user" ? (
                      <div>
                        <p className="text-sm text-foreground">{msg.content}</p>
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-2 flex flex-col gap-2">
                            {msg.files.map((file, idx) => {
                              const isImage = file.type.startsWith("image/");
                              const isPDF = file.type === "application/pdf";
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2 text-xs border border-border"
                                >
                                  <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary">
                                    {isImage ? (
                                      <svg
                                        className="h-4 w-4 text-muted-foreground"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        />
                                      </svg>
                                    ) : isPDF ? (
                                      <svg
                                        className="h-4 w-4 text-muted-foreground"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        className="h-4 w-4 text-muted-foreground"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <p className="truncate font-medium text-foreground">
                                      {file.name}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {msg.imageUrls && msg.imageUrls.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {msg.imageUrls.map((url, idx) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={idx}
                                src={url}
                                alt="Attached"
                                className="max-w-[200px] max-h-[200px] rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
                          <MemoizedMarkdown
                            content={msg.content}
                            id={`msg-${i}`}
                          />
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                            <p className="font-semibold mb-2">Sources:</p>
                            <ul className="space-y-1">
                              {msg.sources.map((source, idx) => (
                                <li key={idx} className="truncate">
                                  • {source}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && <TypingIndicator isSearching={useSearch} />}
            </div>
          )}
        </div>
      </div>

      {/* Input Area - ChatGPT Style */}
      <div className="border-t border-border bg-background px-2 sm:px-4 py-2 sm:py-4">
        <div className="max-w-3xl mx-auto">
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {attachedFiles.map((file, idx) => {
                  const model = MODELS[selectedModel as keyof typeof MODELS];
                  const isImage = file.type.startsWith("image/");
                  const isPDF = file.type === "application/pdf";
                  const isSupported =
                    (isImage || isPDF) &&
                    (model?.provider === "google" ||
                      model?.provider === "perplexity");

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
                        isSupported
                          ? "bg-secondary"
                          : "bg-yellow-500/20 border border-yellow-500/50"
                      }`}
                    >
                      <span className="truncate max-w-[150px]">
                        {file.name}
                      </span>
                      {!isSupported && (
                        <span
                          className="text-yellow-700 dark:text-yellow-300"
                          title="Not fully supported"
                        >
                          ⚠
                        </span>
                      )}
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Remove file"
                      ></button>
                    </div>
                  );
                })}
              </div>
              {attachedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  💡 Tip: Both Google and Perplexity models support images and
                  PDFs. Groq models don&apos;t support file attachments.
                </p>
              )}
            </div>
          )}
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.txt"
          />
          {/* Input Box */}
          <div className="rounded-3xl border border-border bg-secondary/30 dark:bg-zinc-800/50 overflow-hidden">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to know?"
              disabled={isLoading}
              rows={1}
              className="w-full resize-none bg-transparent px-3 sm:px-4 pt-3 sm:pt-4 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[50px] sm:min-h-[60px] max-h-[150px] sm:max-h-[200px]"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />

            {/* Footer with tools */}
            <div className="flex items-center justify-between px-2 sm:px-3 pb-2 sm:pb-3 gap-1">
              {/* Left side tools */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                {/* Plus button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                      suppressHydrationWarning
                    >
                      <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleNewChat}>
                      <GlobeIcon className="mr-2 h-4 w-4" /> New Chat
                    </DropdownMenuItem>
                    {supportsFiles(selectedModel) && (
                      <DropdownMenuItem
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <PlusIcon className="mr-2 h-4 w-4" /> Add File
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mic button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-colors",
                    isListening &&
                      "bg-red-500/20 text-red-500 hover:bg-red-500/30",
                  )}
                  onClick={toggleListening}
                  disabled={!speechSupported || isLoading}
                  title={
                    speechSupported
                      ? isListening
                        ? "Stop listening"
                        : "Start voice input"
                      : "Speech recognition not supported"
                  }
                  suppressHydrationWarning
                >
                  {isListening ? (
                    <MicOffIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <MicIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>

                {/* Search button with label */}
                {supportsSearch(selectedModel) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 sm:h-8 rounded-full gap-1 sm:gap-1.5 px-2 sm:px-3 transition-colors",
                      useSearch && "bg-blue-500/20 text-blue-500",
                    )}
                    onClick={() => setUseSearch(!useSearch)}
                    title={useSearch ? "Disable search" : "Enable search"}
                    suppressHydrationWarning
                  >
                    <GlobeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[10px] sm:text-xs hidden xs:inline">
                      Search
                    </span>
                  </Button>
                )}

                {/* Model Selector */}
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger
                    className="h-7 sm:h-8 w-auto border-none bg-transparent shadow-none hover:bg-accent rounded-full px-2 sm:px-3 gap-1"
                    suppressHydrationWarning
                  >
                    <GlobeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <SelectValue>
                      <span className="text-[10px] sm:text-xs max-w-[80px] sm:max-w-none truncate">
                        {MODELS[selectedModel]?.name}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODEL_GROUPS) as Provider[]).map(
                      (provider) => (
                        <div key={provider}>
                          <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                            {MODEL_GROUPS[provider].name}
                          </div>
                          {MODEL_GROUPS[provider].models.map((modelId) => {
                            const model = MODELS[modelId];
                            return (
                              <SelectItem key={modelId} value={modelId}>
                                <span className="text-xs">{model.name}</span>
                              </SelectItem>
                            );
                          })}
                        </div>
                      ),
                    )}
                  </SelectContent>
                </Select>

                {/* Model Info Button */}
                <ModelInfoModal currentModel={selectedModel} />
              </div>

              {/* Right side - Submit/Stop button */}
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex-shrink-0"
                  onClick={stop}
                  title="Stop generation"
                  suppressHydrationWarning
                >
                  <StopCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary hover:bg-primary/90 flex-shrink-0"
                  disabled={!input.trim()}
                  onClick={() => sendMessage(input)}
                  suppressHydrationWarning
                >
                  <CornerDownLeftIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center mt-2 sm:mt-3 px-2">
            Query Mate AI can make mistakes. Consider checking important info.
          </p>
        </div>
      </div>
    </div>
  );
}
