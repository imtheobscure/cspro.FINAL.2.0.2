import { Competency, CompetencyStatus, Need, Skill } from '../types2';

/**
 * Keep the competency list in step with the needs' learning paths.
 *
 * A "competency" is the trackable, ratable version of a skill that lives inside a
 * need (`need.learningPath`), and the profile shows both: the need folders in
 * "Competency Overview" and the skills inside them. Every place that edits a need
 * therefore has to maintain the pair, and doing that by hand in each component is
 * how they drift apart — a skill with no competency is invisible in the radar
 * chart, and a competency with no need has nowhere to be edited.
 *
 * Rules (all of them are about not losing data):
 *   • a skill that exists in the needs always has a competency;
 *   • progress/rating copy across, so editing either side is the same number;
 *   • a competency that WAS derived from a need and has since been deleted from
 *     that need goes away with it;
 *   • any other competency (a "General Competency", or one added by the AI import)
 *     is left exactly as it is — this function never prunes what it did not create.
 *
 * One wrinkle worth knowing: competencies are matched by NAME, across needs. Two
 * needs that both list "Small talk" share a single tracked competency (the last
 * need's rating wins), which is how the rest of the app has always treated them —
 * the profile shows one radar row per competency, not one per need-and-skill pair.
 */
export function syncCompetenciesFromNeeds(
  nextNeeds: Need[],
  previousNeeds: Need[],
  existing: Competency[] | undefined,
): Competency[] {
  const skillNames = (needs: Need[]) =>
    new Set(
      needs
        .flatMap((n) => n.learningPath || [])
        .map((s: any) => String(s?.name || '').trim().toLowerCase())
        .filter(Boolean),
    );

  const nextNames = skillNames(nextNeeds);
  const previousNames = skillNames(previousNeeds);
  const byName = new Map<string, Competency>();

  (existing || []).forEach((c) => {
    if (!c?.name?.trim()) return;
    const key = c.name.trim().toLowerCase();
    const derivedAndGone = previousNames.has(key) && !nextNames.has(key);
    if (derivedAndGone) return; // the skill was deleted from its need
    byName.set(key, c);
  });

  nextNeeds.forEach((need) => {
    (need.learningPath || []).forEach((skill: any) => {
      const name = String(skill?.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const progress = typeof skill.progress === 'number' ? skill.progress : 0;
      const rating = typeof need.rating === 'number' ? need.rating : 3;
      const current = byName.get(key);

      if (current) {
        byName.set(key, {
          ...current,
          name, // follow a rename
          rating,
          progress,
          initialProgress:
            typeof current.initialProgress === 'number' ? current.initialProgress : progress,
        });
        return;
      }

      byName.set(key, {
        id: skill.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        icon: 'target',
        rating,
        initialProgress: progress,
        progress,
        status: progress >= 40 ? CompetencyStatus.OnTrack : CompetencyStatus.NeedsWork,
      });
    });
  });

  return Array.from(byName.values());
}

/** A brand-new, empty need with a stable id. */
export function createNeed(name = '', rating = 3): Need {
  return {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    rating,
    learningPath: [],
  };
}

/** A brand-new competency inside a need. */
export function createSkill(name: string, progress = 0): Skill {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    progress,
  };
}
