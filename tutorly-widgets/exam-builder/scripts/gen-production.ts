/**
 * Generate the authored 2026 production papers into .check/.
 *
 * These are the two papers that are meant to be looked at by a human: real reading
 * passages, real listening scripts with a cast per character, and the completion family
 * (Complete the Words, note, table and sentence completion) carrying actual stimuli.
 * The generated per-preset papers in gen-all-exams.ts are structural skeletons by
 * comparison; these are the fidelity check.
 *
 * Run: npm run gen:production
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildToefl2026 } from "../src/productionMocks/toefl2026";
import { buildIelts2026 } from "../src/productionMocks/ielts2026";
import type { ExamJSONSchema, LearnerProfile } from "../src/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..", ".check");
fs.mkdirSync(outDir, { recursive: true });

const learner: LearnerProfile = {
  name: "Production Candidate",
  id: "PROD-2026-01",
  email: "candidate@example.com",
  notes: "Authored production paper.",
  context: "2026 standards conformance run",
  targetScore: "80%",
  tutorEmail: "examiner@example.org",
  collectCandidateInfo: true,
};

const captured: string[] = [];
class CapturingBlob {
  constructor(parts: any[]) {
    captured.push(parts.map((p) => String(p)).join(""));
  }
  get size() {
    return captured[captured.length - 1]?.length ?? 0;
  }
}
(globalThis as any).Blob = CapturingBlob;
(globalThis as any).URL.createObjectURL = () => "blob:audit";
(globalThis as any).URL.revokeObjectURL = () => {};
(globalThis as any).document = {
  body: { appendChild() {}, removeChild() {} },
  createElement: () => ({ href: "", download: "", click() {}, style: {} }),
};

const emit = async (name: string, schema: ExamJSONSchema) => {
  const mod = await import("../src/quizHtmlGenerator");
  captured.length = 0;
  mod.handleSaveQuizAsExamHtml(schema, learner);
  const html = captured[0] || "";
  fs.writeFileSync(path.join(outDir, name), html, "utf8");
  return { bytes: html.length, schema };
};

const main = async () => {
  const papers: Array<[string, ExamJSONSchema]> = [
    ["production-toefl-2026.html", buildToefl2026(learner.tutorEmail)],
    ["production-ielts-2026.html", buildIelts2026(learner.tutorEmail)],
  ];

  for (const [file, schema] of papers) {
    const { bytes } = await emit(file, schema);
    const types: Record<string, number> = {};
    let questions = 0;
    let gaps = 0;
    let cast = 0;
    schema.sections.forEach((sec) => {
      (sec.questions ?? []).forEach((q) => {
        questions++;
        types[q.type] = (types[q.type] ?? 0) + 1;
        gaps += Array.isArray((q as any).blanks) ? (q as any).blanks.length : 0;
      });
      (sec.listeningActivities ?? []).forEach((a) => {
        cast += Object.keys(a.cast ?? {}).length;
      });
    });
    console.log(`\n${file}  (${Math.round(bytes / 1024)} KB)`);
    console.log(`  sections ${schema.sections.length} · questions ${questions} · keyed gaps ${gaps} · cast characters ${cast}`);
    console.log(
      "  types: " +
        Object.entries(types)
          .map(([t, n]) => `${t} x${n}`)
          .join(", "),
    );
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
