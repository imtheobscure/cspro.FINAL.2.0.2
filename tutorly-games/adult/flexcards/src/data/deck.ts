/*
 * The deck contract, and the deck that ships with the app.
 *
 * Two changes from the original, both about the content strings rather than the schema.
 *
 * **Emoji are gone from the *data*, not just the chrome.** The old demo carried `emoji: "🍀"`
 * on every card and used ❌ / ✅ / ⚕ / 🎵 inside the `commonErrors`, `joke` and `song` fields.
 * Those are the worst place for them: unlike a tab icon, a glyph inside a sentence is content,
 * and on a machine without a colour emoji font every one of them renders as a box in the middle
 * of the teaching text. The correctness markers are now real words and the punctuation is
 * ordinary text.
 *
 * **`image` carries a real photograph.** The four Unsplash URLs here are genuine, hot-linkable
 * and licence-clear. When a deck supplies none, `lib/wordImage.ts` looks one up — and when it
 * supplies one that 404s, the lookup runs as the fallback rather than the band going blank.
 */

export interface Deploy {
  slang: string;
  casual: string;
  informal: string;
  neutral: string;
  formal: string;
}

export interface FlexItem {
  id: string;
  front: string;
  back: string;
  pronunciation?: string;
  /** IPA with slashes. Rendered in the mono face at a size a projector can read. */
  phoneticIPA?: string;
  example?: string;
  /** Concept-checking questions — the "did you actually understand it" pair. */
  ccq?: string;
  image?: string;
  imageCredit?: string;
  imageAlt?: string;
  challenge?: string;
  joke?: string;
  song?: string;
  movie?: string;
  usage?: string;
  definition?: string;
  synonyms?: string[];
  antonyms?: string[];
  culturalFact?: string;
  commonErrors?: string[];
  wouldYou?: string;
  truthOrDare?: { truth: string; dare: string };
  register?: Deploy;
  registerSlider?: number;
  partOfSpeech?: string;
  difficulty?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  tags?: string[];
  nativeEquivalents?: Record<string, string>;
  collocations?: string[];
  videoQuery?: string;
}

export interface Payload {
  items: FlexItem[];
  targetLang?: string;
  nativeLang?: string;
  title?: string;
  deckId?: string;
}

/**
 * The shipped deck.
 *
 * Five C1 words chosen because each one fails in a different way when taught badly:
 * *serendipity* is culturally loaded, *resilience* is a false friend in half of Europe,
 * *ephemeral* is poetic rather than propositional, *ubiquitous* is usually taught as a
 * synonym for "common" (which it is not), and *melancholy* is a noun and an adjective that a
 * dictionary will happily let a learner use wrongly.
 */
