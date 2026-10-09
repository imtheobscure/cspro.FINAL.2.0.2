import { EXAM_PROFILE_TASK_TYPE_MATRIX, resolveExamTaskType } from '../../tutorly-lessons/Mock-Test/ExamSimulatorHtmlGenerator';

export const EXAM_PROFILE_V2_LABELS: Record<string, string> = {
  // --- Standard 42 Core Exams ---
  ielts_academic_paper_2026: "IELTS Academic (Paper)",
  ielts_academic_computer_2026: "IELTS Academic (Computer)",
  ielts_general_paper_2026: "IELTS General (Paper)",
  ielts_general_computer_2026: "IELTS General (Computer)",
  ielts_ukvi_2026: "IELTS UKVI",
  ielts_life_skills_a1_2026: "IELTS Life Skills A1",
  ielts_life_skills_b1_2026: "IELTS Life Skills B1",
  toefl_ibt_2026: "TOEFL iBT",
  toefl_essentials_2026: "TOEFL Essentials",
  toefl_itp_2026: "TOEFL ITP",
  toefl_junior_2026: "TOEFL Junior",
  pte_academic_2026: "PTE Academic",
  pte_core_2026: "PTE Core",
  pte_home_a1_2026: "PTE Home A1",
  pte_home_b1_2026: "PTE Home B1",
  duolingo_english_test_2026: "Duolingo English Test (DET)",
  cambridge_a2_key_2026: "Cambridge A2 Key",
  cambridge_b1_preliminary_2026: "Cambridge B1 Preliminary",
  cambridge_b2_first_2026: "Cambridge B2 First",
  cambridge_c1_advanced_2026: "Cambridge C1 Advanced",
  cambridge_c2_proficiency_2026: "Cambridge C2 Proficiency",
  celpip_general_2026: "CELPIP General",
  celpip_general_ls_2026: "CELPIP General LS",
  oet_2026: "OET (Occupational English Test)",
  trinity_ise_2026: "Trinity ISE",
  aptis_2026: "Aptis",
  languagecert_2026: "LanguageCert",
  gcse_english_language_2026: "GCSE English Language",
  gcse_english_literature_2026: "GCSE English Literature",
  gcse_mathematics_2026: "GCSE Mathematics",
  gcse_combined_science_2026: "GCSE Combined Science",
  eleven_plus_2026: "Eleven Plus (11+)",
  iseb_common_entrance_2026: "ISEB Common Entrance",
  ssat_upper_middle_2026: "SSAT Upper/Middle",
  sat_2026: "SAT",
  act_2026: "ACT",
  hspt_2026: "HSPT",
  isee_upper_2026: "ISEE Upper",
  naplan_2026: "NAPLAN",
  canadian_cat4_2026: "Canadian CAT4/CCAT",
  english_placement_test_2026: "English Placement Test",
  exam_prep_test_teach_test: "Test-Teach-Test (TTT)",

  // --- Extended 15 Language Exams (German, French, Spanish) ---
  german_testdaf_2026: "TestDaF 2026 (German)",
  german_goethe_b1_2026: "Goethe-Zertifikat B1 (German)",
  german_goethe_b2_2026: "Goethe-Zertifikat B2 (German)",
  german_goethe_c1_2026: "Goethe-Zertifikat C1 (German)",
  german_telc_b1_2026: "telc Deutsch B1 (German)",
  german_telc_b2_2026: "telc Deutsch B2 (German)",
  french_delf_b1_2026: "DELF B1 2026 (French)",
  french_delf_b2_2026: "DELF B2 2026 (French)",
  french_dalf_c1_2026: "DALF C1 2026 (French)",
  french_dalf_c2_2026: "DALF C2 2026 (French)",
  french_tcf_tp_2026: "TCF Tout Public 2026 (French)",
  spanish_dele_b1_2026: "DELE B1 2026 (Spanish)",
  spanish_dele_b2_2026: "DELE B2 2026 (Spanish)",
  spanish_dele_c1_2026: "DELE C1 2026 (Spanish)",
  spanish_siele_global_2026: "SIELE Global 2026 (Spanish)"
};

