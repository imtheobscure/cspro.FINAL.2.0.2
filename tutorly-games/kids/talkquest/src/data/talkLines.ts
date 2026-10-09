import { A, type WordKind } from './contentGen';

/**
 * The tutor's talk lines for one word: what to say, what to chant, what to ask.
 *
 * These used to live in `talkBank.json` — 841 hand-templated entries, 787 of
 * which were generated filler that had grown complicated ("Use the word X in a
 * longer sentence to prove it", "Close your eyes. Imagine watering can."). For
 * learners of 5–12 that is tutor language, not child language, and a fixed bank
 * cannot cover a word the tutor just pasted in from an AI.
 *
 * So the lines are built here instead, from a small pool per kind of word, and
 * picked by hashing the word: every word in a lesson gets different, simple
 * lines, and a brand-new word works immediately.
 *
 * Two rules everything in this file obeys:
 *
 * 1. **Short and simple.** One idea per line, four to nine words, only words a
 *    six-year-old already says out loud.
 * 2. **Grammar the tutor can read out loud.** `{an}` is filled by `A()` below,
 *    which already knows that it is "an apple", "a fork", *no* article before
 *    "water" and none before "grapes" — so a line never comes out as
 *    "I like apple". The word itself is always in `say[0]`, because the quiz
 *    reads that line and blanks the word out.
 */

export type Talk = {
  say: string[];
  chants: string[];
  ask: string;
  talk: string;
  fact: string;
  yes: string;
  no: string;
  why: string;
};

const YES = ['Yes! Now say it in a sentence.', 'Yes. Tell me more.', 'Yes — well done. Say it once more.'];
const NO = ['Not that one. Try again.', 'Almost. Listen again.', 'No, but good try. Look again.'];

/** Four ways to make the child say the word. All contain the word itself. */
const SAY: Record<WordKind, string[]> = {
  food: [
    'Yum! Say: I like {an}.',
    'Say: Can I have {an}, please?',
    'Say {W} with a big smile.',
    'Say: I eat {an} for lunch.',
  ],
  drink: [
    'Say: I like {an}.',
    'Say: I want {an}, please.',
    'Say {W} slowly, then fast.',
    'Say: {W} is good for me.',
  ],
  animal: [
    'Say {W}. Now make the {w} sound!',
    'Say: Look at the {w}!',
    'Say: The little {w} is cute.',
    'Say {W} in a tiny voice, then a big voice.',
  ],
  body: [
    'Touch your {w} and say {w}.',
    'Say: This is my {w}.',
    'Say {W}. Point to it.',
    'Say {W} three times and tap it.',
  ],
  clothes: [
    'Say: I wear {an}.',
    'Say {W}. Now pretend to put it on.',
    'Say: My {w} is comfy.',
    'Say {W}. Is it for hot days or cold days?',
  ],
  color: [
    'Say {W}. Now find something {w}.',
    'Say: My favourite colour is {w}.',
    'Say {W} as quiet as a mouse.',
    'Say: The balloon is {w}.',
  ],
  shape: [
    'Say {W}. Draw it in the air.',
    'Say: It looks like {an}.',
    'Say: I can see {an}.',
    'Say {W} three times and clap.',
  ],
  number: [
    'Say {W}. Now count to {w} on your fingers.',
    'Say {W}. Count up to {w} with me.',
    'Say {W} twice and clap {w} times.',
    'Say {W} in a giant voice!',
  ],
  countword: [
    'Say {W}. It is a number word.',
    'Say {W} and clap your hands.',
    'Say {W} three times. Ready?',
    'Say {W} in your counting voice.',
  ],
  action: [
    'Say: I can {w}.',
    'Say {W} and do it!',
    'Say: Let us {w} together.',
    'Say {W} like a sleepy bear, then like a rocket.',
  ],
  ing: [
    'Say: I like {w}.',
    'Say: Let us go {w} together.',
    'Say {W}. Do you like it?',
    'Say: {W} is fun!',
  ],
  feeling: [
    'Say: I feel {w}.',
    'Make {a} face and say {w}.',
    'Say: Sometimes I feel {w}.',
    'Say {W} softly. It is okay to feel {w}.',
  ],
  place: [
    'Say: Let us go to the {w}.',
    'Say {W}. What do we do there?',
    'Say: I like the {w}.',
    'Say {W} like you are very excited.',
  ],
  person: [
    'Say: This is the {w}.',
    'Say: The {w} helps us.',
    'Say hello to the {w}.',
    'Say {W} and wave.',
  ],
  vehicle: [
    'Say: The {w} is fast!',
    'Make the {w} sound and say {w}.',
    'Say: I ride in the {w}.',
    'Say {W} in a loud voice, like a big truck.',
  ],
  nature: [
    'Say: I like the {w}.',
    'Say {W}. Can you see it outside?',
    'Say {W} softly, like the wind.',
    'Say: The {w} is pretty.',
  ],
  object: [
    'Say: This is {an}.',
    'Say {W}. What do we use it for?',
    'Say: I have {an}.',
    'Say {W} and pretend to hold it.',
  ],
  time: [
    'Say {W}. What do you do then?',
    'Say {W} slowly, then fast.',
    'Say: See you at {w}.',
    'Say {W} three times, like a clock.',
  ],
  weather: [
    'Say: Today it is {w}.',
    'Say {W} and show the weather with your arms.',
    'Say: I like {w} days.',
    'Say {W} like you are surprised!',
  ],
  // (weather NOUNS — an umbrella, ice, a puddle — are `object`, so they never
  // reach these lines; "Today it is umbrella" was the old output.)
  adj: [
    'Say {W}. Now find something {w}.',
    'Say: This is {w}.',
    'Say {W} in a big voice, then a small voice.',
    'Say: My teddy is {w}.',
  ],
  letter: [
    'Say {W}. {W} starts with {L}.',
    'Say the sound {L}. Now say {W}.',
    'Say: {L} is for {W}.',
    'Say {W} three times and clap.',
  ],
};

