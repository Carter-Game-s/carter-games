import { object, text, finite, onlyKeys } from "./validation";
export const fonts = ["system", "Arial", "Georgia", "monospace"] as const;
export const colorKeys = [
  "bg",
  "panel",
  "raised",
  "text",
  "muted",
  "accent",
  "line",
  "button",
  "link",
] as const;
export type Theme = {
  id: string;
  name: string;
  mode: "dark" | "light";
  colors: Record<(typeof colorKeys)[number], string>;
  radius: number;
  font: (typeof fonts)[number];
  density: "compact" | "comfortable";
};
function palette(
  id: string,
  name: string,
  mode: Theme["mode"],
  colors: string[],
): Theme {
  const [bg, panel, raised, foreground, muted, accent, line] = colors;
  return {
    id,
    name,
    mode,
    colors: {
      bg,
      panel,
      raised,
      text: foreground,
      muted,
      accent,
      line,
      button: accent,
      link: accent,
    },
    radius: 10,
    font: "Arial",
    density: "comfortable",
  };
}
export const themes: Theme[] = [
  palette("dark", "Default Dark", "dark", [
    "#111313",
    "#1b1e1e",
    "#252929",
    "#f0f3ef",
    "#929c98",
    "#b9f573",
    "#303735",
  ]),
  palette("light", "Default Light", "light", [
    "#f6f8f4",
    "#ffffff",
    "#edf1e9",
    "#172019",
    "#566458",
    "#537f26",
    "#d9e0d5",
  ]),
  palette("midnight", "Midnight", "dark", [
    "#0b1020",
    "#141c32",
    "#202b46",
    "#e5ecff",
    "#a3b2d0",
    "#93b4ff",
    "#344467",
  ]),
  palette("oled", "OLED Black", "dark", [
    "#000000",
    "#0d0d0d",
    "#1b1b1b",
    "#ffffff",
    "#aaaaaa",
    "#c7f7a0",
    "#383838",
  ]),
  palette("nord", "Nord", "dark", [
    "#2e3440",
    "#3b4252",
    "#434c5e",
    "#eceff4",
    "#d8dee9",
    "#88c0d0",
    "#4c566a",
  ]),
  palette("dracula", "Dracula", "dark", [
    "#282a36",
    "#21222c",
    "#44475a",
    "#f8f8f2",
    "#b6b5cd",
    "#bd93f9",
    "#6272a4",
  ]),
  palette("mocha", "Catppuccin Mocha", "dark", [
    "#1e1e2e",
    "#181825",
    "#313244",
    "#cdd6f4",
    "#bac2de",
    "#cba6f7",
    "#585b70",
  ]),
  palette("latte", "Catppuccin Latte", "light", [
    "#eff1f5",
    "#e6e9ef",
    "#dce0e8",
    "#4c4f69",
    "#5c5f77",
    "#8839ef",
    "#9ca0b0",
  ]),
  palette("tokyo", "Tokyo Night", "dark", [
    "#1a1b26",
    "#16161e",
    "#24283b",
    "#c0caf5",
    "#a9b1d6",
    "#7aa2f7",
    "#565f89",
  ]),
  palette("gruvbox", "Gruvbox Dark", "dark", [
    "#282828",
    "#1d2021",
    "#3c3836",
    "#ebdbb2",
    "#bdae93",
    "#fabd2f",
    "#665c54",
  ]),
  palette("solar-dark", "Solarized Dark", "dark", [
    "#002b36",
    "#073642",
    "#164753",
    "#f0ead6",
    "#a1b6b7",
    "#2aa198",
    "#586e75",
  ]),
  palette("solar-light", "Solarized Light", "light", [
    "#fdf6e3",
    "#eee8d5",
    "#e4ddc6",
    "#073642",
    "#52676f",
    "#006b88",
    "#a79e89",
  ]),
  palette("rose", "Rose Pine", "dark", [
    "#191724",
    "#1f1d2e",
    "#26233a",
    "#e0def4",
    "#b5b0ca",
    "#ebbcba",
    "#524f67",
  ]),
  palette("cyberpunk", "Cyberpunk", "dark", [
    "#090519",
    "#160c2d",
    "#25143b",
    "#fff3ff",
    "#c3acd2",
    "#f9ef00",
    "#77407e",
  ]),
  palette("forest", "Forest", "dark", [
    "#0d1913",
    "#14281d",
    "#203b2a",
    "#edf6e9",
    "#a4bdab",
    "#97d78d",
    "#3e5b46",
  ]),
  palette("ocean", "Ocean", "dark", [
    "#081b28",
    "#102c3c",
    "#1c4051",
    "#e9f8ff",
    "#9ebdce",
    "#69d7e8",
    "#386477",
  ]),
  palette("sunset", "Sunset", "dark", [
    "#26171e",
    "#38212b",
    "#4b2e36",
    "#fff0e7",
    "#d6b4b0",
    "#ffb38a",
    "#77505b",
  ]),
  palette("mono", "Monochrome", "dark", [
    "#151515",
    "#222222",
    "#303030",
    "#f5f5f5",
    "#b2b2b2",
    "#e3e3e3",
    "#555555",
  ]),
];
export const hex = (v: unknown): v is string =>
  typeof v === "string" && /^#[a-f\d]{6}$/i.test(v);
