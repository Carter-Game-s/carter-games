import { themeBootScript } from "@/lib/client/themes";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: "Carter Game's · Browse & play",
  description:
    "Browser games and read-only web browsing, created by Carter with AI assistance from OpenAI Codex.",
  applicationName: "Carter Game's",
  authors: [{ name: "Carter" }],
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
