import { useAppStore } from '../store/appStore';
import { cn } from '../utils/cn';
import { mergeLiveText } from '../utils/subtitleContent';

/**
 * Live "currently speaking" line shown in the docked subtitle bar.
 *
 * The line ACCUMULATES for as long as someone keeps talking: the finalised words
 * waiting in the silence buffer, plus the partial fragment being recognised right
 * now, merged by `mergeLiveText`. Showing the interim fragment on its own is what
 * used to make this read one word at a time and reset on every new partial — which
 * left a tutor unable to follow a learner's sentence as it was spoken.
 *
 * The text WRAPS rather than truncates for the same reason: a single ellipsised line
 * hid the end of every sentence longer than the panel is wide.
 *
 * Both speakers are rendered when both have text, the active one first, so a quick
 * exchange doesn't hide whoever spoke a moment ago. Everything here clears when the
 * silence buffer flushes the words into the scrollback history below.
 */
export function CurrentlySpeakingLabel({ isDark }: { isDark?: boolean }) {
  const currentlySpeaking = useAppStore(s => s.currentlySpeaking);
  const interimTextTutor = useAppStore(s => s.interimTextTutor);
  const interimTextLearner = useAppStore(s => s.interimTextLearner);
  const pendingTextTutor = useAppStore(s => s.pendingTextTutor);
  const pendingTextLearner = useAppStore(s => s.pendingTextLearner);

  const tutorLine = mergeLiveText(pendingTextTutor, interimTextTutor);
  const learnerLine = mergeLiveText(pendingTextLearner, interimTextLearner);

  if (!tutorLine && !learnerLine) {
    return <div className={cn('text-sm italic py-1', isDark ? 'text-slate-600' : 'text-slate-400')}>Listening…</div>;
  }

  // Active speaker first; with nobody flagged active, whoever has text goes first.
  const tutorFirst = currentlySpeaking === 'tutor' || (!currentlySpeaking && !!tutorLine);
  const lines = tutorFirst
    ? [{ role: 'tutor' as const, text: tutorLine }, { role: 'learner' as const, text: learnerLine }]
    : [{ role: 'learner' as const, text: learnerLine }, { role: 'tutor' as const, text: tutorLine }];

  return (
    <div className="space-y-2">
      {lines.filter(l => l.text).map((l, index) => (
        <div key={l.role} className={index > 0 ? 'opacity-60' : undefined}>
          <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-0.5', l.role === 'tutor' ? 'text-indigo-500' : 'text-emerald-500')}>
            {l.role === 'tutor' ? 'Tutor' : 'Learner'}
          </div>
          <div className={cn('leading-tight font-semibold break-words', index > 0 ? 'text-lg' : 'text-2xl')}>{l.text}</div>
        </div>
      ))}
    </div>
  );
}
