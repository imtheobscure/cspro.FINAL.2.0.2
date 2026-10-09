import TutorlyConsolClient from "@/components/TutorlyConsolClient";

/**
 * The console's only page.
 *
 * It used to open with `await db.execute(sql\`select 1\`)` — a PostgreSQL liveness
 * check that made the whole app dynamic and, when no database was configured,
 * logged a warning before rendering exactly the same UI. The workspace, the
 * leaderboard and the loaded games all live in the browser
 * (`lib/localApi.ts`), so there is no server work left here to do: the page is a
 * plain client render, which is what lets `npm run build` export it as files.
 */
export default function HomePage() {
  return <TutorlyConsolClient />;
}
