"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatSidebar from "@/components/ChatSidebar";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";

const MenuIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
  </svg>
);

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string | null>(null);

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-gray-950 text-black dark:text-white overflow-hidden">
      <ChatSidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onSelectConversation={(id, title) => {
          setConvId(id);
          setChatTitle(title);
          setSidebarOpen(false);
        }}
      />
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Fixed floating menu button - always visible */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-20 h-10 w-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Sidebar"
            suppressHydrationWarning
          >
            <MenuIcon className="w-5 h-5 text-black dark:text-white" />
          </Button>
        )}

        <div className="flex-1 h-0 flex flex-col">
          <ChatBox
            conversationId={convId}
            setConversationId={setConvId}
            chatTitle={chatTitle}
          />
        </div>
      </div>
    </div>
  );
}