// Map each of the 15 new language profiles to their list of typical task types.
const EXTENDED_EXAM_MATRIX: Record<string, readonly string[]> = {
  german_testdaf_2026: [
    "leseverstehen_mc_single", "leseverstehen_matching", "hoerverstehen_mc_single", "hoerverstehen_note",
    "schriftlich_essay", "muendlich_speaking_response", "muendlich_interview", "sprachbausteine_cloze"
  ],
  german_goethe_b1_2026: [
    "leseverstehen_mc_single", "leseverstehen_matching", "hoerverstehen_mc_single",
    "schriftlich_email", "schriftlich_essay", "muendlich_speaking_response", "muendlich_interview"
  ],
  german_goethe_b2_2026: [
    "leseverstehen_mc_single", "leseverstehen_matching", "hoerverstehen_mc_single",
    "schriftlich_essay", "schriftlich_email", "muendlich_speaking_response", "muendlich_interview"
  ],
  german_goethe_c1_2026: [
    "leseverstehen_mc_single", "leseverstehen_matching", "leseverstehen_highlight", "hoerverstehen_mc_single",
    "schriftlich_essay", "muendlich_speaking_response", "muendlich_interview", "sprachbausteine_cloze"
  ],
  german_telc_b1_2026: [
    "leseverstehen_mc_single", "leseverstehen_cloze", "hoerverstehen_mc_single",
    "schriftlich_letter", "muendlich_roleplay", "muendlich_speaking_response"
  ],
  german_telc_b2_2026: [
    "leseverstehen_mc_single", "leseverstehen_cloze", "hoerverstehen_mc_single",
    "schriftlich_letter", "muendlich_roleplay", "muendlich_speaking_response", "sprachbausteine_cloze"
  ],
  french_delf_b1_2026: [
    "comprehension_ecrite_mc_single", "comprehension_ecrite_cloze", "comprehension_orale_mc_single",
    "production_ecrite_email", "production_ecrite_essay", "production_orale_interview", "production_orale_roleplay"
  ],
  french_delf_b2_2026: [
    "comprehension_ecrite_mc_single", "comprehension_ecrite_matching", "comprehension_orale_mc_single",
    "production_ecrite_essay", "production_orale_response", "production_orale_interview"
  ],
  french_dalf_c1_2026: [
    "comprehension_ecrite_mc_single", "comprehension_ecrite_matching", "comprehension_orale_mc_single", "comprehension_orale_note",
    "production_ecrite_essay", "production_orale_response", "production_orale_interview"
  ],
  french_dalf_c2_2026: [
    "comprehension_ecrite_mc_single", "comprehension_orale_mc_single", "comprehension_orale_note",
    "production_ecrite_essay", "production_orale_response"
  ],
  french_tcf_tp_2026: [
    "comprehension_ecrite_mc_single", "comprehension_orale_mc_single", "structures_cloze", "structures_completion"
  ],
  spanish_dele_b1_2026: [
    "comprension_lectura_mc_single", "comprension_lectura_matching", "comprension_auditiva_mc_single",
    "expresion_escrita_email", "expresion_escrita_letter", "expresion_oral_interview", "expresion_oral_response"
  ],
  spanish_dele_b2_2026: [
    "comprension_lectura_mc_single", "comprension_lectura_matching", "comprension_lectura_cloze", "comprension_auditiva_mc_single",
    "expresion_escrita_essay", "expresion_escrita_letter", "expresion_oral_interview", "expresion_oral_response"
  ],
  spanish_dele_c1_2026: [
    "comprension_lectura_mc_single", "comprension_lectura_matching", "comprension_lectura_highlight", "comprension_auditiva_mc_single",
    "expresion_escrita_essay", "expresion_oral_interview", "expresion_oral_response"
  ],
  spanish_siele_global_2026: [
    "comprension_lectura_mc_single", "comprension_lectura_matching", "comprension_lectura_cloze", "comprension_auditiva_mc_single",
    "expresion_escrita_essay", "expresion_oral_interview", "expresion_oral_response", "expresion_oral_video"
  ]
};

