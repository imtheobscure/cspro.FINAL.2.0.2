export type LetterItem = {
  letter: string;
  /** phonics sound, spoken + shown */
  sound: string;
  word: string;
  emoji: string;
};

export const ALPHABET: LetterItem[] = [
  { letter: "A", sound: "a as in apple", word: "apple", emoji: "🍎" },
  { letter: "B", sound: "b as in ball", word: "ball", emoji: "⚽" },
  { letter: "C", sound: "c as in cat", word: "cat", emoji: "🐱" },
  { letter: "D", sound: "d as in dog", word: "dog", emoji: "🐶" },
  { letter: "E", sound: "e as in egg", word: "egg", emoji: "🥚" },
  { letter: "F", sound: "f as in fish", word: "fish", emoji: "🐠" },
  { letter: "G", sound: "g as in grapes", word: "grapes", emoji: "🍇" },
  { letter: "H", sound: "h as in hat", word: "hat", emoji: "🧢" },
  { letter: "I", sound: "i as in ice cream", word: "ice cream", emoji: "🍦" },
  { letter: "J", sound: "j as in jump", word: "jump", emoji: "🦘" },
  { letter: "K", sound: "k as in kite", word: "kite", emoji: "🪁" },
  { letter: "L", sound: "l as in lion", word: "lion", emoji: "🦁" },
  { letter: "M", sound: "m as in milk", word: "milk", emoji: "🥛" },
  { letter: "N", sound: "n as in nose", word: "nose", emoji: "👃" },
  { letter: "O", sound: "o as in orange", word: "orange", emoji: "🍊" },
  { letter: "P", sound: "p as in pig", word: "pig", emoji: "🐷" },
  { letter: "Q", sound: "qu as in queen", word: "crown", emoji: "👑" },
  { letter: "R", sound: "r as in rabbit", word: "rabbit", emoji: "🐰" },
  { letter: "S", sound: "s as in sun", word: "sun", emoji: "☀️" },
  { letter: "T", sound: "t as in tree", word: "tree", emoji: "🌳" },
  { letter: "U", sound: "u as in umbrella", word: "umbrella", emoji: "☂️" },
  { letter: "V", sound: "v as in van", word: "van", emoji: "🚐" },
  { letter: "W", sound: "w as in water", word: "water", emoji: "💧" },
  { letter: "X", sound: "x as in box", word: "box", emoji: "📦" },
  { letter: "Y", sound: "y as in yo-yo", word: "yo-yo", emoji: "🪀" },
  { letter: "Z", sound: "z as in zebra", word: "zebra", emoji: "🦓" },
];
