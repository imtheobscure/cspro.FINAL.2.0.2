import { json } from "@/lib/api";
import { recentImports, providerStatuses } from "@/modules/discovery/service";

/** Which catalogs are live right now, and what has already been added to the library. */
export async function GET() {
  const [providers, recent] = await Promise.all([providerStatuses(), recentImports(12)]);
  return json({ providers, recent });
}
