"use client";

import { useState, useEffect, useRef } from "react";
import {
  GlobeIcon,
  PlusIcon,
  MicIcon,
  MicOffIcon,
  CornerDownLeftIcon,
  Loader2Icon,
} from "lucide-react";
import { MemoizedMarkdown } from "./MemoizedMarkdown";
import { mutateConversations, mutateUsage } from "./ChatSidebar";
import { MODELS, MODEL_GROUPS, type Provider } from "@/lib/models";
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

type ChatMessage = { role: "user" | "assistant"; content: string };

const STARTER_SUGGESTIONS = [
  "Explain quantum computing",
  "Write a poem about AI",
  "Help me debug my code",
  "What's the weather like?",
];

function TypingIndicator() {
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
      <span>Thinking…</span>
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
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<string>("gemini-2.5-flash");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef<string>(""); // Store text before speech started
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasHistory = conversationId !== null && messages.length > 0;

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time browser capability check
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
        setMessages(
          data.messages?.length
            ? data.messages
            : [{ role: "assistant", content: chatTitle || "Chat started." }],
        );
      }
    }

    if (!conversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate initialization
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
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    const body: { message: string; model: string; conversationId?: string } = {
      message: trimmed,
      model: selectedModel,
    };
    if (conversationId) body.conversationId = conversationId;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!conversationId) {
        mutateConversations();
        const convRes = await fetch("/api/conversations", {
          credentials: "include",
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          const list = convData.conversations || [];
          if (list.length) {
            const newest = list[list.length - 1];
            setConversationId(newest.id);
          }
        }
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          full += chunk;
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
        mutateUsage();
        mutateConversations();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Unable to connect. Please try again.",
        },
      ]);
    }
    setLoading(false);
  }

  function handleNewChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
  }

  const showCenterPrompt = !hasHistory && !loading && messages.length === 0;

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !loading) {
        sendMessage(input);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full p-4">
          {showCenterPrompt ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <h1 className="text-2xl md:text-3xl font-semibold mb-3 text-foreground">
                What would you like to know?
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Choose a model and ask anything to get started.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
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
                      "max-w-[85%]",
                      msg.role === "user"
                        ? "bg-secondary rounded-2xl px-4 py-3"
                        : "",
                    )}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm text-foreground">{msg.content}</p>
                    ) : (
                      <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
                        <MemoizedMarkdown
                          content={msg.content}
                          id={`msg-${i}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <TypingIndicator />}
            </div>
          )}
        </div>
      </div>

      {/* Input Area - ChatGPT Style */}
      <div className="border-t border-border bg-background px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Input Box */}
          <div className="rounded-3xl border border-border bg-secondary/30 dark:bg-zinc-800/50 overflow-hidden">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to know?"
              disabled={loading}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[60px] max-h-[200px]"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />

            {/* Footer with tools */}
            <div className="flex items-center justify-between px-3 pb-3">
              {/* Left side tools */}
              <div className="flex items-center gap-1">
                {/* Plus button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      suppressHydrationWarning
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleNewChat}>
                      <GlobeIcon className="mr-2 h-4 w-4" /> New Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mic button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    isListening &&
                      "bg-red-500/20 text-red-500 hover:bg-red-500/30",
                  )}
                  onClick={toggleListening}
                  disabled={!speechSupported || loading}
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
                    <MicOffIcon className="h-4 w-4" />
                  ) : (
                    <MicIcon className="h-4 w-4" />
                  )}
                </Button>

                {/* Search button with label */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full gap-1.5 px-3"
                  suppressHydrationWarning
                >
                  <GlobeIcon className="h-4 w-4" />
                  <span className="text-xs">Search</span>
                </Button>

                {/* Model Selector */}
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger
                    className="h-8 w-auto border-none bg-transparent shadow-none hover:bg-accent rounded-full px-3 gap-1.5"
                    suppressHydrationWarning
                  >
                    <GlobeIcon className="h-4 w-4" />
                    <SelectValue>
                      <span className="text-xs">
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
              </div>

              {/* Right side - Submit button */}
              <Button
                type="submit"
                size="icon"
                className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90"
                disabled={loading || !input.trim()}
                onClick={() => sendMessage(input)}
                suppressHydrationWarning
              >
                {loading ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <CornerDownLeftIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Query Mate AI can make mistakes. Consider checking important
            information.
          </p>
        </div>
      </div>
    </div>
  );
}
