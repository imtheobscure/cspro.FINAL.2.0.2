'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Mic, Radio, Clock, Bot, Smile, Heart, Lock, Search, Plane, Package } from 'lucide-react';
import { scene } from '@/lib/art';
import { AudioManager } from '@/lib/audio';

export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  image: string;
  ageRange: string;
  accent: string;
  mechanic: string;
}

export const GAME_REGISTRY: GameMeta[] = [
  {
    id: 'whispering-wall',
    title: 'Whispering-Wall Escape Rooms',
    tagline: 'Whisper the secret password to open the stone door!',
    description: 'Kids whisper magic words into the microphone — watch the runes light up one by one and unlock hidden treasure chambers!',
    icon: <Lock className="w-6 h-6" />,
    gradient: 'from-indigo-900 via-purple-900 to-slate-900',
    image: scene('whisper-wall'),
    ageRange: '4-10',
    accent: 'purple',
    mechanic: 'Voice Recognition + Rune Puzzle',
  },
  {
    id: 'alien-cafe',
    title: 'Alien-Café Order Takers',
    tagline: 'Serve extraterrestrial customers with tasty space food!',
    description: 'Listen to alien orders, drag the right cosmic dishes onto the tray, and serve before the saucer leaves!',
    icon: <Plane className="w-6 h-6" />,
    gradient: 'from-emerald-900 via-teal-900 to-cyan-900',
    image: scene('alien-cafe'),
    ageRange: '5-12',
    accent: 'emerald',
    mechanic: 'Drag & Drop + Listening Quiz',
  },
  {
    id: 'parrot-partner',
    title: 'Parrot-Partner Secret Deliveries',
    tagline: 'Tell Captain Pepper a secret message!',
    description: 'Record a secret message for Captain Pepper the parrot — he flies across tropical islands, then verifies if you remember what you said!',
    icon: <Mic className="w-6 h-6" />,
    gradient: 'from-sky-900 via-blue-900 to-indigo-900',
    image: scene('parrot-delivery'),
    ageRange: '5-11',
    accent: 'sky',
    mechanic: 'Voice Record + Memory Match',
  },
  {
    id: 'detective-clue',
    title: 'Detective Clue-Interrogators',
    tagline: 'Ask smart questions to uncover the culprit!',
    description: 'Three suspects in your detective office. Ask polite questions, collect evidence cards, and match clues to solve the case!',
    icon: <Search className="w-6 h-6" />,
    gradient: 'from-amber-900 via-orange-900 to-rose-900',
    image: scene('detective-office'),
    ageRange: '6-12',
    accent: 'amber',
    mechanic: 'Lineup + Evidence Cards',
  },
  {
    id: 'animal-rescue',
    title: 'Animal-Rescue Radio Dispatches',
    tagline: 'Guide the lost bear cub home!',
    description: 'Listen to radio static from the forest, then click arrows to guide the lost animal through the branching terrain to safety!',
    icon: <Radio className="w-6 h-6" />,
    gradient: 'from-emerald-900 via-green-900 to-lime-900',
    image: scene('animal-rescue'),
    ageRange: '4-10',
    accent: 'green',
    mechanic: 'Pathfinding + Radio Dialogue',
  },
  {
    id: 'time-traveler',
    title: 'Time-Traveler Dinner Parties',
    tagline: 'Converse with Leonardo da Vinci!',
    description: 'Sit at a Renaissance banquet with Leonardo. Explain modern objects and answer his curious questions about the future!',
    icon: <Clock className="w-6 h-6" />,
    gradient: 'from-rose-900 via-pink-900 to-red-900',
    image: scene('time-traveler'),
    ageRange: '7-12',
    accent: 'rose',
    mechanic: 'Dialogue Tree + Era Quiz',
  },
  {
    id: 'monster-babysitter',
    title: 'Monster-Babysitter Comfort Chats',
    tagline: 'Soothe crying Baby Gloop!',
    description: 'Baby monster Gloop is crying! Rock him, sing lullabies, offer toys, and watch his mood meter turn from red to green!',
    icon: <Heart className="w-6 h-6" />,
    gradient: 'from-pink-900 via-rose-900 to-fuchsia-900',
    image: scene('monster-baby'),
    ageRange: '3-8',
    accent: 'pink',
    mechanic: 'Mood Meter + Soothing Actions',
  },
  {
    id: 'magic-mirror',
    title: 'Magic-Mirror Compliment Battles',
    tagline: 'Polish the mirror with kind adjectives!',
    description: 'A cursed cracked mirror needs kind words! Drag positive adjectives onto it and watch the cracks heal with sparkles!',
    icon: <Smile className="w-6 h-6" />,
    gradient: 'from-violet-900 via-purple-900 to-indigo-900',
    image: scene('magic-mirror'),
    ageRange: '5-12',
    accent: 'violet',
    mechanic: 'Drag Adjectives + Sparkle Healing',
  },
  {
    id: 'lost-and-found',
    title: 'Lost-and-Found Toy Reporters',
    tagline: 'Describe your toy to find it!',
    description: 'Train Station Master has cubbies of toys! Pick color, size, and type attributes so he can match your missing teddy!',
    icon: <Package className="w-6 h-6" />,
    gradient: 'from-orange-900 via-amber-900 to-yellow-900',
    image: scene('lost-found'),
    ageRange: '4-10',
    accent: 'orange',
    mechanic: 'Attribute Picker + Cubby Search',
  },
  {
    id: 'robot-upgrade',
    title: 'Robot-Friend Upgrade Interviews',
    tagline: 'Build Beep-Boop\'s new voice!',
    description: 'Interview robot Beep-Boop and drag upgrade modules into his slots — choose between Polite Storyteller or Sarcastic Horn!',
    icon: <Bot className="w-6 h-6" />,
    gradient: 'from-cyan-900 via-blue-900 to-indigo-900',
    image: scene('robot-lab'),
    ageRange: '6-12',
    accent: 'cyan',
    mechanic: 'Assembly Puzzle + Interview',
  },
];

