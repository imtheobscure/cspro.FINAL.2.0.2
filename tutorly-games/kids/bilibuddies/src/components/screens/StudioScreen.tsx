"use client";

import { useMemo } from "react";
import { Studio } from "@/components/Studio";
import { StudioProvider } from "@/lib/studio";
import type { ModeId } from "@/lib/studio";
import { listStudents } from "@/lib/students";

/**
 * The studio, opened from a hash link.
 *
 * The old build read `?theme=…&sub=…&mode=…` on the server and seeded the
 * provider with rows from Postgres. Both of those are gone in the static build:
 * the query comes from the hash (`#/studio?theme=self&sub=body`) and the children
 * come from this device, so a tutor can deep-link a lesson and refresh it mid-class
 * without losing anything.
 */
export function StudioScreen({ theme, sub, mode }: { theme?: string; sub?: string; mode?: string }) {
  const students = useMemo(() => listStudents(), []);
  return (
    <StudioProvider students={students} init={{ theme, sub, mode: mode as ModeId | undefined }}>
      <Studio students={students} />
    </StudioProvider>
  );
}
