"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_vite = require("vite");

// sherpaAsr.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_module = require("module");
var import_meta = {};
var require2 = (0, import_module.createRequire)(import_meta.url);
var sherpa = require2("sherpa-onnx");
var MODELS_DIR = import_path.default.join(process.cwd(), "models", "sherpa");
var SHERPA_MODELS = {
  "sherpa-onnx:canary-180m-flash": {
    id: "sherpa-onnx:canary-180m-flash",
    label: "Canary 180M Flash (EN/ES/DE/FR)",
    kind: "offline-canary",
    repo: "csukuangfj/sherpa-onnx-nemo-canary-180m-flash-en-es-de-fr-int8",
    files: ["encoder.int8.onnx", "decoder.int8.onnx", "tokens.txt"],
    langs: ["en", "es", "de", "fr"],
    modelType: "canary"
  },
  "sherpa-onnx:parakeet-tdt-0.6b": {
    id: "sherpa-onnx:parakeet-tdt-0.6b",
    label: "Parakeet TDT 0.6B v3 (EN, streaming)",
    kind: "online-transducer",
    repo: "csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8",
    files: ["encoder.int8.onnx", "decoder.int8.onnx", "joiner.int8.onnx", "tokens.txt"],
    langs: ["en"],
    modelType: "nemo"
  },
  "sherpa-onnx:nemotron-3.5-streaming": {
    id: "sherpa-onnx:nemotron-3.5-streaming",
    label: "Nemotron 3.5 ASR Streaming 0.6B (40 locales)",
    kind: "online-transducer",
    repo: "csukuangfj2/sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-1120ms-int8-2026-06-11",
    files: ["encoder.int8.onnx", "decoder.int8.onnx", "joiner.int8.onnx", "tokens.txt"],
    langs: [
      "en",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "nl",
      "ru",
      "ar",
      "hi",
      "ja",
      "ko",
      "vi",
      "uk",
      "pl",
      "sv",
      "cs",
      "da",
      "fi",
      "zh",
      "hu",
      "ro",
      "el",
      "he",
      "th",
      "tr",
      "bg",
      "hr",
      "sk",
      "et",
      "lt",
      "lv",
      "mt",
      "sl",
      "nn",
      "no"
    ],
    modelType: "nemotron"
  }
};
var GATEWAYS = [
  "https://huggingface.co",
  "https://hf-mirror.com",
  "https://hf.co",
  "https://cdn-media.huggingface.co"
];
async function gatewayFetch(repoPath, init) {
  let lastErr = null;
  for (const g of GATEWAYS) {
    try {
      const resp = await fetch(`${g}/${repoPath}`, init);
      if (resp.ok) return resp;
      lastErr = new Error(`HTTP ${resp.status} from ${g}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("All download gateways failed");
}
function sherpaAvailable() {
  try {
    return !!sherpa?.createOfflineRecognizer && !!sherpa?.version;
  } catch {
    return false;
  }
}
function modelDir(def) {
  return import_path.default.join(MODELS_DIR, def.id.replace("sherpa-onnx:", ""));
}
function modelDownloaded(id) {
  const def = SHERPA_MODELS[id];
  if (!def) return false;
  const dir = modelDir(def);
  return def.files.every((f) => {
    try {
      return import_fs.default.statSync(import_path.default.join(dir, f)).size > 0;
    } catch {
      return false;
    }
  });
}
function totalModelBytes(def) {
  const dir = modelDir(def);
  let total = 0;
  for (const f of def.files) {
    try {
      total += import_fs.default.statSync(import_path.default.join(dir, f)).size;
    } catch {
    }
  }
  return total;
}
var downloads = /* @__PURE__ */ new Map();
function getDownloadProgress(id) {
  return downloads.get(id) || null;
}
async function startModelDownload(id) {
  const def = SHERPA_MODELS[id];
  if (!def) return { ok: false, error: "Unknown model" };
  if (modelDownloaded(id)) {
    downloads.set(id, { done: totalModelBytes(def), total: totalModelBytes(def), status: "done" });
    return { ok: true };
  }
  if (downloads.get(id)?.status === "downloading") return { ok: true };
  const dir = modelDir(def);
  import_fs.default.mkdirSync(dir, { recursive: true });
  downloads.set(id, { done: 0, total: 0, status: "downloading" });
  let total = 0;
  try {
    for (const f of def.files) {
      const head = await gatewayFetch(`${def.repo}/resolve/main/${f}`, { method: "HEAD" });
      const sz = Number(head.headers.get("x-linked-size") || head.headers.get("content-length") || 0);
      total += sz;
    }
  } catch {
  }
  downloads.set(id, { done: 0, total, status: "downloading" });
  try {
    for (const f of def.files) {
      const dest = import_path.default.join(dir, f);
      if (import_fs.default.existsSync(dest) && import_fs.default.statSync(dest).size > 0) continue;
      let ok = false;
      let attempts = 0;
      while (!ok && attempts < GATEWAYS.length * 3) {
        attempts++;
        try {
          const resp = await gatewayFetch(`${def.repo}/resolve/main/${f}`);
          if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
          const fileSize = Number(resp.headers.get("x-linked-size") || resp.headers.get("content-length") || 0);
          const out = import_fs.default.createWriteStream(dest + ".part");
          let received = 0;
          const completedBefore = downloads.get(id).done;
          const reader = resp.body.getReader();
          for (; ; ) {
            const { done, value } = await reader.read();
            if (done) break;
            out.write(Buffer.from(value));
            received += value.byteLength;
            downloads.set(id, {
              ...downloads.get(id),
              done: completedBefore + received,
              status: "downloading"
            });
          }
          out.end();
          await new Promise((resolve, reject) => {
            out.on("finish", () => resolve());
            out.on("error", reject);
          });
          if (fileSize && received < fileSize * 0.99) throw new Error(`short download ${received}/${fileSize}`);
          import_fs.default.renameSync(dest + ".part", dest);
          ok = true;
        } catch (err) {
          import_fs.default.rmSync(dest + ".part", { force: true });
          if (attempts >= GATEWAYS.length * 3) throw err;
        }
      }
    }
    downloads.set(id, { done: totalModelBytes(def), total, status: "done" });
    return { ok: true };
  } catch (err) {
    downloads.set(id, { done: 0, total, status: "error", error: err.message });
    return { ok: false, error: err.message };
  }
}
var sessions = /* @__PURE__ */ new Map();
var sessionSeq = 0;
function cleanupSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastTouch > 10 * 60 * 1e3) {
      try {
        s.stream?.free();
      } catch {
      }
      try {
        s.recognizer?.free();
      } catch {
      }
      sessions.delete(id);
    }
  }
}
setInterval(cleanupSessions, 5 * 60 * 1e3).unref?.();
function buildRecognizer(def, lang) {
  const dir = modelDir(def);
  const base = (f) => import_path.default.join(dir, f);
  if (def.kind === "offline-canary") {
    const recognizer2 = sherpa.createOfflineRecognizer({
      modelConfig: {
        canary: {
          encoder: base("encoder.int8.onnx"),
          decoder: base("decoder.int8.onnx"),
          srcLang: lang,
          tgtLang: lang,
          usePnc: 1
        },
        debug: 0,
        tokens: base("tokens.txt")
      }
    });
    return { recognizer: recognizer2, stream: recognizer2.createStream() };
  }
  const recognizer = sherpa.createOnlineRecognizer({
    featConfig: { sampleRate: 16e3, featureDim: 80 },
    modelConfig: {
      transducer: {
        encoder: base("encoder.int8.onnx"),
        decoder: base("decoder.int8.onnx"),
        joiner: base("joiner.int8.onnx")
      },
      tokens: base("tokens.txt"),
      numThreads: 1,
      provider: "cpu",
      debug: 0,
      modelType: def.modelType,
      modelingUnit: "",
      bpeVocab: ""
    },
    decodingMethod: "greedy_search",
    maxActivePaths: 4,
    enableEndpoint: 0,
    rule1MinTrailingSilence: 2.4,
    rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 20,
    hotwordsFile: "",
    hotwordsScore: 1.5,
    ctcFstDecoderConfig: { graph: "", maxActive: 3e3 },
    ruleFsts: "",
    ruleFars: ""
  });
  return { recognizer, stream: recognizer.createStream() };
}
function pickLang(def, requested) {
  const base = (requested || "en").split("-")[0].toLowerCase();
  if (def.langs.includes(base)) return base;
  if (def.langs.includes("en")) return "en";
  return def.langs[0] || "en";
}
function startSession(id, requestedLang) {
  const def = SHERPA_MODELS[id];
  const lang = pickLang(def, requestedLang);
  const sessionId = `s${Date.now()}-${sessionSeq++}`;
  const { recognizer, stream } = buildRecognizer(def, lang);
  sessions.set(sessionId, {
    id: sessionId,
    def,
    lang,
    audioChunks: [],
    audioBytes: 0,
    recognizer,
    stream,
    lastTouch: Date.now()
  });
  return { sessionId, lang, fallback: lang !== (requestedLang || "en").split("-")[0].toLowerCase() && !!requestedLang };
}
function sessionExists(sessionId) {
  return sessions.has(sessionId);
}
function endSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return;
  try {
    s.stream?.free();
  } catch {
  }
  try {
    s.recognizer?.free();
  } catch {
  }
  sessions.delete(sessionId);
}
function feedAudio(sessionId, samples) {
  const s = sessions.get(sessionId);
  if (!s) return { text: "", error: "Unknown session" };
  s.lastTouch = Date.now();
  try {
    if (s.def.kind === "offline-canary") {
      s.audioChunks.push(samples);
      s.audioBytes += samples.byteLength;
      const total = s.audioChunks.reduce((n, c) => n + c.length, 0);
      const audio = new Float32Array(total);
      let off = 0;
      for (const c of s.audioChunks) {
        audio.set(c, off);
        off += c.length;
      }
      s.stream.acceptWaveform(16e3, audio);
      s.recognizer.decode(s.stream);
      const text = s.recognizer.getResult(s.stream).text;
      s.stream.free();
      s.stream = s.recognizer.createStream();
      return { text };
    }
    s.stream.acceptWaveform(16e3, samples);
    s.recognizer.decode(s.stream);
    return { text: s.recognizer.getResult(s.stream).text };
  } catch (err) {
    return { text: "", error: err.message };
  }
}
function finalizeSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return { text: "", error: "Unknown session" };
  s.lastTouch = Date.now();
  try {
    let text = "";
    if (s.def.kind === "offline-canary") {
      if (s.audioChunks.length) {
        const total = s.audioChunks.reduce((n, c) => n + c.length, 0);
        const audio = new Float32Array(total);
        let off = 0;
        for (const c of s.audioChunks) {
          audio.set(c, off);
          off += c.length;
        }
        s.audioChunks = [];
        s.audioBytes = 0;
        s.stream.acceptWaveform(16e3, audio);
        s.recognizer.decode(s.stream);
        text = s.recognizer.getResult(s.stream).text;
        s.stream.free();
        s.stream = s.recognizer.createStream();
      }
    } else {
      text = s.recognizer.getResult(s.stream).text;
      s.stream.free();
      s.stream = s.recognizer.createStream();
    }
    return { text };
  } catch (err) {
    return { text: "", error: err.message };
  }
}
function sherpaStatus() {
  return {
    available: sherpaAvailable(),
    version: sherpaAvailable() ? sherpa.version : null,
    models: Object.values(SHERPA_MODELS).map((def) => ({
      id: def.id,
      label: def.label,
      kind: def.kind,
      langs: def.langs,
      downloaded: modelDownloaded(def.id)
    }))
  };
}
async function handleDownload(req, res) {
  const { model } = req.body || {};
  if (!SHERPA_MODELS[model]) {
    res.status(400).json({ error: "Unknown model" });
    return;
  }
  const result = await startModelDownload(model);
  res.json(result);
}
function handleProgress(req, res) {
  const { model } = req.query;
  res.json(getDownloadProgress(String(model)));
}
function handleSession(req, res) {
  try {
    const { action } = req.query;
    const model = String(req.query.model || "");
    const lang = String(req.query.lang || "en");
    const sessionId = String(req.query.sessionId || "");
    if (action === "start") {
      if (!SHERPA_MODELS[model]) {
        res.status(400).json({ error: "Unknown model" });
        return;
      }
      if (!modelDownloaded(model)) {
        res.status(409).json({ error: "Model not downloaded" });
        return;
      }
      const info = startSession(model, lang);
      res.json({ ok: true, ...info });
      return;
    }
    if (action === "finalize") {
      if (!sessionExists(sessionId)) {
        res.status(404).json({ error: "Unknown session" });
        return;
      }
      res.json({ ok: true, ...finalizeSession(sessionId) });
      return;
    }
    if (action === "cancel") {
      endSession(sessionId);
      res.json({ ok: true });
      return;
    }
    if (action === "audio") {
      if (!sessionExists(sessionId)) {
        res.status(404).json({ error: "Unknown session" });
        return;
      }
      const body = req.body;
      if (!body || body.byteLength < 4 || body.byteLength % 4 !== 0) {
        res.status(400).json({ error: "Expected raw Float32 PCM body" });
        return;
      }
      const samples = new Float32Array(body.buffer, body.byteOffset, body.byteLength / 4);
      const result = feedAudio(sessionId, samples);
      if (result.error) {
        res.status(500).json({ error: result.error });
        return;
      }
      res.json({ ok: true, text: result.text });
      return;
    }
    res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/sherpa/status", (_req, res) => {
    res.json(sherpaStatus());
  });
  app.post("/api/sherpa/download", import_express.default.json({ limit: "1mb" }), async (req, res) => {
    try {
      await handleDownload(req, res);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/sherpa/progress", (req, res) => {
    handleProgress(req, res);
  });
  app.post(
    "/api/sherpa/session",
    import_express.default.raw({ type: () => true, limit: "64mb" }),
    (req, res) => {
      handleSession(req, res);
    }
  );
  app.get("/api/translate", async (req, res) => {
    const { sl, tl, q, api = "auto" } = req.query;
    const text = String(q);
    const fetchDirect = async () => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Direct API failed");
      return await response.json();
    };
    const fetchLingva = async () => {
      const url = `https://lingva.ml/api/v1/${sl}/${tl}/${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Lingva API failed");
      const d = await response.json();
      return { translation: d.translation };
    };
    try {
      if (api === "direct") {
        res.json(await fetchDirect());
        return;
      } else if (api === "lingva") {
        res.json(await fetchLingva());
        return;
      }
      try {
        res.json(await fetchDirect());
      } catch {
        try {
          res.json(await fetchLingva());
        } catch {
          res.status(500).json({ error: "All backend translation APIs failed" });
        }
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch translation" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const possiblePaths = [
      import_path2.default.join(process.cwd(), "dist"),
      __dirname,
      process.cwd()
    ];
    let distPath = possiblePaths[0];
    for (const p of possiblePaths) {
      if (import_fs2.default.existsSync(import_path2.default.join(p, "index.html")) && import_fs2.default.existsSync(import_path2.default.join(p, "assets"))) {
        distPath = p;
        break;
      }
    }
    console.log(`[Prod] Serving static files from: ${distPath}`);
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
