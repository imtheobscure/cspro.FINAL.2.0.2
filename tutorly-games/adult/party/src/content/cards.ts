/** The seventeen-card luck deck and the eleven power-up pick-ups. Every card is a rule, not a number. */

export type LuckId =
  | "fairy" | "thief" | "rocket" | "banana" | "star" | "heart" | "eraser" | "virus"
  | "shark" | "magnet" | "lifesaver" | "trap" | "seesaw" | "gold" | "boom" | "gift" | "baam";

export type LuckCard = {
  id: LuckId;
  name: string;
  icon: string;
  colour: string;
  blurb: string;
  rule: string;
  kind: "steal" | "gain" | "loss" | "chaos" | "swap";
  jr: boolean; // included in the gentler "Classic Jr" preset
};

export const LUCK_DECK: LuckCard[] = [
  { id: "fairy", name: "Fairy", icon: "🧚", colour: "#a78bfa", kind: "steal", jr: true,
    blurb: "Steal 50 from a team of your choice.", rule: "Pick a rival. 50 points move from them to you." },
  { id: "thief", name: "Thief", icon: "🦝", colour: "#f87171", kind: "steal", jr: false,
    blurb: "A rival takes 50 from you.", rule: "Choose the rival who robs you — they gain 50, you lose 50." },
  { id: "rocket", name: "Rocket", icon: "🚀", colour: "#60a5fa", kind: "gain", jr: true,
    blurb: "Blast just ahead of the leader.", rule: "Your score becomes the leader's score + 10." },
  { id: "banana", name: "Banana", icon: "🍌", colour: "#facc15", kind: "loss", jr: false,
    blurb: "Slip down to last place.", rule: "Your score becomes the lowest score − 10." },
  { id: "star", name: "Star", icon: "⭐", colour: "#fbbf24", kind: "gain", jr: true,
    blurb: "Double your score.", rule: "Your total is multiplied by two." },
  { id: "heart", name: "Heart", icon: "💗", colour: "#f472b6", kind: "loss", jr: true,
    blurb: "Gift 50 points to a rival.", rule: "Choose a rival: they gain 50, you lose nothing." },
  { id: "eraser", name: "Eraser", icon: "🧽", colour: "#94a3b8", kind: "loss", jr: false,
    blurb: "Wipe your own score.", rule: "Your total resets to zero." },
  { id: "virus", name: "Virus", icon: "🦠", colour: "#4ade80", kind: "chaos", jr: false,
    blurb: "Wipe every score on the board.", rule: "All teams reset to zero, including you." },
  { id: "shark", name: "Shark", icon: "🦈", colour: "#38bdf8", kind: "steal", jr: false,
    blurb: "Bite 25 from every rival.", rule: "Each other team loses 25; you gain the total." },
  { id: "magnet", name: "Magnet", icon: "🧲", colour: "#fb7185", kind: "steal", jr: true,
    blurb: "Pull 75 from the leader.", rule: "The current leader loses 75, you gain 75." },
  { id: "lifesaver", name: "Lifesaver", icon: "🛟", colour: "#22d3ee", kind: "loss", jr: true,
    blurb: "Hand 75 points to the last-placed team.", rule: "You lose 75, the bottom team gains 75." },
  { id: "trap", name: "Trap", icon: "🕳️", colour: "#a3a3a3", kind: "loss", jr: false,
    blurb: "You lose your next turn.", rule: "Turn passes immediately to the next team." },
  { id: "seesaw", name: "Seesaw", icon: "⚖️", colour: "#c084fc", kind: "swap", jr: true,
    blurb: "Swap scores with the leader.", rule: "Your total and the leader's total change places." },
  { id: "gold", name: "Gold", icon: "🪙", colour: "#eab308", kind: "gain", jr: true,
    blurb: "Straight 50 points.", rule: "Add 50 to your total." },
  { id: "boom", name: "Boom", icon: "💥", colour: "#ef4444", kind: "loss", jr: false,
    blurb: "Straight −50 points.", rule: "Subtract 50 from your total." },
  { id: "gift", name: "Gift", icon: "🎁", colour: "#34d399", kind: "gain", jr: true,
    blurb: "A random bonus of 10–40.", rule: "Roll a small bonus and add it." },
  { id: "baam", name: "Baam", icon: "👊", colour: "#fb923c", kind: "loss", jr: true,
    blurb: "A random bite of 10–40.", rule: "Roll a small penalty and subtract it." },
];

export type PowerId =
  | "double" | "fifty50" | "shield" | "freeze" | "timeboost" | "streaklock"
  | "highstakes" | "swap" | "wipe" | "bounty" | "streakup";

export type PowerUp = {
  id: PowerId;
  name: string;
  icon: string;
  colour: string;
  blurb: string;
  rule: string;
  timing: "before" | "anytime";
};

export const POWER_UPS: PowerUp[] = [
  { id: "double", name: "Double Down", icon: "✖️2", colour: "#fbbf24", timing: "before",
    blurb: "Your next correct answer scores double.", rule: "Play before the answer is revealed. Wrong answers are unaffected." },
  { id: "fifty50", name: "Fifty-Fifty", icon: "½", colour: "#60a5fa", timing: "before",
    blurb: "Remove two wrong options.", rule: "Two distractors disappear from the current card." },
  { id: "shield", name: "Shield", icon: "🛡️", colour: "#34d399", timing: "before",
    blurb: "Immunity for one wrong answer.", rule: "The next miss costs zero points and keeps your streak." },
  { id: "freeze", name: "Freeze", icon: "❄️", colour: "#22d3ee", timing: "anytime",
    blurb: "Stop the timer completely.", rule: "The countdown pauses until the tutor restarts it." },
  { id: "timeboost", name: "Overtime", icon: "⏱️", colour: "#a78bfa", timing: "anytime",
    blurb: "+10 seconds and +25 points on this card.", rule: "Adds time and a point boost to the live question." },
  { id: "streaklock", name: "Streak Lock", icon: "🔒", colour: "#f472b6", timing: "before",
    blurb: "Protect your streak from one miss.", rule: "Your streak multiplier survives the next wrong answer." },
  { id: "highstakes", name: "High Stakes", icon: "🎲", colour: "#fb7185", timing: "before",
    blurb: "Double the points — and the penalty.", rule: "This card is now worth twice as much in both directions." },
  { id: "swap", name: "Score Swap", icon: "🔀", colour: "#c084fc", timing: "anytime",
    blurb: "Swap totals with the team above you.", rule: "Exchange scores with the team directly ahead." },
  { id: "wipe", name: "Wipeout", icon: "🧨", colour: "#ef4444", timing: "anytime",
    blurb: "Erase a chosen rival's score.", rule: "One rival team resets to zero. Use it once." },
  { id: "bounty", name: "Bounty", icon: "💸", colour: "#eab308", timing: "anytime",
    blurb: "Give 50 points to anyone — including yourself.", rule: "Choose any team on the board and add 50." },
  { id: "streakup", name: "Streak Boost", icon: "🔥", colour: "#f97316", timing: "anytime",
    blurb: "+1 to your streak instantly.", rule: "Adds one step to your streak multiplier without answering." },
];

export const STREAK_BONUS = (streak: number) => Math.min(streak, 5) * 25;
