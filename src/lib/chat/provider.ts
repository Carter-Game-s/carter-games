export function chatModel() {
  return (
    process.env.CHAT_MODEL ||
    (process.env.CHAT_BASE_URL ? "qwen2.5:0.5b" : "openai/gpt-5.4-nano")
  );
}

// Probe model discovery, not just configuration. Never expose provider errors or credentials.
export async function chatAvailability() {
  const base = process.env.CHAT_BASE_URL;
  if (!base)
    return { available: !!process.env.AI_GATEWAY_API_KEY, local: false };
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/models`, {
      headers: process.env.CHAT_API_KEY
        ? { Authorization: `Bearer ${process.env.CHAT_API_KEY}` }
        : {},
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("Provider unavailable");
    const body = await response.json();
    const available =
      Array.isArray(body.data) &&
      body.data.some((model: { id?: unknown }) => model?.id === chatModel());
    return { available, local: true };
  } catch {
    return { available: false, local: true };
  }
}
