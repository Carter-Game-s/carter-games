import { readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import type { GameMetadata, ExternalGameMetadata } from "../src/games/types";
const categories = ["arcade", "puzzle", "board", "sports", "action", "other"];
const common = [
  "kind",
  "slug",
  "title",
  "description",
  "category",
  "thumbnail",
  "featured",
  "tags",
  "controls",
  "supportsTouch",
  "supportsKeyboard",
  "supportsFullscreen",
  "version",
];
async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`);
}
// Parse literals only: metadata generation executes neither metadata modules nor game code.
export function parseMetadata(source: string, file: string): unknown {
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  function literal(n: ts.Node): unknown {
    if (
      ts.isSatisfiesExpression(n) ||
      ts.isAsExpression(n) ||
      ts.isParenthesizedExpression(n)
    )
      return literal(n.expression);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
      return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
    if (ts.isObjectLiteralExpression(n))
      return Object.fromEntries(
        n.properties.map((p) => {
          if (
            !ts.isPropertyAssignment(p) ||
            !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
          )
            return fail(file, "metadata must use literal properties");
          return [p.name.text, literal(p.initializer)];
        }),
      );
    return fail(
      file,
      "metadata must be a static literal (no calls, spreads or imported values)",
    );
  }
  const vars = new Map<string, ts.Expression>();
  for (const s of ast.statements)
    if (ts.isVariableStatement(s))
      for (const d of s.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.initializer)
          vars.set(d.name.text, d.initializer);
  const exp = ast.statements.find(ts.isExportAssignment);
  if (!exp || exp.isExportEquals) return fail(file, "missing default export");
  const expression = ts.isIdentifier(exp.expression)
    ? vars.get(exp.expression.text)
    : exp.expression;
  if (!expression) return fail(file, "unresolved default export");
  return literal(expression);
}
export async function validateMetadata(
  value: unknown,
  file: string,
  root: string,
  externalDir?: string,
): Promise<GameMetadata | ExternalGameMetadata> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail(file, "metadata must be an object");
  const m = value as Record<string, unknown>;
  const external = externalDir !== undefined;
  const allowed = [
    ...common,
    ...(external ? ["sourcePath", "sandbox"] : ["scoreLabel"]),
  ];
  for (const key of Object.keys(m))
    if (!allowed.includes(key)) fail(file, `unknown field ${key}`);
  if (external && m.kind === undefined) m.kind = "external";
  if (m.kind !== (external ? "external" : "native")) fail(file, "invalid kind");
  if (typeof m.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.slug))
    fail(file, "invalid slug");
  for (const [k, max] of [
    ["title", 80],
    ["description", 300],
  ] as const)
    if (typeof m[k] !== "string" || !m[k].trim() || m[k].length > max)
      fail(file, `invalid or missing ${k} (1–${max} characters)`);
  if (!categories.includes(String(m.category)))
    fail(file, "unsupported category");
  if (
    typeof m.thumbnail !== "string" ||
    !/^\/(?!\/)/.test(m.thumbnail) ||
    m.thumbnail.includes("..") ||
    /[%?#\\]/.test(m.thumbnail)
  )
    fail(file, "thumbnail must be an absolute public path without traversal");
  if (!(await exists(path.join(root, "public", m.thumbnail))))
    fail(file, `missing thumbnail: ${m.thumbnail}`);
  if (
    typeof m.version !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(
      m.version,
    )
  )
    fail(file, "invalid semantic version");
  for (const k of ["supportsTouch", "supportsKeyboard", "supportsFullscreen"])
    if (typeof m[k] !== "boolean") fail(file, `missing or invalid ${k}`);
  if (m.featured !== undefined && typeof m.featured !== "boolean")
    fail(file, "invalid featured");
  if (
    m.scoreLabel !== undefined &&
    (typeof m.scoreLabel !== "string" || !m.scoreLabel.trim())
  )
    fail(file, "invalid scoreLabel");
  if (
    m.tags !== undefined &&
    (!Array.isArray(m.tags) ||
      m.tags.some((t) => typeof t !== "string" || !t.trim()))
  )
    fail(file, "invalid tags");
  if (m.controls !== undefined) {
    if (!Array.isArray(m.controls)) fail(file, "invalid controls");
    for (const c of m.controls as Record<string, unknown>[]) {
      if (
        !c ||
        typeof c !== "object" ||
        Object.keys(c).some(
          (k) => !["label", "description", "keys"].includes(k),
        ) ||
        typeof c.label !== "string" ||
        !c.label.trim() ||
        typeof c.description !== "string" ||
        !c.description.trim() ||
        (c.keys !== undefined &&
          (!Array.isArray(c.keys) ||
            c.keys.some((k) => typeof k !== "string" || !k.trim())))
      )
        fail(file, "invalid control definitions");
    }
  }
  if (external) {
    if (
      m.sourcePath !== `/external-games/${externalDir}/` ||
      !/^[a-zA-Z0-9_-]+$/.test(externalDir!)
    )
      fail(
        file,
        "sourcePath mismatch or unsafe path; must exactly match discovered directory",
      );
    if (m.sandbox !== "allow-scripts")
      fail(file, "unsupported sandbox tokens; only allow-scripts permitted");
    if (!String(m.thumbnail).startsWith(`/external-games/${externalDir}/`))
      fail(file, "external thumbnail must stay inside its game directory");
    if (
      !(await exists(
        path.join(root, "public", String(m.sourcePath), "index.html"),
      ))
    )
      fail(file, "missing index.html");
  }
  return m as unknown as GameMetadata | ExternalGameMetadata;
}
export async function generate(root = process.cwd()) {
  const base = path.join(root, "src/games"),
    native: { metadata: GameMetadata; relative: string; file: string }[] = [],
    external: { metadata: ExternalGameMetadata; file: string }[] = [];
  async function scan(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    const meta = entries.some((e) => e.name === "metadata.ts"),
      game = entries.some((e) => e.name === "game.tsx");
    if (meta !== game)
      fail(dir, `missing ${meta ? "game.tsx" : "metadata.ts"}`);
    if (meta && game) {
      const file = path.join(dir, "metadata.ts");
      const metadata = (await validateMetadata(
        parseMetadata(await readFile(file, "utf8"), file),
        file,
        root,
      )) as GameMetadata;
      native.push({
        metadata,
        relative: path.relative(base, dir).split(path.sep).join("/"),
        file,
      });
    }
    for (const e of entries)
      if (
        e.isDirectory() &&
        !e.name.startsWith(".") &&
        !["node_modules", "__tests__", "__fixtures__"].includes(e.name)
      )
        await scan(path.join(dir, e.name));
  }
  await scan(base);
  const extBase = path.join(root, "public/external-games");
  if (await exists(extBase))
    for (const e of await readdir(extBase, { withFileTypes: true }))
      if (e.isDirectory() && !e.name.startsWith(".")) {
        const dir = path.join(extBase, e.name),
          file = path.join(dir, "metadata.json");
        if (!(await exists(file))) fail(dir, "missing metadata.json");
        if (!(await exists(path.join(dir, "index.html"))))
          fail(dir, "missing index.html");
        let data: unknown;
        try {
          data = JSON.parse(await readFile(file, "utf8"));
        } catch {
          fail(file, "invalid JSON");
        }
        external.push({
          metadata: (await validateMetadata(
            data,
            file,
            root,
            e.name,
          )) as ExternalGameMetadata,
          file,
        });
      }
  const seen = new Map<string, string>();
  for (const g of [...native, ...external]) {
    const prev = seen.get(g.metadata.slug);
    if (prev)
      fail(
        g.file,
        `duplicate slug '${g.metadata.slug}' also declared in ${prev}`,
      );
    seen.set(g.metadata.slug, g.file);
  }
  native.sort((a, b) => a.metadata.slug.localeCompare(b.metadata.slug));
  external.sort((a, b) => a.metadata.slug.localeCompare(b.metadata.slug));
  const header =
    "// GENERATED FILE — manual edits will be overwritten. Run bun run games:generate.\n";
  const nativeText =
    header +
    'import type { NativeGameDefinition } from "./types";\nexport const nativeGameDefinitions: NativeGameDefinition[] = [\n' +
    native
      .map(
        (g) =>
          `  { metadata: ${JSON.stringify(g.metadata, null, 2)}, load: () => import(${JSON.stringify("./" + g.relative + "/game")}) }`,
      )
      .join(",\n") +
    "\n];\n";
  const externalText =
    header +
    'import type { ExternalGameDefinition } from "./types";\nexport const externalGameDefinitions: ExternalGameDefinition[] = ' +
    JSON.stringify(
      external.map((g) => ({ metadata: g.metadata })),
      null,
      2,
    ) +
    ";\n";
  for (const [name, content] of [
    ["generated-native-registry.ts", nativeText],
    ["generated-external-registry.ts", externalText],
  ]) {
    const out = path.join(base, name);
    if (!(await exists(out)) || (await readFile(out, "utf8")) !== content)
      await writeFile(out, content);
  }
  return { native, external };
}
if (process.argv[1]?.endsWith("generate-game-registry.ts"))
  generate(process.argv[2])
    .then((r) =>
      console.log(
        `Validated ${r.native.length} native and ${r.external.length} external games.`,
      ),
    )
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
