// Usage: node tools/replaceFn.cjs <fnName> <fragmentFile>
// Replaces `function <fnName>(...) { ... }` in utils/englishLessonHtmlGenerator.ts.
// Boundary: from "function <name>" to just before the next "\n  // =====" section
// marker (every initializer in the serialized client script has one). Falls back
// to brace scan if no marker is found.
const fs = require("fs");

const GEN = "utils/englishLessonHtmlGenerator.ts";
const fnName = process.argv[2];
const fragFile = process.argv[3];
if (!fnName || !fragFile) { console.error("need fnName + fragmentFile"); process.exit(1); }

let src = fs.readFileSync(GEN, "utf8");
const frag = fs.readFileSync(fragFile, "utf8");

const start = src.indexOf("function " + fnName);
if (start < 0) { console.error("function " + fnName + " not found"); process.exit(1); }

// Find the next section marker after the function starts.
let end = src.indexOf("\n  // =====", start + 10);
// Guard: marker must be after the function's opening brace line.
const openBrace = src.indexOf("{", start);
if (end < 0 || end < openBrace) {
  // Fallback: brace scan (approximate, strings-aware).
  let i = openBrace, depth = 0, state = "code";
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (state === "code") {
      if (c === "/" && n === "/") { state = "lc"; continue; }
      if (c === "/" && n === "*") { state = "bc"; i++; continue; }
      if (c === "'") { state = "sq"; continue; }
      if (c === '"') { state = "dq"; continue; }
      if (c === "`") { state = "tpl"; continue; }
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
    } else if (state === "sq") {
      if (c === "\\") { i++; continue; }
      if (c === "'") state = "code";
    } else if (state === "dq") {
      if (c === "\\") { i++; continue; }
      if (c === '"') state = "code";
    } else if (state === "tpl") {
      if (c === "\\") { i++; continue; }
      if (c === "`") state = "code";
    } else if (state === "lc") {
      if (c === "\n") state = "code";
    } else if (state === "bc") {
      if (c === "*" && n === "/") { state = "code"; i++; }
    }
  }
  end = i;
}

src = src.slice(0, start) + frag.trimEnd() + "\n" + src.slice(end);
fs.writeFileSync(GEN, src);
console.log("replaced " + fnName + " (region " + (end - start) + " -> " + frag.length + " chars)");
