'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioManager } from './audio';

/**
 * The shared engine behind the ten speaking games.
 *
 * What it gives every game: scoring with a combo multiplier, lives, a
 * level/wave difficulty curve, hit-stop, screen shake, and music that gets
 * tenser as the clock runs down.
 *
 * Three things were wrong in the first version and are fixed here:
 *
 * 1. **No side effects inside state updaters.** The old `registerMiss` called
 *    `setRunning(false)`, `setGameOver(true)` and played the alarm *inside* the
 *    `setLives` updater, and `advanceLevel` did the same inside `setLevel`.
 *    React may run an updater more than once (StrictMode in dev, and any
 *    re-render race), so a child could hear the game-over alarm twice or lose
 *    two lives for one mistake. Lives, score and level now live in refs, and
 *    the state setter only ever holds the value to draw.
 * 2. **One mistake, one life.** `registerMiss` is locked per turn, so a
 *    double-tap or a hazard that fires twice cannot drain the whole game.
 * 3. **A gentler clock.** A 5-year-old mid-sentence needs longer than 12
 *    seconds; the curve now starts at 40 seconds and never drops below 20.
 */

export interface DifficultyBand {
  level: number;
  timeLimit: number;   // seconds per round
  choices: number;     // number of options presented
  distractors: number; // similar-looking decoys
  speed: number;       // movement / spawn speed multiplier
  label: string;
}

/** Smooth difficulty curve — ramps time pressure & choice count. */
export function bandFor(level: number): DifficultyBand {
  const l = Math.max(1, level);
  return {
    level: l,
    timeLimit: Math.max(20, Math.round(40 - l * 2.2)),
    choices: Math.min(6, 2 + Math.floor(l / 2)),
    distractors: Math.min(4, Math.floor(l / 2)),
    speed: 1 + l * 0.12,
    label: l <= 2 ? 'Warm Up' : l <= 4 ? 'Getting Hot' : l <= 6 ? 'Intense' : l <= 8 ? 'Blazing' : 'LEGEND',
  };
}

export interface EngineOptions {
  startingLives?: number;
  maxLevel?: number;
  comboDecayMs?: number;
  onGameOver?: (score: number) => void;
  onLevelUp?: (level: number) => void;
}

