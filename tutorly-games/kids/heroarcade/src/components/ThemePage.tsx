import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Theme, LANG_META } from '../data/types';
import { useStore } from '../lib/store';
import { Btn, Icon, SpeakBtn } from './ui';
import { Dictionary, TalkCards, Chant } from './Lesson';
import { LessonPlanView } from './LessonPlan';
import { Quiz, Matching, StoryBook } from './Activities';
import { DragonFeeder, WalkieTalkie, PuppetTheater, Marketplace } from './Games1';
import { MazeNavigator, Detective, TelephoneMonsters, RocketBoosters } from './Games2';
import { cn } from '../utils/cn';

/** The tab ids a lesson step may point at directly. */
const TAB_IDS: Tab[] = ['plan', 'dictionary', 'talk', 'chant', 'quiz', 'matching', 'story', 'games'];
type Tab = 'plan' | 'dictionary' | 'talk' | 'chant' | 'quiz' | 'matching' | 'story' | 'games';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'plan', label: 'Lesson Plan', icon: '📋' },
  { id: 'dictionary', label: 'Dictionary', icon: '📚' },
  { id: 'talk', label: 'CCQ Talk', icon: '💬' },
  { id: 'chant', label: 'Chant', icon: '🎵' },
  { id: 'quiz', label: 'Quiz', icon: '❓' },
  { id: 'matching', label: 'Matching', icon: '🧩' },
  { id: 'story', label: 'Story', icon: '📖' },
  { id: 'games', label: 'Speaking Games', icon: '🎮' },
];

const GAMES = [
  { id: 'dragon', title: 'Dragon Feeder', icon: '🐉', desc: 'Ask the dragon what it wants and describe the food out loud.', skill: 'Questions · Describing' },
  { id: 'radio', title: 'Secret-Agent Walkie-Talkie', icon: '📻', desc: 'Answer spoken riddles over the radio to crack the vault code.', skill: 'Listening · Guessing' },
  { id: 'puppet', title: 'Puppet Theater', icon: '🎭', desc: 'Tell the puppets what happens next – they act out your story.', skill: 'Storytelling' },
  { id: 'market', title: 'Marketplace Friends', icon: '🏪', desc: 'Ask prices and bargain with talking animal shopkeepers.', skill: 'Numbers · Politeness' },
  { id: 'maze', title: 'Voice Maze Navigator', icon: '🧭', desc: 'Guide Max through the maze with spoken directions.', skill: 'Directions · Naming' },
  { id: 'detective', title: 'Picture-Book Detective', icon: '🕵️', desc: 'Interview cartoon suspects to find who took the missing item.', skill: 'Asking questions' },
  { id: 'telephone', title: 'Telephone Monster Chain', icon: '👾', desc: 'Repeat the secret phrase clearly down the line of monsters.', skill: 'Pronunciation · Memory' },
  { id: 'rocket', title: 'Fluency Rocket Boosters', icon: '🚀', desc: 'Read the dialogue aloud – your voice powers the rocket!', skill: 'Fluency · Reading' },
];

export function ThemePage({ theme, onHome }: { theme: Theme; onHome: () => void }) {
  const { settings } = useStore();
  const [tab, setTab] = useState<Tab>('dictionary');
  const [game, setGame] = useState<string | null>(null);
  const [gen, setGen] = useState(0);
  const L = settings.learn;

  /**
   * A lesson step names an activity; this is what actually opens it. A step can
   * point at a tab (the dictionary, the CCQ cards, the story…) or straight at one
   * of the eight speaking games, so both routes live here rather than in the plan
   * screen, which only knows the activity id.
   */
  const goToActivity = (activity: string) => {
    const isGame = GAMES.some((g) => g.id === activity);
    if (isGame) {
      setGame(activity);
      return;
    }
    setTab((TAB_IDS as string[]).includes(activity) ? (activity as Tab) : 'games');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (game) {
    const back = () => setGame(null);
    const restart = () => setGen((g) => g + 1);
    const map: Record<string, React.ReactNode> = {
      dragon: <DragonFeeder theme={theme} onBack={back} />,
      radio: <WalkieTalkie theme={theme} onBack={back} />,
      puppet: <PuppetTheater theme={theme} onBack={back} />,
      market: <Marketplace theme={theme} onBack={back} onRestart={restart} />,
      maze: <MazeNavigator theme={theme} onBack={back} />,
      detective: <Detective theme={theme} onBack={back} onRestart={restart} />,
      telephone: <TelephoneMonsters theme={theme} onBack={back} />,
      rocket: <RocketBoosters theme={theme} onBack={back} />,
    };
    return <div key={game + ':' + gen}>{map[game]}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[2.5rem] p-6 md:p-8 flex items-center gap-6 flex-wrap" style={{ background: theme.color }}>
        <Btn tone="ghost" onClick={onHome}>🏠 Home</Btn>
        <Icon icon={theme.icon} size={96} />
        <div className="flex-1 min-w-[200px]">
          <h1 dir={LANG_META[L].rtl ? 'rtl' : 'ltr'} className="text-4xl md:text-5xl font-black text-slate-800">{theme.title[L]}</h1>
          {settings.support !== 'none' && settings.support !== L && <div className="text-2xl font-semibold text-slate-600 mt-1">{theme.title[settings.support]}</div>}
        </div>
        <SpeakBtn text={theme.title[L]} lang={L} size="lg" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('px-5 py-3 rounded-2xl text-xl font-black flex items-center gap-2 border-4 transition-colors', tab === t.id ? 'bg-indigo-600 text-white border-indigo-700 shadow-[0_4px_0_#312e81]' : 'bg-white text-slate-700 border-slate-100 hover:border-indigo-300')}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div key={tab}>
        {tab === 'plan' && <LessonPlanView theme={theme} onGo={goToActivity} />}
        {tab === 'dictionary' && <Dictionary theme={theme} />}
        {tab === 'talk' && <TalkCards theme={theme} />}
        {tab === 'chant' && <Chant theme={theme} />}
        {tab === 'quiz' && <Quiz theme={theme} />}
        {tab === 'matching' && <Matching theme={theme} />}
        {tab === 'story' && <StoryBook theme={theme} />}
        {tab === 'games' && (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {GAMES.map((g, i) => (
              <motion.button key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -6 }} whileTap={{ scale: 0.97 }} onClick={() => setGame(g.id)}
                className="bg-white rounded-[2rem] border-4 border-slate-100 shadow-[0_8px_0_#e2e8f0] p-6 flex flex-col items-center text-center gap-3 hover:border-indigo-300">
                <Icon icon={g.icon} size={110} />
                <div className="text-2xl font-black text-slate-800">{g.title}</div>
                <div className="text-lg text-slate-500 font-semibold leading-snug">{g.desc}</div>
                <div className="text-sm font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-3 py-1">{g.skill}</div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
