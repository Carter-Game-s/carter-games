"use client";
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
          <Gamepad2 size={25} aria-hidden="true" />
          <span>Carter Game&apos;s</span>
        </Link>
        <nav aria-label="Main navigation">
          {nav.map(({ href, name, Icon }) => (
            <Link
              key={href}
              aria-label={name}
              href={href}
              className={
                (href === "/" ? path === href : path.startsWith(href))
                  ? "active"
                  : ""
              }
            >
              <Icon size={17} />
              <span>{name}</span>
            </Link>
          ))}
        </nav>
        <ClientTools />
        <span className="local-badge">Your space. Locally saved.</span>
      </header>
      <main>{children}</main>
      <footer>
        <span>Your games. Saved on your device.</span>
      </footer>
    </>
  );
}
