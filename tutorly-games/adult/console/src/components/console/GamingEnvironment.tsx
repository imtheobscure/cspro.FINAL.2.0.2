"use client";

import React, { useState } from "react";
import { soundEffects } from "@/utils/audio";
import { Monitor, Gamepad, Tv, Maximize2, Wifi, Battery } from "lucide-react";

export type EnvironmentType = "cinema" | "arcade" | "handheld" | "clean";

interface GamingEnvironmentProps {
  children: React.ReactNode;
  activeRig: EnvironmentType;
  onChangeRig: (rig: EnvironmentType) => void;
  ambientRgb: boolean;
  onToggleAmbientRgb: () => void;
  scanlines: boolean;
  onToggleScanlines: () => void;
  gameTitle?: string;
}

export default function GamingEnvironment({
  children,
  activeRig,
  onChangeRig,
  ambientRgb,
  onToggleAmbientRgb,
  scanlines,
  onToggleScanlines,
  gameTitle,
}: GamingEnvironmentProps) {
  const [rgbTheme, setRgbTheme] = useState<"cyan" | "purple" | "emerald" | "amber">("cyan");
  const [credits, setCredits] = useState(3);

  const insertCoin = () => {
    setCredits((c) => c + 1);
    soundEffects.playCoin();
  };

  const getGlowClass = () => {
    if (!ambientRgb) return "";
    switch (rgbTheme) {
      case "cyan":
        return "shadow-[0_0_80px_rgba(6,182,212,0.35)] border-cyan-500/40";
      case "purple":
        return "shadow-[0_0_80px_rgba(168,85,247,0.35)] border-purple-500/40";
      case "emerald":
        return "shadow-[0_0_80px_rgba(16,185,129,0.35)] border-emerald-500/40";
      case "amber":
        return "shadow-[0_0_80px_rgba(245,158,11,0.35)] border-amber-500/40";
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/*
        Quick Environment Mode Selector Bar.

        Both halves of this panel wrap, and that is the whole point of it. The rig
        buttons carry their names in full ("Retro Arcade Cabinet"), so the strip is
        around 400px wide — wider than a phone. Without wrapping it did not shrink and
        it did not scroll: it simply pushed the page 107px sideways at 320px, which is
        why a phone showed a horizontally scrolling console with a stray "Clean Pro"
        button floating past the right edge. Wrapping keeps every rig reachable without
        shortening a name a tutor is looking for.
      */}
      <div className="w-full mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-slate-400 font-mono text-[11px] uppercase mr-1">RIG MODE:</span>

          <button
            onClick={() => {
              onChangeRig("cinema");
              soundEffects.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
              activeRig === "cinema"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Cinema Ultra Rig
          </button>

          <button
            onClick={() => {
              onChangeRig("arcade");
              soundEffects.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
              activeRig === "arcade"
                ? "bg-purple-500 text-slate-950 font-bold shadow-md shadow-purple-500/25"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Retro Arcade Cabinet
          </button>

          <button
            onClick={() => {
              onChangeRig("handheld");
              soundEffects.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
              activeRig === "handheld"
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/25"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Gamepad className="w-3.5 h-3.5" />
            Tutorly Handheld
          </button>

          <button
            onClick={() => {
              onChangeRig("clean");
              soundEffects.playClick();
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
              activeRig === "clean"
                ? "bg-slate-200 text-slate-950 font-bold shadow-md"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Clean Pro
          </button>
        </div>

        {/* Ambient & Visual FX Toggles */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {activeRig === "cinema" && (
            <div className="flex items-center gap-1 mr-2 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">RGB:</span>
              <button
                onClick={() => setRgbTheme("cyan")}
                className={`w-3.5 h-3.5 rounded-full bg-cyan-400 ${rgbTheme === "cyan" ? "ring-2 ring-white" : "opacity-60"}`}
                title="Cyan Glow"
              />
              <button
                onClick={() => setRgbTheme("purple")}
                className={`w-3.5 h-3.5 rounded-full bg-purple-500 ${rgbTheme === "purple" ? "ring-2 ring-white" : "opacity-60"}`}
                title="Purple Glow"
              />
              <button
                onClick={() => setRgbTheme("emerald")}
                className={`w-3.5 h-3.5 rounded-full bg-emerald-500 ${rgbTheme === "emerald" ? "ring-2 ring-white" : "opacity-60"}`}
                title="Emerald Glow"
              />
              <button
                onClick={() => setRgbTheme("amber")}
                className={`w-3.5 h-3.5 rounded-full bg-amber-500 ${rgbTheme === "amber" ? "ring-2 ring-white" : "opacity-60"}`}
                title="Amber Glow"
              />
            </div>
          )}

          <button
            onClick={() => {
              onToggleAmbientRgb();
              soundEffects.playClick();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition border ${
              ambientRgb
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            Ambient RGB: {ambientRgb ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => {
              onToggleScanlines();
              soundEffects.playClick();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition border ${
              scanlines
                ? "bg-purple-950/60 border-purple-500/50 text-purple-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            CRT Scanlines: {scanlines ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* RIG 1: Cinema Ultra Curved Monitor */}
      {activeRig === "cinema" && (
        <div className="w-full flex flex-col items-center animate-fade-in">
          {/* Curved Monitor Surround Chassis */}
          <div
            className={`relative w-full rounded-3xl p-3.5 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border transition-all duration-500 ${getGlowClass()}`}
          >
            {/* Display Content Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-inner border border-slate-800/80 bg-black">
              {children}
              {scanlines && <div className="absolute inset-0 crt-overlay pointer-events-none z-30" />}
            </div>

            {/* Bottom Monitor Chin with Brand and Status LED */}
            <div className="mt-2.5 px-4 py-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span className="text-slate-400 font-bold tracking-widest text-xs">TUTORLY CONSOLE</span>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            </div>
          </div>

          {/* Curved Heavy Metal Monitor Stand */}
          <div className="w-40 h-8 bg-gradient-to-b from-slate-800 to-slate-900 border-x border-slate-700 shadow-xl" />
          <div className="w-72 h-3.5 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 rounded-full border border-slate-600 shadow-2xl" />
        </div>
      )}

      {/* RIG 2: Retro Arcade Cabinet */}
      {activeRig === "arcade" && (
        <div className="w-full flex flex-col items-center animate-fade-in">
          <div className="relative w-full bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 rounded-3xl p-5 border-4 border-purple-600/60 shadow-[0_0_90px_rgba(168,85,247,0.35)]">
            {/* Illuminated Marquee Banner */}
            <div className="relative w-full h-16 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 p-1 flex items-center justify-between px-6 shadow-[0_0_30px_rgba(236,72,153,0.5)] border-2 border-white/20 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🕹️</span>
                <div>
                  <h2 className="text-xl font-black text-white italic tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    TUTORLY ARCADE
                  </h2>
                  <p className="text-[10px] text-purple-200 font-mono tracking-wider">
                    OFFICIAL UNITY & PLAYABLES TOURNAMENT CABINET
                  </p>
                </div>
              </div>

              {/* Coin Slot Interactive Button */}
              <button
                onClick={insertCoin}
                className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-lg text-xs shadow-lg shadow-amber-400/30 transform active:scale-95 transition"
              >
                <span>INSERT COIN (CREDITS: {credits})</span>
              </button>
            </div>

            {/* CRT Display Bezel */}
            <div className="relative rounded-2xl p-3 bg-slate-950 border-4 border-slate-800 shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]">
              <div className="relative rounded-xl overflow-hidden">
                {children}
                <div className="absolute inset-0 crt-overlay pointer-events-none z-30" />
              </div>
            </div>

            {/* Arcade Controls Deck Panel */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
              {/* Player 1 Joystick & Buttons simulation */}
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_#ef4444]" />
                </div>
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-red-500 shadow-md border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    A
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-500 shadow-md border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    B
                  </div>
                  <div className="w-7 h-7 rounded-full bg-amber-500 shadow-md border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    C
                  </div>
                </div>
              </div>

              <div className="text-center font-mono text-[11px] text-purple-300">
                <p className="font-bold">2-PLAYER SANWA REPLICA SWITCHES</p>
                <p className="text-slate-500 text-[10px]">HI-FI STEREO ARCADE BLASTERS</p>
              </div>

              {/* Player 2 Buttons */}
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 shadow-md border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    X
                  </div>
                  <div className="w-7 h-7 rounded-full bg-yellow-400 shadow-md border border-white/20 flex items-center justify-center text-[10px] font-bold text-slate-900">
                    Y
                  </div>
                  <div className="w-7 h-7 rounded-full bg-pink-500 shadow-md border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    Z
                  </div>
                </div>
                <div className="relative w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-blue-600 shadow-[0_0_10px_#2563eb]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIG 3: Handheld Console (Switch / Steam Deck style) */}
      {activeRig === "handheld" && (
        <div className="w-full flex items-center justify-center animate-fade-in select-none">
          {/* Handheld Body */}
          <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 rounded-[40px] border-4 border-slate-700 shadow-[0_0_70px_rgba(16,185,129,0.3)] flex items-center gap-4">
            {/* Left Controller Grip */}
            <div className="w-32 flex flex-col items-center justify-center gap-6 shrink-0 py-4">
              {/* Left Thumbstick */}
              <div className="w-14 h-14 rounded-full bg-slate-950 border-4 border-slate-700 shadow-inner flex items-center justify-center cursor-pointer hover:border-emerald-500 transition">
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-950" />
                </div>
              </div>

              {/* D-Pad */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute w-5 h-16 bg-slate-700 rounded-md" />
                <div className="absolute w-16 h-5 bg-slate-700 rounded-md" />
                <div className="absolute w-4 h-4 bg-slate-800 rounded-sm" />
              </div>

              {/* Minus / View button */}
              <div className="w-6 h-3 bg-slate-700 rounded-full" />
            </div>

            {/* Center Touchscreen Area */}
            <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border-2 border-slate-700 bg-black shadow-2xl">
              {/* Handheld Top Status Bar */}
              <div className="h-7 bg-slate-950 px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">TUTORLY DECK PRO</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{gameTitle || "READY"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px]">
                    <Wifi className="w-3 h-3 text-emerald-400" /> Wi-Fi 6E
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <Battery className="w-3.5 h-3.5" /> 98%
                  </span>
                </div>
              </div>

              {/* Game View */}
              <div className="relative">
                {children}
                {scanlines && <div className="absolute inset-0 crt-overlay pointer-events-none z-30" />}
              </div>
            </div>

            {/* Right Controller Grip */}
            <div className="w-32 flex flex-col items-center justify-center gap-6 shrink-0 py-4">
              {/* ABXY Action Buttons */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute top-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-yellow-400">
                  Y
                </div>
                <div className="absolute bottom-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                  A
                </div>
                <div className="absolute left-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                  X
                </div>
                <div className="absolute right-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-red-400">
                  B
                </div>
              </div>

              {/* Right Thumbstick */}
              <div className="w-14 h-14 rounded-full bg-slate-950 border-4 border-slate-700 shadow-inner flex items-center justify-center cursor-pointer hover:border-emerald-500 transition">
                <div className="w-9 h-9 rounded-full bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-950" />
                </div>
              </div>

              {/* Plus / Menu button */}
              <div className="w-6 h-3 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* RIG 4: Clean Pro Fullscreen */}
      {activeRig === "clean" && (
        <div className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl animate-fade-in relative">
          {children}
          {scanlines && <div className="absolute inset-0 crt-overlay pointer-events-none z-30" />}
        </div>
      )}
    </div>
  );
}
