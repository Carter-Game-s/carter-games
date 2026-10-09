import { nativeGameDefinitions } from "./generated-native-registry";
import { externalGameDefinitions } from "./generated-external-registry";
import type {
  GameDefinition,
  NativeGameDefinition,
  ExternalGameDefinition,
} from "./types";
export const nativeGames: readonly NativeGameDefinition[] = Object.freeze(
  nativeGameDefinitions,
);
export const externalGames: readonly ExternalGameDefinition[] = Object.freeze(
  externalGameDefinitions,
);
export const allGames: readonly GameDefinition[] = Object.freeze([
  ...nativeGames,
  ...externalGames,
]);
export function getGameBySlug(slug: string): GameDefinition | undefined {
  return allGames.find((g) => g.metadata.slug === slug);
}
