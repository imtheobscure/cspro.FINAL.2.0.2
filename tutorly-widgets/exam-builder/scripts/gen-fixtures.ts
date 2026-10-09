/**
 * Extra audit fixtures:
 *  - practice-ielts.html   : the IELTS form with practice mode + relaxed proctoring
 *  - unsupported-2026.html : a schema using genuine 2026 task types the runtime
 *                            cannot render, to prove the validator lets it through
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTERNATIONAL_TEST_PRESETS, createMockExamForPreset } from "../src/testCatalog";
import type { ExamJSONSchema, LearnerProfile } from "../src/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..", ".check");
fs.mkdirSync(outDir, { recursive: true });

const learner: LearnerProfile = {
  name: "Audit Candidate",
  id: "AUDIT-2026-01",
  email: "audit@example.com",
  notes: "",
  context: "Standards conformance audit",
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
  fs.writeFileSync(path.join(outDir, name), captured[0] || "", "utf8");
  return (captured[0] || "").length;
};

const main = async () => {
  const ielts = INTERNATIONAL_TEST_PRESETS.find((p) => p.id === "ielts")!;
  const practice: ExamJSONSchema = createMockExamForPreset(ielts, learner.tutorEmail);
  practice.metadata.title = "IELTS Practice Mode - Audit";
  practice.metadata.practiceModeFlag = true;
  practice.proctoring = {
    webcamRequired: false,
    maxWarnings: 99,
    tabSwitchPenalty: false,
    pauseTimerOnWarning: false,
    enforceFullscreen: false,
    reproctorOnResume: false,
    aiProctorLog: true,
    gazeTracking: false,
    keystrokeDynamics: false,
    waveformVisualization: true,
    silenceAlerts: false,
    fillerWordTracking: true,
  };
  practice.metadata.voiceSettings = { ...(practice.metadata.voiceSettings as any), enabled: true, readInstructions: false };
  const pBytes = await emit("practice-ielts.html", practice);

  /**
   * These five types are all real, current 2026 constructs (see
   * Mock_Test_V3/ExamTaskTypeCoverage.md). None of them has a renderer in
   * quizHtmlGenerator.ts, so the exported exam shows them as dead cards.
   */
  const unsupported: ExamJSONSchema = {
    metadata: {
      title: "IELTS 2026 Standard Audit",
      language: "en-US",
      examFamily: "IELTS",
      adaptiveFlag: false,
      practiceModeFlag: false,
      timeLimitMinutes: 60,
      timerMode: "section",
      passingScorePercent: 70,
    },
    proctoring: {
      webcamRequired: false,
      maxWarnings: 3,
      tabSwitchPenalty: false,
      pauseTimerOnWarning: false,
      enforceFullscreen: false,
      reproctorOnResume: false,
      aiProctorLog: false,
      gazeTracking: false,
      keystrokeDynamics: false,
      waveformVisualization: false,
      silenceAlerts: false,
      fillerWordTracking: false,
    },
    sections: [
      {
        id: "s1",
        title: "Reading 2026",
        timeLimitMinutes: 20,
        questions: [
          { id: "q1", type: "note_completion", text: "Complete the notes below.", scoringWeight: 10 } as any,
          {
            id: "q2",
            type: "true_false_not_given",
            text: "The writer agrees with the new policy.",
            scoringWeight: 10,
            options: [
              { id: "t", text: "TRUE" },
              { id: "f", text: "FALSE" },
              { id: "n", text: "NOT GIVEN" },
            ],
            correctAnswers: ["t"],
          } as any,
          { id: "q3", type: "hotspot", text: "Click the correct region of the map.", scoringWeight: 10 } as any,
          { id: "q4", type: "drag_and_drop_cloze", text: "Drag the words into the gaps.", scoringWeight: 10 } as any,
          { id: "q5", type: "read_aloud", text: "Read the paragraph aloud.", scoringWeight: 10, maxRecordingSeconds: 40 } as any,
        ],
      },
    ],
  };
  const uBytes = await emit("unsupported-2026.html", unsupported);

  console.log(`practice-ielts.html     ${Math.round(pBytes / 1024)} KB`);
  console.log(`unsupported-2026.html   ${Math.round(uBytes / 1024)} KB`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
