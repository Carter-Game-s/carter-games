"use client";
import { useState } from "react";
import { allGames, getGameBySlug } from "@/games/registry";
import {
  exportSaves,
  validateSaveBackup,
  restoreSaves,
  resetSave,
  supportsSaves,
  type SaveBackup,
} from "@/lib/client/backups";
import { downloadJSON, readBackupFile } from "@/lib/client/validation";
export function SaveManager() {
  const [game, setGame] = useState("all");
  const [backup, setBackup] = useState<SaveBackup | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="panel">
      <h2>Game save backup and restoration</h2>
      <p className="muted">
        Native games and imported pack games support local backups. Other
        external games do not expose a supported save bridge. IndexedDB or
        remote saves inside external games cannot be backed up here. Close games
        before restoring saves.
      </p>
      <label>
        Game
        <select
          aria-label="Save backup game"
          value={game}
          onChange={(e) => setGame(e.target.value)}
        >
          <option value="all">All supported games</option>
          {allGames.map((g) => (
            <option
              value={g.metadata.slug}
              key={g.metadata.slug}
              disabled={!supportsSaves(g.metadata.slug)}
            >
              {g.metadata.title}
              {!supportsSaves(g.metadata.slug) ? " — unsupported" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="feature-actions">
        <button
          onClick={() => {
            try {
              downloadJSON(
                "carter-game-saves.json",
                exportSaves(game === "all" ? undefined : game),
              );
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          Download game progress backup
        </button>
        <label className="button">
          Import save backup
          <input
            aria-label="Import game saves"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const v = validateSaveBackup(
                  await readBackupFile(f, 8 * 1024 * 1024),
                );
                setBackup(v);
                setSelected(Object.keys(v.saves));
                setMessage("");
              } catch (err) {
                setMessage((err as Error).message);
              }
              e.target.value = "";
            }}
          />
        </label>
        <button
          disabled={game === "all"}
          onClick={() => {
            if (
              confirm(
                `Reset saves for ${getGameBySlug(game)?.metadata.title}? This cannot be undone.`,
              )
            ) {
              resetSave(game);
              setMessage("Selected game saves reset.");
            }
          }}
        >
          Reset individual game save
        </button>
      </div>
      {backup && (
        <div className="backup-preview">
          <h3>Preview save contents</h3>
          <p>Created {new Date(backup.created).toLocaleString()}</p>
          {Object.entries(backup.saves).map(([slug, values]) => (
            <div key={slug}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(slug)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, slug]
                        : selected.filter((s) => s !== slug),
                    )
                  }
                />
                {getGameBySlug(slug)?.metadata.title}:{" "}
                {Object.keys(values).length} save entries
              </label>
              <details>
                <summary>Inspect saved progress</summary>
                <pre>{JSON.stringify(values, null, 2)}</pre>
              </details>
            </div>
          ))}
          {!Object.keys(backup.saves).length && (
            <p>This backup contains no saved progress.</p>
          )}
          <label>
            Conflict handling
            <select
              value={overwrite ? "overwrite" : "keep"}
              onChange={(e) => setOverwrite(e.target.value === "overwrite")}
            >
              <option value="keep">
                Keep existing values; restore missing entries
              </option>
              <option value="overwrite">Overwrite conflicting values</option>
            </select>
          </label>
          <button
            disabled={!selected.length}
            onClick={() => {
              if (
                !confirm(
                  `Restore ${selected.length} selected game saves${overwrite ? " and overwrite conflicts" : ""}?`,
                )
              )
                return;
              try {
                restoreSaves(backup, selected, overwrite);
                setBackup(null);
                setMessage(
                  "Selected saves restored. Reopen your games to load them.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Restore selected saves
          </button>
          <button onClick={() => setBackup(null)}>Cancel restoration</button>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