/** Sing-song lines. Short, silly, easy to repeat after the tutor. */
const CHANT: Record<WordKind, string[]> = {
  food: ['{W}, {w}, in my tum!', 'Munch munch {w}, munch munch {w}!'],
  drink: ['Sip sip {w}, sip sip {w}!', 'Pour the {w}, drink it up!'],
  animal: ['Hello {w}, hello {w}, hop little {w}!', '{W} in the sun, {w} having fun!'],
  body: ['Tap your {w}, tap your {w}, hello {w}!', 'Clap your hands, touch your {w}!'],
  clothes: ['On goes the {w}, on goes the {w}, ready to play!', 'Zip! Button! {W} today!'],
  color: ['Show me {w}! Point and say {w}!', '{W} here, {w} there, {w} everywhere!'],
  shape: ['Draw {an}, draw {an}, round and round {an}!', '{W} up, {w} down, spin it all around!'],
  number: ['{W}, {w}, stomp your feet, {w}!', 'Count with me: {w}! Again: {w}!'],
  countword: ['{W} here, {w} there, number words everywhere!', 'Say it loud, say it clear: {w}!'],
  ing: ['{W} today, {w} today, what a happy {w} day!', 'Off we go {w}, off we go today!'],
  action: ['I can {w}, you can {w}, we can {w}!', '{W} now, freeze! {W} now, freeze!'],
  feeling: ['If you feel {w}, tell a friend!', 'Sometimes {w}, that is okay. Take a breath and start the day.'],
  place: ['Off we go to the {w}, off we go today!', 'The {w} is waiting, let us not be late!'],
  person: ['Thank you {w}, thank you {w}, you help us every day!', 'My {w}, my {w}, hip hip hooray!'],
  vehicle: ['Beep beep {w}! Honk honk {w}!', 'The {w} goes fast, the {w} goes far!'],
  nature: ['Grow, grow {w}, up to the sky!', 'Little {w}, big {w}, I can see the {w}!'],
  object: ['Where is the {w}? Here is the {w}!', 'Tap the {w}, name the {w}!'],
  time: ['{W} is here, give a cheer!', 'Tick tock, tick tock, {w} on the clock!'],
  weather: ['{W} day, {w} day, what shall we play?', 'When it is {w}, we know the way!'],
  adj: ['{W} or not {w}? Tell me now!', 'Too {w}, just right, {w} with delight!'],
  letter: ['{L} is for {W}, {L} is for {W}, say it with me!', 'Sound it out: {W}! Sound it out: {W}!'],
};

