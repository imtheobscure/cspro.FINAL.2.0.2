import { getCurrentUser } from "@/lib/auth";
import { getLearnerDashboard } from "@/lib/queries";
import { ProfileForm } from "@/components/ProfileForm";
import { Card, SectionTitle } from "@/components/ui";

export default async function ProfilePage() {
  const { user, profile, isGuest } = await getCurrentUser();
  const dash = await getLearnerDashboard(user.id);
  const known = dash.vocab.filter((v) => v.status === "known" || v.status === "mastered");
  const learning = dash.vocab.filter((v) => !["known", "mastered"].includes(v.status));
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <SectionTitle sub="Everything the lesson generator and the tutor know about you. Change it any time — new lessons adapt immediately.">Learner profile</SectionTitle>
      <ProfileForm initial={{ name: user.name, cefrLevel: profile.cefrLevel, nativeLanguage: profile.nativeLanguage, targetLanguage: profile.targetLanguage, interests: profile.interests, goals: profile.goals, weaknesses: profile.weaknesses, facts: profile.facts }} isGuest={isGuest} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <h3 className="font-bold">Known vocabulary ({known.length})</h3>
          <p className="mt-1 text-sm text-zinc-400">{known.map((v) => v.word).join(", ") || "—"}</p>
        </Card>
        <Card>
          <h3 className="font-bold">Learning vocabulary ({learning.length})</h3>
          <p className="mt-1 text-sm text-zinc-400">{learning.map((v) => v.word).join(", ") || "—"}</p>
        </Card>
        <Card>
          <h3 className="font-bold">Grammar history ({dash.grammar.length})</h3>
          <p className="mt-1 text-sm text-zinc-400">{dash.grammar.map((g) => `${g.name} (${g.status})`).join(", ") || "—"}</p>
        </Card>
      </div>
    </div>
  );
}
