/** Talk-first game content. Every bank holds at least 5 rounds so no game ends after one go. */

export type SpeedText = { id: string; title: string; text: string; targetWpm: number; watchWords: string[] };
export const SPEED_TEXTS: SpeedText[] = [
  { id: "sr1", title: "The 6.02 to Manchester", targetWpm: 130,
    text: "The 6.02 to Manchester leaves from platform three, and it is never quite empty. Commuters claim the same seats every morning, unfold the same newspapers, and pretend not to recognise each other. By Stockport, the carriage smells of coffee and wet coats.",
    watchWords: ["Manchester", "platform", "commuters", "newspapers", "recognise", "carriage"] },
  { id: "sr2", title: "A Short History of the Lift", targetWpm: 135,
    text: "Before the safety brake was invented, few people would step into a lift. Engineers solved the danger, but not the awkwardness: we still stare at the numbers, count the floors, and say almost nothing to the strangers standing thirty centimetres away.",
    watchWords: ["invented", "engineers", "awkwardness", "centimetres", "strangers"] },
  { id: "sr3", title: "Rain at the Market", targetWpm: 128,
    text: "Rain arrived at exactly the wrong moment. The fruit sellers dragged plastic sheets over their stalls, the tourists sheltered under a bakery awning, and a violinist kept playing as though the weather were part of the programme.",
    watchWords: ["exactly", "sheets", "sheltered", "awning", "violinist", "weather"] },
  { id: "sr4", title: "The Interview", targetWpm: 140,
    text: "She had rehearsed every answer, but the first question was not on her list. Instead of panicking, she repeated the question slowly, bought herself four seconds, and discovered that thinking aloud sounded remarkably like confidence.",
    watchWords: ["rehearsed", "panicking", "repeated", "discovered", "remarkably", "confidence"] },
  { id: "sr5", title: "Night Shift", targetWpm: 132,
    text: "The hospital corridor hums at three in the morning. Machines breathe for people who cannot, a cleaner polishes the same square of floor twice, and somewhere a phone rings until a tired voice finally answers it.",
    watchWords: ["hospital", "corridor", "machines", "polishes", "somewhere", "finally"] },
  { id: "sr6", title: "The Algorithm Knows", targetWpm: 138,
    text: "Your phone suggests a restaurant before you are hungry, a song before you are bored, and a route before you decide to leave. It is astonishingly useful and quietly unsettling, and most of us have stopped noticing which of the two it is.",
    watchWords: ["suggests", "restaurant", "astonishingly", "unsettling", "noticing"] },
];

export const PICTIONARY_WORDS: { word: string; category: string; hint: string }[] = [
  { word: "boarding pass", category: "Travel", hint: "Paper or phone, you can't fly without it" },
  { word: "rush hour", category: "City", hint: "A time, not a place" },
  { word: "job interview", category: "Work", hint: "Two chairs, one table, many nerves" },
  { word: "homesick", category: "Feelings", hint: "An adjective about distance" },
  { word: "deadline", category: "Work", hint: "It hangs over you" },
  { word: "traffic jam", category: "City", hint: "Nothing moves" },
  { word: "sunburn", category: "Holiday", hint: "Red evidence of a good day" },
  { word: "queue", category: "Daily life", hint: "A very British art form" },
  { word: "video call", category: "Work", hint: "'You're on mute'" },
  { word: "lost luggage", category: "Travel", hint: "The belt keeps turning, yours doesn't" },
  { word: "night shift", category: "Work", hint: "Awake when the city sleeps" },
  { word: "street food", category: "Food", hint: "No table required" },
  { word: "overslept", category: "Daily life", hint: "A verb in the past" },
  { word: "power cut", category: "Home", hint: "Candles and complaints" },
  { word: "pickpocket", category: "City", hint: "A person, not an action" },
  { word: "recycling", category: "Environment", hint: "Three arrows in a triangle" },
  { word: "gym membership", category: "Health", hint: "Paid monthly, used rarely" },
  { word: "wedding speech", category: "Events", hint: "Glass, microphone, panic" },
  { word: "food delivery", category: "City", hint: "A bag on a back on a bike" },
  { word: "long weekend", category: "Time", hint: "Three days, not two" },
  { word: "smartwatch", category: "Tech", hint: "It tells you to stand up" },
  { word: "jet lag", category: "Travel", hint: "Your body is in another time zone" },
  { word: "open-plan office", category: "Work", hint: "No walls, no silence" },
  { word: "rainy season", category: "Weather", hint: "Months, not minutes" },
];

