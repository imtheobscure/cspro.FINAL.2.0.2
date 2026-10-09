/**
 * Guard the guided walkthrough against a control being deleted.
 *
 * Every step in the "Take Interactive Tour" walkthrough names the element it
 * points at (`targetId`). That indirection is what makes the tour self-healing at
 * runtime — a step whose element is missing is dropped and the rest renumber
 * themselves — but it also means a step can rot in silence: delete the button a
 * step points at and the step is simply never shown, so nothing fails and nobody
 * notices the walkthrough has quietly lost a page.
 *
 * Worse is the *half*-deleted case, which this repo has already lived through
 * once: keep the step but rename the element, and the tour's highlight ring
 * attaches to nothing while the counter and the panels drift out of step with the
 * slides. That is the bug that prompted this check.
 *
 * So: every `targetId` in the source must correspond to a real `id="…"` in the
 * app. Run from the build, before `vite build`, so a broken walkthrough stops the
 * build rather than shipping.
 *
 * Usage:
 *   node scripts/check-tour-targets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Where the app's own markup lives — deliberately excludes `new/`, `dist/` and the standalone app folders. */
const SOURCE_DIRS = ["components", "pages", "hooks", "src", "store", "services", "utils", "tools"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "new", "build"]);

/** `targetId: "tour-bottom-dock"` — the only place a step declares its element. */
const TARGET_RE = /targetId\s*:\s*(["'`])([^"'`]+)\1/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = SOURCE_DIRS.flatMap((d) => walk(path.join(root, d)));
if (files.length === 0) {
  console.error("[check-tour-targets] found no source files to scan — is the script in the right place?");
  process.exit(1);
}

const sources = files.map((file) => ({ file, text: fs.readFileSync(file, "utf8") }));

/** Collect every declared step target, keeping the file it came from for the error message. */
const targets = [];
for (const { file, text } of sources) {
  for (const match of text.matchAll(TARGET_RE)) {
    targets.push({ id: match[2], file: path.relative(root, file) });
  }
}

if (targets.length === 0) {
  console.error("[check-tour-targets] no `targetId` found anywhere — the walkthrough steps were renamed or removed.");
  console.error("  If the tour is genuinely gone, delete this check from package.json.");
  process.exit(1);
}

const failures = [];
const seen = new Map();

for (const { id, file } of targets) {
  // Two steps pointing at the same control is a mistake: the second one teaches
  // nothing and the highlight can't tell them apart.
  if (seen.has(id)) {
    failures.push(`duplicate step target "${id}" — declared in ${seen.get(id)} and again in ${file}`);
  } else {
    seen.set(id, file);
  }

  // The element must literally carry that id, as a plain JSX attribute.
  const needles = [`id="${id}"`, `id='${id}'`, `id={\`${id}\`}`, `id={"${id}"}`, `id={'${id}'}`];
  const found = sources.some(({ text }) => needles.some((n) => text.includes(n)));

  if (!found) {
    failures.push(
      `step target "${id}" (declared in ${file}) has no matching id="${id}" element.\n` +
        `      Either restore the element, or delete the step — a step whose element is gone\n` +
        `      is silently dropped from the walkthrough, and the tour quietly loses a page.`
    );
  }
}

if (failures.length > 0) {
  console.error(`\n[check-tour-targets] ${failures.length} problem(s) with the walkthrough:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}

console.log(`[check-tour-targets] ok — ${targets.length} walkthrough step target(s) all exist (${targets.map((t) => t.id).join(", ")})`);