/** One easy question to check the child really knows the word. */
const ASK: Record<WordKind, string[]> = {
  food: ['Can we eat {w}? Say yes or no.', 'Is {w} sweet or salty?'],
  drink: ['Can we drink {w}? Say yes or no.', 'Do we drink {w} hot or cold?'],
  animal: ['Is {a} an animal? Say yes or no.', 'Can {a} fly? Show me with your hands.'],
  body: ['Is this your {w}? Point and say.', 'Can you move your {w}? Show me.'],
  clothes: ['Do we wear {w} or eat {w}?', 'Do we wear {w} on hot days or cold days?'],
  color: ['Is a banana {w}? Say yes or no.', 'Can you find something {w}?'],
  shape: ['Is a ball {a}? Say yes or no.', 'Can you draw {a} in the air?'],
  number: ['Can you count to {w}? Say the numbers.', 'Is {w} more than three? Say yes or no.'],
  countword: ['Is {w} a number word? Say yes or no.', 'When do we use {w}? Tell me.'],
  ing: ['Do you like {w}? Tell me why.', 'Where do we go {w}?'],
  action: ['Can you {w} right now? Show me.', 'Do you {w} with your hands or your feet?'],
  feeling: ['Do you feel {w} today? Tell me why.', 'What makes you feel {w}?'],
  place: ['Do we go to the {w} to sleep? Say yes or no.', 'What do we see at the {w}?'],
  person: ['Is {a} a person? Say yes or no.', 'What does {a} do?'],
  vehicle: ['Does {a} drive or fly?', 'Is {a} fast or slow?'],
  nature: ['Can you see {a} outside? Say yes or no.', 'Does {a} need water?'],
  object: ['Do we use {a} at school or in bed?', 'Is {a} big or small?'],
  time: ['Is {w} in the morning or at night?', 'What do you do at {w}?'],
  weather: ['If it is {w}, do we need a coat? Say yes or no.', 'Do you like {w} weather?'],
  adj: ['Is a mouse {w}? Say yes or no.', 'Can you find something {w}?'],
  letter: ['Does {W} start with the sound {L}?', 'Can you say three words that start with {L}?'],
};

/** What the tutor says when the child answers well — one more push to talk. */
const TALK: Record<WordKind, string[]> = {
  food: ['Say: I like {w} because it is yummy.', 'Say: I want {an}, please.'],
  drink: ['Say: I want {an}, please.', 'Say: I drink {w} in the morning.'],
  animal: ['Say: The {w} can run and jump.', 'Say: I like the {w} because it is cute.'],
  body: ['Say: I use my {w} every day.', 'Say: This {w} is mine.'],
  clothes: ['Say: I wear {w} when it is cold.', 'Say: My {w} is blue.'],
  color: ['Say: My {w} toy is on my bed.', 'Say: I like {w} because it is pretty.'],
  shape: ['Say: The window is {an}.', 'Say: I can draw {an}.'],
  number: ['Say: I have {w} toys.', 'Count to {w} out loud.'],
  countword: ['Say: I use number words every day.', 'Say: Numbers help me count.'],
  ing: ['Say: I go {w} with my family.', 'Say: {W} is my favourite thing to do.'],
  action: ['Say: I can {w} very fast.', 'Say: I like to {w} with my friend.'],
  feeling: ['Say: I feel {w} because it is my birthday.', 'Say: When I feel {w}, I hug my mum.'],
  place: ['Say: I go to the {w} with my family.', 'Say: The {w} is near my house.'],
  person: ['Say: The {w} is kind to me.', 'Say: I want to be {a} one day.'],
  vehicle: ['Say: The {w} goes very fast.', 'Say: I go to school in {a}.'],
  nature: ['Say: The {w} is green and pretty.', 'Say: I can see the {w} outside.'],
  object: ['Say: I use {an} at school.', 'Say: Please pass me the {w}.'],
  time: ['Say: I play at {w}.', 'Say: At {w} I am happy.'],
  weather: ['Say: It is {w} today, so I wear my coat.', 'Say: I like {w} days.'],
  adj: ['Say: My bag is very {w}.', 'Say: The {w} one is mine.'],
  letter: ['Say: {L} is for {W}.', 'Say: {L} is the first letter of my name.'],
};

