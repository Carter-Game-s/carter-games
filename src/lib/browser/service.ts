export function browserServiceConfigured() {
  return (
    !!process.env.BROWSER_SERVICE_URL && !!process.env.BROWSER_SERVICE_TOKEN
  );
}
export async function browserRequest(payload: Record<string, unknown>) {
  const url = new URL(process.env.BROWSER_SERVICE_URL || "");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        url.hostname === "127.0.0.1" &&
        url.port === "18081")
    )
  )
    throw new Error("Invalid browser service configuration.");
  const token = process.env.BROWSER_SERVICE_TOKEN;
  if (!token || token.length < 32)
    throw new Error("Browser service is not configured.");
  return fetch(new URL("action", url), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
  });
}