export function useGameEngine(opts: EngineOptions = {}) {
  const {
    startingLives = 3,
    maxLevel = 10,
    comboDecayMs = 7000,
    onGameOver,
    onLevelUp,
  } = opts;

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(startingLives);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [timeLeft, setTimeLeft] = useState(bandFor(1).timeLimit);
  const [shake, setShake] = useState(0);
  const [hitStop, setHitStop] = useState(false);
  const [floaters, setFloaters] = useState<{ id: number; text: string; tone: 'good' | 'bad' | 'epic' }[]>([]);

  // The truth the game logic reads. State above is only what we draw.
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(startingLives);
  const levelRef = useRef(1);
  const runningRef = useRef(false);
  /** Set while a mistake is being handled, so one slip costs one life. */
  const missLockRef = useRef(false);
  const timeRef = useRef(bandFor(1).timeLimit);

  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const band = useMemo(() => bandFor(level), [level]);
  const bandRef = useRef(band);
  bandRef.current = band;
  const multiplier = 1 + Math.min(4, Math.floor(combo / 3));

  /** The clock lives in a ref too, so the tick never needs a state updater. */
  const setTime = useCallback((value: number) => {
    timeRef.current = value;
    setTimeLeft(value);
  }, []);

  /* ---------------- juice helpers ---------------- */
  const triggerShake = useCallback((intensity = 8) => {
    setShake(intensity);
    setTimeout(() => setShake(0), 260);
  }, []);

  const triggerHitStop = useCallback((ms = 90) => {
    setHitStop(true);
    setTimeout(() => setHitStop(false), ms);
  }, []);

  const pushFloater = useCallback((text: string, tone: 'good' | 'bad' | 'epic' = 'good') => {
    const id = Date.now() + Math.random();
    setFloaters(f => [...f.slice(-4), { id, text, tone }]);
    setTimeout(() => setFloaters(f => f.filter(x => x.id !== id)), 1100);
  }, []);

  /* ---------------- end of the round ---------------- */
  const finish = useCallback((won: boolean) => {
    runningRef.current = false;
    setRunning(false);
    AudioManager.stopMusic();
    if (won) {
      setVictory(true);
      AudioManager.playSound('fanfare');
      setTimeout(() => AudioManager.playSound('tada'), 320);
    } else {
      setGameOver(true);
      AudioManager.playSound('alarm');
      onGameOver?.(scoreRef.current);
    }
  }, [onGameOver]);

  /* ---------------- scoring ---------------- */
  const registerHit = useCallback((basePoints = 100) => {
    const nextCombo = comboRef.current + 1;
    const mult = 1 + Math.min(4, Math.floor(nextCombo / 3));
    const gained = Math.max(0, basePoints) * mult;

    comboRef.current = nextCombo;
    scoreRef.current += gained;
    setCombo(nextCombo);
    setBestCombo(b => Math.max(b, nextCombo));
    setScore(scoreRef.current);

    if (nextCombo % 3 === 0) {
      AudioManager.playSound('combo', Math.floor(nextCombo / 3));
      pushFloater(`COMBO x${mult}!`, 'epic');
      triggerShake(6);
    } else {
      AudioManager.playSound('correct');
      pushFloater(`+${gained}`, 'good');
    }
    triggerHitStop(70);

    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => {
      if (comboRef.current > 2) AudioManager.playSound('streakBreak');
      comboRef.current = 0;
      setCombo(0);
    }, comboDecayMs);

    return gained;
  }, [comboDecayMs, pushFloater, triggerHitStop, triggerShake]);

  const registerMiss = useCallback((costLife = true) => {
    if (!runningRef.current || missLockRef.current) return;
    missLockRef.current = true;
    setTimeout(() => { missLockRef.current = false; }, 120);

    AudioManager.playSound('wrong');
    triggerShake(12);
    triggerHitStop(110);
    pushFloater('Try again', 'bad');
    if (comboRef.current > 2) AudioManager.playSound('streakBreak');
    comboRef.current = 0;
    setCombo(0);

    if (!costLife) return;
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    if (livesRef.current <= 0) finish(false);
  }, [finish, pushFloater, triggerHitStop, triggerShake]);

  const advanceLevel = useCallback(() => {
    if (!runningRef.current) return;
    const next = levelRef.current + 1;
    if (next > maxLevel) {
      finish(true);
      return;
    }
    levelRef.current = next;
    setLevel(next);
    setTime(bandFor(next).timeLimit);
    AudioManager.playSound('powerup');
    onLevelUp?.(next);
  }, [finish, maxLevel, onLevelUp, setTime]);

  const start = useCallback(() => {
    if (comboTimer.current) clearTimeout(comboTimer.current);
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = startingLives;
    levelRef.current = 1;
    missLockRef.current = false;

    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setLives(startingLives);
    setLevel(1);
    setGameOver(false);
    setVictory(false);
    setFloaters([]);
    setTime(bandFor(1).timeLimit);
    runningRef.current = true;
    setRunning(true);

    AudioManager.unlock();
    AudioManager.startMusic();
    AudioManager.setIntensity(0.35);
    AudioManager.playSound('riser');
  }, [setTime, startingLives]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    AudioManager.stopMusic();
  }, []);

  const addTime = useCallback((sec: number) => {
    setTime(Math.min(99, Math.round((timeRef.current + sec) * 10) / 10));
    AudioManager.playSound('shield');
  }, [setTime]);

  /* ---------------- the clock ---------------- */
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      const next = Math.round((timeRef.current - 1) * 10) / 10;
      if (next > 0) {
        setTime(next);
        return;
      }
      // Out of time: one life, then a fresh, full clock to try again in.
      registerMiss(true);
      setTime(bandRef.current.timeLimit);
    }, 1000);
    return () => clearInterval(tick);
  }, [running, registerMiss, setTime]);

  /** Sounds that depend on how much time is left, played once per second. */
  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 6) {
      AudioManager.playSound('countdown');
      AudioManager.setIntensity(0.9);
    } else if (timeLeft <= 12) {
      AudioManager.playSound('tick');
      AudioManager.setIntensity(0.65);
    } else {
      AudioManager.setIntensity(0.35 + Math.min(0.3, combo * 0.04));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timeLeft]);

  useEffect(() => () => {
    AudioManager.stopMusic();
    if (comboTimer.current) clearTimeout(comboTimer.current);
  }, []);

  return {
    score, combo, bestCombo, lives, level, band, multiplier,
    running, gameOver, victory, timeLeft, shake, hitStop, floaters,
    start, stop, registerHit, registerMiss, advanceLevel, addTime,
    setTimeLeft: setTime, triggerShake, pushFloater,
  };
}

/** Fisher–Yates */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
}