export type ConceptRound = { id: string; clues: string[]; answer: string; accept: string[]; hints: string[]; explain: string };
export const CONCEPT_LINKS: ConceptRound[] = [
  { id: "cl1", clues: ["⏰", "🛫", "🥱", "🌍", "🛏️"], answer: "jet lag", accept: ["jetlag", "jet-lag", "time difference"],
    hints: ["It happens after a long flight east or west.", "Your body clock disagrees with the local clock.", "Two words: the first is an aircraft."],
    explain: "Clock + plane + tiredness + world + bed = jet lag. The globe is the red herring: many teams guess 'travel'." },
  { id: "cl2", clues: ["📅", "😰", "⌛", "📧", "🌙"], answer: "deadline", accept: ["a deadline", "due date"],
    hints: ["It is a point in time, not a period.", "People 'meet' it or 'miss' it.", "Midnight emails are a symptom."],
    explain: "Calendar + stress + sand timer + email + night = a deadline. 'Stress' alone is too general; the sand timer pins it to time." },
  { id: "cl3", clues: ["🏠", "💻", "🐕", "☕", "🧦"], answer: "working from home", accept: ["remote work", "wfh", "home office"],
    hints: ["Three words, the middle one is a preposition.", "The dog and the socks are clues about comfort, not pets.", "It became normal after 2020."],
    explain: "House + laptop + dog + coffee + socks = working from home. The dog tempts teams towards 'pet', which is the planted trap." },
  { id: "cl4", clues: ["🤝", "💰", "📉", "⏱️", "✍️"], answer: "negotiation", accept: ["negotiating", "a deal", "bargaining"],
    hints: ["It is a process with two sides.", "It usually ends with a signature.", "The falling graph is a tactic, not a failure."],
    explain: "Handshake + money + falling price + time pressure + signature = negotiation. The falling graph misleads teams towards 'recession'." },
  { id: "cl5", clues: ["👻", "📱", "💬", "🚫", "💔"], answer: "ghosting", accept: ["being ghosted", "ghosted"],
    hints: ["It is a behaviour, and the word is a verb + -ing.", "It happens in dating and in recruitment.", "Nobody says goodbye."],
    explain: "Ghost + phone + messages + block + broken heart = ghosting. The heart pushes teams to 'breakup', which is the planted trap." },
  { id: "cl6", clues: ["🛒", "🧠", "🎯", "📺", "🎁"], answer: "advertising", accept: ["marketing", "an advert", "ads"],
    hints: ["An industry, not a single object.", "It targets what you think you want.", "The gift is the promise, not the product."],
    explain: "Basket + brain + target + TV + gift = advertising. 'Shopping' is the near-miss answer the basket is designed to trigger." },
  { id: "cl7", clues: ["🤐", "👥", "📄", "🏢", "⚖️"], answer: "a confidentiality agreement", accept: ["nda", "non-disclosure agreement", "confidentiality"],
    hints: ["Three letters in its short form.", "You sign it before you hear the secret.", "The scales mean law, not fairness."],
    explain: "Silence + two people + document + company + law = an NDA. The scales tempt teams towards 'court case'." },
  { id: "cl8", clues: ["🔋", "📵", "🌲", "🧘", "🌅"], answer: "a digital detox", accept: ["digital detox", "screen break", "unplugging"],
    hints: ["Two words; the second is normally about health.", "The battery is about you, not your phone.", "People do it at weekends."],
    explain: "Battery + no phone + forest + meditation + sunrise = a digital detox. The forest suggests 'camping', the deliberate red herring." },
];

