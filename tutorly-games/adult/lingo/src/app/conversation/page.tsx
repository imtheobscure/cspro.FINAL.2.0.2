"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageShell, SectionTitle, ContentStatus, EmptyPackNotice } from "@/components/ui";
import { useContent } from "@/lib/content-provider";
import { useStore } from "@/lib/store";
import { playClick } from "@/lib/audio";
import { AZURE_VOICES, assignVoices, speakLine, stopSpeaking, useVoiceConfig, voicesForLanguage, type Voice } from "@/lib/tts";
import { refAnchor, useFocusScroll } from "@/lib/ref-link";
import { RaceQuiz } from "@/components/RaceQuiz";
import { buildOrderRace, buildReplyRace } from "@/lib/race";
import type { Conversation } from "@/content/tutolingo";

const CAST_KEY = "tutolingo-voice-cast-v1";

/** Characters in a dialogue, in speaking order (some files only use "A"/"B"). */
function castOf(conversation: Conversation): string[] {
  const names: string[] = [];
  for (const turn of conversation.turns) {
    const key = turn.name?.trim() || (turn.speaker ? `Speaker ${turn.speaker}` : "Speaker");
    if (!names.includes(key)) names.push(key);
  }
  return names;
}

export function DialoguesView({ focus }: { focus?: string } = {}) {
  const { pack, loading } = useContent();
  const { addXp } = useStore();
  const [cfg] = useVoiceConfig();
  const [selected, setSelected] = useState(0);
  const [rolePlay, setRolePlay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  /** Read & role play, or race the clock. */
  const [tab, setTab] = useState<"read" | "race">("read");
  const [raceKind, setRaceKind] = useState<"reply" | "order">("reply");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CAST_KEY);
      if (raw) setOverrides(JSON.parse(raw) as Record<string, string>);
    } catch {
      /* ignore */
    }
  }, []);

  // A deep link from a lesson selects the dialogue it came from (or scrolls to
  // the sentence it practised, further down the page).
  const focusConvo = useMemo(
    () => (focus ? pack.conversations.findIndex((c) => c.title.trim().toLowerCase() === focus.trim().toLowerCase()) : -1),
    [focus, pack.conversations],
  );
  useEffect(() => {
    if (focusConvo >= 0) {
      setSelected(focusConvo);
      setTab("read");
    }
  }, [focusConvo]);
  useFocusScroll(focus, !loading && pack.conversations.length > 0, 460);

  const conversation: Conversation | undefined = pack.conversations[selected];
  const cast = useMemo(() => (conversation ? castOf(conversation) : []), [conversation]);

  /** Two timed games: reply to what was just said, or rebuild the exchange. */
  const replyQuestions = useMemo(() => buildReplyRace(pack), [pack]);
  const orderQuestions = useMemo(() => buildOrderRace(pack), [pack]);

  /** One unique natural voice per character, overridable from the cast panel. */
  const voices = useMemo(() => {
    const assigned = assignVoices(cast, pack.meta.targetLanguage);
    const out: Record<string, Voice> = {};
    for (const name of cast) {
      const override = overrides[name];
      out[name] = (override && AZURE_VOICES.find((v) => v.id === override)) || assigned[name];
    }
    return out;
  }, [cast, overrides, pack.meta.targetLanguage]);

  function speakerOf(turn: Conversation["turns"][number]): string {
    return turn.name?.trim() || (turn.speaker ? `Speaker ${turn.speaker}` : "Speaker");
  }

  async function play(turns: Conversation["turns"], from = 0) {
    setPlaying(true);
    for (let i = from; i < turns.length; i++) {
      if (!playingRef.current) break;
      const turn = turns[i];
      await speakLine(turn.target, { speaker: speakerOf(turn), voice: voices[speakerOf(turn)], language: pack.meta.targetLanguage });
    }
    setPlaying(false);
  }

  // A ref keeps the “stop” button able to interrupt the loop above.
  const playingRef = React.useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  function stop() {
    setPlaying(false);
    stopSpeaking();
  }

  function setCastVoice(name: string, voiceId: string) {
    const next = { ...overrides, [name]: voiceId };
    setOverrides(next);
    try {
      localStorage.setItem(CAST_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <ContentStatus />
      <SectionTitle
        icon="💬"
        title="Dialogue reference"
        sub={`${pack.conversations.length} dialogues from your course material${pack.meta.l1Name ? ` · explanations in ${pack.meta.l1Name}` : ""}`}
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setTab("read")}
          className={`rounded-full px-4 py-1.5 text-xs font-black ${tab === "read" ? "bg-[#1CB0F6] text-white" : "bg-slate-100 text-slate-500"}`}
        >
          📖 Read &amp; role play
        </button>
        <button
          onClick={() => {
            stop();
            setRolePlay(false);
            setTab("race");
          }}
          className={`rounded-full px-4 py-1.5 text-xs font-black ${tab === "race" ? "bg-[#FF9600] text-white" : "bg-slate-100 text-slate-500"}`}
        >
          ⏱️ Race against time
        </button>
      </div>

      {!pack.conversations.length && <EmptyPackNotice feature="conversation" />}

      {tab === "race" && (
        <div className="mb-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button
              onClick={() => setRaceKind("reply")}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${raceKind === "reply" ? "bg-[#FF9600] text-white" : "bg-slate-100 text-slate-500"}`}
            >
              💬 Choose the best reply
            </button>
            <button
              onClick={() => setRaceKind("order")}
              className={`rounded-full px-3 py-1.5 text-xs font-black ${raceKind === "order" ? "bg-[#FF9600] text-white" : "bg-slate-100 text-slate-500"}`}
            >
              🔀 Reorder the conversation
            </button>
          </div>
          <RaceQuiz
            key={raceKind}
            questions={raceKind === "reply" ? replyQuestions : orderQuestions}
            storageKey={`dialogues-${raceKind}`}
            title={raceKind === "reply" ? "Best-reply race" : "Reorder race"}
            blurb={
              raceKind === "reply"
                ? "You are given what was just said and have to answer it — every wrong option is a real line from another dialogue, so only understanding wins."
                : "Four lines of a real conversation arrive shuffled. Put them back in order before the clock runs out."
            }
            accent="#FF9600"
            seconds={raceKind === "reply" ? 12 : 20}
          />
        </div>
      )}

      {tab === "read" && !!pack.conversations.length && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
          {pack.conversations.map((c, i) => (
            <button
              key={String(c.id ?? i)}
              onClick={() => {
                stop();
                setSelected(i);
                setRolePlay(false);
                playClick();
              }}
              data-ref={c.title}
              className={`shrink-0 rounded-2xl border-2 px-3 py-2 text-xs font-black ${i === selected ? "border-[#1CB0F6] bg-[#DDF4FF] text-[#1899D6]" : "border-slate-200 bg-white text-slate-500"}`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {tab === "read" && conversation && (
        <div
          id={conversation.title ? refAnchor("dialogues", conversation.title) : undefined}
          className="card-light scroll-mt-24 rounded-3xl border-2 border-slate-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-black text-slate-800">{conversation.title}</h2>
              {conversation.setting && <p className="text-xs text-slate-400">{conversation.setting}</p>}
              {conversation.goal && <p className="mt-1 text-xs font-bold text-slate-500">🎯 {conversation.goal}</p>}
              {conversation.nativeSummary && <p className="mt-1 text-xs text-slate-400">{conversation.nativeSummary}</p>}
            </div>
            {conversation.level && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600">{conversation.level}</span>
            )}
          </div>

          {/* Cast: every character speaks with their own natural voice */}
          {cast.length > 0 && !rolePlay && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-600">🎙️ Cast — one voice per character</p>
                <span className="text-[10px] font-bold text-slate-400">{cfg.azure ? "Microsoft natural voices" : "browser voices"}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {cast.map((name) => (
                  <label key={name} className="flex items-center gap-2 rounded-xl bg-white p-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#E9FBD1] text-xs font-black text-[#4b9417]">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate text-xs font-black text-slate-600">{name}</span>
                    <select
                      value={voices[name]?.id ?? ""}
                      onChange={(e) => setCastVoice(name, e.target.value)}
                      className="max-w-[46%] rounded-lg border-2 border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold outline-none focus:border-[#58CC02]"
                    >
                      {voicesForLanguage(pack.meta.targetLanguage).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} · {v.locale}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!rolePlay ? (
            <>
              <div className="mt-3 space-y-2.5">
                {conversation.turns.map((turn, i) => {
                  const name = speakerOf(turn);
                  const isA = (turn.speaker ?? "A").toUpperCase() === "A";
                  return (
                    <div key={`${turn.target}-${i}`} className={`flex ${isA ? "justify-start" : "justify-end"}`}>
                      {/* Anchored so a lesson that practised this exact line can link straight to it. */}
                      <div
                        id={refAnchor("dialogues", turn.target)}
                        data-ref={turn.target}
                        className={`card-light max-w-[85%] scroll-mt-24 rounded-2xl p-3 ${isA ? "rounded-tr-sm bg-blue-50" : "rounded-tl-sm bg-green-50"}`}
                      >
                        <p className="text-[10px] font-black text-slate-400">
                          {name}
                          <span className="ml-1 font-bold text-slate-300">· {voices[name]?.label}</span>
                        </p>
                        <p className="font-latin text-sm font-bold text-slate-800">{turn.target}</p>
                        {turn.native && <p className="mt-0.5 text-xs text-slate-400">{turn.native}</p>}
                        <button
                          onClick={() => void speakLine(turn.target, { speaker: name, voice: voices[name], language: pack.meta.targetLanguage })}
                          className="mt-1 text-xs font-black text-blue-500"
                        >
                          🔊 Play
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!!conversation.keyPhrases?.length && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-600">🔑 Key phrases</p>
                  <div className="mt-2 space-y-1">
                    {conversation.keyPhrases.map((p, i) => (
                      <p key={`${p.target}-${i}`} className="text-sm">
                        <span className="font-latin font-bold text-slate-800">{p.target}</span>
                        {p.native && <span className="text-slate-400"> — {p.native}</span>}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {playing ? (
                  <button onClick={stop} className="btn-3d rounded-2xl border-slate-300 bg-white py-3 text-sm font-black text-slate-500">
                    ⏹ Stop playback
                  </button>
                ) : (
                  <button
                    onClick={() => void play(conversation.turns)}
                    className="btn-3d rounded-2xl border-[#1899D6] bg-[#1CB0F6] py-3 text-sm font-black text-white"
                  >
                    🔊 Play the whole dialogue
                  </button>
                )}
                <button
                  onClick={() => {
                    setRolePlay(true);
                    addXp(0);
                  }}
                  className="btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] py-3 text-sm font-black text-white"
                >
                  🎭 Role play (you are speaker B)
                </button>
              </div>

              {!cfg.azure && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Natural Azure voices are switched off — the dialogue is using your browser&apos;s voices. Turn them on in{" "}
                  <b>Profile → Voice</b>.
                </p>
              )}
            </>
          ) : (
            <RolePlay
              conversation={conversation}
              voices={voices}
              speakerOf={speakerOf}
              language={pack.meta.targetLanguage}
              onDone={() => {
                setRolePlay(false);
                addXp(15);
              }}
            />
          )}
        </div>
      )}

      {/* Every remaining sentence in the pack — the raw material the listening,
          typing and word-order exercises are built from. */}
      {tab === "read" && pack.sentences.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 font-black text-slate-800">🔤 Sentences &amp; phrases</h2>
          <p className="mb-2 text-xs text-slate-400">
            {pack.sentences.length.toLocaleString("en-US")} sentences from your course material — the same lines the
            listening, typing and word-order exercises use.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {pack.sentences.map((s, i) => (
              <div
                key={String(s.id ?? i)}
                id={refAnchor("dialogues", s.target)}
                data-ref={s.target}
                className="card-light scroll-mt-24 rounded-2xl border-2 border-slate-200 bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => void speakLine(s.target, { speaker: "Narrator", language: pack.meta.targetLanguage })}
                    className="shrink-0 rounded-xl bg-blue-50 px-2.5 py-1.5 text-sm"
                    aria-label="Play sentence"
                  >
                    🔊
                  </button>
                  <div className="min-w-0">
                    <p className="font-latin text-sm font-bold text-slate-800">{s.target}</p>
                    {s.native && <p className="mt-0.5 text-xs text-slate-400">{s.native}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function RolePlay({
  conversation,
  voices,
  speakerOf,
  language,
  onDone,
}: {
  conversation: Conversation;
  voices: Record<string, Voice>;
  speakerOf: (turn: Conversation["turns"][number]) => string;
  language?: string;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const turn = conversation.turns[idx];
  const isUser = (turn?.speaker ?? "A").toUpperCase() !== "A";

  if (!turn) {
    return (
      <div className="mt-3 text-center">
        <p className="font-black text-slate-700">Dialogue complete 🎉</p>
        <button onClick={onDone} className="btn-3d mt-3 rounded-2xl border-[#46A302] bg-[#58CC02] px-6 py-3 text-sm font-black text-white">
          Back to the dialogue
        </button>
      </div>
    );
  }

  const name = speakerOf(turn);

  function next() {
    if (idx + 1 >= conversation.turns.length) onDone();
    else {
      setIdx(idx + 1);
      setShowAnswer(false);
    }
  }

  return (
    <div className="mt-3">
      <p className="text-center text-xs font-bold text-slate-400">
        Line {idx + 1} of {conversation.turns.length} · your role: {isUser ? "B 🟢" : "listening 👂"}
      </p>
      <div className="mx-auto mt-2 max-w-md rounded-3xl border-2 border-dashed border-purple-300 bg-purple-50 p-5 text-center">
        {isUser ? (
          <>
            <p className="text-sm font-black text-purple-600">🎤 Your turn! Say this:</p>
            {!showAnswer ? (
              <>
                {turn.native && <p className="mt-2 text-sm text-slate-500">{turn.native}</p>}
                <button onClick={() => setShowAnswer(true)} className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-black text-purple-500 shadow">
                  Show the sentence 👁
                </button>
              </>
            ) : (
              <>
                <p className="font-latin mt-2 text-lg font-black text-slate-800">{turn.target}</p>
                <button
                  onClick={() => void speakLine(turn.target, { speaker: name, voice: voices[name], language })}
                  className="mt-2 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-blue-500 shadow"
                >
                  🔊 Listen ({voices[name]?.label})
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-black text-blue-600">🤖 {name} says:</p>
            <p className="font-latin mt-2 text-lg font-black text-slate-800">{turn.target}</p>
            {turn.native && <p className="text-xs text-slate-400">{turn.native}</p>}
            <button
              onClick={() => void speakLine(turn.target, { speaker: name, voice: voices[name], language })}
              className="mt-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-blue-500 shadow"
            >
              🔊 Play ({voices[name]?.label})
            </button>
          </>
        )}
      </div>
      <button onClick={next} className="btn-3d mx-auto mt-3 block w-full max-w-md rounded-2xl border-[#46A302] bg-[#58CC02] py-3 text-sm font-black text-white">
        {idx + 1 >= conversation.turns.length ? "Finish role play 🎉" : "Next line →"}
      </button>
      <button onClick={onDone} className="mx-auto mt-1 block text-xs font-bold text-slate-400">
        Exit role play
      </button>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <PageShell>
      <DialoguesView />
    </PageShell>
  );
}
