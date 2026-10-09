/* ════════════════════════════════════════════════════════════════════════════
   🏰 KIDS LEARNING KINGDOM — App Root
   View routing: 'dashboard' | 'profile' | 'onboarding'
   Onboarding = full-page takeover (never layered under dashboard)
   ════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { triggerAutoSync, ensureStartupDiskRestore, readKidsStateFromStorage, persistKidsState } from '../../utils/diskStorage';
import { useNavigate } from 'react-router-dom';
import { Dashboard, SoundProvider } from './KidsDashboard';
import { Kidsprofile } from './KidsLearnerProfile';
import KidsOnboarding from './KidsOnboarding';
import { Learner, ThemeType, StoreItem, TeacherProfile } from './types';
import './index.css';
import { useAuthStore } from '../../store/useAuthStore';
import { canAddLearner, FREE_LEARNER_LIMIT } from '../../utils/tiers';

/* ────────────────────────────────────────────────────────────────────────────
   DEFAULT TEACHER PROFILE
   ──────────────────────────────────────────────────────────────────────────── */
export const DEFAULT_TEACHER: TeacherProfile = {
  name: 'Teacher Dan',
  characterEmoji: '🧙‍♂️',
  characterName: 'Wizard Master Dan',
  bio: 'A magical English teacher who turns spells into words!',
  teachingStyle: 'Gamified & Encouraging',
  interests: ['Linguistics', 'Magic Stories', 'Coding Games'],
  greeting: 'Greetings, young hero! Today we shall master the spells of English! ✨',
  storeOwnerTitle: 'Royal Storekeeper of the Kingdom',
};

/* ────────────────────────────────────────────────────────────────────────────
   DEFAULT STORE
   ──────────────────────────────────────────────────────────────────────────── */
export const DEFAULT_STORE: StoreItem[] = [
  { id: 'item-pot-1',  emoji: '🧪', name: 'Attack Elixir',     cost: 30,  stock: 5,  effect: 'attack',   effectValue: 5,  category: 'potion',  rarity: 'common',    description: 'Boosts attack power by 5!' },
  { id: 'item-pot-2',  emoji: '🍎', name: 'Defense Apple',     cost: 30,  stock: 5,  effect: 'defense',  effectValue: 5,  category: 'food',    rarity: 'common',    description: 'Hardens your defense by 5!' },
  { id: 'item-pot-3',  emoji: '💖', name: 'Happy Potion',      cost: 50,  stock: 3,  effect: 'heal',     effectValue: 10, category: 'potion',  rarity: 'rare',      description: 'Restores mood & energy!' },
  { id: 'item-land-1', emoji: '🌲', name: 'Magic Pine',        cost: 20,  stock: 10, effect: 'land',                      category: 'land',    rarity: 'common',    description: 'Plant a glowing pine!' },
  { id: 'item-land-2', emoji: '🌸', name: 'Cherry Bloom',      cost: 25,  stock: 10, effect: 'land',                      category: 'land',    rarity: 'common',    description: 'Beautiful cherry tree!' },
  { id: 'item-land-3', emoji: '🏰', name: 'Castle Tower',      cost: 200, stock: 3,  effect: 'land',                      category: 'land',    rarity: 'epic',      description: 'Grand castle for your land!' },
  { id: 'item-spec-1', emoji: '🦄', name: 'Unicorn Companion', cost: 500, stock: 1,  effect: 'cosmetic',                  category: 'pet',     rarity: 'legendary', description: 'A super rare unicorn friend!' },
  { id: 'item-pot-4',  emoji: '⚔️', name: 'Mega Sword',       cost: 100, stock: 4,  effect: 'attack',   effectValue: 15, category: 'special', rarity: 'epic',      description: '+15 ATK legendary sword!' },
];

/* ────────────────────────────────────────────────────────────────────────────
   SAMPLE LEARNERS
   ──────────────────────────────────────────────────────────────────────────── */
const today = new Date().toISOString().split('T')[0];
const hwFuture = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
const hwExpired = new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0];

