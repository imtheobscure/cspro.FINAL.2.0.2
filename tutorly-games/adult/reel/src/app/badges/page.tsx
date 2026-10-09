import { getCurrentUser } from "@/lib/auth";
import { getLearnerDashboard } from "@/lib/queries";
import { cx, RARITY_COLORS, SectionTitle } from "@/components/ui";

export default async function BadgesPage() {
  const { user } = await getCurrentUser();
  const dash = await getLearnerDashboard(user.id);
  const earnedIds = new Map(dash.earned.map((e) => [e.badge.id, e.earnedAt]));
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub={`${earnedIds.size} of ${dash.allBadges.length} unlocked. Conditions are machine-readable, so new badges can be added without code changes.`}>Badges</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {dash.allBadges.map((b) => {
          const earnedAt = earnedIds.get(b.id);
          const color = RARITY_COLORS[b.rarity];
          return (
            <div key={b.id} className={cx("relative overflow-hidden rounded-3xl border p-5 transition", earnedAt ? "bg-white/[0.05]" : "border-white/5 bg-white/[0.02] opacity-70")} style={earnedAt ? { borderColor: `${color}66`, boxShadow: `0 0 40px ${color}22 inset` } : undefined}>
              <div className={cx("text-5xl", !earnedAt && "grayscale")}>{b.emoji}</div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                {b.rarity}
              </div>
              <h2 className="text-lg font-bold">{b.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">{b.description}</p>
              <p className="mt-3 text-[11px] text-zinc-500">
                Condition: <code className="rounded bg-white/5 px-1">{b.condition.type} ≥ {b.condition.count}</code>
              </p>
              {earnedAt ? <p className="mt-2 text-xs text-emerald-300">Unlocked {earnedAt.toLocaleDateString()}</p> : <p className="mt-2 text-xs text-zinc-500">Locked</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
