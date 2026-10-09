"use client";

import { Stage } from "@/components/modes/Stage";
import { BottomDock, RestorePanelButton, SideRail, TopBar, useTutorShortcuts } from "@/components/TutorPanel";
import { useTutor } from "@/lib/store";

export function PlayScreen() {
  useTutorShortcuts();
  const panelHidden = useTutor((s) => s.panelHidden);

  return (
    <div className="dot-grid flex min-h-screen flex-col bg-cream">
      {!panelHidden && <TopBar />}
      <div className="flex min-h-0 flex-1">
        {!panelHidden && <SideRail />}
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
          <Stage />
        </main>
      </div>
      {!panelHidden && <BottomDock />}
      <RestorePanelButton />
    </div>
  );
}

