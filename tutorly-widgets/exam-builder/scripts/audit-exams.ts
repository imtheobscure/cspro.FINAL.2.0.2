/**
 * Audit the generated standalone exam files.
 *
 * Three families of checks, all of which the builder itself never ran:
 *
 *  1. Does the emitted engine <script> actually PARSE? A syntax error there leaves a
 *     page that renders and does nothing at all - which is exactly what shipped.
 *  2. Can the runtime RENDER every question type in the schema? The renderable set is
 *     imported from the registry, so this file cannot drift out of step with the
 *     validator the way a hand-written list did.
 *  3. Does every item carry the STIMULUS its prompt promises? A task that says
 *     "complete the notes below" with no notes is broken even though its type is fine.
 *
 * Run: npm run audit:exams   (after npm run gen:exams)
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { NATIVE_TYPES, TYPE_ALIASES, checkQuestionContent, checkStimulusPromise } from "../src/questionTypeRegistry";

const here = path.dirname(fileURLToPath(import.meta.url));
const checkDir = path.resolve(here, "..", ".check");

const RENDERABLE = new Set<string>([...NATIVE_TYPES, ...Object.keys(TYPE_ALIASES)]);

interface Row {
  exam: string;
  parses: boolean;
  parseErrors: string;
  sections: number;
  questions: number;
  blocking: number;
  incomplete: number;
  problems: string[];
  perType: Record<string, number>;
}

/**
 * Fixtures that are SUPPOSED to fail. The negative fixture deliberately carries types and
 * stimuli the runtime cannot render, so the gate proves it catches them instead of
 * pretending the build is clean.
 */
const EXPECTED_FAILURES: Record<string, string> = {
  "unsupported-2026": "negative fixture: real 2026 task types with no renderer, plus a note task with no notes",
};

const files = fs.readdirSync(checkDir).filter((f) => f.endsWith(".html"));
const rows: Row[] = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(checkDir, file), "utf8");
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

  const parseErrors: string[] = [];
  scripts.forEach((src, i) => {
    try {
      new vm.Script(src, { filename: `${file}#script${i}` });
    } catch (err: any) {
      parseErrors.push(`${err.name}: ${err.message}`);
    }
  });

  const engine = scripts.find((s) => s.includes("const schema = ")) ?? "";
  let schema: any = null;
  try {
    const start = engine.indexOf("const schema = ") + "const schema = ".length;
    const end = engine.indexOf(";\n", start);
    schema = JSON.parse(engine.slice(start, end));
  } catch (err: any) {
    parseErrors.push(`schema-extract: ${err.message}`);
  }

  const problems: string[] = [];
  const perType: Record<string, number> = {};
  let questions = 0;

  (schema?.sections ?? []).forEach((sec: any) => {
    // Passages declared on the section are legitimately available to its questions.
    const sectionStimulus = { readingPassage: sec?.readingPassages ?? null, audioText: null };
    (sec?.questions ?? []).forEach((q: any) => {
      questions++;
      perType[q.type] = (perType[q.type] ?? 0) + 1;

      if (!RENDERABLE.has(q.type)) {
        problems.push(`UNRENDERABLE ${sec.id}/${q.id}:${q.type}`);
        return;
      }
      const content = checkQuestionContent(q)
        ?? checkStimulusPromise({ ...q, readingPassage: q.readingPassage ?? sectionStimulus.readingPassage });
      if (content) problems.push(`INCOMPLETE ${sec.id}/${q.id}:${q.type} - ${content}`);
    });
  });

  // A listening section is useless without audio, and a reading section without a passage.
  (schema?.sections ?? []).forEach((sec: any) => {
    const name = String(sec?.title ?? "").toLowerCase();
    if (name.includes("listen") && !(sec?.listeningActivities ?? []).length) {
      problems.push(`NO-AUDIO ${sec.id}: a listening section carries no listeningActivities`);
    }
    if (name.includes("read") && !(sec?.readingPassages ?? []).length) {
      problems.push(`NO-PASSAGE ${sec.id}: a reading section carries no readingPassages`);
    }
  });

  // Duplicate audio. Every listening item used to be handed one shared sentence as
  // its audioText, so a candidate heard the same recording once per item and no item's
  // own answer was ever spoken. Two items in a section sharing a recording is the
  // signature of that regression, so it fails the audit outright.
  (schema?.sections ?? []).forEach((sec: any) => {
    const seen = new Map<string, string>();
    (sec?.questions ?? []).forEach((q: any) => {
      const audio = typeof q?.audioText === "string" ? q.audioText.trim() : "";
      if (!audio) return;
      const first = seen.get(audio);
      if (first) problems.push(`DUP-AUDIO ${sec.id}: ${q.id} plays the same recording as ${first}`);
      else seen.set(audio, q.id);
    });
  });

  // The recording must actually contain the answer. A completion item whose blanks are
  // never mentioned in its audio cannot be answered by listening.
  //
  // The check is per BLANK and satisfied by ANY accepted alternative, because the answer
  // key legitimately lists spellings the recording does not use ("8am" alongside "8 am"
  // and "eight" for a speaker who says "eight a.m."). Multiple-choice is exempt: an
  // option is a paraphrase of the source, not a transcript of it, so verbatim matching
  // there produces false alarms rather than findings.
  const spokenForms = (needle: string): string[] => {
    const numbers: Record<string, string[]> = {
      "0": ["zero"], "1": ["one"], "2": ["two"], "3": ["three"], "4": ["four"],
      "5": ["five"], "6": ["six"], "7": ["seven"], "8": ["eight"], "9": ["nine"],
      "10": ["ten"], "12": ["twelve"], "24": ["twenty-four", "twenty four"],
      "95": ["ninety-five", "ninety five"],
    };
    const forms = [needle];
    const bare = needle.replace(/[£$]/g, "").replace(/\s+/g, " ").trim();
    forms.push(bare, bare.replace(/\s/g, ""));
    // "8am" / "8 am" are both spoken as "eight a.m." or "eight am".
    const clock = bare.match(/^(\d{1,2})\s*(am|pm)$/);
    if (clock) forms.push(`${clock[1]} ${clock[2]}`, `${clock[1]}${clock[2]}`, `${clock[1]} o'clock ${clock[2]}`);
    if (numbers[bare]) forms.push(...numbers[bare]);
    return forms;
  };

  (schema?.sections ?? []).forEach((sec: any) => {
    (sec?.questions ?? []).forEach((q: any) => {
      const audio = typeof q?.audioText === "string" ? q.audioText.toLowerCase() : "";
      if (!audio) return;
      const groups: string[][] = [];
      if (Array.isArray(q?.blanks)) {
        q.blanks.forEach((b: any) => {
          // A partial-word gap can be a single letter ("fie_d" -> "l"); one letter of a
          // word is not a phrase the recording can be searched for, and the surrounding
          // stem is what identifies the word.
          const list = (b?.correct ?? []).map(String).filter((c: string) => c.trim().length > 1);
          if (list.length) groups.push(list);
        });
      }
      if (!(q?.options ?? []).length && Array.isArray(q?.correctAnswers) && q.type !== "ordering" && q.type !== "matching" && q.type !== "multipleSelect") {
        const list = q.correctAnswers.map(String).filter((a: string) => a.length > 1);
        if (list.length) groups.push(list);
      }
      const missing = groups.filter((alts) => {
        return !alts.some((alt) => spokenForms(String(alt).toLowerCase().trim()).some((form) => form.length > 1 && audio.includes(form)));
      });
      if (missing.length) {
        problems.push(`AUDIO-ANSWER-MISSING ${sec.id}/${q.id}: the recording never states ${missing.map((g) => g.map((a) => `"${a}"`).join("/")).join(", ")}`);
      }
    });
  });

  rows.push({
    exam: file.replace(".html", ""),
    parses: parseErrors.length === 0,
    parseErrors: parseErrors.join(" | "),
    sections: schema?.sections?.length ?? 0,
    questions,
    blocking: problems.filter((p) => p.startsWith("UNRENDERABLE")).length,
    incomplete: problems.filter((p) => p.startsWith("INCOMPLETE")).length,
    problems,
    perType,
  });
}

