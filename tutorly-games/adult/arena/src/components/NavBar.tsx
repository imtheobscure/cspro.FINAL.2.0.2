import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { useNarration } from '../context/NarrationContext';
import { THEME_CONFIG } from '../utils/helpers';
import { playCardFlip } from '../utils/audio';
import type { NavTab } from '../types';

const NAV_ITEMS: { id: NavTab; label: string; mafiaIcon: string; wolfIcon: string; tip: string }[] = [
  { id: 'dashboard', label: 'HQ', mafiaIcon: '🎰', wolfIcon: '🌕', tip: 'Command Center — stats, airdrops, role assignment' },
  { id: 'profiles', label: 'Roster', mafiaIcon: '👥', wolfIcon: '🐾', tip: 'View all operatives and open their profiles' },
  { id: 'arena', label: 'Arena', mafiaIcon: '⚔️', wolfIcon: '🐺', tip: 'Battle story viewer, war logs & chronicles' },
  { id: 'shop', label: 'Shop', mafiaIcon: '🏪', wolfIcon: '🪨', tip: 'Syndicate Armory — buy & forge items' },
  { id: 'tutor', label: 'God Mode', mafiaIcon: '👑', wolfIcon: '👑', tip: 'Profile, AI Prompt Hub, Roles, Voice, Backup' },
];

export function NavBar() {
  const { state, dispatch } = useGame();
  useNarration(); // Available for future narration
  const cfg = THEME_CONFIG[state.theme];

  const setNav = (tab: NavTab) => {
    if (tab !== state.activeNav) {
      playCardFlip();
    }
    dispatch({ type: 'SET_NAV', payload: tab });
  };

  return (
    <>
      {/* ===== Desktop sidebar nav - MASSIVE ICONS ===== */}
      <nav
        className="hidden md:flex flex-col w-24 py-4 gap-1 overflow-hidden flex-shrink-0"
        style={{
          background: state.theme === 'mafia'
            ? 'linear-gradient(180deg, rgba(10,3,3,0.97) 0%, rgba(6,2,2,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(3,10,4,0.97) 0%, rgba(2,6,3,0.99) 100%)',
          borderRight: `2px solid ${cfg.neonColor}15`,
          backdropFilter: 'blur(25px)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = state.activeNav === item.id;
          const icon = state.theme === 'mafia' ? item.mafiaIcon : item.wolfIcon;
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.1, x: 4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setNav(item.id)}
              title={item.tip}
              className="relative flex flex-col items-center justify-center py-4 px-2 mx-2 rounded-2xl transition-all text-center group"
            >
              {/* Active glow background */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: `linear-gradient(145deg, ${cfg.neonColor}20 0%, ${cfg.neonColor}10 100%)`,
                    border: `2px solid ${cfg.neonColor}30`,
                    boxShadow: `0 0 30px ${cfg.neonColor}15, inset 0 0 20px ${cfg.neonColor}08`,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {/* Active left bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bar"
                  className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                  style={{ background: cfg.neonColor, boxShadow: `0 0 12px ${cfg.neonColor}` }}
                />
              )}
              {/* MASSIVE Icon */}
              <motion.span
                className="text-4xl relative z-10"
                style={{
                  filter: isActive ? `drop-shadow(0 0 15px ${cfg.neonColor}90)` : 'none',
                }}
                animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                {icon}
              </motion.span>
              <span
                className="text-sm font-black tracking-wider uppercase mt-2 relative z-10 transition-colors"
                style={{ color: isActive ? cfg.neonColor : '#555' }}
              >
                {item.label.split(' ')[0]}
              </span>
              {/* Tooltip */}
              <div
                className="absolute left-full ml-4 px-5 py-2 rounded-xl text-base text-white font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                style={{
                  background: 'rgba(0,0,0,0.95)',
                  border: `2px solid ${cfg.neonColor}35`,
                  backdropFilter: 'blur(15px)',
                  boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 15px ${cfg.neonColor}15`,
                }}
              >
                {item.label}
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* ===== Mobile bottom nav - MASSIVE ===== */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-3"
        style={{
          background: state.theme === 'mafia'
            ? 'rgba(8,3,3,0.97)'
            : 'rgba(3,8,4,0.97)',
          borderTop: `2px solid ${cfg.neonColor}20`,
          backdropFilter: 'blur(35px)',
          boxShadow: `0 -8px 40px rgba(0,0,0,0.6)`,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = state.activeNav === item.id;
          const icon = state.theme === 'mafia' ? item.mafiaIcon : item.wolfIcon;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.85 }}
              onClick={() => setNav(item.id)}
              className="relative flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all"
              style={{
                background: isActive ? `${cfg.neonColor}20` : 'transparent',
              }}
            >
              <motion.span
                className="text-3xl"
                style={{
                  filter: isActive ? `drop-shadow(0 0 12px ${cfg.neonColor}90)` : 'none',
                }}
                animate={{ scale: isActive ? 1.25 : 1 }}
              >
                {icon}
              </motion.span>
              <span
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: isActive ? cfg.neonColor : '#444' }}
              >
                {item.label.split(' ')[0]}
              </span>
              {/* Active dot */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  className="absolute -bottom-0.5 w-6 h-[3px] rounded-full"
                  style={{ background: cfg.neonColor, boxShadow: `0 0 12px ${cfg.neonColor}` }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