export const DEMO_PAYLOAD: Payload = {
  title: "Advanced English Vocabulary",
  targetLang: "English",
  nativeLang: "Spanish",
  deckId: "demo-deck-1",
  items: [
    {
      id: "serendipity",
      front: "Serendipity",
      back: "A fortunate discovery made by accident",
      pronunciation: "ser·en·DIP·i·ty",
      phoneticIPA: "/ˌser.ənˈdɪp.ɪ.ti/",
      partOfSpeech: "noun",
      difficulty: "C1",
      example: "Finding that rare book at a garage sale was pure serendipity.",
      ccq: "If you plan to find something, is it serendipity? (No) If you stumble upon it by lucky accident? (Yes!)",
      definition:
        "The occurrence of events by chance in a happy or beneficial way — coined by Horace Walpole from the Persian fairy tale 'Three Princes of Serendip'.",
      synonyms: ["fortuitousness", "providence", "luck", "happy chance", "fluke"],
      antonyms: ["misfortune", "deliberate", "intentional"],
      culturalFact:
        "The word was invented in 1754 by English writer Horace Walpole. 'Serendip' is an old Persian name for Sri Lanka. It is regularly listed among the hardest English words to translate.",
      commonErrors: [
        "Wrong: 'It was a serendipity' → Right: 'It was serendipity' (no article)",
        "Wrong: 'serendipituous' → Right: 'serendipitous' (adjective form)",
      ],
      wouldYou:
        "Would you rather experience serendipity every day and never be surprised, or experience it only once but it changes your life forever?",
      truthOrDare: {
        truth: "Tell us about the most serendipitous moment of your life.",
        dare: "Stand up and mime bumping into your long-lost friend on the street — act out the serendipitous reunion!",
      },
      usage:
        "Used in written English, speeches, and storytelling. Rarely used in casual everyday speech. Often found in brand names (Serendipity Ice Cream NYC). Perfect in essays about fate versus coincidence.",
      song: "Every playlist that finds you perfectly — that's serendipity.",
      movie: '"I believe in destiny. Some call it God, I call it serendipity." — Serendipity (2001, John Cusack)',
      joke: "I accidentally made the perfect coffee this morning. Serendip-a-tea!",
      challenge:
        "PHYSICAL DARE: Stand up! Draw 'serendipity' on paper using only pictures — no words! Show the class in 60 seconds!",
      register: {
        slang: "lucky break / stumbled on it",
        casual: "a happy accident",
        informal: "stumbled upon by luck",
        neutral: "fortuitous discovery",
        formal: "serendipitous occurrence",
      },
      registerSlider: 3,
      collocations: ["pure serendipity", "serendipitous discovery", "by serendipity", "a moment of serendipity"],
      nativeEquivalents: { Spanish: "serendipia", French: "sérendipité", German: "Serendipität", Japanese: "セレンディピティ" },
      tags: ["abstract", "literary", "rare"],
      videoQuery: "serendipity movie scene",
      image: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1400&q=80",
      imageAlt: "A path of stepping stones leading into mist",
      imageCredit: "Unsplash",
    },
    {
      id: "resilience",
      front: "Resilience",
      back: "The ability to recover quickly from difficulties",
      pronunciation: "re·ZIL·ience",
      phoneticIPA: "/rɪˈzɪl.i.əns/",
      partOfSpeech: "noun",
      difficulty: "B2",
      example: "Her resilience after losing her job inspired the whole team.",
      ccq: "If someone cries and gives up — resilience? (No). If they bounce back stronger? (Yes!)",
      definition:
        "The capacity to withstand or to recover quickly from difficulties; toughness. In materials science, the ability to spring back into shape.",
      synonyms: ["toughness", "hardiness", "adaptability", "fortitude", "grit", "bounce-back"],
      antonyms: ["fragility", "vulnerability", "weakness"],
      culturalFact:
        "The word comes from Latin 'resilire' (to spring back). In Japan, the concept 'Nana korobi ya oki' (fall seven times, stand up eight) is the cultural equivalent.",
      commonErrors: [
        "Careful: 'She has a lot of resilience' is fine, but 'She is very resilience' → 'She is very resilient'",
        "Spelling: 'resillience' → 'resilience'",
      ],
      wouldYou:
        "Would you rather have superhuman physical resilience (never get tired) or emotional resilience (nothing can break your spirit)?",
      truthOrDare: {
        truth: "Share a time when you showed incredible resilience. What kept you going?",
        dare: "Do 10 jumping jacks RIGHT NOW while saying 'I am resilient!' after each one!",
      },
      usage:
        "High-frequency word in psychology, business, HR, and education. Very common in job interviews: 'Tell me about your resilience'. Also used in climate and environmental contexts.",
      song: "What doesn't kill you makes you stronger, stand a little taller — that's resilience in every corner.",
      movie: '"It\'s not about how hard you hit. It\'s about how hard you can get hit and keep moving forward." — Rocky Balboa',
      joke: "I told my gym trainer I have resilience. He said 'Great, now do 50 more push-ups.'",
      challenge:
        "PHYSICAL DARE: Stand up! Show the class what resilience LOOKS like — mime being knocked down 3 times and bouncing back each time, getting stronger!",
      register: {
        slang: "thick-skinned / bounce back",
        casual: "tough as nails",
        informal: "keeps going no matter what",
        neutral: "ability to recover",
        formal: "psychological resilience / adaptive capacity",
      },
      registerSlider: 2,
      collocations: ["build resilience", "show resilience", "emotional resilience", "resilience in the face of adversity"],
      nativeEquivalents: { Spanish: "resiliencia", French: "résilience", German: "Resilienz", Japanese: "回復力" },
      tags: ["psychology", "business", "positive"],
      videoQuery: "resilience motivation speech",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=80",
      imageAlt: "A runner training on a track",
      imageCredit: "Unsplash",
    },
    {
      id: "ephemeral",
      front: "Ephemeral",
      back: "Lasting for a very short time; transitory",
      pronunciation: "e·FEM·er·al",
      phoneticIPA: "/ɪˈfem.ər.əl/",
      partOfSpeech: "adjective",
      difficulty: "C1",
      example: "The ephemeral beauty of cherry blossoms makes them all the more precious.",
      ccq: "Is a rainbow ephemeral? (Yes!) Is a mountain ephemeral? (No, it lasts millions of years)",
      definition: "Lasting for a very short time. From Greek 'ephemeros' — epi (on) + hemera (day) — literally 'lasting only a day'.",
      synonyms: ["fleeting", "transient", "momentary", "short-lived", "transitory", "evanescent"],
      antonyms: ["permanent", "eternal", "everlasting", "enduring"],
      culturalFact:
        "The Japanese concept of 'mono no aware' (物の哀れ) captures this perfectly — the bittersweet beauty of impermanence. Cherry blossoms (sakura) are the ultimate symbol.",
      commonErrors: [
        "Wrong: 'ephemerous' → Right: 'ephemeral'",
        "In speech, 'the ephemerality of it' is rare; prefer 'its fleeting nature'",
      ],
      wouldYou:
        "Would you rather experience something extraordinarily beautiful but ephemeral (lasts 1 second), or something ordinary that lasts forever?",
      truthOrDare: {
        truth: "What's the most ephemeral beautiful thing you've ever witnessed? Describe it.",
        dare: "Draw a picture of something ephemeral in 30 seconds and show everyone!",
      },
      usage:
        "Literary, poetic, and academic usage. Common in philosophy, art criticism, and social media (Snapchat and Instagram Stories are literally ephemeral). Great for essays.",
      song: "Like a flower in the rain, you were ephemeral — beautiful and fleeting, never meant to stay.",
      movie: '"Everything is temporary. Emotions, thoughts, people and scenery." — Inception',
      joke: "My attention span is so ephemeral that I forgot the punchline of this joke.",
      challenge:
        "ARTISTIC DARE: You have 45 seconds! Draw something that represents 'ephemeral' — a sunset? a bubble? Show everyone before time runs out!",
      register: {
        slang: "here today gone tomorrow",
        casual: "doesn't last long",
        informal: "short-lived / fades fast",
        neutral: "temporary / brief",
        formal: "ephemeral / transient / evanescent",
      },
      registerSlider: 4,
      collocations: ["ephemeral beauty", "ephemeral pleasure", "ephemeral content", "ephemeral nature of"],
      nativeEquivalents: { Spanish: "efímero/a", French: "éphémère", German: "flüchtig / ephemer", Japanese: "はかない (hakanai)" },
      tags: ["literary", "adjective", "philosophy"],
      videoQuery: "cherry blossom ephemeral beauty timelapse",
      image: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1400&q=80",
      imageAlt: "Cherry blossom branches in full flower",
      imageCredit: "Unsplash",
    },
    {
      id: "ubiquitous",
      front: "Ubiquitous",
      back: "Present, appearing, or found everywhere",
      pronunciation: "yoo·BIK·wi·tus",
      phoneticIPA: "/juːˈbɪk.wɪ.təs/",
      partOfSpeech: "adjective",
      difficulty: "B2",
      example: "Smartphones have become ubiquitous in modern society.",
      ccq: "If something is only in one place, is it ubiquitous? (No) If it's everywhere you look? (Yes!)",
      definition: "Present, appearing, or found everywhere. From Latin 'ubique' meaning 'everywhere'.",
      synonyms: ["omnipresent", "pervasive", "everywhere", "universal", "widespread"],
      antonyms: ["rare", "scarce", "uncommon", "limited"],
      culturalFact:
        "The word gained popularity in tech contexts — 'ubiquitous computing' was coined by Mark Weiser at Xerox PARC in 1988 to describe technology that becomes invisible through integration.",
      commonErrors: [
        "Spelling: 'ubiquitious' → 'ubiquitous'",
        "Do not use it for things that are merely 'common' — ubiquitous means EVERYWHERE",
      ],
      wouldYou:
        "Would you rather be ubiquitous (everywhere at once) but invisible, or visible but stuck in one place forever?",
      truthOrDare: {
        truth: "What's something ubiquitous in your life that you couldn't live without?",
        dare: "Name 10 ubiquitous things in this room in 30 seconds!",
      },
      usage:
        "Common in academic, technical, and journalistic writing. Often used to describe technology, trends, or phenomena that have become inescapable.",
      song: "You're ubiquitous, everywhere I go — in my dreams, my thoughts, my soul.",
      movie: '"Coffee shops are ubiquitous in this city. You can\'t walk two blocks without finding one."',
      joke: "Wi-Fi is supposed to be ubiquitous, but it always disappears when I need it most!",
      challenge: "SPEED ROUND: Point to 5 ubiquitous things around you in 10 seconds!",
      register: {
        slang: "it's everywhere man",
        casual: "you see it everywhere",
        informal: "all over the place",
        neutral: "commonly found",
        formal: "ubiquitous / omnipresent",
      },
      registerSlider: 3,
      collocations: ["ubiquitous presence", "become ubiquitous", "ubiquitous in", "ubiquitous technology"],
      nativeEquivalents: { Spanish: "ubicuo", French: "omniprésent", German: "allgegenwärtig", Japanese: "どこにでもある" },
      tags: ["technology", "adjective", "common"],
      videoQuery: "ubiquitous computing future",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=80",
      imageAlt: "A network of glowing connections over the Earth",
      imageCredit: "Unsplash",
    },
    {
      id: "melancholy",
      front: "Melancholy",
      back: "A deep, pensive sadness; thoughtful sorrow",
      pronunciation: "MEL·un·kol·ee",
      phoneticIPA: "/ˈmel.ən.kɒl.i/",
      partOfSpeech: "noun / adjective",
      difficulty: "B2",
      example: "There was a beautiful melancholy in the autumn air as leaves fell silently.",
      ccq: "Is melancholy angry crying? (No) Is it a quiet, thoughtful sadness? (Yes!)",
      definition:
        "A feeling of pensive sadness, typically with no obvious cause. Can be noun or adjective. From Greek 'melaina kholē' (black bile) — one of the four humors in ancient medicine.",
      synonyms: ["sadness", "sorrow", "wistfulness", "pensiveness", "gloom", "dejection"],
      antonyms: ["joy", "happiness", "elation", "cheerfulness"],
      culturalFact:
        "In Romanticism, melancholy was considered a sign of artistic sensitivity. Keats, Shelley, and Byron often wrote about 'sweet melancholy'. The Portuguese word 'saudade' is a similar concept.",
      commonErrors: [
        "'melancholic' is not the noun → use 'melancholy' (noun) or 'melancholic' (adjective)",
        "Do not use it for ordinary sadness — melancholy is deeper and more reflective",
      ],
      wouldYou:
        "Would you rather feel melancholy forever but create beautiful art, or be happy forever but unable to create anything?",
      truthOrDare: {
        truth: "Describe a moment of beautiful melancholy in your life.",
        dare: "Make the most melancholic face you can and hold it for 10 seconds!",
      },
      usage:
        "Literary and artistic contexts. Often describes art, music, or atmosphere. 'Melancholic' is the adjective form. Common in poetry and film criticism.",
      song: "Hello darkness, my old friend... I've come to talk with you again — that's melancholy.",
      movie: '"I felt a great disturbance in the Force... as if millions of voices suddenly cried out in terror, and were suddenly silenced."',
      joke: "I tried to write a song about melancholy, but it was too sad to finish. Now THAT'S melancholy!",
      challenge: "ACTING CHALLENGE: Show melancholy through body language only — no words, no sounds. Can the class guess the emotion?",
      register: {
        slang: "feeling blue / in a funk",
        casual: "kind of sad",
        informal: "feeling down",
        neutral: "sadness",
        formal: "melancholy / melancholic state",
      },
      registerSlider: 4,
      collocations: ["air of melancholy", "deep melancholy", "melancholy mood", "sweet melancholy"],
      nativeEquivalents: { Spanish: "melancolía", French: "mélancolie", German: "Melancholie", Japanese: "憂鬱 (yūutsu)" },
      tags: ["emotion", "literary", "artistic"],
      videoQuery: "melancholy music scene movie",
      image: "https://images.unsplash.com/photo-1499346030926-9a72daac6c63?w=1400&q=80",
      imageAlt: "Autumn leaves on a path in soft light",
      imageCredit: "Unsplash",
    },
  ],
};
