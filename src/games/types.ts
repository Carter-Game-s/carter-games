import type React from "react";
export type GameKind = "native" | "external";
export type GameCategory =
  "arcade" | "puzzle" | "board" | "sports" | "action" | "other";
export type GameControl = {
  label: string;
  keys?: string[];
  description: string;
};
export type GameMetadata = {
  kind: "native";
  slug: string;
  title: string;
  description: string;
  category: GameCategory;
  thumbnail: string;
  featured?: boolean;
  tags?: string[];
  controls?: GameControl[];
  supportsTouch: boolean;
  supportsKeyboard: boolean;
  supportsFullscreen: boolean;
  scoreLabel?: string;
  version: string;
};
export type GameStorage = {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
};
export type GameRuntime = {
  storage: GameStorage;
  reportScore: (score: number) => void;
  setStatus: (status: "idle" | "playing" | "paused" | "won" | "lost") => void;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
};
export type NativeGameProps = {
  metadata: GameMetadata;
  runtime: GameRuntime;
  className?: string;
};
export type NativeGameComponent = React.ComponentType<NativeGameProps>;
export type NativeGameDefinition = {
  metadata: GameMetadata;
  load: () => Promise<{ default: NativeGameComponent }>;
};
export type ExternalGameMetadata = Omit<GameMetadata, "kind" | "scoreLabel"> & {
  kind: "external";
  sourcePath: string;
  sandbox: string;
};
export type ExternalGameDefinition = { metadata: ExternalGameMetadata };
export type GameDefinition = NativeGameDefinition | ExternalGameDefinition;
