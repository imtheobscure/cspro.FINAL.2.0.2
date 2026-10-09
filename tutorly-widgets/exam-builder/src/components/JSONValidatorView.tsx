import React, { useState } from 'react';
import { ExamJSONSchema, LearnerProfile } from '../types';
import { createMockExamForPreset, INTERNATIONAL_TEST_PRESETS } from '../testCatalog';
import { handleSaveQuizAsExamHtml } from '../quizHtmlGenerator';
import { normaliseQuestionTypes, TypeCheckResult } from '../questionTypeRegistry';
import { CheckCircle2, AlertCircle, FileCode, Download, Layers, Ban } from 'lucide-react';

interface JSONValidatorViewProps {
  learner: LearnerProfile;
  onLoadConfigOverrides?: (schema: ExamJSONSchema) => void;
}

export const JSONValidatorView: React.FC<JSONValidatorViewProps> = ({ learner, onLoadConfigOverrides }) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [parsedSchema, setParsedSchema] = useState<ExamJSONSchema | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMeta, setSuccessMeta] = useState<string | null>(null);
  /** Result of mapping every question onto a renderer the runtime actually has. */
  const [typeReport, setTypeReport] = useState<TypeCheckResult | null>(null);

  const presetOptions = INTERNATIONAL_TEST_PRESETS.map((preset) => ({
    name: `${preset.name} Complete Mock`,
    description: `${preset.summary} Includes sections, listening activities, speaking recording prompts and official-style timing.`,
    data: createMockExamForPreset(preset, learner.tutorEmail),
  }));

  // Parse and validate text whenever changed or triggers fired
  const validateJsonString = (input: string) => {
    setJsonText(input);
    if (!input.trim()) {
      setParsedSchema(null);
      setValidationError(null);
      setSuccessMeta(null);
      return;
    }

    try {
      // Stripping potential markdown wrapping
      let cleanInput = input.trim();
      if (cleanInput.startsWith('```json')) {
        cleanInput = cleanInput.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanInput.startsWith('```')) {
        cleanInput = cleanInput.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanInput);

      // Validate core required properties based on the schema
      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Payload is not a recognized JSON dictionary root.");
      }

      if (!parsed.metadata || typeof parsed.metadata !== 'object') {
        throw new Error("Missing critical 'metadata' block at object root.");
      }

      if (!parsed.metadata.title) {
        throw new Error("Missing 'metadata.title' string value.");
      }

      if (!Array.isArray(parsed.sections)) {
        throw new Error("Missing or invalid 'sections' property. Must be an array of assessment segments.");
      }

      if (parsed.sections.length === 0) {
        throw new Error("Assessment schema specifies zero available sections.");
      }

      // Check inner questions presence
      let totalQCount = 0;
      parsed.sections.forEach((sec: any, sIdx: number) => {
        if (!sec.title) throw new Error(`Section index [${sIdx}] lacks a title.`);
        if (!Array.isArray(sec.questions)) {
          throw new Error(`Section '${sec.title}' lacks a valid 'questions' array.`);
        }
        totalQCount += sec.questions.length;
        
        sec.questions.forEach((q: any, qIdx: number) => {
          if (!q.id) throw new Error(`Question index [${qIdx}] in '${sec.title}' lacks a unique id.`);
          if (!q.text) throw new Error(`Question [${q.id}] lacks core prompt text.`);
          if (!q.type) throw new Error(`Question [${q.id}] lacks a 'type' flag.`);
        });
      });

      // Structural checks passed. Now prove the runtime can actually RENDER what
      // was pasted: a parseable schema full of 2026 task types with no renderer
      // used to be reported as "SCHEMA APPROVED" and compiled into a paper with
      // unanswerable items.
      const { schema: normalised, report } = normaliseQuestionTypes(parsed);
      setTypeReport(report);

      if (report.blocking.length > 0) {
        setParsedSchema(null);
        setSuccessMeta(null);
        setValidationError(
          `${report.blocking.length} item(s) use a question type this build cannot render. ` +
          `The exported paper would show them as cards with no way to answer, scoring zero. ` +
          `Fix or replace them before compiling.`
        );
        return;
      }

      // Validation passes!
      setParsedSchema(normalised as ExamJSONSchema);
      setValidationError(null);
      setSuccessMeta(
        `Schema Validated: "${parsed.metadata.title}" containing ${parsed.sections.length} section(s) and ${totalQCount} active item(s).` +
        (report.warnings.length ? ` ${report.warnings.length} item(s) were adapted to a supported renderer.` : '')
      );

      // Optionally notify layout overrides
      if (onLoadConfigOverrides) {
        onLoadConfigOverrides(normalised as ExamJSONSchema);
      }
    } catch (err: any) {
      setParsedSchema(null);
      setSuccessMeta(null);
      setTypeReport(null);
      setValidationError(err.message || "Syntactical JSON anomaly detected.");
    }
  };

  // Inject sample preset templates
  const loadPresetExample = (index: number) => {
    const targetSample = presetOptions[index];
    if (targetSample) {
      const stringified = JSON.stringify(targetSample.data, null, 2);
      validateJsonString(stringified);
    }
  };

  // Trigger main Standalone File Download generator
  const triggerHTMLGeneration = () => {
    if (!parsedSchema) return;

    // Verify minimum candidate metrics
    if (!learner.name.trim()) {
      alert("⚠️ Please enter a Candidate Name in Stage 1 above before compiling the standalone assessment file.");
      const elt = document.getElementById('learner-form-anchor');
      if (elt) elt.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    handleSaveQuizAsExamHtml(parsedSchema, learner);
  };

  return (
    <div className="space-y-6">
      
      {/* Preset injection shortcuts */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-slate-600" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Instant Test Templates (Pre-populated JSON presets)
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Click any preset to instantly evaluate the live parser engine and explore full capabilities without external ping latency.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {presetOptions.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadPresetExample(idx)}
              className="flex flex-col p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs transition-all text-left group"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {sample.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  Load Preset
                </span>
              </div>
              <span className="text-[11px] text-slate-500 leading-tight line-clamp-2">
                {sample.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Importer Frame */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-600" />
              Stage 5: JSON Importer & Realtime Schema Validator
            </h2>
            <p className="text-xs text-slate-500">
              Paste the finalized raw dictionary generated by the external engine.
            </p>
          </div>

          <button
            type="button"
            onClick={() => validateJsonString('')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline"
            disabled={!jsonText}
          >
            Clear Textbox
          </button>
        </div>

        <div className="relative">
          <textarea
            value={jsonText}
            onChange={(e) => validateJsonString(e.target.value)}
            rows={12}
            placeholder="Paste verified JSON string block starting with { 'metadata': ... } here..."
            className={`w-full text-xs font-mono p-4 rounded-lg border focus:outline-none transition-all resize-y ${
              validationError
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 bg-rose-50/20'
                : parsedSchema
                ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-emerald-50/10'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
            }`}
          />

          {/* Inline valid or invalid state stamp */}
          <div className="absolute top-3 right-3 pointer-events-none flex items-center gap-1.5">
            {parsedSchema && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                SCHEMA APPROVED
              </span>
            )}
            {validationError && (
              <span className="text-xs font-bold text-rose-700 bg-rose-100/90 px-3 py-1 rounded-full border border-rose-300 flex items-center gap-1 shadow-xs">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                INVALID PARSE
              </span>
            )}
          </div>
        </div>

        {/* Validation Error banner */}
        {validationError && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1 animate-fade-in">
            <strong className="block font-semibold flex items-center gap-1.5 text-rose-900">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              Parsing Exception Failed:
            </strong>
            <p className="font-mono text-rose-700 pl-5.5">{validationError}</p>
            <p className="text-[11px] text-rose-500 pl-5.5 pt-1">
              Ensure quotes are balanced correctly and inner arrays conform precisely to metadata structures. Check the prompt copy instructions above.
            </p>
          </div>
        )}

        {/* Unrenderable question types - the only thing that hard-blocks compilation */}
        {typeReport && typeReport.blocking.length > 0 && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-xs space-y-2 animate-fade-in">
            <strong className="flex items-center gap-1.5 text-rose-900">
              <Ban className="w-4 h-4 flex-shrink-0 text-rose-600" />
              {typeReport.blocking.length} item(s) cannot be rendered by this build
            </strong>
            <p className="text-rose-700">
              These task types are real, but the standalone engine has no control for them, so a candidate
              would see a question with nothing to answer. Compilation is blocked until they are replaced.
            </p>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {typeReport.blocking.map((b, i) => (
                <li key={i} className="font-mono text-[11px] text-rose-800 bg-white/70 rounded px-2 py-1">
                  <strong>{b.type}</strong> — {b.sectionTitle} / {b.questionId}: {b.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Types that were reduced onto a supported renderer */}
        {typeReport && typeReport.blocking.length === 0 && typeReport.warnings.length > 0 && (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-2 animate-fade-in">
            <strong className="flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              {typeReport.warnings.length} item(s) adapted to a supported renderer
            </strong>
            <p className="text-amber-800">The paper is compilable. Each row states exactly what the adaptation loses.</p>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {typeReport.warnings.map((w, i) => (
                <li key={i} className="font-mono text-[11px] text-amber-900 bg-white/70 rounded px-2 py-1">
                  <strong>{w.from}</strong> → <strong>{w.to}</strong> — {w.sectionTitle} / {w.questionId}: {w.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success confirmation details */}
        {parsedSchema && successMeta && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <strong className="block font-semibold">Integrity Parser Validated!</strong>
              <p className="text-emerald-700 leading-relaxed font-medium">{successMeta}</p>
              
              {/* Renderer coverage */}
              {typeReport && Object.keys(typeReport.coverage).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {Object.entries(typeReport.coverage).map(([type, count]) => (
                    <span key={type} className="bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                      {type}: {count}
                    </span>
                  ))}
                </div>
              )}

              {/* Feature check tags */}
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                <span className="bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                  TimeLimit: {parsedSchema.metadata.timeLimitMinutes}m
                </span>
                <span className="bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                  Adaptive: {parsedSchema.metadata.adaptiveFlag ? 'YES' : 'NO'}
                </span>
                <span className="bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                  PracticeMode: {parsedSchema.metadata.practiceModeFlag ? 'YES' : 'NO'}
                </span>
                <span className="bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                  Webcam: {parsedSchema.proctoring?.webcamRequired ? 'MANDATORY' : 'OPTIONAL'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Standalone Generation Hook trigger */}
        <div className="pt-4 border-t border-slate-100">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-6 rounded-xl border border-blue-100 flex flex-col items-center text-center space-y-3">
            <div className="max-w-md">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Stage 5: Create Standalone HTML Distribution File
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compiles the valid schema, CSS grid structures, camera detection routines, local buffer autosave mechanisms, and cheat trackers into one file.
              </p>
            </div>

            <button
              type="button"
              onClick={triggerHTMLGeneration}
              disabled={!parsedSchema}
              className={`w-full max-w-md py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 ${
                parsedSchema
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-blue-200 hover:translate-y-[-1px]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Generate Standalone HTML Exam
            </button>

            {!parsedSchema && (
              <span className="text-[10px] text-slate-400 block pt-0.5">
                ⚠️ Requires valid JSON code parsed cleanly to enable output compilation.
              </span>
            )}
            {parsedSchema && !learner.name && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded block mt-1 border border-amber-200">
                ⚠️ Advisory: Set a Candidate Name in Stage 1 to brand the downloaded artifact correctly.
              </span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