export const SAMPLE_LEARNERS: Learner[] = [
  {
    id: 'hero-001', name: 'Luna Starlight', age: 8, avatar: '🧚‍♀️',
    gender: 'Female', avatarArchetype: 'Fairy', petType: 'Cat', theme: 'fairy',
    country: 'Mexico', city: 'Mexico City', status: 'active',
    joinDate: '2024-01-15', birthday: '2016-03-12',
    xp: 4500, petXp: 1200, coins: 350, streak: 12, attack: 65, defense: 70,
    mood: 'excited', totalSessions: 84, totalMinutes: 1260,
    favoriteSubject: 'Pronunciation',
    tags: ['top-performer', 'creative'],
    badges: [
      { id: 'b1', name: 'Phonics Master', icon: '🏆', rarity: 'legendary' },
      { id: 'b2', name: 'Streak Star',    icon: '🔥', rarity: 'epic' },
      { id: 'b3', name: 'Word Wizard',    icon: '📖', rarity: 'rare' },
    ],
    skills: { pronunciation: 92, vocabulary: 85, grammar: 78, listening: 90, speaking: 80, reading: 88, writing: 70 },
    weaknesses: [
      { id: 'w1', name: 'Past tense irregular verbs', points: 3, completed: false, dateAdded: today },
      { id: 'w2', name: 'Pronunciation of "th" sound', points: 2, completed: false, dateAdded: today },
    ],
    interests: ['Unicorns', 'Magic', 'Dragons'],
    coursePlan: ['Master vowel sounds', 'Read 5 short stories', 'Practice greetings'],
    landItems: [
      { id: 'l1', emoji: '🏰', name: 'Castle Tower', row: 1, col: 1 },
      { id: 'l2', emoji: '🌲', name: 'Magic Pine',   row: 2, col: 3 },
      { id: 'l3', emoji: '🌸', name: 'Cherry Bloom', row: 3, col: 0 },
    ],
    dialogueText: "Hi! I'm Luna, ready for our magic lesson today!",
    purchasedRewards: [], nativeLang: 'Spanish', targetLang: 'English', learningStyle: 'Visual',
    talkingMood: { emoji: '🤩', text: "I'm SO ready to learn today!", dialogues: ["Let's go on an adventure!", "I love English class!", "What spell are we learning?"], voiceName: '' },
    homework: [
      { id: 'hw1', title: 'Fruits Vocabulary Practice', description: 'Write 10 sentences using fruit words', dueDate: hwFuture, xpReward: 50, completed: false },
      { id: 'hw2', title: 'Past Tense Story',           description: 'Tell a story about yesterday',         dueDate: hwExpired, xpReward: 80, completed: false },
    ],
    sessionLogs: [],
    calendarEvents: [
      { id: 'ce1', title: 'English Class',    type: 'class',    date: today,     recurring: 'weekly' },
      { id: 'ce2', title: 'Fruits HW Due',    type: 'homework', date: hwFuture },
    ],
  },
  {
    id: 'hero-002', name: 'Max Thunder', age: 10, avatar: '🦸‍♂️',
    gender: 'Male', avatarArchetype: 'Superhero', petType: 'Dog', theme: 'jungle',
    country: 'Spain', city: 'Madrid', status: 'active',
    joinDate: '2024-02-20', birthday: '2014-07-22',
    xp: 1800, petXp: 500, coins: 220, streak: 7, attack: 50, defense: 55,
    mood: 'happy', totalSessions: 42, totalMinutes: 630,
    favoriteSubject: 'Vocabulary', tags: ['energetic', 'sports-fan'],
    badges: [{ id: 'b1', name: 'Quick Learner', icon: '⚡', rarity: 'rare' }],
    skills: { pronunciation: 65, vocabulary: 72, grammar: 60, listening: 70, speaking: 75, reading: 68, writing: 55 },
    weaknesses: [{ id: 'w1', name: 'Spelling of double-letter words', points: 2, completed: false, dateAdded: today }],
    interests: ['Sports', 'Animals', 'Robots'],
    coursePlan: ['Learn animal vocabulary', 'Sports verb practice'],
    landItems: [{ id: 'l1', emoji: '🌲', name: 'Magic Pine', row: 0, col: 2 }],
    dialogueText: "Let's go on an adventure!", purchasedRewards: [],
    nativeLang: 'Spanish', targetLang: 'English', learningStyle: 'Kinesthetic',
    talkingMood: { emoji: '💪', text: "I can do it!", dialogues: ["Let's train hard today!", "I love a challenge!", "Bring it on!"], voiceName: '' },
    homework: [{ id: 'hw1', title: 'Sports Verbs List', description: 'Write 5 sentences about sports', dueDate: hwFuture, xpReward: 40, completed: false }],
    sessionLogs: [],
  },
  {
    id: 'hero-003', name: 'Sophie Star', age: 7, avatar: '🧝‍♀️',
    gender: 'Female', avatarArchetype: 'Elf', petType: 'Bird', theme: 'space',
    country: 'United States', city: 'Boston', status: 'active',
    joinDate: '2024-03-10', birthday: '2017-11-05',
    xp: 700, petXp: 200, coins: 150, streak: 3, attack: 30, defense: 35,
    mood: 'focused', totalSessions: 18, totalMinutes: 270,
    favoriteSubject: 'Reading', tags: ['curious', 'space-lover'],
    badges: [],
    skills: { pronunciation: 45, vocabulary: 50, grammar: 40, listening: 50, speaking: 42, reading: 55, writing: 35 },
    weaknesses: [],
    interests: ['Space', 'Robots'], coursePlan: ['Space vocabulary lesson', 'Phonics review'],
    landItems: [], dialogueText: "I want to learn about the stars!", purchasedRewards: [],
    nativeLang: 'English', targetLang: 'Spanish', learningStyle: 'Reading',
    talkingMood: { emoji: '🌟', text: "Stars guide me!", dialogues: ["Space is amazing!", "What does this word mean?", "I love reading!"], voiceName: '' },
    homework: [],
    sessionLogs: [],
  },
  {
    id: 'hero-004', name: 'Diego Wave', age: 9, avatar: '🧜‍♂️',
    gender: 'Male', avatarArchetype: 'Mermaid', petType: 'Fish', theme: 'ocean',
    country: 'Brazil', city: 'Rio', status: 'active',
    joinDate: '2024-04-05', birthday: '2015-08-30',
    xp: 2400, petXp: 800, coins: 280, streak: 9, attack: 55, defense: 60,
    mood: 'happy', totalSessions: 56, totalMinutes: 840,
    favoriteSubject: 'Speaking', tags: ['confident', 'ocean-explorer'],
    badges: [{ id: 'b1', name: 'Speaker', icon: '🎤', rarity: 'rare' }],
    skills: { pronunciation: 70, vocabulary: 75, grammar: 65, listening: 78, speaking: 82, reading: 72, writing: 60 },
    weaknesses: [],
    interests: ['Animals', 'Pirates', 'Music'], coursePlan: ['Ocean vocabulary', 'Conversation practice'],
    landItems: [{ id: 'l1', emoji: '🏰', name: 'Castle Tower', row: 2, col: 2 }],
    dialogueText: "Ahoy! Ready to explore!", purchasedRewards: [],
    nativeLang: 'Portuguese', targetLang: 'English', learningStyle: 'Auditory',
    talkingMood: { emoji: '🌊', text: "Surf the waves of English!", dialogues: ["The ocean calls!", "Let's conquer this!"], voiceName: '' },
    homework: [],
    sessionLogs: [],
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   APP ROOT
   ──────────────────────────────────────────────────────────────────────────── */
type AppView = 'dashboard' | 'profile' | 'onboarding';
const STORAGE_KEY = 'kids_learning_kingdom_v2';

export default function App() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');
  const [learners, setLearners] = useState<Learner[]>(SAMPLE_LEARNERS);
  const [storeItems, setStoreItems] = useState<StoreItem[]>(DEFAULT_STORE);
  const [teacher, setTeacher] = useState<TeacherProfile>(DEFAULT_TEACHER);
  const [theme, setTheme] = useState<ThemeType>('fairy');
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);

  const [showGlobalSplash, setShowGlobalSplash] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Manage dark mode class on html/body for KidsApp (always runs in light/colorful mode)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const wasDark = html.classList.contains('dark');
    
    // Always force light mode styles in Kids Dashboard
    if (wasDark) {
      html.classList.remove('dark');
      body.classList.remove('dark');
    }
    
    return () => {
      // Restore dark mode if it was active
      if (wasDark) {
        html.classList.add('dark');
        body.classList.add('dark');
      }
    };
  }, []);

  /* ── Restore from IndexedDB first, with compressed localStorage fallback ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureStartupDiskRestore();
        const stored = await readKidsStateFromStorage();
        if (!cancelled && stored && typeof stored === 'object') {
          // An empty array is valid (for example after an intentional purge),
          // so never use `.length` as the existence check.
          if (Array.isArray(stored.learners)) setLearners(stored.learners);
          if (Array.isArray(stored.storeItems)) setStoreItems(stored.storeItems);
          if (stored.teacher && typeof stored.teacher === 'object') {
            setTeacher({ ...DEFAULT_TEACHER, ...stored.teacher });
          }
          if (stored.theme) setTheme(stored.theme);
        }
      } catch (e) {
        console.warn('Failed to restore kids data:', e);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Persist the complete kingdom in IndexedDB, then mirror it locally ── */
  useEffect(() => {
    if (!isLoaded) return;
    const payload = { learners, storeItems, teacher, theme };
    void persistKidsState(payload).then(() => {
      // Schedule the folder backup only after the browser snapshot is durable.
      triggerAutoSync();
    }).catch((e) => {
      console.warn('Failed to persist kids data:', e);
    });
  }, [learners, storeItems, teacher, theme, isLoaded]);

  /* ── Navigation ── */
  const goToProfile = (l: Learner) => {
    setSelectedLearner(l);
    setView('profile');
    window.scrollTo({ top: 0 });
  };

  const goToDashboard = () => {
    setView('dashboard');
    setSelectedLearner(null);
    window.scrollTo({ top: 0 });
  };

  const openOnboarding = () => {
    const { tier, openUpgradeModal } = useAuthStore.getState();
    if (!canAddLearner(learners.length, tier)) {
      openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} Young Learner profiles. Upgrade to PRO or VIP to recruit unlimited young heroes!`);
      return;
    }
    setView('onboarding');
    window.scrollTo({ top: 0 });
  };

  const handleAddLearner = (l: Learner) => {
    const { tier, openUpgradeModal } = useAuthStore.getState();
    if (!canAddLearner(learners.length, tier)) {
      openUpgradeModal(`You have reached the Free Tier limit of ${FREE_LEARNER_LIMIT} Young Learner profiles. Upgrade to PRO or VIP to recruit unlimited young heroes!`);
      return;
    }
    setLearners(prev => [l, ...prev]);
    setView('dashboard');
    window.scrollTo({ top: 0 });
  };

  /* ── Update learner ── */
  const handleUpdateLearner = (updated: Partial<Learner>) => {
    if (!selectedLearner) return;
    const merged = { ...selectedLearner, ...updated };
    setSelectedLearner(merged);
    setLearners(prev => prev.map(l => l.id === selectedLearner.id ? merged : l));
  };

  /* ── Buy item (reduces global stock + applies effect to learner) ── */
  const handleBuyItem = (item: StoreItem, learnerId?: string) => {
    setStoreItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: Math.max(0, i.stock - 1) } : i));
    if (!learnerId) return;
    const applyEffect = (l: Learner): Learner => {
      const next = { ...l, coins: Math.max(0, l.coins - item.cost), purchasedRewards: [...(l.purchasedRewards || []), item.id] };
      /* Only shop items modify attack/defense */
      if (item.effect === 'attack')  next.attack  = next.attack  + (item.effectValue || 0);
      if (item.effect === 'defense') next.defense = next.defense + (item.effectValue || 0);
      if (item.effect === 'heal')    next.mood    = 'excited';
      if (item.effect === 'land') {
        next.landItems = [...next.landItems, { id: `land-${Date.now()}`, emoji: item.emoji, name: item.name, row: Math.floor(Math.random() * 5), col: Math.floor(Math.random() * 4) }];
      }
      return next;
    };
    setLearners(prev => prev.map(l => l.id === learnerId ? applyEffect(l) : l));
    if (selectedLearner?.id === learnerId) setSelectedLearner(prev => prev ? applyEffect(prev) : prev);
  };

  /* ── Render ── */
  return (
    <SoundProvider>
      <div className="font-kids min-h-screen">

        {/* ONBOARDING — full page takeover */}
        {view === 'onboarding' && (
          <KidsOnboarding
            onComplete={handleAddLearner}
            onCancel={goToDashboard}
          />
        )}

        {/* LEARNER PROFILE — full page */}
        {view === 'profile' && selectedLearner && (
          <Kidsprofile
            learner={selectedLearner}
            onBack={goToDashboard}
            onUpdate={handleUpdateLearner}
            storeItems={storeItems}
            setStoreItems={setStoreItems}
            teacher={teacher}
            onBuyItem={(item) => handleBuyItem(item, selectedLearner.id)}
          />
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <Dashboard
            learners={learners}
            setLearners={setLearners}
            storeItems={storeItems}
            setStoreItems={setStoreItems}
            teacher={teacher}
            setTeacher={setTeacher}
            onSelectLearner={goToProfile}
            onOpenOnboarding={openOnboarding}
            theme={theme}
            setTheme={setTheme}
            onBuyItem={(item) => handleBuyItem(item)}
            onGoHome={() => navigate('/')}
            // After a hard-drive restore we must reload: the kids state lives in
            // React state and the persistence effect would otherwise overwrite
            // the freshly restored localStorage payload.
            onKingdomRestored={() => window.location.reload()}
          />
        )}
      </div>
    </SoundProvider>
  );
}
