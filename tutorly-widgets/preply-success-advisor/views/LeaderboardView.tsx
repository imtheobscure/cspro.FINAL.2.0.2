import React, { useMemo, useState } from "react";
import type { Platform, Tutor } from "../types";
import { allPlatforms, platformOf, tutorPlatforms, worksOnPlatform } from "../lib/platforms";
import { Avatar, Btn, Card, Empty, Field, Gauge, Meter, Pill, PlatformMark, SectionTitle, inputClass } from "../components/ui";
import { TIERS, badgesFor, averages, healthOf, latestSnapshot, phaseMeta, scoreColor, tierFor, totalEarnings, weekTrend } from "../lib/domain";
import { moneyPair, num, toman, usd } from "../lib/format";

/**
 * The leaderboard.
 *
 * A tutor's rank here is the whole point of the gamification: the score is the same
 * Profile Power Score the auditor produces, so improving the profile visibly moves the
 * card up, changes its tier, and adds a crown. Tiers add the shine (blue shimmer,
 * purple pulse, gold particles) and the mentor reads the roster's momentum in one
 * screen: who is climbing, who is sliding, who has never been scored.
 */

type SortKey = "score" | "earnings" | "rating" | "health" | "momentum";

interface LeaderboardViewProps {
  tutors: Tutor[];
  customPlatforms: Platform[];
  rialPerUsd: number;
  onOpenTutor: (id: string) => void;
}

