"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientTools } from "@/components/features/client-tools";
import {
  Home,
  Globe,
  Gamepad2,
  Settings,
  AudioLines,
  MessageCircle,
} from "lucide-react";
import styles from "./shell.module.css";
const nav = [
  { href: "/", name: "Home", Icon: Home },
  { href: "/browser", name: "Browser", Icon: Globe },
  { href: "/games", name: "Games", Icon: Gamepad2 },
  { href: "/soundboard", name: "Soundboard", Icon: AudioLines },
  { href: "/chat", name: "AI Chat", Icon: MessageCircle },
  { href: "/settings", name: "Settings", Icon: Settings },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className={`topbar ${styles.header}`}>
        <Link className="brand" href="/">
          <Image src="/icon.svg" width={32} height={32} alt="" />
          <span>Carter Game&apos;s</span>
        </Link>
        <nav aria-label="Main navigation">
          {nav.map(({ href, name, Icon }) => {
            const current =
              href === "/"
                ? path === href
                : path === href || path.startsWith(href + "/");
            const props = {
              className: current ? "active" : undefined,
              "aria-current": current ? ("page" as const) : undefined,
            };
            const label = (
              <>
                <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                <span>{name}</span>
              </>
            );
            // The browser can require HTTP authentication at the document boundary.
            return href === "/browser" ? (
              <a key={href} href={href} {...props}>
                {label}
              </a>
            ) : (
              <Link key={href} href={href} {...props}>
                {label}
              </Link>
            );
          })}
        </nav>
        <ClientTools />
      </header>
      <main>{children}</main>
      <footer>
        <span>Game progress and preferences are saved on this device.</span>
      </footer>
    </>
  );
}
