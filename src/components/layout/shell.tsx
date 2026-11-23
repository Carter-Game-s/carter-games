"use client";
import { useEffect, useState } from "react";
import {
  getAgreement,
  saveAgreement,
  RulesDialog,
} from "@/components/player/agreement";
import { SiteNotice } from "@/components/player/site-notice";
import { GlobalChat } from "@/components/player/chat";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClientTools } from "@/components/features/client-tools";
import {
  Home,
  Film,
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
  { href: "/movies", name: "Movies & TV", Icon: Film },
  { href: "/soundboard", name: "Soundboard", Icon: AudioLines },
  { href: "/chat", name: "AI Chat", Icon: MessageCircle },
  { href: "/settings", name: "Settings", Icon: Settings },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [accepted, setAccepted] = useState<boolean | null>(null);
  useEffect(() => setAccepted(getAgreement()), []);
  return (
    <>
      <div inert={accepted !== true}>
        <header className={`topbar ${styles.header}`}>
          <Link className="brand" href="/">
            <Image src="/icon.svg" width={32} height={32} alt="" />
            <span>GetMoreMath2.0</span>
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
        {accepted && <SiteNotice />}
        <main>{children}</main>
        <footer>
          <span>
            GetMoreMath2.0 · Game progress and preferences are saved on this
            device.
          </span>
        </footer>
        {accepted && <GlobalChat />}
      </div>
      {accepted === false && (
        <RulesDialog
          accept={() => {
            saveAgreement();
            setAccepted(true);
          }}
        />
      )}
      {accepted === null && (
        <noscript>
          Enable JavaScript to read and accept the GetMoreMath2.0 player
          agreement.
        </noscript>
      )}
    </>
  );
}
