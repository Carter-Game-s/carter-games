"use client";
import { HomeCustomizer } from "@/components/features/home-customizer";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowUpRight, ArrowRight } from "lucide-react";
import { allGames } from "@/games/registry";
import { GameCard } from "@/components/games/game-card";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultSettings } from "@/lib/storage/settings";
import { engines, searchTarget, type SearchEngine } from "@/lib/search";
export default function HomePage() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [settings, saveSettings] = useStorage("settings", defaultSettings);
  const [recent, setRecent] = useStorage<string[]>("searches", []);
  const [favorites] = useStorage<string[]>("favorites", []);
  function go(text = query) {
    try {
      const target = searchTarget(text, settings.engine);
      if (target.search)
        setRecent(
          [text.trim(), ...recent.filter((s) => s !== text.trim())].slice(
            0,
            20,
          ),
        );
      // A document navigation lets the browser show the HTTP authentication prompt.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/browser?url=" + encodeURIComponent(target.url));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const searchWidget = (
    <section className="hero">
      <div className="hero-copy">
        <h1>Where to next?</h1>
        <p>Play classic games, or open a site in the Carter browser.</p>
        <form
          className="searchbox"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <Search size={22} />
          <input
            aria-label="Search the web or enter a URL"
            placeholder="Search or enter a URL"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            list="search-history"
          />
          <datalist id="search-history">
            {recent.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <select
            aria-label="Search provider"
            value={settings.engine}
            onChange={(e) =>
              saveSettings({
                ...settings,
                engine: e.target.value as SearchEngine,
              })
            }
          >
            {Object.entries(engines).map(([id, m]) => (
              <option key={id} value={id}>
                {m.label}
              </option>
            ))}
          </select>
          <button className="primary" aria-label="Search">
            <ArrowUpRight size={20} />
          </button>
        </form>
        <span className="shortcut">
          <kbd>Ctrl</kbd> / <kbd>⌘</kbd> <kbd>K</kbd> for commands
        </span>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {settings.showRecent && recent.length > 0 && (
          <div className="suggestions mt-5">
            {recent
              .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5)
              .map((s) => (
                <button key={s} onClick={() => go(s)}>
                  {s}
                </button>
              ))}
          </div>
        )}
        {settings.showQuick && (
          <div className="quick">
            {[
              ["Wikipedia", "https://en.wikipedia.org/wiki/Main_Page"],
              ["Example", "https://example.com"],
              ["DuckDuckGo", "https://duckduckgo.com"],
            ].map(([name, url]) => (
              <a key={name} href={"/browser?url=" + encodeURIComponent(url)}>
                {name} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </div>
      <Link className="hero-game" href="/games/breakout">
        <Image
          src="/games/breakout/thumbnail.svg"
          alt=""
          width={420}
          height={240}
          loading="eager"
        />
        <span>
          <span>
            <small>Featured game</small>
            <strong>Breakout</strong>
          </span>
          <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
  return (
    <div className="page">
      <HomeCustomizer search={searchWidget}>
        {searchWidget}
        <div className="section-head">
          <h2>Featured games</h2>
          <Link href="/games">
            All games <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="cards">
          {allGames
            .filter((g) => g.metadata.featured)
            .slice(0, 4)
            .map((g) => (
              <GameCard
                key={g.metadata.slug}
                game={g}
                favorite={favorites.includes(g.metadata.slug)}
              />
            ))}
        </div>
      </HomeCustomizer>
    </div>
  );
}