/** A simple, true line to keep the chat going. */
const FACT: Record<WordKind, string[]> = {
  food: ['We chew {w} with our teeth.', 'Some people grow {w} in a garden.', '{W} can be a snack.'],
  drink: ['We need {w} to stay strong.', '{W} can be hot or cold.', 'People drink {w} every day.'],
  animal: ['A baby {w} has a special name.', 'What sound does {a} make?', 'Where does {a} live?'],
  body: ['Your {w} is part of you.', 'Your {w} works every day.', 'We look after our body.'],
  clothes: ['We wear {w} to stay warm or cool.', '{W} can be many colours.', 'We put on {w} in the morning.'],
  color: ['We can mix colours to make {w}.', '{W} is all around us.', '{W} can be light or dark.'],
  shape: ['We can find {a} in real things.', '{W} has its own shape.', 'You can draw {a} with one line.'],
  number: ['We use {w} when we count.', '{W} comes in counting order.', 'Numbers tell us how many.'],
  countword: ['{W} is a counting word.', 'We use number words to count things.', 'Numbers tell us how many.'],
  ing: ['{W} is something you DO.', 'You can go {w} outside.', 'Some people love {w}.'],
  action: ['{W} is something you DO.', 'You can {w} inside or outside.', 'Show me how you {w}.'],
  feeling: ['Everyone feels {w} sometimes.', 'Feelings come and go.', 'We can talk about feeling {w}.'],
  place: ['People go to the {w} for a reason.', 'The {w} is a place in our town.', 'You can walk or ride to the {w}.'],
  person: ['{A} has a job to do.', '{A} helps other people.', 'We say thank you to the {w}.'],
  vehicle: ['{A} takes people places.', '{A} needs power to move.', '{A} can be fast or slow.'],
  nature: ['Living things like {w} need care.', 'We can find {a} outside.', '{W} needs sun and water.'],
  object: ['We keep {a} at home or at school.', '{A} is a thing we can hold.', '{A} has a job to do.'],
  time: ['{W} is part of our day.', 'We plan our day with {w}.', '{W} comes at the same time each day.'],
  weather: ['{W} weather changes what we wear.', 'We can look outside and see {w}.', '{W} can make us feel happy or cold.'],
  adj: ['{W} tells us about a thing.', 'Some things are {w} and some are not.', 'Can you name three {w} things?'],
  letter: ['{W} begins with the sound {L}.', 'The letter {L} starts the word {W}.', 'You can write the letter {L}.'],
};

/** Stable hash so a word always gets the same line, on every screen. */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: string, salt: number): T {
  return arr[hash(`${seed}#${salt}`) % arr.length];
}

function fill(line: string, word: string): string {
  const an = A(word);
  const An = an ? an.charAt(0).toUpperCase() + an.slice(1) : word;
  return line
    .replace(/\{W\}/g, word)
    .replace(/\{w\}/g, word.toLowerCase())
    .replace(/\{An\}/g, An)
    .replace(/\{an\}/g, an || word.toLowerCase())
    .replace(/\{A\}/g, An)
    .replace(/\{a\}/g, an || word.toLowerCase())
    .replace(/\{L\}/g, word[0] ?? '');
}

export function talkFor(english: string, kind: WordKind): Talk {
  const sayPool = SAY[kind] ?? SAY.object;
  const chantPool = CHANT[kind] ?? CHANT.object;
  const askPool = ASK[kind] ?? ASK.object;
  const talkPool = TALK[kind] ?? TALK.object;
  const factPool = FACT[kind] ?? FACT.object;

  const first = pick(chantPool, english, 11);
  const second = chantPool.find((line) => line !== first) ?? first;
  const fact = fill(pick(factPool, english, 13), english);

  return {
    say: sayPool.map((line) => fill(line, english)),
    chants: [fill(first, english), fill(second, english)],
    ask: fill(pick(askPool, english, 17), english),
    talk: fill(pick(talkPool, english, 19), english),
    fact,
    yes: pick(YES, english, 23),
    no: pick(NO, english, 29),
    why: fact,
  };
}