export function validTheme(v: unknown): v is Theme {
  return (
    object(v) &&
    onlyKeys(v, [
      "id",
      "name",
      "mode",
      "colors",
      "radius",
      "font",
      "density",
    ]) &&
    text(v.id, 80) &&
    /^custom-[a-z\d-]+$/i.test(v.id) &&
    text(v.name, 60) &&
    v.name.trim().length > 0 &&
    ["light", "dark"].includes(String(v.mode)) &&
    object(v.colors) &&
    onlyKeys(v.colors, colorKeys) &&
    colorKeys.every((k) => hex((v.colors as Record<string, unknown>)[k])) &&
    finite(v.radius, 24) &&
    fonts.includes(v.font as Theme["font"]) &&
    ["compact", "comfortable"].includes(String(v.density))
  );
}
export type Appearance = {
  version: 1;
  selected: string;
  custom: Theme[];
  font: Theme["font"];
  density: Theme["density"];
  corners: "rounded" | "square";
  gradients: boolean;
  animations: boolean;
  intensity: number;
};
export const defaultAppearance: Appearance = {
  version: 1,
  selected: "dark",
  custom: [],
  font: "Arial",
  density: "comfortable",
  corners: "rounded",
  gradients: false,
  animations: false,
  intensity: 1,
};
export function validAppearance(v: unknown): v is Appearance {
  return (
    object(v) &&
    v.version === 1 &&
    onlyKeys(v, [
      "version",
      "selected",
      "custom",
      "font",
      "density",
      "corners",
      "gradients",
      "animations",
      "intensity",
    ]) &&
    text(v.selected, 80) &&
    Array.isArray(v.custom) &&
    v.custom.length <= 30 &&
    v.custom.every(validTheme) &&
    new Set(v.custom.map((t) => t.id)).size === v.custom.length &&
    [...themes, ...v.custom].some((t) => t.id === v.selected) &&
    fonts.includes(v.font as Theme["font"]) &&
    ["compact", "comfortable"].includes(String(v.density)) &&
    ["rounded", "square"].includes(String(v.corners)) &&
    typeof v.gradients === "boolean" &&
    typeof v.animations === "boolean" &&
    finite(v.intensity, 2)
  );
}
export function contrast(a: string, b: string) {
  const luminance = (h: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export const fontCSS = (font: Theme["font"]) =>
  ({
    system: "system-ui, sans-serif",
    Arial: "Arial, Helvetica, sans-serif",
    Georgia: "Georgia, serif",
    monospace: "ui-monospace, monospace",
  })[font];
export function applyTheme(
  theme: Theme,
  appearance: Appearance,
  reduced: boolean,
) {
  const root = document.documentElement;
  for (const key of colorKeys)
    root.style.setProperty("--" + key, theme.colors[key]);
  root.style.setProperty(
    "--accent-text",
    contrast(theme.colors.accent, "#ffffff") >= 4.5 ? "#ffffff" : "#111111",
  );
  root.style.setProperty(
    "--button-text",
    contrast(theme.colors.button, "#ffffff") >= 4.5 ? "#ffffff" : "#111111",
  );
  root.style.setProperty(
    "--radius",
    `${appearance.corners === "square" ? 0 : theme.radius}px`,
  );
  root.style.setProperty("--font", fontCSS(appearance.font));
  root.style.setProperty("--intensity", String(appearance.intensity));
  root.style.colorScheme = theme.mode;
  root.dataset.theme = theme.id;
  root.dataset.density = appearance.density;
  root.dataset.corners = appearance.corners;
  root.dataset.motion = reduced ? "reduced" : "normal";
  root.dataset.gradients = String(appearance.gradients);
  root.dataset.animations = String(
    appearance.animations && !reduced && appearance.intensity > 0,
  );
}
// Runs before paint. Only validated color and enum values can reach inline styles.
export const themeBootScript = `(()=>{try{
 const builtins=${JSON.stringify(themes)},defaults=${JSON.stringify(defaultAppearance)},fonts=${JSON.stringify(fonts)},keys=${JSON.stringify(colorKeys)};
 const record=v=>v&&typeof v==='object'&&!Array.isArray(v);const exact=(v,ks)=>record(v)&&Object.keys(v).every(k=>ks.includes(k));const colors=v=>exact(v,keys)&&keys.every(k=>/^#[a-f0-9]{6}$/i.test(v[k]));
 const custom=t=>exact(t,['id','name','mode','colors','radius','font','density'])&&typeof t.id==='string'&&/^custom-[a-z0-9-]+$/i.test(t.id)&&t.id.length<=80&&typeof t.name==='string'&&t.name.trim()&&t.name.length<=60&&['dark','light'].includes(t.mode)&&colors(t.colors)&&Number.isFinite(t.radius)&&t.radius>=0&&t.radius<=24&&fonts.includes(t.font)&&['compact','comfortable'].includes(t.density);
 const raw=JSON.parse(localStorage.getItem('orbit:appearance')||'null'),s=JSON.parse(localStorage.getItem('orbit:settings')||'{}');
 const valid=exact(raw,['version','selected','custom','font','density','corners','gradients','animations','intensity'])&&raw.version===1&&Array.isArray(raw.custom)&&raw.custom.length<=30&&raw.custom.every(custom)&&new Set(raw.custom.map(t=>t.id)).size===raw.custom.length&&[...builtins,...raw.custom].some(t=>t.id===raw.selected)&&fonts.includes(raw.font)&&['compact','comfortable'].includes(raw.density)&&['rounded','square'].includes(raw.corners)&&typeof raw.gradients==='boolean'&&typeof raw.animations==='boolean'&&Number.isFinite(raw.intensity)&&raw.intensity>=0&&raw.intensity<=2;
 const a=valid?raw:defaults;let t=[...builtins,...a.custom].find(t=>t.id===a.selected)||builtins[0];if(!raw&&s.theme==='light')t=builtins[1];if(s.theme==='system')t=builtins[matchMedia('(prefers-color-scheme:light)').matches?1:0];
 const root=document.documentElement;for(const k of keys)root.style.setProperty('--'+k,t.colors[k]);root.dataset.theme=t.id;root.style.colorScheme=t.mode;root.style.setProperty('--font',${JSON.stringify({ system: "system-ui, sans-serif", Arial: "Arial, Helvetica, sans-serif", Georgia: "Georgia, serif", monospace: "ui-monospace, monospace" })}[a.font]);root.style.setProperty('--radius',(a.corners==='square'?0:t.radius)+'px');root.dataset.density=a.density;root.dataset.corners=a.corners;root.dataset.motion=s.reducedMotion||matchMedia('(prefers-reduced-motion:reduce)').matches?'reduced':'normal';
 }catch{}})()`;
