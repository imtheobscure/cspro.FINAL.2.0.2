import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lang, Theme } from '../data/types';
import { useStore } from '../lib/store';
import { ACTIVITY_LABELS, basePlan, type LessonPlan as Plan } from '../lib/lessons';
import { speak } from '../lib/audio';
import { Btn, Icon, SpeakBtn } from './ui';
import { cn } from '../utils/cn';

/**
 * THE LESSON PLAN SCREEN.
 *
 * A plan is a list of timed steps that name the activity they need. This screen
 * turns that list into something a tutor can actually run: every step is a card
 * with the words to say (and a 🔊 button), the questions to ask, a tip for the
 * adult, and a button that OPENS the real activity in the app. “Focus mode”
 * shows one step at a time at full size for screen sharing, and keeps a
 * countdown of the words the step uses so nothing has to be looked up mid-lesson.
 */
export function LessonPlanView({ theme, onGo }: { theme: Theme; onGo: (activity: string) => void }) {
  const { settings, lessonPlans } = useStore();
  const lang = settings.learn;
  const plans = useMemo<Plan[]>(() => {
    const custom = lessonPlans.filter((p) => p.theme === theme.id);
    return [...custom, basePlan(theme, lang)];
  }, [lessonPlans, theme, lang]);

  const [planId, setPlanId] = useState<string | null>(null);
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const [focus, setFocus] = useState(false);
  const [step, setStep] = useState(0);
  const current = plan.steps[Math.min(step, plan.steps.length - 1)];
  const words = useMemo(
    () => plan.words.map((id) => theme.words.find((w) => w.id === id)).filter(Boolean).slice(0, 12),
    [plan, theme],
  );

  const chooseActivity = (activity: string) => {
    setFocus(false);
    onGo(activity);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[2rem] border-4 border-indigo-100 shadow-[0_8px_0_#e2e8f0] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-2xl font-black text-slate-800">📋 {plan.title}</div>
          <span className="text-lg font-bold text-indigo-600 bg-indigo-50 rounded-full px-4 py-1">{plan.minutes} min</span>
          <span className="text-lg font-bold text-slate-500">{plan.steps.length} steps</span>
          {plan.builtin ? (
            <span className="text-sm font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 rounded-full px-3 py-1">Written by the app</span>
          ) : (
            <span className="text-sm font-black uppercase tracking-wide text-violet-700 bg-violet-50 rounded-full px-3 py-1">Pasted from an AI</span>
          )}
          <div className="ml-auto flex gap-2 flex-wrap">
            <Btn tone={focus ? 'primary' : 'soft'} onClick={() => { setStep(0); setFocus((f) => !f); }}>
              {focus ? '📋 Full plan' : '▶ Focus mode'}
            </Btn>
            <Btn tone="ghost" onClick={() => onGo('dictionary')}>📚 Open the dictionary</Btn>
          </div>
        </div>
        <p className="text-xl text-slate-600 font-semibold">{plan.goal}</p>
        {plans.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPlanId(p.id); setStep(0); }}
                className={cn('px-4 py-2 rounded-2xl text-lg font-black border-4', p.id === plan.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-100 hover:border-indigo-300')}
              >
                {p.custom ? '🤖 ' : '🧭 '}{p.title}
              </button>
            ))}
          </div>
        )}
        {words.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-lg font-black text-slate-500">Words in this lesson:</span>
            {words.map((w) => w && (
              <button key={w.id} onClick={() => speak(w.t[lang], lang)} className="flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 rounded-full px-3 py-1 text-lg font-bold text-slate-700">
                <span className="text-xl">{w.icon}</span>{w.t[lang]}
              </button>
            ))}
          </div>
        )}
      </div>

      {focus ? (
        <FocusCard
          plan={plan}
          step={step}
          setStep={setStep}
          lang={lang}
          current={current}
          onGo={chooseActivity}
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {plan.steps.map((s, i) => {
            const meta = ACTIVITY_LABELS[s.activity] ?? { label: s.activity, icon: '🎯' };
            return (
              <motion.div
                key={`${s.title}-${i}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.04 }}
                className="bg-white rounded-[2rem] border-4 border-slate-100 shadow-[0_8px_0_#e2e8f0] p-6 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-10 h-10 rounded-full bg-indigo-600 text-white grid place-items-center text-xl font-black">{i + 1}</span>
                  <div className="text-2xl font-black text-slate-800">{s.title}</div>
                  {s.minutes ? <span className="text-lg font-bold text-slate-500">{s.minutes} min</span> : null}
                </div>
                <button onClick={() => chooseActivity(s.activity)} className="self-start flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-2xl px-4 py-2 text-lg font-black">
                  <span className="text-2xl">{meta.icon}</span>Go to {meta.label} →
                </button>
                <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                  <SpeakBtn text={s.say} lang={lang} size="md" />
                  <p className="text-xl font-bold text-slate-800 leading-snug">“{s.say}”</p>
                </div>
                {s.ask && s.ask.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {s.ask.map((q, k) => (
                      <li key={k} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2">
                        <SpeakBtn text={q} lang="en" size="sm" />
                        <span className="text-lg font-bold text-slate-700 flex-1">{q}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.tutor && <p className="text-base font-semibold text-slate-500">💡 {s.tutor}</p>}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FocusCard({ plan, step, setStep, lang, current, onGo }: {
  plan: Plan;
  step: number;
  setStep: (n: number) => void;
  lang: Lang;
  current: Plan['steps'][number] | undefined;
  onGo: (activity: string) => void;
}) {
  if (!current) return null;
  const meta = ACTIVITY_LABELS[current.activity] ?? { label: current.activity, icon: '🎯' };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        {plan.steps.map((s, i) => (
          <button
            key={`${s.title}-${i}`}
            onClick={() => setStep(i)}
            aria-label={`Step ${i + 1}: ${s.title}`}
            className={cn('w-12 h-12 rounded-full text-xl font-black border-4', i === step ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200')}
          >
            {i + 1}
          </button>
        ))}
        <span className="text-lg font-bold text-slate-500">Step {step + 1} of {plan.steps.length}</span>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] border-4 border-indigo-100 shadow-[0_10px_0_#c7d2fe] p-8 flex flex-col items-center gap-6 text-center"
      >
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Icon icon={meta.icon} size={96} />
          <div className="text-4xl md:text-5xl font-black text-slate-800">{current.title}</div>
          {current.minutes ? <span className="text-2xl font-bold text-indigo-600 bg-indigo-50 rounded-full px-4 py-1">{current.minutes} min</span> : null}
        </div>
        <p className="text-3xl md:text-4xl font-black text-slate-800 leading-snug max-w-4xl">“{current.say}”</p>
        <SpeakBtn text={current.say} lang={lang} size="lg" />
        {current.ask && current.ask.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-w-3xl">
            {current.ask.map((q, i) => (
              <div key={i} className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
                <SpeakBtn text={q} lang="en" size="sm" />
                <span className="text-2xl font-bold text-slate-800 text-left flex-1">{q}</span>
              </div>
            ))}
          </div>
        )}
        <Btn size="xl" tone="accent" onClick={() => onGo(current.activity)}>{meta.icon} Open {meta.label}</Btn>
        {current.tutor && <p className="text-xl font-semibold text-slate-500 max-w-3xl">💡 {current.tutor}</p>}
      </motion.div>

      <div className="flex gap-4 justify-between">
        <Btn size="xl" tone="soft" onClick={() => setStep(Math.max(0, step - 1))}>← Previous step</Btn>
        {step < plan.steps.length - 1 ? (
          <Btn size="xl" onClick={() => setStep(step + 1)}>Next step →</Btn>
        ) : (
          <Btn size="xl" tone="success" onClick={() => onGo('chant')}>🎉 Finish with the chant</Btn>
        )}
      </div>
    </div>
  );
}
