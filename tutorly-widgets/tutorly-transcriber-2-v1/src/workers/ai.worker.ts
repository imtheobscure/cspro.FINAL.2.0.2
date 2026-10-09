import { pipeline, env } from "@xenova/transformers";

// ── Resilient fetch wrapper ────────────────────────────────────────────────
// transformers.js fetches model files (config.json, *.onnx, tokenizer.json)
// from env.remoteHost. We wrap fetch to:
//   - serve from the custom folder cache when enabled (true offline),
//   - retry transient 5xx / network failures with backoff,
//   - follow cross-origin redirects (HF mirror → huggingface.co) cleanly,
//   - normalise URLs so the custom cache keys are stable.
const originalFetch = self.fetch.bind(self);

function normaliseUrl(input: RequestInfo | URL): string {
  try {
    const urlStr = typeof input === "string" ? input : (input as any).url || String(input);
    return urlStr;
  } catch {
    return String(input);
  }
}

self.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = normaliseUrl(input);

  // 1. Custom folder cache (when the user selected a local directory).
  if (env.useCustomCache && (env as any).customCache) {
    try {
      const cached = await (env as any).customCache.match(input);
      if (cached) {
        console.log(`[Worker Fetch] cache HIT: ${urlStr.split("/").pop()}`);
        return cached;
      }
    } catch (cacheErr) {
      console.warn(`[Worker Fetch] cache match failed for ${urlStr}:`, cacheErr);
    }
  }

  // 2. Network fetch with retry. `redirect: "follow"` lets the browser chase
  //    the HF mirror's redirects (308 → 307 → 200) automatically.
  const MAX_ATTEMPTS = 4;
  let delay = 800;
  let response: Response | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      response = await originalFetch(input, { redirect: "follow", ...(init || {}) });
      if (response && response.ok) {
        lastError = null;
        break;
      }
      // Retry only on server errors; 404/403 etc. are terminal.
      if (response && response.status >= 500) {
        throw new Error(`HTTP ${response.status} for ${urlStr.split("/").pop()}`);
      }
      break;
    } catch (err: any) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS - 1) break;
      const filename = urlStr.split("/").pop() || urlStr;
      console.warn(
        `[Worker Fetch] ${filename} failed (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${err?.message || err}`,
      );
      // Abort retries fast for genuine offline states.
      const msg = String(err?.message || err);
      if (/Failed to fetch|NetworkError|Load failed|Offline|ERR_NETWORK/i.test(msg)) {
        if (attempt > 0) break;
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.6, 4000);
    }
  }

  if (!response || !response.ok) {
    const filename = urlStr.split("/").pop() || urlStr;
    const statusInfo = response ? `HTTP ${response.status}` : "no response";
    throw lastError || new Error(`Failed to fetch ${filename} (${statusInfo}). Check network or try switching the model mirror in Settings.`);
  }

  // 3. Persist to the custom folder cache (best-effort, never fatal).
  if (env.useCustomCache && (env as any).customCache) {
    try {
      await (env as any).customCache.put(input, response.clone());
    } catch (putErr) {
      console.warn(`[Worker Fetch] cache write failed for ${urlStr.split("/").pop()}:`, putErr);
    }
  }

  return response;
};


// ── ONNX / transformers.js environment ────────────────────────────────────
// These settings must be in place BEFORE any pipeline() call, otherwise the
// WASM backend fails to locate its binaries and the model load hangs / throws.

// Don't try to load models from a local /models path — always fetch from the
// configured remote mirror (HuggingFace).
env.allowLocalModels = false;

// Cache model weights in the browser's CacheStorage so they survive reloads
// and work fully offline after the first download. This is the default path
// when no custom folder is selected.
env.useBrowserCache = true;
env.useCustomCache = false;

// Default mirror — hf-mirror.com is a high-speed, widely-available CDN that
// mirrors huggingface.co. The user can change this in Settings → Offline Mode.
env.remoteHost = "https://huggingface.co";

// Pin the ORT (onnxruntime-web) WASM binaries to a specific jsDelivr path that
// matches the onnxruntime-web version bundled with this transformers.js.
// Without this, the worker looks for the .wasm files next to itself (which
// don't exist in the bundle) and the whole backend fails to initialise — the
// #1 reason "models don't download / offline doesn't work".
(function configureOnnx() {
  try {
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.wasmPaths =
        "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/";
      // Single-threaded WASM — works WITHOUT cross-origin isolation (COOP/COEP).
      // Multi-threaded needs SharedArrayBuffer which requires those headers, which
      // most static hosts don't set. Force 1 thread for maximum compatibility.
      env.backends.onnx.wasm.numThreads = 1;
    } else {
      console.warn("[Worker] ONNX backends not available yet, will configure after init");
    }
  } catch (e) {
    console.warn("[Worker] Failed to configure ONNX WASM paths:", e);
  }
})();

