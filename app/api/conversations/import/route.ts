// app/api/conversations/import/route.ts
import { db } from "@/lib/lib";
import { conversations, messages } from "@/lib/schema";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-middleware";

interface ImportMessage {
  role: string;
  content: string;
  model?: string | null;
  tokensUsed?: number | null;
}

interface ImportConversation {
  title?: string | null;
  messages: ImportMessage[];
}

interface ImportData {
  version?: string;
  conversations: ImportConversation[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const importData: ImportData = await req.json();

    if (!importData.conversations || !Array.isArray(importData.conversations)) {
      return NextResponse.json(
        { error: "Invalid import format" },
        { status: 400 },
      );
    }

    let importedCount = 0;
    let failedCount = 0;

    for (const conv of importData.conversations) {
      try {
        // Create new conversation
        const [newConv] = await db
          .insert(conversations)
          .values({
            userId: session.user.id,
            title: conv.title || "Imported Chat",
          })
          .returning();

        // Import messages
        if (conv.messages && Array.isArray(conv.messages)) {
          for (const msg of conv.messages) {
            await db.insert(messages).values({
              conversationId: newConv.id,
              role: msg.role,
              content: msg.content,
              model: msg.model || null,
              tokensUsed: msg.tokensUsed || null,
            });
          }
        }

        importedCount++;
      } catch (error) {
        console.error("Failed to import conversation:", error);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      failed: failedCount,
      message: `Successfully imported ${importedCount} conversation(s)${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 },
    );
  }
}
