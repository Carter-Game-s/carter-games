"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Home,
  Globe,
  Gamepad2,
  Settings,
  AudioLines,
  MessageCircle,
} from "lucide-react";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultSettings } from "@/lib/storage/settings";
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
  const [settings] = useStorage("settings", defaultSettings);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const update = () => {
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? media.matches
            ? "light"
            : "dark"
          : settings.theme;
      document.documentElement.dataset.motion = settings.reducedMotion
        ? "reduced"
        : "normal";
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [settings]);
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
        <span className="local-badge">Your space. Locally saved.</span>
      </header>
      <main>{children}</main>
      <footer>
        <span>Your games. Saved on your device.</span>
      </footer>
    </>
  );
}