let translator: any = null;
let recognizer: any = null;
let loadedTranslationModel = "";
let loadedTranscriptionModel = "";

const INSTRUCTION_READY = "ready";
const INSTRUCTION_TRANSLATE = "translate";
const INSTRUCTION_RECOGNIZE = "recognize";
const INSTRUCTION_LOAD = "load";
const INSTRUCTION_SET_CACHE_DIR = "setCacheDir";

const NLLB_LANG_MAP: Record<string, string> = {
  en: "eng_Latn",
  fr: "fra_Latn",
  es: "spa_Latn",
  de: "deu_Latn",
  it: "ita_Latn",
  pt: "por_Latn",
  nl: "nld_Latn",
  ru: "rus_Cyrl",
  ja: "jpn_Jpan",
  ko: "kor_Hang",
  zh: "zho_Hans",
  ar: "arb_Arab",
  hi: "hin_Deva",
  tr: "tur_Latn",
  pl: "pol_Latn",
  sv: "swe_Latn",
  da: "dan_Latn",
  no: "nob_Latn",
  fi: "fin_Latn",
  cs: "ces_Latn",
  el: "ell_Grek",
  he: "heb_Hebr",
  th: "tha_Thai",
  vi: "vie_Latn",
  id: "ind_Latn",
  uk: "ukr_Cyrl",
  ro: "ron_Latn",
  hu: "hun_Latn",
  fa: "pes_Arab",
  bn: "ben_Beng",
  auto: "auto",
};

// m2m100 supports a fixed set of 100 languages as 2-letter codes. Pass-through
// valid ones; map variants (zh-* → zh) and reject unknowns to a safe default
// so the tokenizer never throws on an unsupported token.
const M2M100_LANG_MAP: Record<string, string> = {
  af: "af", am: "am", ar: "ar", ast: "ast", az: "az", ba: "ba", be: "be", bg: "bg",
  bn: "bn", br: "br", bs: "bs", ca: "ca", ceb: "ceb", cs: "cs", cy: "cy", da: "da",
  de: "de", el: "el", en: "en", es: "es", et: "et", fa: "fa", ff: "ff", fi: "fi",
  fr: "fr", fy: "fy", ga: "ga", gd: "gd", gl: "gl", gu: "gu", ha: "ha", he: "he",
  hi: "hi", hr: "hr", ht: "ht", hu: "hu", hy: "hy", id: "id", ig: "ig", ilo: "ilo",
  is: "is", it: "it", ja: "ja", jv: "jv", ka: "ka", kk: "kk", km: "km", kn: "kn",
  ko: "ko", lb: "lb", lg: "lg", ln: "ln", lo: "lo", lt: "lt", lv: "lv", mg: "mg",
  mk: "mk", ml: "ml", mn: "mn", mr: "mr", ms: "ms", my: "my", ne: "ne", nl: "nl",
  no: "no", ns: "ns", oc: "oc", or: "or", pa: "pa", pl: "pl", ps: "ps", pt: "pt",
  ro: "ro", ru: "ru", sd: "sd", si: "si", sk: "sk", sl: "sl", so: "so", sq: "sq",
  sr: "sr", ss: "ss", su: "su", sv: "sv", sw: "sw", ta: "ta", th: "th", tl: "tl",
  tn: "tn", tr: "tr", uk: "uk", ur: "ur", uz: "uz", vi: "vi", wo: "wo", xh: "xh",
  yi: "yi", yo: "yo", zh: "zh", zu: "zu",
  // Common regional variants collapse to their base code.
  "zh-cn": "zh", "zh-tw": "zh", "pt-br": "pt", "pt-pt": "pt",
  "en-us": "en", "en-gb": "en", "fr-ca": "fr",
};

