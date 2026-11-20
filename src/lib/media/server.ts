import { readFile, stat } from "node:fs/promises";
import { initialCatalog, validateCatalog } from "./catalog";

export const catalogPath = "/var/lib/carter-games/media-catalog.json";
export async function loadCatalog() {
  try {
    if ((await stat(catalogPath)).size > 1024 * 1024)
      throw new Error("Catalog exceeds 1 MiB");
    const value: unknown = JSON.parse(await readFile(catalogPath, "utf8"));
    if (!validateCatalog(value)) throw new Error("Invalid catalog");
    return value;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      console.error(
        "Could not read managed media catalog. Serving reviewed defaults.",
      );
    return initialCatalog;
  }
}