// Combine original V1 matrix with extended matrix
export const EXAM_PROFILE_V2_TASK_TYPE_MATRIX: Record<string, readonly string[]> = {
  ...EXAM_PROFILE_TASK_TYPE_MATRIX,
  ...EXTENDED_EXAM_MATRIX
};

// Resolve extended task types and fallback to the original resolver
export interface ResolvedV2TaskType {
  label: string;
  renderer: string;
  primarySkill: string;
}

const LOCAL_V2_CATALOG: Record<string, ResolvedV2TaskType> = {
  // German Task Types
  leseverstehen_mc_single: { label: "Leseverstehen (Multiple Choice)", renderer: "single_choice", primarySkill: "reading" },
  leseverstehen_matching: { label: "Leseverstehen (Zuordnung)", renderer: "matching", primarySkill: "reading" },
  leseverstehen_highlight: { label: "Leseverstehen (Satz markieren)", renderer: "highlight_sentence", primarySkill: "reading" },
  leseverstehen_cloze: { label: "Leseverstehen (Lückentext)", renderer: "dropdown_cloze", primarySkill: "reading" },
  hoerverstehen_mc_single: { label: "Hörverstehen (Multiple Choice)", renderer: "single_choice", primarySkill: "listening" },
  hoerverstehen_note: { label: "Hörverstehen (Notizen ausfüllen)", renderer: "note_completion", primarySkill: "listening" },
  hoerverstehen_matching: { label: "Hörverstehen (Zuordnung)", renderer: "matching", primarySkill: "listening" },
  schriftlich_essay: { label: "Schriftlicher Ausdruck (Freier Aufsatz)", renderer: "essay", primarySkill: "writing" },
  schriftlich_email: { label: "Schriftlicher Ausdruck (E-Mail)", renderer: "email", primarySkill: "writing" },
  schriftlich_letter: { label: "Schriftlicher Ausdruck (Brief)", renderer: "letter", primarySkill: "writing" },
  muendlich_interview: { label: "Mündlicher Ausdruck (Mündliches Interview)", renderer: "oral_interview", primarySkill: "speaking" },
  muendlich_roleplay: { label: "Mündlicher Ausdruck (Rollenspiel)", renderer: "role_play", primarySkill: "speaking" },
  muendlich_speaking_response: { label: "Mündlicher Ausdruck (Bildbeschreibung)", renderer: "speaking_response", primarySkill: "speaking" },
  sprachbausteine_cloze: { label: "Sprachbausteine (Lückentext)", renderer: "dropdown_cloze", primarySkill: "grammar" },
  sprachbausteine_completion: { label: "Sprachbausteine (Satzvervollständigung)", renderer: "sentence_completion", primarySkill: "grammar" },

  // French Task Types
  comprehension_ecrite_mc_single: { label: "Compréhension écrite (Choix multiple)", renderer: "single_choice", primarySkill: "reading" },
  comprehension_ecrite_matching: { label: "Compréhension écrite (Appariement)", renderer: "matching", primarySkill: "reading" },
  comprehension_ecrite_highlight: { label: "Compréhension écrite (Surlignage)", renderer: "highlight_sentence", primarySkill: "reading" },
  comprehension_ecrite_cloze: { label: "Compréhension écrite (Texte à trous)", renderer: "dropdown_cloze", primarySkill: "reading" },
  comprehension_orale_mc_single: { label: "Compréhension orale (Choix multiple)", renderer: "single_choice", primarySkill: "listening" },
  comprehension_orale_note: { label: "Compréhension orale (Notes de cours)", renderer: "note_completion", primarySkill: "listening" },
  production_ecrite_essay: { label: "Production écrite (Essai)", renderer: "essay", primarySkill: "writing" },
  production_ecrite_email: { label: "Production écrite (Courriel)", renderer: "email", primarySkill: "writing" },
  production_ecrite_letter: { label: "Production écrite (Lettre)", renderer: "letter", primarySkill: "writing" },
  production_orale_interview: { label: "Production orale (Entretien dirigé)", renderer: "oral_interview", primarySkill: "speaking" },
  production_orale_roleplay: { label: "Production orale (Jeu de rôle)", renderer: "role_play", primarySkill: "speaking" },
  production_orale_response: { label: "Production orale (Exposé continu)", renderer: "speaking_response", primarySkill: "speaking" },
  structures_cloze: { label: "Structures (Texte à trous)", renderer: "dropdown_cloze", primarySkill: "grammar" },
  structures_completion: { label: "Structures (Compléter la phrase)", renderer: "sentence_completion", primarySkill: "grammar" },

  // Spanish Task Types
  comprension_lectura_mc_single: { label: "Comprensión de lectura (Opción múltiple)", renderer: "single_choice", primarySkill: "reading" },
  comprension_lectura_matching: { label: "Comprensión de lectura (Asociación)", renderer: "matching", primarySkill: "reading" },
  comprension_lectura_highlight: { label: "Comprensión de lectura (Marcar texto)", renderer: "highlight_sentence", primarySkill: "reading" },
  comprension_lectura_cloze: { label: "Comprensión de lectura (Llenar huecos)", renderer: "dropdown_cloze", primarySkill: "reading" },
  comprension_auditiva_mc_single: { label: "Comprensión auditiva (Opción múltiple)", renderer: "single_choice", primarySkill: "listening" },
  comprension_auditiva_note: { label: "Comprensión auditiva (Completar notas)", renderer: "note_completion", primarySkill: "listening" },
  comprension_auditiva_matching: { label: "Comprensión auditiva (Asociación)", renderer: "matching", primarySkill: "listening" },
  expresion_escrita_essay: { label: "Expresión escrita (Ensayo)", renderer: "essay", primarySkill: "writing" },
  expresion_escrita_email: { label: "Expresión escrita (Correo electrónico)", renderer: "email", primarySkill: "writing" },
  expresion_escrita_letter: { label: "Expresión escrita (Carta formal)", renderer: "letter", primarySkill: "writing" },
  expresion_oral_interview: { label: "Expresión oral (Entrevista)", renderer: "oral_interview", primarySkill: "speaking" },
  expresion_oral_roleplay: { label: "Expresión oral (Juego de rol)", renderer: "role_play", primarySkill: "speaking" },
  expresion_oral_response: { label: "Expresión oral (Monólogo guiado)", renderer: "speaking_response", primarySkill: "speaking" },
  expresion_oral_video: { label: "Expresión oral (Video reflexión)", renderer: "video_reflection", primarySkill: "speaking" },
  gramatica_cloze: { label: "Gramática y uso de la lengua (Llenar huecos)", renderer: "dropdown_cloze", primarySkill: "grammar" },
  gramatica_completion: { label: "Gramática y uso de la lengua (Completar frase)", renderer: "sentence_completion", primarySkill: "grammar" }
};

export function resolveExamV2TaskType(taskId: string): ResolvedV2TaskType | undefined {
  if (LOCAL_V2_CATALOG[taskId]) {
    return LOCAL_V2_CATALOG[taskId];
  }
  const original = resolveExamTaskType(taskId);
  if (original) {
    return {
      label: original.label,
      renderer: original.renderer,
      primarySkill: original.taskType.includes('reading') ? 'reading' :
                    original.taskType.includes('listening') ? 'listening' :
                    original.taskType.includes('writing') ? 'writing' :
                    original.taskType.includes('speaking') ? 'speaking' :
                    original.taskType.includes('grammar') ? 'grammar' : 'reading'
    };
  }
  return undefined;
}
