"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { showToast } from "@/lib/toastify";
import { signOut } from "@/lib/better-auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlusIcon,
  Search,
  Edit,
  Trash2,
  MessageSquare,
  MoreVertical,
  Zap,
  Infinity,
  Download,
  Upload,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronUp,
  LogOut,
  X,
} from "lucide-react";

type Conversation = {
  id: string;
  title?: string | null;
  createdAt?: string;
  userId?: string;
};

type UsageData = {
  gemini: {
    tokensUsed: number;
    tokensLimit: number;
    requestsUsed: number;
    requestsLimit: number;
  };
  perplexity: {
    unlimited: boolean;
  };
};

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}K`;
  }
  return tokens.toString();
}

export const mutateConversations = () => mutate("/api/conversations");
export const mutateUsage = () => mutate("/api/usage");

export default function ChatSidebar({
  open,
  setOpen,
  onSelectConversation,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSelectConversation: (id: string | null, title: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [conversationToEdit, setConversationToEdit] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [profileExpanded, setProfileExpanded] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: sessionData } = useSWR("/api/auth/sessions");
  const user = sessionData?.user;

  const { data: usageData } = useSWR("/api/usage");
  const usage: UsageData | undefined = usageData?.usage;

  const { data: convData, mutate: mutateChats } = useSWR("/api/conversations");
  const chats: Conversation[] = convData?.conversations || [];

  const getChatTitle = (chat: Conversation) => {
    if (
      chat.title &&
      chat.title !== "New Chat" &&
      chat.title !== "New Conversation"
    ) {
      return chat.title.trim();
    }
    return "New Chat";
  };

  const filteredChats = chats.filter((chat) => {
    const chatTitle = getChatTitle(chat);
    return !search || chatTitle.toLowerCase().includes(search.toLowerCase());
  });

  // Group chats by time period
  const groupChatsByDate = (chatList: Conversation[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: {
      today: Conversation[];
      yesterday: Conversation[];
      last7Days: Conversation[];
      last30Days: Conversation[];
      older: Conversation[];
    } = {
      today: [],
      yesterday: [],
      last7Days: [],
      last30Days: [],
      older: [],
    };

    // Sort by createdAt descending first
    const sorted = [...chatList].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    for (const chat of sorted) {
      const chatDate = chat.createdAt ? new Date(chat.createdAt) : new Date(0);
      
      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat);
      } else if (chatDate >= last7Days) {
        groups.last7Days.push(chat);
      } else if (chatDate >= last30Days) {
        groups.last30Days.push(chat);
      } else {
        groups.older.push(chat);
      }
    }

    return groups;
  };

  const groupedChats = groupChatsByDate(filteredChats);

  const openEditDialog = (id: string, title: string) => {
    setConversationToEdit({ id, title });
    setEditTitle(title);
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!conversationToEdit || !editTitle.trim()) return;

    try {
      const response = await fetch("/api/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: conversationToEdit.id,
          title: editTitle.trim(),
        }),
      });

      if (response.ok) {
        mutateChats();
        setEditDialogOpen(false);
      } else {
        alert("Failed to update conversation title");
      }
    } catch (error) {
      console.error("Error updating title:", error);
      alert("Failed to update conversation title");
    }
  };

  const openDeleteDialog = (id: string, title: string) => {
    setConversationToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!conversationToDelete) return;

    const { id } = conversationToDelete;

    try {
      const response = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        mutateChats();
        if (activeId === id) {
          setActiveId(null);
          onSelectConversation(null, "New Chat");
        }
      } else {
        alert("Failed to delete conversation");
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("Failed to delete conversation");
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    showToast("info", "Export started...");
    try {
      const response = await fetch("/api/conversations/export", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `querymate-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("success", "Export finished! File downloaded.");
    } catch (error) {
      console.error("Export error:", error);
      showToast("error", "Failed to export conversations");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImportLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const response = await fetch("/api/conversations/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok) {
          alert(result.message);
          mutateChats();
        } else {
          throw new Error(result.error || "Import failed");
        }
      } catch (error) {
        console.error("Import error:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to import conversations",
        );
      } finally {
        setImportLoading(false);
      }
    };
    input.click();
  };

  const handleExportPDF = async (conversationId: string, title: string) => {
    showToast("info", "PDF export started...");
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/export-pdf`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to fetch conversation data");
      const data = await response.json();
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("QueryMate", 20, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Exported: ${new Date().toLocaleDateString()}`, 20, 28);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const wrappedTitle = doc.splitTextToSize(
        data.conversation.title || "Untitled",
        170,
      );
      doc.text(wrappedTitle, 20, 40);
      let yPosition = 50;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = 170;
      for (const msg of data.messages) {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const roleText =
          msg.role === "user"
            ? "You"
            : `Assistant${msg.model ? ` (${msg.model})` : ""}`;
        doc.text(roleText, margin, yPosition);
        yPosition += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        let textContent = msg.content;
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed && typeof parsed.text === "string") {
            textContent = parsed.text;
            if (parsed.files && Array.isArray(parsed.files)) {
              textContent +=
                "\n[Attachments: " +
                parsed.files.map((f: { name: string }) => f.name).join(", ") +
                "]";
            }
          }
        } catch {
          // Not JSON, use as is
        }
        const wrappedContent = doc.splitTextToSize(textContent, maxWidth);
        for (const line of wrappedContent) {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        }
        yPosition += 10;
      }
      const fileName = `${title.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.pdf`;
      doc.save(fileName);
      showToast("success", "PDF export finished! File downloaded.");
    } catch (error) {
      console.error("PDF export error:", error);
      showToast("error", "Failed to export conversation as PDF");
    }
  };

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.error) {
      window.location.href = "/auth/login";
    }
  };

  // Render a single chat item
  const renderChatItem = (chat: Conversation) => {
    const chatTitle = getChatTitle(chat);
    return (
      <div
        key={chat.id}
        className={`flex items-center gap-1 rounded-md px-2 py-1 ${
          activeId === chat.id
            ? "bg-gray-100 dark:bg-gray-800"
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <button
          className="text-left flex-1 min-w-0 py-1 text-sm text-gray-800 dark:text-gray-200"
          onClick={() => {
            setActiveId(chat.id);
            onSelectConversation(chat.id, chatTitle);
            setOpen(false);
          }}
          suppressHydrationWarning
        >
          <span className="truncate block">{chatTitle}</span>
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={(e) => e.stopPropagation()}
              aria-label="Conversation options"
              suppressHydrationWarning
            >
              <MoreVertical className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            side="right"
            align="start"
            className="z-[99] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm text-sm min-w-[150px] py-1"
          >
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                openEditDialog(chat.id, chatTitle);
              }}
              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
            >
              <Edit className="w-3 h-3" />
              <span>Edit</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                handleExportPDF(chat.id, chatTitle);
              }}
              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
            >
              <FileText className="w-3 h-3" />
              <span>Export PDF</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                openDeleteDialog(chat.id, chatTitle);
              }}
              className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    );
  };

  const initial = (user?.name?.[0] || "U").toUpperCase();

  return (
    <>
      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="dark:bg-gray-900 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              Delete Conversation
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900 dark:text-gray-200">
                &quot;{conversationToDelete?.title || "this conversation"}&quot;
              </span>
              ? This action cannot be undone and all messages will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit title */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              Edit Conversation Title
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Enter a new title for this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="dark:text-gray-200">
                Title
              </Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter conversation title..."
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEdit();
                  }
                }}
                suppressHydrationWarning
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-30 left-0 top-0 h-screen w-[85vw] xs:w-72 md:w-80 transition-transform duration-300 ease-in-out bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col ${
          open
            ? "translate-x-0"
            : "-translate-x-[85vw] xs:-translate-x-72 md:-translate-x-80"
        }`}
      >
        {/* QueryMate Header */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight dark:text-white">
            QueryMate
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setOpen(false)}
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>

        {/* New chat + search */}
        <div className="flex flex-col px-4 pt-4 gap-2">
          <Button
            onClick={() => {
              setActiveId(null);
              onSelectConversation(null, "New Chat");
              setOpen(false);
            }}
            className="flex items-center gap-2 justify-center bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200 h-9 rounded-md text-sm"
            suppressHydrationWarning
          >
            <PlusIcon className="w-4 h-4" /> New Chat
          </Button>
          <div className="flex items-center rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1">
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="text"
              placeholder="Search chats"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border-0 px-2 py-1 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent dark:text-white"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Conversations */}
        <nav className="flex-1 mt-4 mb-4 px-4 min-h-0 flex flex-col overflow-hidden">
          <div className="mb-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>Recent Chats</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              {filteredChats.length > 0 ? (
                <>
                  {/* Today */}
                  {groupedChats.today.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase px-2 py-1">Today</div>
                      {groupedChats.today.map((chat) => renderChatItem(chat))}
                    </div>
                  )}
                  
                  {/* Yesterday */}
                  {groupedChats.yesterday.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase px-2 py-1">Yesterday</div>
                      {groupedChats.yesterday.map((chat) => renderChatItem(chat))}
                    </div>
                  )}
                  
                  {/* Last 7 Days */}
                  {groupedChats.last7Days.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase px-2 py-1">Previous 7 Days</div>
                      {groupedChats.last7Days.map((chat) => renderChatItem(chat))}
                    </div>
                  )}
                  
                  {/* Last 30 Days */}
                  {groupedChats.last30Days.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase px-2 py-1">Previous 30 Days</div>
                      {groupedChats.last30Days.map((chat) => renderChatItem(chat))}
                    </div>
                  )}
                  
                  {/* Older */}
                  {groupedChats.older.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase px-2 py-1">Older</div>
                      {groupedChats.older.map((chat) => renderChatItem(chat))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-400 dark:text-gray-500 text-sm py-8 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>No conversations yet</p>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Profile Section at Bottom */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-auto">
          <button
            onClick={() => setProfileExpanded(!profileExpanded)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            suppressHydrationWarning
          >
            <div className="w-9 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-semibold">
              {initial}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-sm dark:text-white">
                {user?.name ?? "User"}
              </div>
            </div>
            {profileExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {profileExpanded && (
            <div className="px-3 pb-3 space-y-1 border-t border-gray-200 dark:border-gray-800">
              {/* Token Usage Display */}
              <div className="px-3 py-3 text-xs space-y-2">
                {/* Gemini */}
                {usage && (
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Google tokens</span>
                    </div>
                    <span className="font-mono">
                      {formatTokens(usage.gemini.tokensUsed)}/
                      {formatTokens(usage.gemini.tokensLimit)}
                    </span>
                  </div>
                )}
                {/* Perplexity */}
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Infinity className="w-3 h-3" />
                    <span>Perplexity</span>
                  </div>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    Unlimited
                  </span>
                </div>
                {/* Groq */}
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Infinity className="w-3 h-3" />
                    <span>Groq</span>
                  </div>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    Unlimited
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>
                  {exportLoading ? "Exporting..." : "Export conversations"}
                </span>
              </button>
              <button
                onClick={handleImportClick}
                disabled={importLoading}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {importLoading ? "Importing..." : "Import conversations"}
                </span>
              </button>
              <button
                onClick={() => {
                  window.location.href = "/analytics";
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
