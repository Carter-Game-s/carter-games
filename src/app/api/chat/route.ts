import { streamText, gateway } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { parseMessages } from "@/lib/chat/messages";
import { allowRequest, sameOrigin } from "@/lib/proxy/security";

export const runtime = "nodejs";
export const maxDuration = 120;
const configured = () =>
  !!(process.env.AI_GATEWAY_API_KEY || process.env.CHAT_BASE_URL);
export function GET() {
  return Response.json(
    { available: configured(), local: !!process.env.CHAT_BASE_URL },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Same-origin access required. Refresh and retry." },
      { status: 403 },
    );
  if (!configured())
    return Response.json(
      {
        error:
          "AI chat is awaiting its model connection. Please try again once Carter connects the provider.",
      },
      { status: 503 },
    );
  if (
    !allowRequest(
      "chat:" +
        (request.headers.get("x-forwarded-for")?.split(",")[0] || "local"),
      10,
    )
  )
    return Response.json(
      { error: "Too many messages. Try again in a minute." },
      { status: 429 },
    );
  let messages;
  let streaming = true;
  try {
    if (Number(request.headers.get("content-length") || 0) > 80000)
      throw Error("Message is too large.");
    const reader = request.body?.getReader();
    if (!reader) throw Error("Missing messages.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 80000) {
        await reader.cancel();
        throw Error("Message is too large.");
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    messages = parseMessages(body.messages);
    streaming = body.stream !== false;
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Invalid messages." },
      { status: 400 },
    );
  }
  try {
    const generation = new AbortController();
    const model = process.env.CHAT_BASE_URL
      ? createOpenAICompatible({
          name: "carter-chat",
          baseURL: process.env.CHAT_BASE_URL,
          apiKey: process.env.CHAT_API_KEY,
        }).chatModel(process.env.CHAT_MODEL || "qwen2.5:0.5b")
      : gateway(process.env.CHAT_MODEL || "openai/gpt-5.4-nano");
    const result = streamText({
      model,
      messages,
      instructions:
        "You are Carter Games' friendly AI chat assistant. Keep replies clear and concise. Help with general questions, browser games, and sounds. Carter created Carter Games with AI assistance. Never claim you can change the website, browse live sites, access private information, or perform actions; you have no tools. If uncertain, say so.",
      maxOutputTokens: 512,
      maxRetries: 0,
      abortSignal: AbortSignal.any([request.signal, generation.signal]),
      timeout: 110000,
    });
    if (!streaming) {
      const text = await result.text;
      if (!text.trim()) throw Error("No response");
      return Response.json(
        { text },
        {
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    const iterator = result.textStream[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done) throw Error("No response");
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(first.value));
      },
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(next.value));
        } catch {
          controller.error(
            Error("The AI connection was interrupted. Please retry."),
          );
        }
      },
      async cancel() {
        generation.abort();
        await iterator.return?.();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return Response.json(
      { error: "The AI couldn't respond. Please try again shortly." },
      { status: 502 },
    );
  }
}