export type TrapRound = { id: string; l1: string; literal: string; natural: string[]; why: string; focus: string };
export const TRANSLATION_TRAPS: TrapRound[] = [
  { id: "tt1", l1: "Tengo 29 años y todavía vivo con mis padres.", literal: "I have 29 years and still I live with my parents.",
    natural: ["I'm 29 and I still live with my parents."], why: "English uses BE for age, not HAVE, and 'still' goes before the main verb.", focus: "be + age" },
  { id: "tt2", l1: "Me gusta mucho esta ciudad, pero es muy cara.", literal: "It likes me a lot this city, but is very expensive.",
    natural: ["I really like this city, but it's very expensive."], why: "English needs a subject pronoun ('it is') and puts the liker first.", focus: "subject pronouns" },
  { id: "tt3", l1: "Hace dos años que trabajo aquí.", literal: "It makes two years that I work here.",
    natural: ["I've worked here for two years.", "I've been working here for two years."], why: "Unfinished time from past to now takes present perfect + for.", focus: "present perfect + for" },
  { id: "tt4", l1: "¿Me puedes hacer un favor? Estoy de acuerdo contigo.", literal: "Can you make me a favour? I am agree with you.",
    natural: ["Could you do me a favour? I agree with you."], why: "You DO a favour, and 'agree' is a verb, so no 'am'.", focus: "do a favour / agree" },
  { id: "tt5", l1: "Si tendría tiempo, iría contigo al concierto.", literal: "If I would have time, I would go with you to the concert.",
    natural: ["If I had time, I'd go to the concert with you."], why: "No 'would' in the if-clause of a second conditional.", focus: "second conditional" },
  { id: "tt6", l1: "El martes pasado he ido al médico.", literal: "Last Tuesday I have gone to the doctor.",
    natural: ["Last Tuesday I went to the doctor's."], why: "A finished time expression forces past simple, never present perfect.", focus: "past simple vs present perfect" },
  { id: "tt7", l1: "Esperamos que nos respondan lo antes posible.", literal: "We wait that they answer us as soon as possible.",
    natural: ["We hope to hear from you as soon as possible.", "We look forward to your reply."], why: "'Esperar' splits into hope / wait / expect, and English prefers a fixed email frame.", focus: "hope vs wait vs expect" },
  { id: "tt8", l1: "Me he cortado el pelo ayer en la peluquería.", literal: "I have cut me the hair yesterday in the hairdresser.",
    natural: ["I got my hair cut at the hairdresser's yesterday.", "I had my hair cut yesterday."], why: "Someone else did it, so English uses the causative have/get something done.", focus: "causative" },
];

export type ForbiddenRound = { id: string; question: string; banned: string[]; trap: string; model: string };
export const FORBIDDEN_ROUNDS: ForbiddenRound[] = [
  { id: "fb1", question: "Have you ever lied to get out of a social event?", banned: ["yes", "no", "maybe", "sometimes"], trap: "The question is designed to pull a one-word confession.", model: "Let's just say my grandmother has been ill more often in stories than in life." },
  { id: "fb2", question: "Do you think your generation works harder than your parents'?", banned: ["yes", "no", "maybe", "of course", "depends"], trap: "'Depends' is the escape hatch — it's banned too.", model: "We work longer hours on smaller things, while they worked shorter hours on heavier ones." },
  { id: "fb3", question: "Would you accept a job you hate for double your salary?", banned: ["yes", "no", "maybe", "probably", "never"], trap: "Any adverb of probability counts as a refusal to commit.", model: "Give me the contract length first, because two years of misery buys a house and ten buys a breakdown." },
  { id: "fb4", question: "Is it ever acceptable to read your partner's messages?", banned: ["yes", "no", "maybe", "never", "always"], trap: "Absolutes are banned, so the learner must qualify.", model: "The moment you need to read them, the relationship has already answered the question." },
  { id: "fb5", question: "Are you afraid of getting old?", banned: ["yes", "no", "maybe", "a bit", "not really"], trap: "Soft hedges are banned as well as the obvious words.", model: "I'm relaxed about the wrinkles and terrified of the paperwork." },
  { id: "fb6", question: "Did you enjoy school?", banned: ["yes", "no", "maybe", "kind of", "so-so"], trap: "The past tense invites a single syllable.", model: "I enjoyed the corridors far more than the classrooms." },
  { id: "fb7", question: "Should tourists be banned from city centres?", banned: ["yes", "no", "maybe", "obviously", "absolutely"], trap: "Emphatic agreement words are banned.", model: "Ban the coaches, keep the tourists, and watch half the problem disappear." },
  { id: "fb8", question: "Can money buy happiness?", banned: ["yes", "no", "maybe", "partly", "sort of"], trap: "The classic question with the classic one-word answer.", model: "Money buys the absence of certain miseries, which most people mistake for happiness." },
  { id: "fb9", question: "Would you tell a friend their business idea is terrible?", banned: ["yes", "no", "maybe", "it depends", "honestly"], trap: "'Honestly' is banned because it replaces the actual answer.", model: "I'd ask them three questions they can't answer, and let the silence do the talking." },
  { id: "fb10", question: "Is your phone the first thing you touch in the morning?", banned: ["yes", "no", "maybe", "usually", "always"], trap: "Frequency adverbs are banned to force a description.", model: "My alarm lives inside it, so the day begins with a small act of surrender." },
];

