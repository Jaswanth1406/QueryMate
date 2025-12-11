"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MessageSquare,
  Zap,
  TrendingUp,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalConversations: number;
    totalMessages: number;
    totalTokensAllTime: number;
    totalTokensToday: number;
    requestsToday: number;
    avgConversationLength: number;
  };
  messagesByRole: {
    user: number;
    assistant: number;
  };
  messagesByModel: Record<string, number>;
  timeAnalytics: {
    messagesByHour: number[];
    peakHour: number;
    activityData: Array<{ date: string; messages: number }>;
  };
  recentConversations: Array<{
    id: string;
    title: string | null;
    createdAt: string;
    messageCount: number;
  }>;
  accountAge: {
    createdAt: string;
    daysActive: number;
  };
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR("/api/analytics");
  const analytics: AnalyticsData | undefined = data?.analytics;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            Failed to load analytics
          </p>
          <Button
            onClick={() => router.push("/chat")}
            variant="outline"
            className="mt-4"
          >
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  const modelColors: Record<string, string> = {
    "gemini-2.5-flash": "bg-blue-500",
    "gemini-2.5-flash-lite": "bg-cyan-500",
    sonar: "bg-purple-500",
    "sonar-pro": "bg-indigo-500",
    "llama-3.3-70b": "bg-green-500",
    "llama-3.1-8b": "bg-emerald-500",
    "llama-4-scout": "bg-teal-500",
    "llama-4-maverick": "bg-lime-500",
    "qwen3-32b": "bg-orange-500",
    "kimi-k2": "bg-pink-500",
    unknown: "bg-gray-500",
  };

  const totalModelMessages = Object.values(analytics.messagesByModel).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/chat")}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your usage insights and statistics
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Conversations
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {analytics.overview.totalConversations}
                </p>
              </div>
              <MessageSquare className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Messages
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(analytics.overview.totalMessages)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Tokens
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatNumber(analytics.overview.totalTokensAllTime)}
                </p>
              </div>
              <Zap className="w-10 h-10 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Account Age
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {analytics.accountAge.daysActive}d
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-500" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Model Usage */}
          <Card className="p-6 dark:bg-gray-900 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Model Usage
            </h2>
            <div className="space-y-3">
              {Object.entries(analytics.messagesByModel)
                .sort(([, a], [, b]) => b - a)
                .map(([model, count]) => {
                  const percentage =
                    totalModelMessages > 0
                      ? ((count / totalModelMessages) * 100).toFixed(1)
                      : "0";
                  return (
                    <div key={model}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {model}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                        <div
                          className={`${modelColors[model] || modelColors.unknown} h-2 rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* Activity Stats */}
          <Card className="p-6 dark:bg-gray-900 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Stats
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Avg. Conversation Length
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {analytics.overview.avgConversationLength} msgs
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Peak Usage Hour
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {analytics.timeAnalytics.peakHour}:00
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Tokens Today
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(analytics.overview.totalTokensToday)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Days Active
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {analytics.accountAge.daysActive}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Hourly Activity Chart */}
        <Card className="p-6 dark:bg-gray-900 dark:border-gray-800 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Messages by Hour (24h)
          </h2>
          <div className="flex items-end justify-between gap-1 h-48">
            {analytics.timeAnalytics.messagesByHour.map((count, hour) => {
              const maxCount = Math.max(
                ...analytics.timeAnalytics.messagesByHour,
              );
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div
                  key={hour}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${hour}:00 - ${count} messages`}
                >
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-t relative flex-1 flex items-end">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  {hour % 3 === 0 && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {hour}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Conversations */}
        <Card className="p-6 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Conversations
          </h2>
          <div className="space-y-3">
            {analytics.recentConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => router.push(`/chat?id=${conv.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {conv.title || "Untitled Conversation"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(conv.createdAt)} • {conv.messageCount} messages
                  </p>
                </div>
                <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
