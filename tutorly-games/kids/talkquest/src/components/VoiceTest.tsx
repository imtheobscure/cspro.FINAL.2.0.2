'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, RefreshCw, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { AudioManager } from '@/lib/audio';
import { LANG_LABEL, loadVoices, SPEECH_LANGS, voiceReport, type VoiceReport } from '@/lib/voices';

/**
 * 🎤 Voice test.
 *
 * The app reads lessons aloud with the device's own voices — on Edge those are
 * the same free Microsoft natural voices its Read aloud uses, child voices
 * included. This screen plays a real sentence in each language and says plainly
 * which voice it will use, because "kid voice" is a promise the app should be
 * able to keep or admit it cannot.
 */

const SAMPLE: Record<string, string> = {
  en: 'Hello! Let us learn English together.',
  zh: '你好！我们一起来学中文。',
  fr: 'Bonjour ! Apprenons le français ensemble.',
  it: 'Ciao! Impariamo l’italiano insieme.',
  de: 'Hallo! Lass uns zusammen Deutsch lernen.',
  tr: 'Merhaba! Birlikte Türkçe öğrenelim.',
  fa: 'سلام! بیایید با هم فارسی یاد بگیریم.',
};

export const VoiceTest: React.FC = () => {
  const [reports, setReports] = useState<VoiceReport[]>(() => SPEECH_LANGS.map(voiceReport));
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    void loadVoices().then(() => {
      setReports(SPEECH_LANGS.map(voiceReport));
      setLoading(false);
    });
  };

  useEffect(() => {
    // Chromium returns an empty list on the first call and fills it in a moment
    // later, so the honest answer needs this second look.
    refresh();
  }, []);

  const test = (lang: string) => {
    setPlaying(lang);
    AudioManager.speak(SAMPLE[lang], lang, () => setPlaying(null));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white rounded-3xl card-3d p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-300 flex items-center justify-center text-2xl">🎤</div>
            <div>
              <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'var(--font-display), Fredoka, sans-serif' }}>
                Read-aloud voice test
              </h1>
              <p className="text-sm font-bold text-slate-500">
                Every word and every story in this app can be read out loud. Test the voices here.
              </p>
            </div>
          </div>
          <button onClick={refresh}
            className="btn-3d flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-sm cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Re-check voices
          </button>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-sky-50 flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-700 mt-0.5 shrink-0" />
          <p className="text-xs font-bold text-slate-700">
            Best voices on Windows: open this app in <strong>Microsoft Edge</strong>. Its
            “Microsoft … Online (Natural)” voices are the same Azure voices Edge's own Read aloud uses — free, no
            account, child voices included. Chrome and Safari have fewer.
          </p>
        </div>
      </div>

      {reports.map(r => (
        <div key={r.code} className="bg-white rounded-3xl card-3d p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl">{FLAGS[r.code] ?? '🌍'}</span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-900">{LANG_LABEL[r.code as keyof typeof LANG_LABEL]}</p>
              <p className="text-xs font-bold text-slate-500">
                {r.count} voice{r.count === 1 ? '' : 's'} installed {r.chosen ? `· using ${r.chosen.name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.chosen ? (
                r.natural
                  ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                      <CheckCircle2 className="w-3 h-3" /> {r.child ? 'natural child voice' : 'natural voice'}
                    </span>
                  : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black">
                      <AlertTriangle className="w-3 h-3" /> basic system voice
                    </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black">
                  <AlertTriangle className="w-3 h-3" /> no voice installed
                </span>
              )}
              <button onClick={() => test(r.code)}
                className={`btn-3d flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs cursor-pointer ${
                  playing === r.code ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'
                }`}>
                <Volume2 className="w-3.5 h-3.5" /> {playing === r.code ? 'Speaking…' : 'Test'}
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm font-bold text-slate-600">{r.message}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">Sample: “{SAMPLE[r.code]}”</p>

          {r.alternates.length ? (
            <p className="mt-2 text-[11px] font-bold text-slate-400">
              Other voices found: {r.alternates.map(a => a.name).join(' · ')}
            </p>
          ) : null}
        </div>
      ))}

      <p className="text-center text-xs font-bold text-slate-500 pb-4">
        If a language has no voice, the app still shows the word on screen — read it out yourself. A real voice beats any robot.
      </p>
    </div>
  );
};

const FLAGS: Record<string, string> = {
  en: '🇬🇧', zh: '🇨🇳', fr: '🇫🇷', it: '🇮🇹', de: '🇩🇪', tr: '🇹🇷', fa: '🇮🇷',
};
