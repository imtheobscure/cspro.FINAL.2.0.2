import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';

const AVATARS = ['🎓','🦁','🌸','🔥','⚡','🎭','🦊','🐯','🦋','🎸','🚀','🌟','🐉','🦅','🎯'];

export const SplashScreen: React.FC = () => {
  const { setShowSplash, setShowProfileSetup } = useStore();
  const [phase, setPhase] = useState<'intro' | 'features' | 'ready'>('intro');
  const [featureIdx, setFeatureIdx] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  let splashText = "VIDEO LESSON";
  let splashSubtext = "Interactive Language Learning";
  let logoUrl = null;
  try {
    const store = JSON.parse(localStorage.getItem('app-storage') || '{}');
    if (store.state?.tutorInfo?.splashScreenText) splashText = store.state.tutorInfo.splashScreenText;
    if (store.state?.tutorInfo?.splashScreenSubtext) splashSubtext = store.state.tutorInfo.splashScreenSubtext;
    if (store.state?.logoUrl) logoUrl = store.state.logoUrl;
  } catch (e) {}

  const features = [
    { icon: '🎬', text: 'Learn from Videos' },
    { icon: '🎮', text: 'Gamified Activities' },
    { icon: '🎤', text: 'Speaking Practice' },
    { icon: '📝', text: 'Interactive Whiteboard' },
    { icon: '😺', text: 'Cat Tutor Assistant' },
  ];

  const [waitingForPremium, setWaitingForPremium] = useState(true);

  useEffect(() => {
    const checkPremium = () => {
      const p = document.getElementById('premium-splash-screen');
      if (!p || p.classList.contains('hidden') || getComputedStyle(p).opacity === '0') {
         setTimeout(() => setWaitingForPremium(false), 300);
      } else {
         setTimeout(checkPremium, 100);
      }
    };
    checkPremium();
  }, []);

  useEffect(() => {
    if (waitingForPremium) return;
    const t1 = setTimeout(() => setPhase('features'), 2000);
    const t2 = setTimeout(() => setPhase('ready'), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [waitingForPremium]);

  useEffect(() => {
    if (waitingForPremium) return;
    if (phase === 'features') {
      const interval = setInterval(() => {
        setFeatureIdx(i => (i + 1) % features.length);
      }, 600);
      return () => clearInterval(interval);
    }
  }, [phase, features.length]);

  // Epic orchestral intro sound
  useEffect(() => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const playChord = (freqs: number[], start: number, duration: number, gain = 0.15) => {
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.frequency.value = freq;
          osc.type = i === 0 ? 'sine' : 'triangle';
          filter.type = 'lowpass';
          filter.frequency.value = 2000;
          
          gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
          gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
          
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + duration + 0.1);
        });
      };

      // Epic rising chord progression
      playChord([130.81, 164.81, 196.00], 0, 0.8, 0.12); // C major
      playChord([146.83, 185.00, 220.00], 0.3, 0.8, 0.14); // D major
      playChord([164.81, 207.65, 246.94], 0.6, 1.0, 0.16); // E major
      playChord([196.00, 246.94, 293.66], 1.0, 1.2, 0.18); // G major
      playChord([261.63, 329.63, 392.00, 523.25], 1.5, 2.0, 0.2); // C major (octave up)
      
      // Triumphant finale
      playChord([523.25, 659.25, 783.99], 2.0, 2.5, 0.15);
      playChord([783.99, 987.77, 1174.66], 2.5, 3.0, 0.1);

    } catch {/* Audio not supported */}
    return () => { audioCtxRef.current?.close(); };
  }, []);

  const handleEnter = () => {
    setShowSplash(false);
    setShowProfileSetup(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: Math.random() * 300 + 50,
              height: Math.random() * 300 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `linear-gradient(135deg, ${['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'][i % 5]} 0%, transparent 70%)`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={`p-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center gap-8 px-4 text-center">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Animated logo mark */}
              {logoUrl ? (
                <motion.div
                  className="relative w-32 h-32 flex items-center justify-center rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(102,126,234,0.5)] border-2 border-white/20"
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </motion.div>
              ) : (
                <motion.div
                  className="relative w-32 h-32 flex items-center justify-center"
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', opacity: 0.9 }} />
                  <svg className="relative z-10" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" fill="white" opacity="0.9" />
                  </svg>
                  <motion.div
                    className="absolute -inset-2 rounded-3xl border-2 border-purple-400/40"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
              )}
              <motion.h1
                className="text-5xl md:text-7xl font-black tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 4px 20px rgba(102, 126, 234, 0.5))',
                }}
              >
                {splashText}
              </motion.h1>
              <motion.p
                className="text-xl text-purple-200 font-medium"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {splashSubtext}
              </motion.p>
            </motion.div>
          )}

          {phase === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8"
            >
              <motion.h1
                className="text-4xl md:text-6xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                VIDEO LESSON
              </motion.h1>
              
              <div className="flex flex-wrap justify-center gap-4 max-w-lg">
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all ${
                      i === featureIdx
                        ? 'bg-white/20 border-purple-400 scale-110 shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                    animate={i === featureIdx ? { y: [0, -5, 0] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <span className={`font-semibold ${i === featureIdx ? 'text-white' : 'text-gray-400'}`}>
                      {f.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-8"
            >
              {/* Animated play icon */}
              <motion.div
                className="relative w-28 h-28 flex items-center justify-center rounded-3xl"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                animate={{ rotateZ: [0, 3, -3, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" fill="white" opacity="0.9" />
                </svg>
                <motion.div
                  className="absolute -inset-3 rounded-3xl border-2 border-purple-400/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -inset-6 rounded-3xl border border-purple-400/15"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
              </motion.div>

              <div className="text-center">
                <motion.h1
                  className="text-5xl md:text-7xl font-black mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  VIDEO LESSON
                </motion.h1>
                <p className="text-purple-200 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
                  Transform any video into an interactive language learning experience 
                  with AI-powered lessons, gamification, and real-time feedback.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 text-sm">
                {['🎬 Video Learning', '🎮 Gamified', '✏️ Whiteboard', '🎤 Speaking', '😺 Cat Tutor'].map((tag) => (
                  <motion.span
                    key={tag}
                    className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full border border-white/20"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>

              <motion.button
                onClick={handleEnter}
                className="px-12 py-5 text-xl font-black rounded-2xl text-white cursor-pointer relative overflow-hidden group"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 15px 50px rgba(102, 126, 234, 0.6)' }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <span>🚀</span>
                  <span>START LEARNING</span>
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </motion.button>

              <p className="text-purple-300/60 text-sm">
                No account needed • 100% browser-based • Works offline
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
    </motion.div>
  );
};

export const ProfileSetup: React.FC = () => {
  const { setShowProfileSetup, setLearner, learner, setLearnerL1, learnerL1 } = useStore();
  const [name, setName] = useState(learner.name || '');
  const [avatar, setAvatar] = useState(learner.avatar || '🎓');
  const [customAvatar, setCustomAvatar] = useState('');
  const [nativeLang, setNativeLang] = useState(learnerL1 || 'es');
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const L1_LANGUAGES = [
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  ];

  const tryWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setWebcamActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Could not access webcam');
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setWebcamActive(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setName(text.trim().substring(0, 30));
    } catch {/* ignore */}
  };

  const handleStart = () => {
    if (!name.trim()) return;
    stopWebcam();
    setLearner({ name: name.trim(), avatar: customAvatar || avatar });
    setLearnerL1(nativeLang);
    setShowProfileSetup(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-900/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 w-full max-w-2xl shadow-2xl my-8"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120 }}
      >
        <div className="text-center mb-8">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            👋
          </motion.div>
          <h2 className="text-3xl font-black" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Welcome to Video Lesson!
          </h2>
          <p className="text-gray-400 mt-2">Let's personalize your learning experience</p>
        </div>

        {/* Avatar area */}
        <div className="flex flex-col items-center gap-6 mb-8">
          {webcamActive ? (
            <div className="relative">
              <video ref={videoRef} autoPlay muted className="w-28 h-28 rounded-full object-cover border-4 border-purple-500 shadow-lg shadow-purple-500/30" />
              <button onClick={stopWebcam} className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 text-white text-sm flex items-center justify-center hover:bg-red-600">✕</button>
            </div>
          ) : (
            <motion.div
              className="text-7xl select-none"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {customAvatar || avatar}
            </motion.div>
          )}

          <div className="flex gap-3">
            <button
              onClick={tryWebcam}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              📷 Webcam
            </button>
            <button
              onClick={handlePaste}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              📋 Paste Name
            </button>
          </div>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="block text-purple-400 font-semibold mb-2">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full bg-gray-800/50 border border-gray-600 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-lg outline-none transition-colors"
            onKeyDown={e => e.key === 'Enter' && handleStart()}
          />
        </div>

        {/* Native language */}
        <div className="mb-6">
          <label className="block text-purple-400 font-semibold mb-2">Your Native Language (for translations)</label>
          <input
            type="text"
            value={nativeLang}
            onChange={(e) => setNativeLang(e.target.value)}
            placeholder="e.g. Spanish, German, Persian, etc."
            className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Emoji avatar picker */}
        {!webcamActive && (
          <div className="mb-6">
            <label className="block text-purple-400 font-semibold mb-3">Choose Your Avatar</label>
            <div className="grid grid-cols-5 gap-2 md:grid-cols-8">
              {AVATARS.map((em) => (
                <button
                  key={em}
                  onClick={() => { setAvatar(em); setCustomAvatar(''); }}
                  className={`text-3xl p-2 rounded-xl transition-all ${avatar === em && !customAvatar ? 'bg-purple-500/20 border-2 border-purple-500 scale-110' : 'border-2 border-transparent hover:border-gray-500'}`}
                >
                  {em}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <input
                type="text"
                value={customAvatar}
                onChange={e => setCustomAvatar(e.target.value.slice(0, 2))}
                placeholder="Or type any emoji..."
                className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-xl px-4 py-2 outline-none text-center text-2xl"
              />
            </div>
          </div>
        )}

        <motion.button
          onClick={handleStart}
          disabled={!name.trim()}
          className="w-full py-4 text-xl font-black rounded-2xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          whileHover={{ scale: name.trim() ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
        >
          🚀 Start Learning, {name || 'Friend'}!
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