export type EmotionRound = { id: string; line: string; emotion: string; coach: string };
export const EMOTION_ROUNDS: EmotionRound[] = [
  { id: "em1", line: "The meeting has been moved to seven tomorrow morning.", emotion: "furious but polite", coach: "Clip the consonants, keep the volume low, stress 'seven'." },
  { id: "em2", line: "I found your keys in the freezer again.", emotion: "sleepy", coach: "Drag the vowels, drop the pitch at the end of every phrase." },
  { id: "em3", line: "There's something you should know about the accounts.", emotion: "secretive", coach: "Breathy voice, slow pace, pause before 'accounts'." },
  { id: "em4", line: "We are out of coffee.", emotion: "opera singer", coach: "Full vowels, huge dynamic range, hold the final syllable." },
  { id: "em5", line: "Your flight leaves in forty minutes.", emotion: "panicking", coach: "Speed up, raise the pitch, breathe in the wrong places." },
  { id: "em6", line: "I've decided to sell everything and move to the coast.", emotion: "suspiciously calm", coach: "Flat intonation, steady pace, tiny smile in the voice." },
  { id: "em7", line: "That's the third time this week.", emotion: "delighted", coach: "Rising intonation, wide pitch range, stress 'third'." },
  { id: "em8", line: "Please read the terms and conditions carefully.", emotion: "sports commentator", coach: "Accelerate, add urgency, shout the last three words." },
  { id: "em9", line: "I don't remember agreeing to any of this.", emotion: "film-noir detective", coach: "Low, slow, lots of pauses, swallow the final consonants." },
  { id: "em10", line: "Everything is completely fine.", emotion: "barely holding it together", coach: "Bright words, shaky breath, one crack on 'fine'." },
];

export type KeepTalkingTopic = { id: string; topic: string; tasks: string[]; seconds: number };
export const KEEP_TALKING: KeepTalkingTopic[] = [
  { id: "kt1", topic: "Convince the bomb squad that your commute is worse than theirs", seconds: 90,
    tasks: ["Use a present perfect", "Name three places", "Use 'heavy traffic'", "Ask a rhetorical question", "Use a comparative"] },
  { id: "kt2", topic: "Explain how to survive a family dinner with people you disagree with", seconds: 90,
    tasks: ["Use a second conditional", "Use two linking words", "Give one piece of advice with 'should'", "Use a phrasal verb", "Quote someone"] },
  { id: "kt3", topic: "Sell the idea of a four-day week to a sceptical boss", seconds: 100,
    tasks: ["Use a passive form", "Give a statistic (invent it)", "Use 'however'", "Handle one objection", "Finish with a call to action"] },
  { id: "kt4", topic: "Describe the worst holiday photograph ever taken of you", seconds: 80,
    tasks: ["Use past continuous", "Use three adjectives of feeling", "Use 'used to'", "Add direct speech", "End with a joke"] },
  { id: "kt5", topic: "Argue that your city is misunderstood by tourists", seconds: 100,
    tasks: ["Use a relative clause", "Name two stereotypes", "Use 'despite'", "Recommend one place", "Use a superlative"] },
  { id: "kt6", topic: "Talk your way out of a speeding ticket", seconds: 80,
    tasks: ["Use a polite request", "Use 'I was just about to…'", "Apologise without admitting fault", "Use reported speech", "Offer a solution"] },
  { id: "kt7", topic: "Explain a technology your grandparents would hate", seconds: 90,
    tasks: ["Define it simply", "Use 'used to'", "Compare then and now", "Predict with 'will'", "Use one idiom"] },
  { id: "kt8", topic: "Defend the most unpopular food in your country", seconds: 80,
    tasks: ["Describe the taste", "Use 'although'", "Tell a childhood memory", "Use two food collocations", "Invite someone to try it"] },
];

