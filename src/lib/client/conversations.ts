import type { ChatMessage } from "@/lib/chat/messages";
import { object, text, finite } from "./validation";
export type Conversation = {
  id: string;
  title: string;
  created: number;
  updated: number;
  messages: ChatMessage[];
};
export type Conversations = { version: 1; items: Conversation[] };
export const emptyConversations: Conversations = { version: 1, items: [] };
export function validConversations(v: unknown): v is Conversations {
  return (
    object(v) &&
    v.version === 1 &&
    Array.isArray(v.items) &&
    v.items.length <= 100 &&
    new Set(v.items.map((c) => (object(c) ? c.id : ""))).size ===
      v.items.length &&
    v.items.every(
      (c) =>
        object(c) &&
        text(c.id, 80) &&
        text(c.title, 100) &&
        finite(c.created) &&
        finite(c.updated) &&
        Array.isArray(c.messages) &&
        c.messages.length <= 200 &&
        c.messages.every(
          (m) =>
            object(m) &&
            ["user", "assistant"].includes(String(m.role)) &&
            text(m.content, 32000),
        ),
    )
  );
}
export function conversationTitle(messages: ChatMessage[]) {
  return (
    messages
      .find((m) => m.role === "user")
      ?.content.trim()
      .slice(0, 60) || "New conversation"
  );
}
export function regenerationHistory(
  messages: ChatMessage[],
  index = messages.length - 1,
) {
  const end = messages[index]?.role === "assistant" ? index : index + 1;
  const history = messages.slice(0, end);
  if (history.at(-1)?.role !== "user")
    throw Error("Select an assistant response to regenerate.");
  return history;
}
export function requestHistory(messages: ChatMessage[]) {
  let size = 0;
  const selected: ChatMessage[] = [];
  for (const message of [...messages].reverse()) {
    if (!message.content.trim()) continue;
    const content = message.content.slice(0, 4000);
    if (size + content.length > 16000 || selected.length >= 24) break;
    selected.unshift({ ...message, content });
    size += content.length;
  }
  return selected;
}