const createFSCache = (dirHandle: any) => ({
  match: async (request: any) => {
    return new Promise<Response | undefined>(async (resolve) => {
      try {
        const urlStr = typeof request === "string" ? request : request.url;
        const url = new URL(urlStr);
        const pathMatch = url.pathname.match(
          /([^\/]+\/[^\/]+)\/resolve\/main\/(.+)$/,
        );
        const filename = pathMatch
          ? pathMatch[1] + "/" + pathMatch[2]
          : encodeURIComponent(urlStr);
        const parts = filename.split("/");

        let currentDir = dirHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(parts[i], {
            create: false,
          });
        }
        const fileHandle = await currentDir.getFileHandle(
          parts[parts.length - 1],
          { create: false },
        );
        const file = await fileHandle.getFile();

        // If file exists but is 0 bytes (due to previous aborted/failed downloads), skip cache to trigger download
        if (file.size === 0) {
          console.warn(
            `[Worker Cache] Found 0-byte empty file: ${filename}. Skipping cache to redownload...`,
          );
          resolve(undefined);
          return;
        }

        let contentType = "application/octet-stream";
        const lowerUrl = urlStr.toLowerCase();
        const lowerFilename = filename.toLowerCase();
        if (
          lowerUrl.endsWith(".wasm") ||
          lowerFilename.endsWith(".wasm") ||
          lowerUrl.includes(".wasm") ||
          lowerFilename.includes(".wasm")
        ) {
          contentType = "application/wasm";
        } else if (
          lowerUrl.endsWith(".json") ||
          lowerFilename.endsWith(".json") ||
          lowerUrl.includes(".json") ||
          lowerFilename.includes(".json")
        ) {
          contentType = "application/json";
        } else if (
          lowerUrl.endsWith(".js") ||
          lowerFilename.endsWith(".js") ||
          lowerUrl.includes(".js") ||
          lowerFilename.includes(".js")
        ) {
          contentType = "application/javascript";
        }

        console.log(
          `[Worker Cache] Match found: ${filename}. Serving copy with Content-Type: ${contentType}`,
        );

        const blob = file.slice(0, file.size, contentType);
        resolve(
          new Response(blob, {
            headers: {
              "Content-Length": String(file.size),
              "Content-Type": contentType,
            },
          }),
        );
      } catch (err) {
        resolve(undefined);
      }
    });
  },
  put: async (request: any, response: any) => {
    try {
      const urlStr = typeof request === "string" ? request : request.url;
      const url = new URL(urlStr);
      const pathMatch = url.pathname.match(
        /([^\/]+\/[^\/]+)\/resolve\/main\/(.+)$/,
      );
      const filename = pathMatch
        ? pathMatch[1] + "/" + pathMatch[2]
        : encodeURIComponent(urlStr);
      const parts = filename.split("/");

      let currentDir = dirHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i], {
          create: true,
        });
      }

      const cloned = response.clone();

      // Consume response first. If it fails mid-stream, we fail before touching system storage!
      const buffer = await cloned.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error("Downloaded buffer of 0 bytes, ignoring cache store.");
      }

      const fileHandle = await currentDir.getFileHandle(
        parts[parts.length - 1],
        { create: true },
      );

      if ("createWritable" in fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(buffer);
        await writable.close();
      } else if ("createSyncAccessHandle" in fileHandle) {
        const accessHandle = await fileHandle.createSyncAccessHandle();
        accessHandle.write(new Uint8Array(buffer));
        accessHandle.flush();
        accessHandle.close();
      } else {
        throw new Error("No writable file handle API supported");
      }
    } catch (err) {
      console.error("Cache put error during stream write:", err);
    }
  },
});

