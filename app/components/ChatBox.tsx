"use client";
import { useState, useRef, useEffect } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, User, Bot } from "lucide-react";

function Bubble({ role, children }: { role: string; children: React.ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4 sm:mb-6 animate-slideInRight">
        <div className="flex items-start gap-2 sm:gap-3 max-w-[85%] sm:max-w-[75%]">
          <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-fuchsia-500 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-3xl rounded-tr-md shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="text-sm sm:text-[15px] leading-relaxed font-medium">{children}</div>
          </div>
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-400 flex items-center justify-center shadow-md">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start mb-4 sm:mb-6 animate-slideInLeft">
      <div className="flex items-start gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%]">
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
          <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="bg-white border border-gray-200 text-gray-800 px-4 py-3 sm:px-6 sm:py-4 rounded-3xl rounded-tl-md shadow-md hover:shadow-lg transition-shadow duration-300">
          <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200">
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
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
          <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="bg-white border border-gray-200 px-6 py-4 sm:px-8 sm:py-5 rounded-3xl rounded-tl-md shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
            <span className="text-xs sm:text-sm text-gray-500 ml-2">Thinking...</span>
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
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini");
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

    const body: any = { message: trimmed, model: selectedModel };
    if (conversationId) body.conversationId = conversationId;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!conversationId) {
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
            if (updated.length && updated[updated.length - 1].role === "assistant") {
              updated[updated.length - 1].content = full;
            } else {
              updated.push({ role: "assistant", content: full });
            }
            return updated;
          });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠ Unable to connect. Please try again." },
      ]);
    }
    setLoading(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(e);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-gray-50 to-white">
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
          ref={scrollRootRef as any}
          className="h-full w-full px-3 py-4 sm:px-6 sm:py-8 md:px-16 lg:px-24"
          style={{ maxHeight: "calc(100vh - 170px)", minHeight: 0 }}
        >
          <div className="max-w-5xl mx-auto">
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 {...props} className="text-2xl font-bold mt-4 mb-3 text-gray-900" />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 {...props} className="text-xl font-semibold mt-3 mb-2 text-gray-800" />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 {...props} className="text-lg font-semibold mt-2 mb-2 text-gray-800" />
                      ),
                      p: ({ node, ...props }) => (
                        <p {...props} className="mb-3 last:mb-0" />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul {...props} className="space-y-2 my-3" />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol {...props} className="space-y-2 my-3" />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="ml-4" {...props} />
                      ),
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
        <ScrollArea.Scrollbar orientation="vertical" className="w-2 bg-gray-100 rounded-full">
          <ScrollArea.Thumb className="bg-purple-400 rounded-full hover:bg-purple-500 transition-colors" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner />
      </ScrollArea.Root>

      <div className="flex-shrink-0 border-t bg-white shadow-lg">
        <div className="max-w-5xl mx-auto px-3 py-3 sm:px-6 sm:py-5 md:px-16 lg:px-24">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-gray-50 rounded-2xl p-2 border-2 border-transparent focus-within:border-purple-400 focus-within:bg-white transition-all duration-300 shadow-sm">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-0 focus:ring-0 h-10">
                <SelectValue placeholder="Select AI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧠</span>
                    <span>Google Gemini</span>
                  </div>
                </SelectItem>
                <SelectItem value="perplexity">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔍</span>
                    <span>Perplexity</span>
                  </div>
                </SelectItem>
                <SelectItem value="bedrock">
                  <div className="flex items-center gap-2">
                    <span className="text-base">☁</span>
                    <span>Amazon Bedrock</span>
                  </div>
                </SelectItem>
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
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-[15px] placeholder:text-gray-400 px-3 sm:px-4 h-10"
                placeholder="Ask me anything..."
                disabled={loading}
              />
              <Button
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 text-white rounded-xl px-4 sm:px-6 py-2 sm:py-3 h-10 font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
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