const TierCard: React.FC<{
  tutor: Tutor;
  platform: Platform;
  customPlatforms: Platform[];
  rank: number;
  rialPerUsd: number;
  onOpen: () => void;
}> = ({ tutor, platform, customPlatforms, rank, rialPerUsd, onOpen }) => {
  const score = tutor.audit?.powerScore ?? 0;
  const tier = tierFor(score);
  const trend = weekTrend(tutor);
  const avg = averages(tutor, 4);
  const last = latestSnapshot(tutor);
  const badges = badgesFor(tutor, totalEarnings(tutor), rialPerUsd);
  const health = healthOf(tutor);
  const scored = !!tutor.audit;

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border bg-white p-4 transition-all hover:-translate-y-1 ${tier.glow}`}
      style={{ borderColor: `${tier.color}33` }}
    >
      {/* Legendary gets the particles, Epic the pulse, Rare the shimmer — all CSS. */}
      {tier.id === "legendary" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="particle absolute h-1 w-1 rounded-full bg-amber-300"
              style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.45}s`, animationDuration: `${4 + (i % 5)}s` }}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-start gap-3">
        <div className="relative">
          <Avatar src={tutor.avatar} name={tutor.name} size={56} glow={tier.glow} ring={`${tier.color}66`} />
          <span
            className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold text-white shadow"
            style={{ background: tier.color }}
          >
            {rank}
          </span>
          {tier.id === "legendary" && <span className="absolute -right-2 -top-3 text-lg">👑</span>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button onClick={onOpen} className="truncate text-left text-base font-bold hover:text-[#FF79AC]">
              {tutor.name}
            </button>
            <span className="text-xs">{phaseMeta(tutor.phase).emoji}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Pill tone={platform.color} title={platform.colorSource}>
              <PlatformMark platform={platform} size={13} /> {platform.name}
            </Pill>
            {tutorPlatforms(tutor, customPlatforms)
              .filter((p) => p.id !== platform.id)
              .map((p) => (
                <Pill key={p.id} tone={p.color} title={`Also on ${p.name}`} className="!px-2 !py-0.5">
                  <PlatformMark platform={p} size={12} />
                </Pill>
              ))}
            <Pill tone={tier.color} title="Profile Power Score tier">
              {tier.emoji} {tier.name}
            </Pill>
            {trend.direction !== "flat" && (
              <span
                className={`rounded-full px-2 py-1 text-[12px] font-bold ${
                  trend.direction === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                }`}
                title="Week over week earnings"
              >
                {trend.direction === "up" ? "▲" : "▼"} {Math.abs(trend.earningsPercent)}%
              </span>
            )}
            {health.burnoutRisk && (
              <Pill
                tone={health.overloaded ? "#EF4444" : "#F59E0B"}
                title={
                  health.overloaded
                    ? "Low health score with real load on top — check the load before adding hours"
                    : "Low health score — information is missing, not necessarily load"
                }
              >
                🫀 {health.score}%
              </Pill>
            )}
          </div>
        </div>

        <div className="shrink-0 text-center">
          <Gauge value={score} color={tier.color} size={78} label={scored ? String(score) : "—"} sublabel="power" />
        </div>
      </div>

      <div className="relative mt-3">
        <Meter
          value={tutor.audit?.successProbability ?? 0}
          color={tier.color}
          label="Conversion readiness"
          right={scored ? `${tutor.audit?.successProbability}%` : "not scored"}
        />
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/[0.06] p-2">
          <p className="text-[11px] uppercase tracking-wide text-[#121118]/78">Rating</p>
          <p className="text-sm font-bold tabular-nums">{avg.rating ? avg.rating.toFixed(1) : "—"}</p>
        </div>
        <div className="rounded-xl bg-black/[0.06] p-2">
          <p className="text-[11px] uppercase tracking-wide text-[#121118]/78">Response</p>
          <p className="text-sm font-bold tabular-nums">{avg.responseHours ? `${avg.responseHours}h` : "—"}</p>
        </div>
        <div className="rounded-xl bg-black/[0.06] p-2">
          <p className="text-[11px] uppercase tracking-wide text-[#121118]/78">Last week</p>
          <p className="text-sm font-bold tabular-nums">{last ? usd(last.earningsUsd) : "—"}</p>
        </div>
      </div>

      {last && (
        <p className="relative mt-2 text-center text-[12px] text-[#121118]/82">
          {moneyPair(last.earningsUsd, rialPerUsd)} last week · {num(avg.lessons, 1)} lessons a week
        </p>
      )}

      {badges.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1">
          {badges.map((b) => (
            <Pill key={b.id} tone="#F59E0B" title={b.detail}>
              {b.emoji} {b.label}
            </Pill>
          ))}
        </div>
      )}

      {!scored && (
        <p className="relative mt-3 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[12px] font-semibold text-amber-700">
          Not scored yet — run the Master AI audit on this profile.
        </p>
      )}

      <div className="relative mt-3 flex justify-end">
        <Btn size="sm" variant="outline" onClick={onOpen}>
          Open profile
        </Btn>
      </div>
    </div>
  );
};

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ tutors, customPlatforms, rialPerUsd, onOpenTutor }) => {
  const [sort, setSort] = useState<SortKey>("score");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [query, setQuery] = useState("");

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tutors.filter((t) => {
      // Multi-platform tutors must be found under every platform they work on, and under
      // either spelling of their name.
      if (platformFilter !== "all" && !worksOnPlatform(t, platformFilter)) return false;
      if (tierFilter !== "all" && tierFor(t.audit?.powerScore ?? 0).id !== tierFilter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.latinName.toLowerCase().includes(q)) return false;
      return true;
    });
    const score = (t: Tutor) => t.audit?.powerScore ?? -1;
    const sorters: Record<SortKey, (a: Tutor, b: Tutor) => number> = {
      score: (a, b) => score(b) - score(a),
      earnings: (a, b) => (latestSnapshot(b)?.earningsUsd ?? 0) - (latestSnapshot(a)?.earningsUsd ?? 0),
      rating: (a, b) => averages(b, 4).rating - averages(a, 4).rating,
      health: (a, b) => healthOf(b).score - healthOf(a).score,
      momentum: (a, b) => weekTrend(b).earningsPercent - weekTrend(a).earningsPercent,
    };
    return [...list].sort(sorters[sort]);
  }, [tutors, sort, platformFilter, tierFilter, query]);

  const platforms = allPlatforms(customPlatforms);
  const podium = ranked.slice(0, 3);
  const unscored = tutors.filter((t) => !t.audit).length;

  return (
    <div>
      <SectionTitle
        icon="🏆"
        title="Leaderboard"
        sub="Ranked by Profile Power Score. Tiers shift as profiles improve."
      />

      {/* Tier legend */}
      <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TIERS.map((t) => {
          const count = tutors.filter((x) => tierFor(x.audit?.powerScore ?? 0).id === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTierFilter(tierFilter === t.id ? "all" : t.id)}
              className={`flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-all ${t.glow} ${
                tierFilter === t.id ? "border-[#121118]/20" : "border-black/12"
              }`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: t.color }}>
                  {t.name}
                </p>
                <p className="text-[12px] text-[#121118]/82">
                  {t.min}
                  {t.id === "legendary" ? "–100" : `–${TIERS[TIERS.indexOf(t) + 1].min - 1}`} · {count} tutor{count === 1 ? "" : "s"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {unscored > 0 && (
        <p className="mb-4 text-[12px] text-[#121118]/82">
          {unscored} profile{unscored === 1 ? "" : "s"} sit{unscored === 1 ? "s" : ""} in Common only because no audit has been run yet.
          Score them and the tiers sort themselves out.
        </p>
      )}

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Search" className="min-w-[180px] flex-1">
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tutor name…" />
          </Field>
          <Field label="Platform">
            <select className={inputClass} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
              <option value="all">All platforms</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sort by">
            <select className={inputClass} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="score">Profile Power Score</option>
              <option value="earnings">Last week's earnings</option>
              <option value="rating">Rating</option>
              <option value="health">Health score</option>
              <option value="momentum">Momentum (week over week)</option>
            </select>
          </Field>
          {(tierFilter !== "all" || platformFilter !== "all" || query) && (
            <Btn
              variant="ghost"
              onClick={() => {
                setTierFilter("all");
                setPlatformFilter("all");
                setQuery("");
              }}
            >
              Clear filters
            </Btn>
          )}
        </div>
      </Card>

      {ranked.length === 0 ? (
        <Empty
          icon="🏅"
          title={tutors.length ? "Nobody matches those filters" : "Nothing to rank yet"}
          body={
            tutors.length
              ? "Loosen the filters, or clear them to see the whole roster."
              : "Add tutors to the roster, run each profile through the Master AI audit, and this board fills up with tiers and scores."
          }
        />
      ) : (
        <>
          {podium.length >= 3 && (
            <div className="mb-5 grid gap-3 lg:grid-cols-3">
              {podium.map((t, i) => {
                const tier = tierFor(t.audit?.powerScore ?? 0);
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={t.id}
                    className={`relative flex items-center gap-3 overflow-hidden rounded-3xl p-4 text-white ${tier.glow}`}
                    style={{ background: `linear-gradient(135deg, ${tier.color}, #121118)` }}
                  >
                    <span className="text-3xl">{medals[i]}</span>
                    <Avatar src={t.avatar} name={t.name} size={44} ring="#ffffff66" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{t.name}</p>
                      <p className="text-[12px] opacity-80">
                        {t.audit ? `${tier.emoji} ${tier.name} · ${t.audit.powerScore}/100` : "Not scored yet — run the Master AI audit"}
                      </p>
                    </div>
                    <button onClick={() => onOpenTutor(t.id)} className="rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-bold">
                      Open
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ranked.map((t, i) => (
              <TierCard
                key={t.id}
                tutor={t}
                platform={platformOf(t.platformId, customPlatforms)}
                customPlatforms={customPlatforms}
                rank={i + 1}
                rialPerUsd={rialPerUsd}
                onOpen={() => onOpenTutor(t.id)}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-[#121118]/78">
            Roster total: {(ranked.reduce((a, t) => a + totalEarnings(t), 0) / 1000).toFixed(1)}k USD ·{" "}
            {toman(ranked.reduce((a, t) => a + totalEarnings(t), 0), rialPerUsd)} earned by everyone shown
          </p>
        </>
      )}
    </div>
  );
};

export default LeaderboardView;
