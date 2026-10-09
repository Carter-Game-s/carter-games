import type { Metadata } from "next";
import { Shell } from "@/components/layout/shell";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: "Orbit · Browse & play",
  description: "A private Codespaces browser and games collection.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