self.onmessage = async (event) => {
  const { type, data, id } = event.data;

  if (type === INSTRUCTION_SET_CACHE_DIR) {
    try {
      const dirHandle = data.dirHandle;
      env.useBrowserCache = false;
      env.useCustomCache = true;
      env.customCache = createFSCache(dirHandle);
      self.postMessage({ id, status: "success" });
    } catch (error: any) {
      self.postMessage({ id, status: "error", error: error.message });
    }
    return;
  }

  if (type === INSTRUCTION_LOAD) {
    try {
      const progressCallback = (info: any) => {
        self.postMessage({ type: "progress", data: info });
      };

      let tasks: string[] = [];
      let translationModel = "Xenova/m2m100_418M";
      let transcriptionModel = "Xenova/whisper-tiny";
      let modelMirror = "https://huggingface.co";

      if (Array.isArray(data)) {
        tasks = data;
      } else if (data && typeof data === "object") {
        tasks = data.tasks || [];
        if (data.translationModel) translationModel = data.translationModel;
        if (data.transcriptionModel)
          transcriptionModel = data.transcriptionModel;
        if (data.modelMirror) modelMirror = data.modelMirror;
      }

      // Configure transformers.js remoteHost mirror dynamically!
      env.remoteHost = modelMirror || "https://huggingface.co";
      console.log(`[Worker] Loading tasks=${JSON.stringify(tasks)} from ${env.remoteHost}`);
      console.log(`[Worker] wasmPaths=${env.backends.onnx.wasm.wasmPaths}`);

      // Load each requested task, isolating failures so a partial load is
      // still reported clearly (and the error names WHICH model failed).
      const loadErrors: string[] = [];

      if (
        tasks.includes("translate") &&
        (!translator || loadedTranslationModel !== translationModel)
      ) {
        try {
          console.log(`[Worker] Loading translation model: ${translationModel}`);
          translator = await pipeline("translation", translationModel, {
            progress_callback: progressCallback,
          });
          loadedTranslationModel = translationModel;
          console.log(`[Worker] Translation model loaded ✓`);
        } catch (err: any) {
          const msg = `Translation model "${translationModel}" failed: ${err?.message || err}`;
          console.error("[Worker] " + msg, err);
          loadErrors.push(msg);
        }
      }
      if (
        tasks.includes("recognize") &&
        (!recognizer || loadedTranscriptionModel !== transcriptionModel)
      ) {
        try {
          console.log(`[Worker] Loading transcription model: ${transcriptionModel}`);
          recognizer = await pipeline(
            "automatic-speech-recognition",
            transcriptionModel,
            { progress_callback: progressCallback },
          );
          loadedTranscriptionModel = transcriptionModel;
          console.log(`[Worker] Transcription model loaded ✓`);
        } catch (err: any) {
          const msg = `Transcription model "${transcriptionModel}" failed: ${err?.message || err}`;
          console.error("[Worker] " + msg, err);
          loadErrors.push(msg);
        }
      }

      // If nothing loaded at all, that's a hard failure.
      const anyLoaded =
        (tasks.includes("translate") && translator) ||
        (tasks.includes("recognize") && recognizer);

      if (!anyLoaded && loadErrors.length > 0) {
        self.postMessage({ id, status: "error", error: loadErrors.join(" | ") });
        return;
      }
      // Partial success (some models loaded, some failed) is still "ready"
      // for the ones that worked — surface the failures via console only.
      self.postMessage({ id, status: "success", type: INSTRUCTION_READY });
    } catch (error: any) {
      console.error("[Worker] INSTRUCTION_LOAD fatal:", error);
      self.postMessage({
        id,
        status: "error",
        error: error?.message || String(error),
      });
    }
  }

  if (type === INSTRUCTION_TRANSLATE) {
    try {
      if (!translator) throw new Error("Translator not loaded");
      let { text, targetLang, sourceLang } = data;

      let src_lang = "";
      let tgt_lang = "";

      if (loadedTranslationModel.toLowerCase().includes("m2m")) {
        // m2m100 supports a fixed set of 2-letter codes. Map unknowns /
        // 'auto' to safe defaults so the tokenizer never throws.
        src_lang = M2M100_LANG_MAP[(sourceLang?.split("-")[0] || "").toLowerCase()] || "en";
        tgt_lang = M2M100_LANG_MAP[(targetLang?.split("-")[0] || "").toLowerCase()] || "en";
      } else {
        src_lang = NLLB_LANG_MAP[sourceLang?.split("-")[0]] || "eng_Latn";
        tgt_lang = NLLB_LANG_MAP[targetLang?.split("-")[0]] || "eng_Latn";
      }

      const output = await translator(text, {
        src_lang: src_lang || undefined,
        tgt_lang: tgt_lang,
      });
      self.postMessage({
        id,
        status: "success",
        result: output[0].translation_text,
      });
    } catch (error: any) {
      self.postMessage({ id, status: "error", error: error.message });
    }
  }

  if (type === INSTRUCTION_RECOGNIZE) {
    try {
      if (!recognizer) throw new Error("Recognizer not loaded");
      const { audioData, language, task } = data;
      const sampleCount = Array.isArray(audioData) ? audioData.length : (audioData as Float32Array).length;
      const durationSec = sampleCount / 16000;
      console.log(`[Worker] Recognize request: ${sampleCount} samples (${durationSec.toFixed(1)}s), lang=${language || "auto"}, task=${task || "transcribe"}`);

      // Whisper pipeline options:
      // - language: required for short clips — Whisper often returns empty on
      //   3s audio if it can't auto-detect the language fast enough.
      // - task: "transcribe" (default) or "translate" (translate to English).
      // - return_timestamps: false for speed — we only need the text.
      // - chunk_length_s / stride_length_s: only for clips >= 10s.
      // - force_full_sequences: true forces output even from short clips.
      const opts: any = {
        return_timestamps: false,
        force_full_sequences: true,
      };
      if (language) opts.language = language;
      if (task) opts.task = task;
      if (durationSec >= 10) {
        opts.chunk_length_s = 30;
        opts.stride_length_s = 5;
      }

      const output = await recognizer(audioData, opts);
      const text = output?.text || "";
      console.log(`[Worker] Recognize result: "${text.slice(0, 80)}"`);
      self.postMessage({ id, status: "success", result: text });
    } catch (error: any) {
      console.error(`[Worker] Recognize error:`, error?.message || error);
      self.postMessage({ id, status: "error", error: error.message });
    }
  }
};
