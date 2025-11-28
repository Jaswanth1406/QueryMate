"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatSidebar from "@/components/ChatSidebar";
import ChatBox from "@/components/ChatBox";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify"; // same helper used on login

// Custom SVG icons
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
    // clear local token if you use it
    localStorage.removeItem("token");

    // use the same toast helper & style as login
    showToast("success", "Signed out successfully!");

    router.push("/auth/login");
  }

  return (
    <div className="h-screen w-screen flex bg-gradient-to-br from-gray-50 via-purple-50 to-fuchsia-50 overflow-hidden">
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
        <header className="flex w-full items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b bg-white/80 backdrop-blur-lg sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-purple-100 transition-colors rounded-xl h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
              suppressHydrationWarning
            >
              <MenuIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="hidden sm:block text-xl sm:text-2xl font-bold select-none tracking-tight bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                QUERY MATE AI
              </h1>
            </div>
          </div>
          <Button
            className="ml-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-1 sm:gap-2 font-semibold text-sm px-3 sm:px-4 h-9 sm:h-10"
            onClick={handleLogout}
            suppressHydrationWarning
          >
            <LogoutIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
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
