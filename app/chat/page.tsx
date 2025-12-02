"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatSidebar from "@/components/ChatSidebar";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify";

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

const CloseIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoutIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SparklesIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path
      d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("token");
    showToast("success", "Signed out successfully!");
    router.push("/auth/login");
  }

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
        <header className="flex w-full items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 relative z-40">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              suppressHydrationWarning
            >
              {sidebarOpen ? (
                <CloseIcon className="w-5 h-5 text-black dark:text-white" />
              ) : (
                <MenuIcon className="w-5 h-5 text-black dark:text-white" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-black dark:bg-white flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-white dark:text-black" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">
                QUERY MATE AI
              </h1>
            </div>
          </div>
          <Button
            className="ml-auto h-9 px-3 rounded-md bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200"
            onClick={handleLogout}
            suppressHydrationWarning
          >
            <LogoutIcon className="w-4 h-4 mr-1" />
            <span>Logout</span>
          </Button>
        </header>

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
