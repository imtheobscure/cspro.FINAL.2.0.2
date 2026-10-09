import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Field, Select, Textarea, Pill } from "./ui";
import { useStore } from "../store/useStore";
import { plainText } from "../utils/annotations";
import {
  Play, Square, Mic, Volume2, Music, Download, RefreshCw, Filter, Upload,
} from "lucide-react";

export const PodcastMaker: React.FC = () => {
  const { lesson, studentRoster, learner } = useStore();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [filterNatural, setFilterNatural] = useState(true);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [introMusic, setIntroMusic] = useState<File | null>(null);
  const [outroMusic, setOutroMusic] = useState<File | null>(null);
  const [muteDuringRecord, setMuteDuringRecord] = useState(false);
  const [plainTextPreview, setPlainTextPreview] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Load voices
  useEffect(() => {
    function loadVoices() {
      const v = speechSynthesis.getVoices();
      setVoices(v);
      // Auto-select first natural Microsoft voice or first English voice
      if (!selectedVoice && v.length > 0) {
        const natural = v.find((voice) =>
          /natural|microsoft/i.test(voice.name) && voice.lang.startsWith("en"),
        );
        const english = v.find((voice) => voice.lang.startsWith("en"));
        const chosen = natural || english || v[0];
        setSelectedVoice(chosen.name);
      }
    }
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, [selectedVoice]);

  // Generate plain text from lesson
  useEffect(() => {
    if (!lesson) return;
    const studentName = (studentRoster[0] || learner.name || "").trim() || undefined;
    const allText = lesson.sections
      .flatMap((s) => [
        `[${s.title}]`,
        ...s.sentences.map((sn) => plainText(sn.text, studentName)),
      ])
      .join("\n\n");
    setPlainTextPreview(allText);
  }, [lesson, studentRoster, learner]);

  // Filtered voices
  const filteredVoices = voices.filter((v) => {
    const name = v.name.toLowerCase();
    if (filterNatural && !(/natural|microsoft|google|samantha/i.test(name))) return false;
    return v.lang.startsWith("en");
  });

  // Play/stop preview
  function togglePlay() {
    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(plainTextPreview);
    const voice = voices.find((v) => v.name === selectedVoice);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
    speechSynthesis.speak(u);
    setIsPlaying(true);
  }

  // Record with screen share + system audio
  async function startRecording() {
    setRecordingStatus("Select a tab or screen to share (with audio)...");
    try {
      // Request display + system audio capture
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      } as any);

      streamRef.current = displayStream;

      // Optionally include mic (if not muted)
      let micStream: MediaStream | null = null;
      if (!muteDuringRecord) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          // Mic denied or not available — continue without
        }
      }

      // Combine streams via AudioContext
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      // Add system audio tracks
      displayStream.getAudioTracks().forEach((track) => {
        const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
        src.connect(dest);
      });

      // Add mic tracks if not muted
      if (micStream) {
        micStream.getAudioTracks().forEach((track) => {
          const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
          src.connect(dest);
        });
      }

      // Set up media recorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(dest.stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // Clean up
        displayStream.getTracks().forEach((t) => t.stop());
        if (micStream) micStream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        setRecordingStatus("");
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingStatus("Recording... Play the lesson audio now.");

      // Auto-start the speech
      setTimeout(() => {
        togglePlay();
      }, 500);

      // When speech ends, stop recording
      const u = new SpeechSynthesisUtterance(plainTextPreview);
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) u.voice = voice;
      u.rate = rate;
      u.pitch = pitch;
      u.onend = () => {
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, 1500); // Extra 1.5s to capture tail
      };
    } catch (e: any) {
      setRecordingStatus(`Error: ${e.message}`);
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    speechSynthesis.cancel();
    setIsPlaying(false);
  }

  function downloadAudio() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `podcast-${Date.now()}.webm`;
    a.click();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Volume2 className="h-4 w-4 text-blue-400" /> Voice selection
        </h2>
        <div className="mb-3 flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={filterNatural}
              onChange={(e) => setFilterNatural(e.target.checked)}
            />
            <Filter className="h-3 w-3" /> Show only natural voices (Microsoft/Google)
          </label>
        </div>
        <Field label="Voice">
          <Select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
            {filteredVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </Select>
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label={`Rate: ${rate.toFixed(2)}`}>
            <input type="range" min={0.5} max={1.5} step={0.05} value={rate}
              onChange={(e) => setRate(Number(e.target.value))} className="w-full" />
          </Field>
          <Field label={`Pitch: ${pitch.toFixed(2)}`}>
            <input type="range" min={0.5} max={1.5} step={0.05} value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))} className="w-full" />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="primary" onClick={togglePlay}>
            {isPlaying ? <><Square className="h-4 w-4" /> Stop</> : <><Play className="h-4 w-4" /> Preview</>}
          </Button>
          <Button variant="ghost" onClick={() => speechSynthesis.cancel()}>
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Music className="h-4 w-4 text-violet-400" /> Intro & Outro music
        </h2>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-xs hover:bg-white/5">
            <span className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" />
              {introMusic ? introMusic.name : "Upload intro music (MP3)"}
            </span>
            <input type="file" accept="audio/*" className="hidden"
              onChange={(e) => setIntroMusic(e.target.files?.[0] || null)} />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-xs hover:bg-white/5">
            <span className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" />
              {outroMusic ? outroMusic.name : "Upload outro music (MP3)"}
            </span>
            <input type="file" accept="audio/*" className="hidden"
              onChange={(e) => setOutroMusic(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-200">
          ℹ️ Music is mixed with the voice during recording. Use short clips (5-10 seconds).
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Mic className="h-4 w-4 text-rose-400" /> Record podcast
        </h2>
        {!lesson && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            Load a lesson first in the Compose tab to record.
          </div>
        )}
        {lesson && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={muteDuringRecord}
                  onChange={(e) => setMuteDuringRecord(e.target.checked)}
                />
                Mute my microphone (background-style recording)
              </label>
            </div>
            <div className="mb-3 flex gap-2">
              {!isRecording ? (
                <Button variant="primary" onClick={startRecording}>
                  <Mic className="h-4 w-4" /> Start recording
                </Button>
              ) : (
                <Button variant="danger" onClick={stopRecording}>
                  <Square className="h-4 w-4" /> Stop recording
                </Button>
              )}
              {audioUrl && (
                <Button variant="ghost" onClick={downloadAudio}>
                  <Download className="h-4 w-4" /> Download audio
                </Button>
              )}
            </div>
            {recordingStatus && (
              <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-xs text-blue-200">
                {recordingStatus}
              </div>
            )}
            {audioUrl && (
              <div className="mb-3">
                <Pill color="emerald">Recording complete</Pill>
                <audio controls src={audioUrl} className="mt-2 w-full" />
              </div>
            )}
            <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3 text-[11px] text-slate-400">
              <p className="mb-1 font-semibold text-slate-300">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click "Start recording" — your browser will ask to share a tab/screen (with audio)</li>
                <li>Select the current tab or any screen with audio</li>
                <li>The app automatically plays the lesson text using the selected voice</li>
                <li>The system audio is captured and recorded</li>
                <li>When the speech ends, recording stops automatically (or click Stop)</li>
                <li>Download the audio file</li>
              </ol>
              <p className="mt-2 text-amber-300">⚠️ Note: Downloaded audio is in WebM format. Use a converter (e.g. cloudconvert.com) to convert to MP3 if needed.</p>
            </div>
          </>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          Plain text preview
        </h2>
        <Textarea
          rows={10}
          value={plainTextPreview}
          onChange={(e) => setPlainTextPreview(e.target.value)}
          className="font-mono text-[11px]"
        />
        <p className="mt-2 text-[11px] text-slate-500">
          Edit the text to customize what will be read. Annotations (emojis, //, *, IPA) have been stripped.
        </p>
      </Card>
    </div>
  );
};
