// Run on the VPS through an administrator-controlled shell. The app can only read the catalog.
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initialCatalog, validateCatalog } from "../src/lib/media/catalog";
import { catalogPath, loadCatalog } from "../src/lib/media/server";

async function main() {
  const [command, file] = process.argv.slice(2);
  if (command === "seed" || command === "list") {
    console.log(
      JSON.stringify(
        command === "seed" ? initialCatalog : await loadCatalog(),
        null,
        2,
      ),
    );
    return;
  }
  if (!["validate", "publish"].includes(command) || !file)
    throw new Error(
      "Usage: bun tools/manage-media.ts seed | list | validate FILE | publish FILE",
    );
  if (command === "publish" && process.getuid?.() !== 0)
    throw new Error("Publishing requires a local administrator.");
  const info = await stat(file);
  if (!info.isFile() || info.size > 1024 * 1024)
    throw new Error("Use a regular catalog file of at most 1 MiB");
  const input = await readFile(file);
  if (input.length > 1024 * 1024) throw new Error("Catalog exceeds 1 MiB");
  const data: unknown = JSON.parse(input.toString());
  if (!validateCatalog(data))
    throw new Error("Invalid catalog schema or source");
  if (command === "publish") {
    const temporary = catalogPath + "." + randomUUID();
    try {
      await writeFile(temporary, input, { flag: "wx", mode: 0o644 });
      await rename(temporary, catalogPath);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }
  console.log(
    `${data.length} catalog entries ${command === "publish" ? "published" : "validated"}.`,
  );
}
main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
