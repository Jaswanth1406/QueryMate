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
            className="fixed top-2 left-2 sm:top-3 sm:left-3 z-20 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 backdrop-blur-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Sidebar"
            suppressHydrationWarning
          >
            <MenuIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black dark:text-white" />
          </Button>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
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
