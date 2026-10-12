export type ChatMessage = { role: "user" | "assistant"; content: string };
export function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24)
    throw Error("Send between 1 and 24 messages.");
  let total = 0;
  const messages = value.map((item): ChatMessage => {
    if (
      !item ||
      typeof item !== "object" ||
      !["user", "assistant"].includes(item.role) ||
      typeof item.content !== "string" ||
      !item.content.trim() ||
      item.content.length > 4000
    )
      throw Error("Invalid chat message.");
    total += item.content.length;
    return { role: item.role, content: item.content };
  });
  if (total > 16000 || messages.at(-1)?.role !== "user")
    throw Error(
      "Keep the conversation under 16,000 characters and end with your message.",
    );
  return messages;
}
