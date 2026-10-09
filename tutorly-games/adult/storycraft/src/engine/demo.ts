import type { GameState } from "./types";

/** A fully-featured demo scene exercising every trigger, for instant playability. */
export function demoSceneHTML(s: GameState): string {
  const players = s.entities.filter((e) => e.kind === "player");
  const npc = s.entities.find((e) => e.kind === "npc");
  const p1 = players[0];
  const p2 = players[1] ?? players[0];

  return `<div class="aw-scene" style="position:relative;min-height:100%;background:
    radial-gradient(1200px 600px at 50% -10%, #1e1b4b, transparent),
    linear-gradient(180deg,#0b1020,#05070f);overflow:hidden">
  <img src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=70"
       style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.28;filter:saturate(1.2)" alt="ancient hall">
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 60%, transparent 30%, rgba(0,0,0,.7))"></div>
  <div style="position:relative;padding:48px;max-width:760px;margin:0 auto;text-align:center">
    <h1 style="font-family:Georgia,serif;font-size:clamp(28px,5vw,52px);
        background:linear-gradient(90deg,#c4b5fd,#f0abfc);-webkit-background-clip:text;background-clip:text;color:transparent;
        text-shadow:0 0 40px rgba(167,139,250,.4)">The Shattered Throne</h1>
    <p style="color:#cbd5e1;font-size:18px;line-height:1.7;margin-top:18px">
      Torchlight gutters across the bones of fallen kings. ${npp(p1)} feels the cold breath of
      <b style="color:#f0abfc">${npp(npc)}</b> upon the nape of their neck. Somewhere, a phone that should not exist begins to ring…
    </p>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:30px;flex-wrap:wrap">
      <div style="padding:16px 22px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
        ⚔️ A blade glints in the rubble
      </div>
      <div style="padding:16px 22px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
        🚪 A hidden door breathes cold air
      </div>
    </div>
  </div>

  <div class="aw-opening" hidden>A storm gathers as the Shattered Throne awakens beneath your feet.</div>

  <div class="aw-triggers" hidden>
    <i data-aw="weather" data-kind="storm"></i>
    <i data-aw="speak" data-id="narrator" data-text="Torchlight gutters across the bones of fallen kings."></i>
    ${npc ? `<i data-aw="speak" data-id="${npc.id}" data-text="So... the little ones return to my hall. How delicious."></i>` : ""}
    <i data-aw="ring"></i>
    <i data-aw="item" data-id="${p1.id}" data-emoji="🗡️" data-name="Bone Dagger" data-qty="1" data-rarity="epic"></i>
    <i data-aw="status" data-id="${p2.id}" data-emoji="☠️" data-label="Dread" data-turns="2"></i>
    <i data-aw="stat" data-id="${p2.id}" data-key="health" data-op="add" data-val="-15"></i>
    ${s.settings.mode === "adult" ? `<i data-aw="stat" data-id="${p1.id}" data-key="hunger" data-op="add" data-val="20"></i>` : ""}
    ${npc ? `<i data-aw="relation" data-from="${npc.id}" data-to="${p1.id}" data-op="add" data-val="-15"></i>` : ""}
    <i data-aw="scare" data-emoji="👹"></i>
    <i data-aw="prompt" data-id="${p1.id}" data-hint1="Grab the glinting blade" data-hint2="Confront the Hollow King" data-hint3="Slip toward the hidden door"></i>
    ${players[1] ? `<i data-aw="prompt" data-id="${p2.id}" data-hint1="Shield your ally" data-hint2="Search the rubble" data-hint3="Answer the ringing phone"></i>` : ""}
    <i data-aw="widget" data-widget="questlog" data-title="Escape the Shattered Throne" data-action="show"></i>
  </div>
</div>`;
}

function npp(e?: { name: string }) {
  return e ? `<b style="color:#a5b4fc">${e.name}</b>` : "the hero";
}
