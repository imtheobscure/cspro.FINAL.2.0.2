import TutorlyApp from "@/components/tutorly-app";

/**
 * The whole product is one screen: `TutorlyApp` owns the navigation, and every
 * piece of state it needs comes from the browser workspace (see
 * `lib/local-store.ts`), so this page is static.
 *
 * It previously pinged PostgreSQL on every request (`export const dynamic =
 * 'force-dynamic'`) just to prove the database was reachable. With the workspace
 * in the browser there is nothing to ping, and the page can be exported.
 */
export default function HomePage() {
  return <TutorlyApp />;
}