interface GameLauncherProps {
  onLaunchGame: (gameId: string) => void;
}

export const GameLauncher: React.FC<GameLauncherProps> = ({ onLaunchGame }) => {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 md:p-12 text-white">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 80%, white 0%, transparent 50%)'
          }}></div>
          <div className="relative z-10 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-black uppercase tracking-wider mb-4"
            >
              <Gamepad2 className="w-4 h-4" />
              10 Interactive Spoken Games
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
              Welcome to the<br/>
              <span className="bg-gradient-to-r from-amber-300 to-pink-300 bg-clip-text text-transparent">Spoken Adventure Lab</span>
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 font-semibold mb-6 max-w-2xl">
              Every game has its own world, its own rules, and its own characters. Click a card to dive in — speak, drag, build, and play!
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">🎤 Voice-Activated</span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">🖐️ Drag & Drop</span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">🗺️ Pathfinding</span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">🧩 Puzzles</span>
              <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold">💬 Dialogue Trees</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GAME_REGISTRY.map((game, idx) => (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              AudioManager.playSound('pop');
              onLaunchGame(game.id);
            }}
            className="group relative overflow-hidden rounded-3xl bg-white border-2 border-slate-200 shadow-lg hover:shadow-2xl transition-all cursor-pointer text-left"
          >
            {/* Hero Image */}
            <div className="relative h-44 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient}`}></div>
              <img
                src={game.image}
                alt={game.title}
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

              {/* Age Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur text-[10px] font-black text-slate-900 uppercase tracking-wider">
                Ages {game.ageRange}
              </div>

              {/* Icon Badge */}
              <div className="absolute top-3 right-3 w-11 h-11 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-lg">
                {game.icon}
              </div>

              {/* Title */}
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-xl font-black text-white drop-shadow-lg leading-tight">
                  {game.title}
                </h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <p className="text-sm font-bold text-slate-700 italic">
                &quot;{game.tagline}&quot;
              </p>
              <p className="text-sm text-slate-600 line-clamp-2">
                {game.description}
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
                  {game.mechanic}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black group-hover:bg-indigo-700 transition-colors">
                  Play Now →
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
