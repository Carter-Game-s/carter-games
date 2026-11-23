import { themeBootScript } from "@/lib/client/themes";
import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: {
    default: "GetMoreMath2.0 · Browse & play",
    template: "%s | GetMoreMath2.0",
  },
  openGraph: {
    siteName: "GetMoreMath2.0",
    title: "GetMoreMath2.0 · Browse & play",
    description:
      "Play browser games, watch movies, and connect with other players.",
  },
  description:
    "Play browser games, watch movies, and connect with other players. GetMoreMath2.0 is an independent entertainment site and is not affiliated with the Get More Math educational service.",
  applicationName: "GetMoreMath2.0",
  authors: [{ name: "Carter" }],
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
