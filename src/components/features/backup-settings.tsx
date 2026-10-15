"use client";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { readBackupFile, downloadJSON } from "@/lib/client/validation";
import {
  settingsBackup,
  validateSettingsBackup,
  importSettings,
} from "@/lib/client/backups";
export function BackupSettings() {
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  return (
    <section className="panel">
      <h2>Settings import and export</h2>
      <p className="muted">
        Backs up supported appearance, homepage, favorites, search, Quick Hide,
        command and browser preferences. Conversations, open URLs, credentials
        and server settings are excluded.
      </p>
      <div className="feature-actions">
        <button
          onClick={() => downloadJSON("carter-settings.json", settingsBackup())}
        >
          <Download size={16} />
          Export settings
        </button>
        <label className="button">
          <Upload size={16} />
          Import settings
          <input
            type="file"
            aria-label="Import settings backup"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setPreview(validateSettingsBackup(await readBackupFile(f)));
                setMessage("");
              } catch (err) {
                setMessage((err as Error).message);
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {preview && (
        <div className="backup-preview">
          <h3>Preview changes</h3>
          <p>Only the following sections will be replaced:</p>
          <ul>
            {Object.entries(preview).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>
                <pre>{JSON.stringify(v, null, 2)}</pre>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              try {
                importSettings(preview);
                setPreview(null);
                setMessage("Settings imported.");
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Apply imported settings
          </button>
          <button onClick={() => setPreview(null)}>Cancel import</button>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
