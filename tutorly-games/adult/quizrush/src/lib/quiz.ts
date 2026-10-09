import type { Question } from "./types";

export function checkAnswer(q: Question, response: unknown): boolean {
  switch (q.type) {
    case "mc":
    case "reading":
    case "listening":
    case "dialogue":
    case "tf": {
      return Number(response) === Number(q.answer);
    }
    case "multi": {
      const ans = (Array.isArray(q.answer) ? q.answer : []).map(Number).sort();
      const resp = (Array.isArray(response) ? response : []).map(Number).sort();
      if (ans.length !== resp.length) return false;
      return ans.every((v, i) => v === resp[i]);
    }
    case "typed": {
      const norm = (s: unknown) =>
        String(s ?? "")
          .trim()
          .toLowerCase()
          .replace(/[.,!?;:'"]/g, "");
      const accepted = Array.isArray(q.answer)
        ? (q.answer as unknown[]).map(norm)
        : [norm(q.answer)];
      return accepted.includes(norm(response));
    }
    default:
      return false;
  }
}

export function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
