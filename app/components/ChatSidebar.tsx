"use client";
import { useState, useEffect } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusIcon,
  Search,
  Edit,
  Trash2,
  MessageSquare,
  Sparkles,
  X,
  MoreVertical,
} from "lucide-react";

function titleFromMessages(messages: any[]) {
  const firstUserMsg = messages?.find((m) => m.role === "user")?.content || "";
  return firstUserMsg.split(/\s+/).slice(0, 5).join(" ") || "New Chat";
}

export default function ChatSidebar({
  open,
  setOpen,
  onSelectConversation,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSelectConversation: (id: string | null, title: string) => void;
}) {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch("/api/auth/sessions", {
          credentials: "include",
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setUser(sessionData.user);
        }

        const convRes = await fetch("/api/conversations", {
          credentials: "include",
        });
        if (!convRes.ok) {
          setChats([]);
          setMessagesByConv({});
          return;
        }
        const convData = await convRes.json();
        const list = convData.conversations || [];
        setChats(list);

        const msgMap: Record<string, any[]> = {};
        for (const c of list) {
          try {
            const r = await fetch(`/api/messages?conversationId=${c.id}`, {
              credentials: "include",
            });
            if (r.ok) {
              const d = await r.json();
              msgMap[c.id] = d.messages || [];
            }
          } catch (e) {
            console.warn("[ChatSidebar] message fetch error", c.id, e);
          }
        }
        setMessagesByConv(msgMap);
      } catch (e) {
        console.error("[ChatSidebar] load error", e);
      }
    }
    loadData();
  }, []);

  const getChatTitle = (chat: any) => {
    if (chat.title && chat.title !== "New Chat" && chat.title !== "New Conversation") {
      return chat.title.trim();
    }
    return titleFromMessages(messagesByConv[chat.id] || []);
  };

  const filteredChats = chats.filter((chat) => {
    const chatTitle = getChatTitle(chat);
    return !search || chatTitle.toLowerCase().includes(search.toLowerCase());
  });

  const handleEdit = async (id: string) => {
    const currentChat = chats.find((c) => c.id === id);
    const currentTitle = currentChat ? getChatTitle(currentChat) : "";
    const newTitle = prompt("Edit chat title", currentTitle);
    if (newTitle && newTitle.trim()) {
      try {
        const response = await fetch("/api/conversations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, title: newTitle.trim() }),
        });
        
        if (response.ok) {
          setChats((prev) =>
            prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() } : c)),
          );
        } else {
          alert("Failed to update conversation title");
        }
      } catch (error) {
        console.error("Error updating title:", error);
        alert("Failed to update conversation title");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || !confirm("Delete this conversation and all its messages?")) return;
    
    try {
      const response = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        setChats((prev) => prev.filter((c) => c.id !== id));
        setMessagesByConv((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        if (activeId === id) setActiveId(null);
      } else {
        alert("Failed to delete conversation");
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("Failed to delete conversation");
    }
  };

  const initial = (user?.name?.[0] || "U").toUpperCase();

  return (
    <>
      <aside
        className={`fixed z-30 left-0 top-0 h-full w-80 transition-all duration-300 ease-in-out shadow-2xl bg-white ${
          open ? "translate-x-0" : "-translate-x-80"
        }`}
      >
        <Button
          variant="ghost"
          className="absolute top-4 right-4 rounded-full hover:bg-gray-100 transition-colors"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
          size="icon"
        >
          <X className="w-5 h-5 text-gray-600" />
        </Button>

        {/* User circle + name + email */}
        <div className="flex flex-col items-center py-8 border-b bg-gradient-to-b from-purple-50 to-white">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-semibold shadow-lg mb-3">
            {initial}
          </div>
          <div className="font-bold text-lg text-gray-900">
            {user?.name ?? "User"}
          </div>
          <div className="text-sm text-gray-500">
            {user?.email ?? "email@example.com"}
          </div>
        </div>

        {/* New Chat + Search */}
        <div className="flex flex-col px-4 pt-5 gap-3">
          <Button
            onClick={() => {
              setActiveId(null);
              onSelectConversation(null, "New Chat");
            }}
            className="flex items-center gap-2 justify-center bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 py-3 font-semibold"
          >
            <PlusIcon className="w-5 h-5" /> New Chat
          </Button>
          <div className="flex items-center rounded-xl border-2 border-gray-200 px-3 py-2 focus-within:border-purple-400 transition-colors bg-gray-50 focus-within:bg-white">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-1 outline-none bg-transparent text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Conversations list */}
        <nav className="flex-1 mt-4 mb-6 px-4">
          <div className="mb-3 font-semibold text-xs tracking-wide text-gray-500 uppercase flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Recent Conversations</span>
          </div>
          <ScrollArea.Root className="h-[calc(100vh-320px)] w-full">
            <ScrollArea.Viewport className="w-full h-full py-1">
              <div className="flex flex-col gap-2 pr-1">
                {filteredChats.length > 0 ? (
                  filteredChats.map((chat) => {
                    const chatTitle = getChatTitle(chat);
                    return (
                      <div
                        key={chat.id}
                        className={`flex items-center rounded-xl transition-all duration-200 px-2 py-1 ${
                          activeId === chat.id
                            ? "bg-gradient-to-r from-purple-100 to-fuchsia-100 shadow-sm"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <button
                          className="text-left flex-1 min-w-0 px-2 py-2 font-medium text-sm truncate text-gray-800"
                          onClick={() => {
                            setActiveId(chat.id);
                            onSelectConversation(chat.id, chatTitle);
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span className="truncate">{chatTitle}</span>
                          </div>
                        </button>

                        {/* Three-dots menu with Edit/Delete */}
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button
                              type="button"
                              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Conversation options"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content
                            side="right"
                            align="start"
                            className="z-[99] bg-white border border-gray-200 rounded-md shadow-md text-sm min-w-[160px] py-1"
                          >
                            <DropdownMenu.Item
                              onSelect={(e) => {
                                e.preventDefault();
                                handleEdit(chat.id);
                              }}
                              className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100 text-gray-700"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Edit</span>
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                            <DropdownMenu.Item
                              onSelect={(e) => {
                                e.preventDefault();
                                handleDelete(chat.id);
                              }}
                              className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-400 text-sm py-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No conversations yet</p>
                    <p className="text-xs mt-1">Start a new chat to begin</p>
                  </div>
                )}
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              orientation="vertical"
              className="w-2 bg-gray-100 rounded-full"
            >
              <ScrollArea.Thumb className="bg-purple-400 rounded-full hover:bg-purple-500 transition-colors" />
            </ScrollArea.Scrollbar>
            <ScrollArea.Corner />
          </ScrollArea.Root>
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-20 backdrop-blur-sm transition-opacity"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
          tabIndex={-1}
        />
      )}
    </>
  );
}