export type SellItem = { id: string; item: string; twist: string; reserve: number };
export const SELL_ITEMS: SellItem[] = [
  { id: "se1", item: "A single left shoe, size 44, barely worn", twist: "The buyer must believe it is a collector's item", reserve: 40 },
  { id: "se2", item: "A jar of air from your hometown", twist: "Mention a smell and a memory", reserve: 60 },
  { id: "se3", item: "A alarm clock that only rings in French", twist: "Sell it as a language course", reserve: 55 },
  { id: "se4", item: "Ten minutes of absolute silence", twist: "Price it against a spa day", reserve: 70 },
  { id: "se5", item: "An umbrella with three holes", twist: "Turn the defect into a feature", reserve: 35 },
  { id: "se6", item: "Your unused gym membership", twist: "Sell the guilt, not the gym", reserve: 65 },
  { id: "se7", item: "A houseplant that has survived four owners", twist: "Give it a personality and a name", reserve: 50 },
  { id: "se8", item: "A phone with a two-hour battery", twist: "Market it as a wellbeing device", reserve: 45 },
  { id: "se9", item: "The last printed map of your city", twist: "Sell nostalgia to a data-tired audience", reserve: 75 },
  { id: "se10", item: "A cardboard box that once held a famous laptop", twist: "Sell the story, not the box", reserve: 30 },
];

export const NPC_BIDDERS = [
  { name: "Margot", style: "Art dealer, rewards vivid adjectives", seed: "Margot" },
  { name: "Dev", style: "Tech investor, rewards numbers and future forms", seed: "Dev" },
  { name: "Ines", style: "Sceptic, rewards answers to objections", seed: "Ines" },
  { name: "Kwame", style: "Collector, rewards storytelling and past tenses", seed: "Kwame" },
];

export type Mission = { id: string; mission: string; reveal: string; language: string };
export const SECRET_MISSIONS: Mission[] = [
  { id: "sm1", mission: "Make someone mention travel without asking about holidays", reveal: "Say the word 'suitcase' if they stall", language: "Indirect questions" },
  { id: "sm2", mission: "Get another player to disagree with you openly", reveal: "State something mildly outrageous about coffee", language: "Disagreeing politely" },
  { id: "sm3", mission: "Get someone to give you advice using 'should'", reveal: "Describe a problem you 'can't solve'", language: "Advice modals" },
  { id: "sm4", mission: "Make the room laugh using a comparison", reveal: "Use 'as … as' with something absurd", language: "Similes and comparatives" },
  { id: "sm5", mission: "Get another player to correct a fact you state", reveal: "Say a confident wrong number", language: "Correcting politely" },
  { id: "sm6", mission: "Make someone apologise for something tiny", reveal: "Pretend not to hear twice", language: "Apologising" },
  { id: "sm7", mission: "Get someone to make a prediction about next year", reveal: "Mention prices going up", language: "Future forms" },
  { id: "sm8", mission: "Make a player use a past perfect", reveal: "Ask what had happened before an event", language: "Past perfect" },
  { id: "sm9", mission: "Get someone to recommend a film to the room", reveal: "Complain you have nothing to watch", language: "Recommending" },
  { id: "sm10", mission: "Make someone interrupt you politely", reveal: "Speak for 30 seconds without a pause", language: "Interrupting" },
  { id: "sm11", mission: "Get a player to talk about their first job", reveal: "Mention a terrible boss you once had", language: "Narrative past" },
  { id: "sm12", mission: "Make someone use the word 'actually' twice", reveal: "State two small wrong facts", language: "Discourse markers" },
];

export type StoryRound = { id: string; opener: string; vocab: string[]; twist: string };
export const STORY_ROUNDS: StoryRound[] = [
  { id: "st1", opener: "The lift stopped between the fourth and fifth floor, and the woman next to me said my name.", vocab: ["stranger", "coincidence", "reluctantly", "whisper", "handle"], twist: "A phone starts ringing inside the wall." },
  { id: "st2", opener: "I bought a second-hand coat, and in the pocket there was a boarding pass for a flight that left tomorrow.", vocab: ["destination", "expire", "suspicious", "identical", "queue"], twist: "The name on the pass is yours." },
  { id: "st3", opener: "Every Tuesday at six, my neighbour carries an empty birdcage downstairs and brings it back full.", vocab: ["routine", "curious", "eventually", "confront", "feathers"], twist: "This Tuesday the cage is not empty." },
  { id: "st4", opener: "The company sent me to a conference that, according to every search engine, does not exist.", vocab: ["venue", "delegates", "badge", "apparently", "reimburse"], twist: "Someone at reception knows your name." },
  { id: "st5", opener: "My grandfather left me a map with one word written on it: 'sorry'.", vocab: ["inherit", "faded", "coastline", "dig", "regret"], twist: "The map is of the building you live in." },
  { id: "st6", opener: "At 3am the smart speaker in my kitchen started giving directions to somewhere I've never been.", vocab: ["glitch", "unplug", "insist", "coordinates", "reluctant"], twist: "It repeats the same street name every night." },
];
