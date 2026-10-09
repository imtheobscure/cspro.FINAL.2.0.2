import React, { useMemo, useState } from 'react';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { useAutomationStore } from '../../../store/useAutomationStore';
import SectionCard from '../SectionCard';
import { getAvatarUrl } from '../../../services/avatarService';
import { getWeeklyActivityStats, buildCompetitionAiPrompt } from '../../../utils/weeklyStats';
import { getCategoryById, LEARNER_CATEGORIES } from '../../../data/learnerCategories';
// Fix: Changed react-router-dom import to named import.
import { Link } from 'react-router-dom';

const CompetitionLeaderboard: React.FC = () => {
    const learners = useLearnerStore(state => state.learners);
    const assignMatches = useLearnerStore(state => state.assignMatches);
    const competitionRoundWeek = useLearnerStore(state => state.competitionRoundWeek);
    const competitionRoundYear = useLearnerStore(state => state.competitionRoundYear);
    const lastSettledRound = useLearnerStore(state => state.lastSettledRound);
    const homeworkAssignments = useAutomationStore(state => state.homeworkAssignments);
    const [copied, setCopied] = useState(false);

    const roundLabel = competitionRoundWeek && competitionRoundYear
        ? `Round W${competitionRoundWeek} · ${competitionRoundYear}`
        : 'Round not started';

    const leaderboard = useMemo(() => {
        return learners
            .filter(l => (l.competitionWins || 0) > 0)
            .sort((a, b) => (b.competitionWins || 0) - (a.competitionWins || 0));
    }, [learners]);

    const medalIcons = ['🥇', '🥈', '🥉'];

    const handleCopyAiPrompt = async () => {
        // Pre-fills the AI review prompt with the settled results + current pairings.
        const prompt = buildCompetitionAiPrompt(learners, homeworkAssignments, {
            roundWeek: competitionRoundWeek,
            roundYear: competitionRoundYear,
        });
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error("Failed to copy competition AI prompt:", err);
            alert("Could not copy the prompt. Your browser may block clipboard access.");
        }
    };

    const activeCompetitors = learners.filter(l => l.isCompeting).length;

    // ── Next weekly pairings preview (deterministic, grouped by category) ──
    const nextPairings = useMemo(() => {
        const competing = learners.filter(l => l.isCompeting);
        const byCategory = new Map<string, typeof competing>();
        competing.forEach(l => {
            const key = l.category || 'none';
            if (!byCategory.has(key)) byCategory.set(key, []);
            byCategory.get(key)!.push(l);
        });
        const pairs: Array<{ category: string; a?: typeof competing[number]; b?: typeof competing[number] }> = [];
        byCategory.forEach((group, category) => {
            for (let i = 0; i < group.length; i += 2) {
                pairs.push({ category, a: group[i], b: group[i + 1] });
            }
        });
        return pairs;
    }, [learners]);

    // ── Per-week win history from weeklyWinRecords ──
    const weeklyWins = useMemo(() => {
        const records = learners.flatMap(l => (l.weeklyWinRecords || []).map(r => ({ ...r, winnerId: l.id, winnerName: l.name })));
        return records.sort((a, b) => (b.year - a.year) || (b.week - a.week));
    }, [learners]);

    return (
        <SectionCard title="🏆 Competition Leaderboard" icon={<i className="fas fa-trophy"></i>}>
            {/* FIX: Reassign Players was invisible — explicit colors, border and shadow for clear visibility */}
            <button
                onClick={assignMatches}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-black py-2.5 px-4 rounded-xl border-2 border-orange-700 shadow-md shadow-orange-500/30 transition-all mb-4"
            >
                <i className="fas fa-shuffle mr-2"></i>
                Reassign Players
                <span className="ml-2 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full align-middle">
                    pairs learners two-by-two inside their category
                </span>
            </button>

            {/* Next weekly pairings preview — shown BEFORE the tutor clicks Reassign */}
            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="font-extrabold text-xs text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <i className="fas fa-eye text-indigo-500"></i> Preview — Next Weekly Pairings
                        <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {activeCompetitors} competing
                        </span>
                    </h4>
                    <div className="space-y-1.5">
                        {nextPairings.map((pair, i) => {
                            const cat = getCategoryById(pair.category);
                            return (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border shrink-0 ${cat ? cat.chip : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {cat ? `${cat.emoji} ${cat.name}` : 'Uncategorized'}
                                    </span>
                                    {pair.a && pair.b ? (
                                        <span className="font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                                            {pair.a.name} <span className="text-[9px] font-black bg-slate-800 text-white px-1.5 py-0.5 rounded-full">VS</span> {pair.b.name}
                                        </span>
                                    ) : pair.a ? (
                                        <span className="font-semibold text-amber-700">{pair.a.name} — <span className="text-[10px] font-bold">waiting for a same-category rival</span></span>
                                    ) : null}
                                </div>
                            );
                        })}
                        {nextPairings.length === 0 && (
                            <p className="text-[11px] text-slate-400 font-semibold">No learners opted into weekly matching yet — open a learner's Competition tab and tick "Participate in weekly matching", then press Reassign Players.</p>
                        )}
                    </div>
                    <p className="text-[9px] text-slate-400 font-semibold mt-2">⚡ Pairs are re-shuffled randomly inside each category when you press Reassign Players — and automatically every Sunday 23:59 as the weekly round rolls over ({roundLabel}).</p>
                </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {leaderboard.length > 0 ? (
                    leaderboard.slice(0, 10).map((learner, index) => {
                        const category = getCategoryById(learner.category);
                        const weekly = getWeeklyActivityStats(learner, homeworkAssignments);
                        return (
                            <Link to={`/learner/${learner.id}`} key={`${learner.id}-${index}`} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border-l-4 border-yellow-400 hover:bg-gray-100 transition-colors">
                                <div className="font-bold text-xl w-8 text-center text-yellow-600">{index < 3 ? medalIcons[index] : index + 1}</div>
                                <img src={getAvatarUrl(learner.gender, learner.avatarId, learner.name)} alt={learner.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{learner.name}</p>
                                    {category && (
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border mt-0.5 ${category.chip}`}>
                                            {category.emoji} {category.name}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="font-extrabold text-brand-green text-lg">{learner.competitionWins} wins</p>
                                    <p className="text-[10px] text-gray-400 font-semibold">✨ {weekly.xpEarned} XP this week</p>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <p className="text-center text-gray-500 py-4">No winners yet. Complete a match to appear on the leaderboard!</p>
                )}
            </div>

            {/* Weekly category standings */}
            <div className="mt-5 pt-4 border-t border-gray-100">
                <h4 className="font-extrabold text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <span>🎯</span> Weekly Standings by Category
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{activeCompetitors} competing</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {LEARNER_CATEGORIES.map(cat => {
                        const members = learners.filter(l => l.category === cat.id);
                        if (members.length === 0) return null;
                        const ranked = [...members].sort((a, b) => getWeeklyActivityStats(b, homeworkAssignments).xpEarned - getWeeklyActivityStats(a, homeworkAssignments).xpEarned);
                        return (
                            <div key={cat.id} className={`p-2.5 rounded-xl border ${cat.chip} bg-white`}>
                                <p className="text-[11px] font-black flex items-center gap-1.5 mb-1.5">
                                    <span>{cat.emoji}</span> {cat.name}
                                    <span className="ml-auto text-[9px] font-bold opacity-60">{members.length} learners</span>
                                </p>
                                {ranked.slice(0, 3).map((l, i) => {
                                    const s = getWeeklyActivityStats(l, homeworkAssignments);
                                    return (
                                        <div key={l.id} className="flex items-center justify-between text-[10px] font-semibold text-slate-600 py-0.5">
                                            <span className="truncate pr-2">{i + 1}. {l.name}</span>
                                            <span className="shrink-0 font-black text-slate-800">✨{s.xpEarned} XP</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Weekly win history — per-week records with auto-awarded bonus XP */}
            <div className="mt-5 pt-4 border-t border-gray-100">
                <h4 className="font-extrabold text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <span>📜</span> Weekly Win History
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">+100 XP per win</span>
                </h4>
                {weeklyWins.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {weeklyWins.slice(0, 20).map((w, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">W{w.week} · {w.year}</span>
                                <span className="font-bold text-slate-800 truncate">{w.winnerName}</span>
                                <span className="text-slate-400">defeated</span>
                                <span className="font-semibold text-slate-600 truncate">{w.opponentName}</span>
                                <span className="ml-auto shrink-0 font-black text-amber-600">+{w.bonusXp} XP 🎁</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Last Week Settled — auto-settlement results digest (shown before the tutor copies the AI prompt) */}
            <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div>
                        <h4 className="font-extrabold text-sm text-slate-700 flex items-center gap-2">
                            <span>🧾</span> Last Week Settled
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Auto-settled results from the round that ended at the Sunday deadline — winners, ties, and each pair's XP.
                        </p>
                    </div>
                    {lastSettledRound && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                            Round W{lastSettledRound.week} · {lastSettledRound.year} — settled {lastSettledRound.date}
                        </span>
                    )}
                </div>

                {lastSettledRound && lastSettledRound.pairs.length > 0 && (
                    <>
                        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                            {(() => {
                                const winners = lastSettledRound.pairs.filter(p => !p.tie).length;
                                const ties = lastSettledRound.pairs.length - winners;
                                return (
                                    <>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">👥 {lastSettledRound.pairs.length} duels</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🏆 {winners} winner{(winners === 1 ? '' : 's')}</span>
                                        {ties > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">🤝 {ties} tie{(ties === 1 ? '' : 's')}</span>}
                                    </>
                                );
                            })()}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {lastSettledRound.pairs.map((pair, i) => {
                                const cat = getCategoryById(pair.category);
                                const aWon = !pair.tie && pair.winnerId === pair.a.id;
                                const bWon = !pair.tie && pair.winnerId === pair.b.id;
                                return (
                                    <div key={i} className={`rounded-xl border px-3 py-2.5 bg-white ${pair.tie ? 'border-slate-200' : aWon ? 'border-amber-300 bg-amber-50/40' : bWon ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-1.5">
                                            {cat && <span className={`px-1.5 py-0.5 rounded-full border ${cat.chip}`}>{cat.emoji} {cat.name}</span>}
                                            <span className="text-slate-300">·</span>
                                            <span>Duel {i + 1}</span>
                                            {!pair.tie && (
                                                <span className="ml-auto inline-flex items-center gap-1 font-black text-amber-600 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                                    🏆 {pair.winnerId === pair.a.id ? pair.a.name : pair.b.name} wins +{pair.bonusXp} XP
                                                </span>
                                            )}
                                            {pair.tie && (
                                                <span className="ml-auto inline-flex items-center gap-1 font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">🤝 Tied week — no winner</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[pair.a, pair.b].map((learner, side) => {
                                                const won = !pair.tie && pair.winnerId === learner.id;
                                                return (
                                                    <div key={side} className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border ${won ? 'border-amber-400 bg-amber-50 font-bold' : 'border-slate-100 bg-slate-50'}`}>
                                                        <span className="font-black text-slate-700 truncate flex-1">{won ? '👑 ' : ''}{learner.name}</span>
                                                        <span className="shrink-0 font-black text-slate-800">✨{learner.xp} XP</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-semibold mt-1.5">
                                            XP snapshot taken at the Sunday deadline from each learner's 7-day activity.
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Weekly Performance Review — AI prompt generator */}
            <div className="mt-5 pt-4 border-t border-gray-100 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h4 className="font-extrabold text-sm text-indigo-900 flex items-center gap-2">
                            <span>🤖</span> Weekly Performance Review
                        </h4>
                    </div>
                    <button
                        onClick={handleCopyAiPrompt}
                        className={`flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer ${copied
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'}`}
                    >
                        <i className={`fas ${copied ? 'fa-check' : 'fa-clipboard-list'}`}></i>
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                {copied && (
                    <p className="text-[10px] font-bold text-emerald-700 mt-2 animate-fade-in">
                        ✅ Full competition stats prompt copied — paste it into Gemini / ChatGPT / Claude for the weekly review.
                    </p>
                )}
            </div>
        </SectionCard>
    );
};

export default CompetitionLeaderboard;