import React from 'react';
import { LeaderboardEntry } from '../types/game';
import { Trophy, Award, Target, Flame, Download, X } from 'lucide-react';
import { downloadJSONFile } from '../utils/aiPromptGenerator';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  playerScore: number;
  playerWaves: number;
  playerAccuracy: number;
  playerName: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  playerScore,
  playerWaves,
  playerAccuracy,
  playerName,
}) => {
  if (!isOpen) return null;

  const handleDownloadReport = () => {
    const reportData = {
      title: 'Runner - English Arena Classroom Report',
      timestamp: new Date().toISOString(),
      player: playerName || 'Commander',
      score: playerScore,
      highestWave: playerWaves,
      overallAccuracyPercent: `${playerAccuracy}%`,
      leaderboardSnapshot: entries.slice(0, 10),
    };
    downloadJSONFile(reportData, `student_performance_report_${Date.now()}.json`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-label="Mission records" className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 px-6 py-4 border-b border-amber-400/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-amber-300/40 text-amber-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Mission Records & Arena Standings</h2>
              <p className="text-xs text-amber-100 font-semibold">Illustrative rival scores. Your personal best is saved on this device.</p>
            </div>
          </div>
          <button
            aria-label="Close records"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-black/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player's Current Performance Banner */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Your Score</span>
            <div className="text-xl md:text-2xl font-black text-amber-400 flex items-center justify-center gap-1.5">
              <Flame className="w-5 h-5 text-amber-500" />
              {playerScore.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Wave Survived</span>
            <div className="text-xl md:text-2xl font-black text-sky-400 flex items-center justify-center gap-1.5">
              <Award className="w-5 h-5 text-sky-400" />
              Wave {playerWaves}
            </div>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Accuracy</span>
            <div className="text-xl md:text-2xl font-black text-emerald-400 flex items-center justify-center gap-1.5">
              <Target className="w-5 h-5 text-emerald-400" />
              {playerAccuracy}%
            </div>
          </div>
        </div>

        {/* Dynamic Leaderboard Table */}
        <div className="p-6 overflow-y-auto space-y-2">
          {entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const rankEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;

            return (
              <div
                key={entry.rank}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  entry.isPlayer 
                    ? 'bg-amber-500/15 border-amber-500/80 ring-1 ring-amber-400' 
                    : isTop3 
                    ? 'bg-slate-800/80 border-slate-700 shadow-md' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 text-center font-black ${isTop3 ? 'text-xl' : 'text-sm text-slate-400'}`}>
                    {rankEmoji}
                  </span>
                  <span className="text-lg">{entry.country}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm md:text-base">
                        {entry.name}
                      </span>
                      {entry.badge && (
                        <span className="text-[10px] bg-sky-900/80 border border-sky-400 text-sky-300 px-2 py-0.5 rounded font-black">
                          {entry.badge}
                        </span>
                      )}
                      {entry.isPlayer && (
                        <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">Wave {entry.waves} • {entry.accuracy}% Accuracy</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg md:text-xl font-black text-amber-300">
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="text-[10px] block text-slate-400 font-semibold uppercase">PTS</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Session Download */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Local session records. Rival entries are fictional, not live online players.</span>
          <button
            type="button"
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-xl shadow transition-all"
          >
            <Download className="w-4 h-4" />
            Download Student Report (.json)
          </button>
        </div>

      </div>
    </div>
  );
};