console.table(
  rows.map((r) => ({
    exam: r.exam,
    parses: r.parses,
    errors: r.parseErrors.slice(0, 60),
    q: r.questions,
    unrenderable: r.blocking,
    incomplete: r.incomplete,
    other: r.problems.filter((p) => !p.startsWith("UNRENDERABLE") && !p.startsWith("INCOMPLETE")).length,
  })),
);

// Pass a negative fixture only when it genuinely fails, and for the right reasons.
for (const [exam, why] of Object.entries(EXPECTED_FAILURES)) {
  const row = rows.find((r) => r.exam === exam);
  if (!row) continue;
  const caught = row.blocking + row.incomplete + row.problems.filter((p) => p.startsWith("NO-")).length;
  console.log(
    caught > 0
      ? `✓ ${exam}: gate correctly refused it (${caught} problem(s)) - ${why}`
      : `✗ ${exam}: the gate ACCEPTED a paper it should have refused - ${why}`,
  );
  if (caught === 0) process.exitCode = 1;
}

const failing = rows.filter((r) => !(r.exam in EXPECTED_FAILURES) && (!r.parses || r.problems.length));
if (failing.length) {
  console.log("\nProblems:");
  failing.forEach((r) => {
    console.log(`  ${r.exam}:`);
    if (!r.parses) console.log(`    engine does not parse: ${r.parseErrors.slice(0, 160)}`);
    r.problems.slice(0, 8).forEach((p) => console.log(`    ${p}`));
    if (r.problems.length > 8) console.log(`    ...and ${r.problems.length - 8} more`);
  });
} else {
  console.log(`\nAll ${rows.length} generated papers parse, use renderable types and carry their stimulus.`);
}

console.log("\nQuestion types produced across all papers:");
const totals: Record<string, number> = {};
rows.forEach((r) => Object.entries(r.perType).forEach(([t, n]) => { totals[t] = (totals[t] ?? 0) + n; }));
Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => console.log(`  ${type.padEnd(20)} ${count}`));

const used = new Set(Object.keys(totals));
console.log("\nNative types never exercised by any preset:");
const untouched = [...NATIVE_TYPES].filter((t) => !used.has(t));
console.log(untouched.length ? `  ${untouched.join(", ")}` : "  none");

if (failing.length) process.exitCode = 1;
