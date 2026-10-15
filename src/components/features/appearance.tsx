"use client";
import { useState } from "react";
import {
  Palette,
  Check,
  Copy,
  Download,
  Trash2,
  Pencil,
  Eye,
} from "lucide-react";
import { useStorage } from "@/lib/storage/use-storage";
import {
  themes,
  defaultAppearance,
  validAppearance,
  validTheme,
  colorKeys,
  fonts,
  contrast,
  type Theme,
} from "@/lib/client/themes";
import { defaultSettings } from "@/lib/storage/settings";
import {
  downloadJSON,
  id,
  object,
  readBackupFile,
} from "@/lib/client/validation";
export function AppearanceSettings() {
  const [a, save] = useStorage(
    "appearance",
    defaultAppearance,
    validAppearance,
  );
  const [settings, saveSettings] = useStorage("settings", defaultSettings);
  const [draft, setDraft] = useState<Theme | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const all = [...themes, ...a.custom];
  const selected = all.find((t) => t.id === a.selected) || themes[0];
  function apply(t: Theme) {
    const custom =
      t.id.startsWith("custom-") && !a.custom.some((c) => c.id === t.id)
        ? [...a.custom, t].slice(-30)
        : a.custom;

    save({ ...a, custom, selected: t.id, font: t.font, density: t.density });
    saveSettings({ ...settings, theme: t.mode });
    window.dispatchEvent(
      new CustomEvent("orbit-theme-preview", { detail: null }),
    );
    setPreview(false);
  }
  function edit(t: Theme, duplicate = false) {
    setDraft({
      ...t,
      id: duplicate || !t.id.startsWith("custom-") ? "custom-" + id() : t.id,
      name: duplicate
        ? `${t.name} copy`.slice(0, 60)
        : t.id.startsWith("custom-")
          ? t.name
          : "My theme",
      colors: { ...t.colors },
    });
  }
  function previewTheme(t: Theme) {
    window.dispatchEvent(new CustomEvent("orbit-theme-preview", { detail: t }));
    setPreview(true);
  }
  function cancelPreview() {
    window.dispatchEvent(
      new CustomEvent("orbit-theme-preview", { detail: null }),
    );
    setPreview(false);
  }
  return (
    <section className="panel" id="appearance">
      <h2>
        <Palette size={22} /> Themes &amp; Appearance
      </h2>
      <p className="muted">
        Preview a palette, then apply it. External games and websites keep their
        own appearance.
      </p>
      <div className="theme-gallery">
        {all.map((t) => (
          <article
            className="theme-card"
            key={t.id}
            style={{
              background: t.colors.bg,
              color: t.colors.text,
              borderColor: t.colors.line,
            }}
          >
            <div className="theme-swatches" aria-label={`${t.name} colors`}>
              {[
                t.colors.bg,
                t.colors.panel,
                t.colors.accent,
                t.colors.text,
              ].map((c, i) => (
                <span
                  key={i}
                  style={{
                    background: c,
                    border: "1px solid " + t.colors.line,
                  }}
                />
              ))}
            </div>
            <strong>{t.name}</strong>
            <small>
              {t.mode}{" "}
              {selected.id === t.id && (
                <>
                  <Check size={14} /> Selected
                </>
              )}
            </small>
            <div className="feature-actions">
              <button
                onClick={() => previewTheme(t)}
                aria-label={`Preview ${t.name}`}
              >
                <Eye size={14} />
                Preview
              </button>
              <button onClick={() => apply(t)} aria-label={`Apply ${t.name}`}>
                Apply
              </button>
              <button
                onClick={() => edit(t, true)}
                aria-label={`Duplicate ${t.name}`}
              >
                <Copy size={14} />
              </button>
              {t.id.startsWith("custom-") && (
                <>
                  <button aria-label={`Edit ${t.name}`} onClick={() => edit(t)}>
                    <Pencil size={14} />
                  </button>
                  <button
                    aria-label={`Delete ${t.name}`}
                    onClick={() => {
                      if (confirm(`Delete ${t.name}?`)) {
                        save({
                          ...a,
                          selected: a.selected === t.id ? "dark" : a.selected,
                          custom: a.custom.filter((c) => c.id !== t.id),
                        });
                        cancelPreview();
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {preview && (
        <div role="status" className="feature-actions">
          Preview active
          <button
            onClick={() => {
              const root = document.documentElement.dataset.theme;
              const t = all.find((t) => t.id === root) || draft;
              if (t) apply(t);
            }}
          >
            Apply preview
          </button>
          <button onClick={cancelPreview}>Cancel preview</button>
        </div>
      )}
      <div className="feature-actions">
        <button onClick={() => edit(selected)}>Create custom theme</button>
        <button
          onClick={() =>
            downloadJSON("carter-theme.json", {
              format: "carter-theme",
              version: 1,
              theme: { ...selected, id: "custom-" + id() },
            })
          }
        >
          <Download size={16} />
          Export theme
        </button>
        <label className="button">
          Import theme
          <input
            aria-label="Import theme"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const v = await readBackupFile(f, 64000);
                if (
                  !object(v) ||
                  v.format !== "carter-theme" ||
                  v.version !== 1 ||
                  !validTheme(v.theme)
                )
                  throw Error("Invalid theme file.");
                setDraft({ ...v.theme, id: "custom-" + id() });
                setError("");
              } catch (err) {
                setError((err as Error).message);
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {draft && (
        <fieldset className="theme-builder">
          <legend>Custom theme builder</legend>
          <label>
            Name
            <input
              aria-label="Custom theme name"
              maxLength={60}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Classification
            <select
              value={draft.mode}
              onChange={(e) =>
                setDraft({ ...draft, mode: e.target.value as Theme["mode"] })
              }
            >
              <option>dark</option>
              <option>light</option>
            </select>
          </label>
          <div className="feature-grid">
            {colorKeys.map((k) => (
              <label key={k}>
                {
                  {
                    bg: "Main background",
                    panel: "Secondary background",
                    raised: "Card surface",
                    text: "Primary text",
                    muted: "Secondary text",
                    accent: "Accent",
                    line: "Border",
                    button: "Button",
                    link: "Link",
                  }[k]
                }
                <input
                  aria-label={`Theme ${k}`}
                  type="color"
                  value={draft.colors[k]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      colors: { ...draft.colors, [k]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Border radius
            <input
              type="range"
              min={0}
              max={24}
              value={draft.radius}
              onChange={(e) =>
                setDraft({ ...draft, radius: Number(e.target.value) })
              }
            />
            {draft.radius}px
          </label>
          <label>
            Theme font
            <select
              value={draft.font}
              onChange={(e) =>
                setDraft({ ...draft, font: e.target.value as Theme["font"] })
              }
            >
              {fonts.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label>
            Theme density
            <select
              value={draft.density}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  density: e.target.value as Theme["density"],
                })
              }
            >
              <option>comfortable</option>
              <option>compact</option>
            </select>
          </label>
          <div
            className="theme-live"
            style={{
              background: draft.colors.bg,
              color: draft.colors.text,
              border: `1px solid ${draft.colors.line}`,
              borderRadius: draft.radius,
              fontFamily: draft.font === "system" ? "system-ui" : draft.font,
            }}
          >
            <h3>Live preview</h3>
            <p style={{ color: draft.colors.muted }}>
              Secondary text on your main background.
            </p>
            <div style={{ background: draft.colors.raised, padding: 12 }}>
              Card surface{" "}
              <a style={{ color: draft.colors.link }} href="#appearance">
                Example link
              </a>
            </div>
            <button
              style={{
                background: draft.colors.button,
                color:
                  contrast(draft.colors.button, "#ffffff") >= 4.5
                    ? "white"
                    : "black",
              }}
            >
              Example button
            </button>
          </div>
          {(["text", "muted", "link"] as const).some(
            (k) => contrast(draft.colors[k], draft.colors.bg) < 4.5,
          ) && (
            <p role="alert" className="error">
              Low contrast: text or link colors may be difficult to read. Aim
              for at least 4.5:1 contrast.
            </p>
          )}
          <div className="feature-actions">
            <button onClick={() => previewTheme(draft)}>
              Preview on website
            </button>
            <button
              disabled={
                !validTheme(draft) ||
                (a.custom.length >= 30 &&
                  !a.custom.some((t) => t.id === draft.id))
              }
              onClick={() => {
                if (!validTheme(draft)) return;
                const custom = [
                  ...a.custom.filter((t) => t.id !== draft.id),
                  draft,
                ];
                save({
                  ...a,
                  custom,
                  selected: draft.id,
                  font: draft.font,
                  density: draft.density,
                });
                saveSettings({ ...settings, theme: draft.mode });
                cancelPreview();
                setDraft(null);
              }}
            >
              Save and apply theme
            </button>
            <button
              onClick={() => {
                setDraft(null);
                cancelPreview();
              }}
            >
              Cancel editing
            </button>
          </div>
        </fieldset>
      )}
      <div className="feature-grid mt-4">
        <label>
          <input
            type="checkbox"
            checked={settings.theme === "system"}
            onChange={(e) =>
              saveSettings({
                ...settings,
                theme: e.target.checked ? "system" : selected.mode,
              })
            }
          />
          Follow system appearance
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) =>
              saveSettings({ ...settings, reducedMotion: e.target.checked })
            }
          />
          Reduced motion
        </label>
        <label>
          Interface density
          <select
            value={a.density}
            onChange={(e) =>
              save({ ...a, density: e.target.value as typeof a.density })
            }
          >
            <option>comfortable</option>
            <option>compact</option>
          </select>
        </label>
        <label>
          Corners
          <select
            value={a.corners}
            onChange={(e) =>
              save({ ...a, corners: e.target.value as typeof a.corners })
            }
          >
            <option>rounded</option>
            <option>square</option>
          </select>
        </label>
        <label>
          Font preference
          <select
            value={a.font}
            onChange={(e) =>
              save({ ...a, font: e.target.value as typeof a.font })
            }
          >
            {fonts.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={a.gradients}
            onChange={(e) => save({ ...a, gradients: e.target.checked })}
          />
          Optional gradients
        </label>
        <label>
          <input
            type="checkbox"
            checked={a.animations}
            onChange={(e) => save({ ...a, animations: e.target.checked })}
          />
          Background animations
        </label>
        <label>
          Animation intensity
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={a.intensity}
            onChange={(e) => save({ ...a, intensity: Number(e.target.value) })}
          />
        </label>
      </div>
      <button
        onClick={() => {
          if (confirm("Reset appearance and remove custom themes?")) {
            save(defaultAppearance);
            saveSettings({ ...settings, theme: "dark" });
            cancelPreview();
            setDraft(null);
          }
        }}
      >
        Reset customizations
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
