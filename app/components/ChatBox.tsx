"use client";
import { useState, useRef, useEffect } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { Send, User, Bot } from "lucide-react";
import { mutateConversations, mutateUsage } from "./ChatSidebar";
import { MODELS, MODEL_GROUPS, type Provider } from "@/lib/models";

function Bubble({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4 sm:mb-6 animate-slideInRight">
        <div className="flex items-start gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%]">
          <div className="bg-black dark:bg-white text-white dark:text-black px-4 py-3 sm:px-6 sm:py-4 rounded-3xl rounded-tr-md shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="text-sm sm:text-[15px] leading-relaxed font-medium">
              {children}
            </div>
          </div>
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800 dark:bg-gray-200 flex items-center justify-center shadow-md">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-black" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start mb-4 sm:mb-6 animate-slideInLeft">
      <div className="flex items-start gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%]">
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 dark:from-gray-300 dark:to-gray-400 flex items-center justify-center shadow-md">
          <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-black" />
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-4 py-3 sm:px-6 sm:py-4 rounded-3xl rounded-tl-md shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="prose prose-sm max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-200 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-a:text-gray-900 dark:prose-a:text-gray-100 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-gray-800 dark:prose-code:text-gray-200 prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4 sm:mb-6 animate-slideInLeft">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 dark:from-gray-300 dark:to-gray-400 flex items-center justify-center shadow-md">
          <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-black" />
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-4 sm:px-8 sm:py-5 rounded-3xl rounded-tl-md shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span
                className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></span>
              <span
                className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></span>
              <span
                className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></span>
            </div>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-2">
              Thinking...
            </span>
          </div>
        </div>
      </div>
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
  type ChatMessage = { role: "user" | "assistant"; content: string };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<string>("gemini-2.5-flash");
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadHistory(id: string) {
      const res = await fetch(`/api/messages?conversationId=${id}`, {
        credentials: "include",
      });
      const data = await res.json();
      setMessages(
        data.messages?.length
          ? data.messages
          : [{ role: "assistant", content: chatTitle || "Chat started." }],
      );
    }

    if (!conversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([
        {
          role: "assistant",
          content: "👋 Hello! I'm your AI assistant. How can I help you today?",
        },
      ]);
      return;
    }
    loadHistory(conversationId);
  }, [conversationId, chatTitle]);

  useEffect(() => {
    if (scrollRootRef.current) {
      scrollRootRef.current.scrollTop = scrollRootRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
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
        // New conversation created - revalidate sidebar
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
        // Response complete - revalidate usage and conversations (for title update)
        mutateUsage();
        mutateConversations();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠ Unable to connect. Please try again.",
        },
      ]);
    }
    setLoading(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(e);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.4s ease-out;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease-out;
        }
      `}</style>

      <ScrollArea.Root type="scroll" className="flex-1 min-h-0 w-full">
        <ScrollArea.Viewport
          ref={scrollRootRef}
          className="h-full w-full px-3 py-4 sm:px-6 sm:py-8 md:px-16 lg:px-24"
          style={{ maxHeight: "calc(100vh - 170px)", minHeight: 0 }}
        >
          <div className="max-w-5xl mx-auto">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ ...props }) => (
                        <h1
                          {...props}
                          className="text-2xl font-bold mt-4 mb-3 text-gray-900 dark:text-white"
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h2
                          {...props}
                          className="text-xl font-semibold mt-3 mb-2 text-gray-800 dark:text-gray-200"
                        />
                      ),
                      h3: ({ ...props }) => (
                        <h3
                          {...props}
                          className="text-lg font-semibold mt-2 mb-2 text-gray-800 dark:text-gray-200"
                        />
                      ),
                      p: ({ ...props }) => (
                        <p {...props} className="mb-3 last:mb-0" />
                      ),
                      ul: ({ ...props }) => (
                        <ul {...props} className="space-y-2 my-3" />
                      ),
                      ol: ({ ...props }) => (
                        <ol {...props} className="space-y-2 my-3" />
                      ),
                      li: ({ ...props }) => <li className="ml-4" {...props} />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  m.content
                )}
              </Bubble>
            ))}
            {loading && <TypingIndicator />}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="w-2 bg-gray-100 dark:bg-gray-800 rounded-full"
        >
          <ScrollArea.Thumb className="bg-gray-400 dark:bg-gray-600 rounded-full hover:bg-gray-500 dark:hover:bg-gray-500 transition-colors" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner />
      </ScrollArea.Root>

      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
        <div className="max-w-5xl mx-auto px-3 py-3 sm:px-6 sm:py-5 md:px-16 lg:px-24">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-2 border-2 border-transparent focus-within:border-gray-400 dark:focus-within:border-gray-600 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all duration-300 shadow-sm">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 border-0 focus:ring-0 h-10">
                <SelectValue placeholder="Select AI Model">
                  {MODELS[selectedModel] && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {MODEL_GROUPS[MODELS[selectedModel].provider].icon}
                      </span>
                      <span className="truncate">
                        {MODELS[selectedModel].name}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-80">
                {(Object.keys(MODEL_GROUPS) as Provider[]).map((provider) => (
                  <SelectGroup key={provider}>
                    <SelectLabel className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1.5">
                      <span>{MODEL_GROUPS[provider].icon}</span>
                      <span>{MODEL_GROUPS[provider].name}</span>
                    </SelectLabel>
                    {MODEL_GROUPS[provider].models.map((modelId) => {
                      const model = MODELS[modelId];
                      return (
                        <SelectItem
                          key={modelId}
                          value={modelId}
                          className="dark:text-gray-200 dark:focus:bg-gray-700 pl-6"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{model.name}</span>
                            {model.description && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {model.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-[15px] placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-white px-3 sm:px-4 h-10"
                placeholder="Ask me anything..."
                disabled={loading}
              />
              <Button
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                className="bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white rounded-xl px-4 sm:px-6 py-2 sm:py-3 h-10 font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
