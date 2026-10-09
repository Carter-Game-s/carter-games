"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Compass, Home, Globe, Gamepad2, Settings } from "lucide-react";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultSettings } from "@/lib/storage/settings";
const nav = [
  { href: "/", name: "Home", Icon: Home },
  { href: "/browser", name: "Browser", Icon: Globe },
  { href: "/games", name: "Games", Icon: Gamepad2 },
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
      <header className="topbar">
        <Link className="brand" href="/">
          <Compass size={25} />
          <span>
            orbit<span className="brand-dot">.</span>
          </span>
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
        Explore a little. Play a little. <span>No accounts. No tracking.</span>
      </footer>
    </>
  );
}
