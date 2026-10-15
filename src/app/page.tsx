"use client";
import { HomeCustomizer } from "@/components/features/home-customizer";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { allGames } from "@/games/registry";
import { GameCard } from "@/components/games/game-card";
import { useStorage } from "@/lib/storage/use-storage";
import { defaultSettings } from "@/lib/storage/settings";
import { engines, searchTarget, type SearchEngine } from "@/lib/search";
export default function HomePage() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
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
      router.push("/browser?url=" + encodeURIComponent(target.url));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const searchWidget = (
    <section className="hero">
      <div className="eyebrow">A small escape from the ordinary</div>
      <h1>Where to next?</h1>
      <p>Search the web, visit a favorite, or find your next high score.</p>
      <form
        className="searchbox"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <Search size={22} />
        <input
          ref={input}
          aria-label="Search the web or enter a URL"
          placeholder="Search anything or enter a URL"
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
      <span className="shortcut">Ctrl / ⌘ K for commands</span>
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
            <Link key={name} href={"/browser?url=" + encodeURIComponent(url)}>
              {name} ↗
            </Link>
          ))}
        </div>
      )}
    </section>
  );
  return (
    <div className="page">
      <HomeCustomizer search={searchWidget}>
        {searchWidget}
        <div className="section-head">
          <div>
            <div className="eyebrow">Take a break</div>
            <h2>Good games. Zero downloads.</h2>
          </div>
          <Link href="/games">All games →</Link>
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
