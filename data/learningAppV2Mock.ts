/**
 * Learning App V2 mock — "Load Mock Data" for the 🎮 Learning App V2 type in
 * Lessons > Lesson Creator, and the source for the pre-generated Gallery
 * sample (built via `npx tsx tools/build_learning_app_v2.ts`).
 *
 * Schema matches utils/learningAppV2HtmlGenerator.ts (Lav2Data). Every activity
 * type is exercised — multiple_choice, true_false, cloze, scramble, dictation,
 * matching, audio_matching, pronunciation, tap_word, translate, speaking — plus
 * DuoRadio (`radio`), Stories (`story`), and the `html5` type where the lesson
 * embeds its own raw HTML5 interactive widgets (flip-card deck, memory match
 * game, boss quiz arena) with inline handlers and <script> blocks the player
 * executes. Scored items carry the structured feedback contract
 * (feedback + miniLesson + keywords + speakingPrompt).
 */

import type { Lav2Data, Lav2Section } from '../utils/learningAppV2HtmlGenerator';

const items = (...arr: any[]): string => JSON.stringify(arr);

const section1: Lav2Section = {
  title: '🗺️ City Sights',
  colour: '#1CB0F6',
  xpReward: 100,
  slides: [
    {
      heading: 'Welcome to the City!',
      body: 'Today you are a traveler exploring a new city. You will learn the names of places and how to ask for help. 🧳',
      example: 'Excuse me, where is the museum?',
      colour: '#1CB0F6',
    },
    {
      heading: 'Places in Town',
      body: 'Supermarket, bank, park, museum, hospital, train station — these are the places you need every day.',
      example: 'The bank is next to the park.',
      colour: '#1CB0F6',
    },
    {
      heading: 'Your Mission',
      body: 'Help the cat find its way to the museum! Answer every question to earn XP. 🐱🗺️',
      example: '',
      colour: '#1CB0F6',
    },
  ],
  activities: [
    {
      type: 'multiple_choice',
      title: 'Vocabulary: Places Around Town',
      skillLabel: 'Vocabulary',
      skillIcon: '📚',
      mode: 'in-class',
      content: items(
        {
          question: 'Where can you buy food and milk?',
          l1: '¿Dónde puedes comprar comida y leche?',
          options: ['Supermarket', 'Market', 'Bookshop'],
          answer: 'Supermarket',
          feedback: 'A supermarket is that big indoor shop with shelves of food — the market outside sells food too, so look for the building. 🛒',
          miniLesson: "Here is the trick: a **supermarket** is an indoor shop, but an open-air street **market** sells food too — so read the details. Both sell food, which is why this one was a trap. Picture the shelves of milk inside the big building — that is your supermarket. We say *a* supermarket (one of many), like *a* bank or *a* park.",
          keywords: ['supermarket', 'market', 'food'],
          speakingPrompt: 'Say out loud: describe where you buy food in your own town using the word "supermarket".',
          context: 'You are hungry after your trip.',
          contextTitle: 'Story',
          audioScript: 'Where can you buy food and milk?',
          audioLabel: '🔊 Listen',
        },
        {
          question: 'Where do sick people go to see a doctor?',
          l1: '¿A dónde van las personas enfermas para ver a un médico?',
          options: ['Hospital', 'Pharmacy', 'Bank'],
          answer: 'Hospital',
          feedback: 'Exactly — doctors and nurses work at the hospital. 🏥',
          miniLesson: "Watch the trap: a **pharmacy** also helps sick people, but there you buy medicine from a pharmacist — you do not see a *doctor* there. The hospital is the big building with doctors, nurses, and rooms for patients. Remember the family together: **hospital → doctor → nurse → medicine** — learn the four as one picture and they reinforce each other.",
          keywords: ['hospital', 'pharmacy', 'doctor'],
          speakingPrompt: 'Say out loud: "If I am sick, I go to the hospital to see a doctor."',
          audioScript: 'Where do sick people go to see a doctor?',
        },
        {
          question: 'Where can you see old paintings and history?',
          l1: '¿Dónde puedes ver pinturas antiguas e historia?',
          options: ['Museum', 'Gallery', 'Library'],
          answer: 'Museum',
          feedback: 'Right! A museum is a building where you see art and history. 🖼️',
          miniLesson: "Here is the difference: a **gallery** shows paintings too, but usually modern art by living artists. A **museum** shows old things — history, ancient objects, classic paintings. And a **library** is for books you borrow. So: old + historical + paintings together = *museum*.",
          keywords: ['museum', 'gallery', 'history'],
          speakingPrompt: 'Say out loud: "My favorite museum has old paintings from 1900."',
          audioScript: 'Where can you see old paintings and history?',
        },
        {
          question: 'Where do trains arrive and leave?',
          l1: '¿Dónde llegan y salen los trenes?',
          options: ['Train station', 'Bus stop', 'Airport'],
          answer: 'Train station',
          feedback: 'Perfect! Trains arrive at and leave from a train station. 🚉',
          miniLesson: "All three are travel places, so read the key word in the question: **trains**. Buses stop at a *bus stop*, planes land at an *airport*, and trains arrive at a **train station** — say it with a long *sss* sound at the start: *sss-train station*.",
          keywords: ['train station', 'bus stop', 'airport'],
          speakingPrompt: 'Say out loud: "I take the train — I go to the train station every morning."',
          audioScript: 'Where do trains arrive and leave?',
        },
      ),
    },
    {
      type: 'audio_matching',
      title: 'Listening: Words & Sounds',
      skillLabel: 'Listening',
      skillIcon: '👂',
      mode: 'in-class',
      content: items(
        { word: 'bakery', definition: 'A shop that sells bread and cakes', l1: 'panadería', audioScript: 'A bakery sells fresh bread and cakes.' },
        { word: 'bookshop', definition: 'A shop that sells books', l1: 'librería', audioScript: 'A bookshop is full of stories.' },
        { word: 'pharmacy', definition: 'A shop where you buy medicine', l1: 'farmacia', audioScript: 'You buy medicine at a pharmacy.' },
        { word: 'café', definition: 'A small restaurant for coffee and snacks', l1: 'cafetería', audioScript: "Let's get a coffee at the café." },
      ),
    },
    {
      type: 'true_false',
      title: 'Reading: A City Day',
      skillLabel: 'Reading',
      skillIcon: '📖',
      mode: 'homework',
      content: items(
        {
          statement: 'Lily goes to the bakery to buy fresh bread.',
          isTrue: true,
          feedback: "Correct! You read carefully — Lily\u2019s first stop IS the bakery. 🥖",
          miniLesson: "READING SKILL: true/false questions test details. The story says 'bakery → supermarket → pharmacy → park' — the bakery comes FIRST.",
          keywords: ['bakery', 'fresh bread'],
          speakingPrompt: 'Say out loud: "I go to the bakery to buy fresh bread."',
          context: 'Lily\u2019s day: bakery → supermarket → pharmacy → park.',
          contextTitle: 'Story',
          audioScript: 'Lily goes to the bakery to buy fresh bread.',
        },
        {
          statement: 'The pharmacy sells apples and milk.',
          isTrue: false,
          feedback: 'No — the pharmacy sells medicine. The supermarket sells apples and milk. 🛒',
          miniLesson: "Shop logic: a **pharmacy** sells medicine; a **supermarket** sells food like apples and milk. Read what each shop really sells before you answer TRUE or FALSE.",
          keywords: ['pharmacy', 'supermarket'],
          context: 'Lily\u2019s day: bakery → supermarket → pharmacy → park.',
          audioScript: 'The pharmacy sells apples and milk.',
        },
        {
          statement: 'Lily relaxes in the park at the end of her day.',
          isTrue: true,
          feedback: 'After shopping, Lily relaxes in the park — the story ends there. 🌳',
          miniLesson: "Reading for detail: the story order was **bakery → supermarket → pharmacy → park** — the park comes *last*, so that is where she relaxes at the end of her day.",
          keywords: ['at the end'],
          context: 'Lily\u2019s day: bakery → supermarket → pharmacy → park.',
          audioScript: 'Lily relaxes in the park at the end of her day.',
        },
      ),
    },
  ],
};

const section2: Lav2Section = {
  title: '📍 Getting There',
  colour: '#58CC02',
  xpReward: 120,
  slides: [
    {
      heading: 'Ask for Directions',
      body: 'Politely ask: "Excuse me, how do I get to...?" — then listen carefully!',
      example: 'Excuse me, how do I get to the station?',
      colour: '#58CC02',
    },
    {
      heading: 'Direction Words',
      body: 'Go straight, turn left, turn right, cross the street, it\u2019s on your right.',
      example: 'Turn left at the bank, then go straight.',
      colour: '#58CC02',
    },
    {
      heading: 'Mini-Mission',
      body: 'Help the cat cross the city! Use the direction words to reach the museum. 🐱',
      example: '',
      colour: '#58CC02',
    },
  ],
  activities: [
    {
      type: 'cloze',
      title: 'Grammar: Giving Directions',
      skillLabel: 'Grammar',
      skillIcon: '📐',
      mode: 'in-class',
      content: items(
        {
          sentence: 'Go straight ahead, then ___ left at the bank.',
          l1: 'Sigue recto y luego gira a la izquierda en el banco.',
          blanks: ['turn'],
          feedback: "Great! 'Turn left' means change direction to your left. ↩️",
          miniLesson: "VERB POWER: 'turn' + 'left/right' is a fixed pair — never 'go left' in directions. 'Turn left at the bank' = change direction when you reach the bank.",
          keywords: ['turn left', 'go straight'],
          speakingPrompt: 'Say out loud: give directions to your door using "turn left" and "go straight".',
          audioScript: 'Go straight ahead, then turn left at the bank.',
        },
        {
          sentence: 'The museum is ___ the right, next to the park.',
          blanks: ['on'],
          feedback: "We say 'on the right' or 'on the left' — 'on' + a side. 👉",
          miniLesson: "Remember the pair: **on the right** and **on the left** — the preposition *on* always goes with a side. The museum is on the right, *next to* the park — two location phrases in one sentence.",
          keywords: ['on the right', 'next to'],
          audioScript: 'The museum is on the right, next to the park.',
        },
        {
          sentence: 'Excuse me, ___ do I get to the train station?',
          blanks: ['how'],
          feedback: "'How do I get to...?' is the classic way to ask for directions. 🗺️",
          miniLesson: "Question pattern: **How do I get to...?** — the question word *how* asks for the way. Excuse me, how do I get to the train station? Remember the order: how + do + I + get + to + place.",
          keywords: ['how do I get to'],
          audioScript: 'Excuse me, how do I get to the train station?',
        },
      ),
    },
    {
      type: 'scramble',
      title: 'Sentence Builder',
      skillLabel: 'Writing',
      skillIcon: '✍️',
      mode: 'in-class',
      content: items(
        {
          chunks: ['Turn', 'left', 'at', 'the', 'hospital.'],
          answer: 'Turn left at the hospital.',
          feedback: 'Great sentence! You rebuilt it perfectly — Turn left at the hospital. 🏥',
          miniLesson: "SENTENCE PATTERN: Turn left/right + AT + place. The preposition 'at' marks the exact spot where you change direction.",
          keywords: ['turn left at', 'hospital'],
          speakingPrompt: 'Say out loud: "Turn left at the hospital" — then give your own example.',
        },
        {
          chunks: ['The', 'park', 'is', 'on', 'your', 'right.'],
          answer: 'The park is on your right.',
          feedback: 'The park is on your right — "on" + "your" + a side. 🌳',
          miniLesson: "Sentence pattern: **The [place] is on your [side]** — the park is *on your right*. When you give directions, the place comes first, then *on your left* or *on your right*.",
          keywords: ['on your right'],
        },
        {
          chunks: ['How', 'do', 'I', 'get', 'to', 'the', 'museum?'],
          answer: 'How do I get to the museum?',
          feedback: 'How do I get to the museum? — the order matters. 🖼️',
          miniLesson: "Question word order: **How + do + I + get + to + place?** The question word *how* goes first, then *do I*, then the verb *get*. Never say *How I get to the museum* in a question.",
          keywords: ['how do I get to'],
        },
      ),
    },
    {
      type: 'dictation',
      title: 'Listening: Dictation',
      skillLabel: 'Listening',
      skillIcon: '👂',
      mode: 'homework',
      content: items(
        {
          audioScript: 'Go straight and turn right at the café.',
          answer: 'Go straight and turn right at the café.',
          feedback: 'Beautiful listening! You caught every direction word — straight, turn, right, café. 👏',
          miniLesson: "LISTENING TIP: direction sentences follow a beat: [action] + [place]. Hear the action word first, then relax — the place comes last.",
          keywords: ['go straight', 'turn right', 'café'],
          speakingPrompt: 'Say out loud: "Go straight and turn right at the café."',
        },
        {
          audioScript: 'The bank is across the street from the park.',
          answer: 'The bank is across the street from the park.',
          feedback: "'Across the street from' — one place facing another. 🌟",
          miniLesson: "Key phrase: **across the street from** — the bank is *across the street from* the park, one on each side of the road. Hear the rhythm: the + place + is + across the street from + the + place.",
          keywords: ['across the street from'],
        },
      ),
    },
    {
      type: 'translate',
      title: 'Translate: Street Talk',
      skillLabel: 'Writing',
      skillIcon: '🖋️',
      mode: 'homework',
      content: items(
        {
          prompt: 'Gira a la izquierda en el banco.',
          answer: 'Turn left at the bank.',
          l1: 'Gira a la izquierda en el banco.',
          feedback: "Beautiful! 'Turn left at the bank' — you just gave directions in English. 🏦",
          miniLesson: "RULE: 'turn left/right at + place' — the place marks the spot where you change direction. 'At' pinpoints it.",
          keywords: ['turn left at', 'bank'],
          speakingPrompt: 'Say out loud: give directions to your favorite café using "turn left" and "go straight".',
          audioScript: 'Turn left at the bank.',
        },
        {
          prompt: 'El museo está a la derecha, junto al parque.',
          answer: 'The museum is on the right, next to the park.',
          feedback: "Great job! 'On the right' + 'next to' — a perfect location sentence. 🌳",
          miniLesson: "RULE: 'on the right/left' says the side, 'next to' says the neighbor. Chain them: The X is on the right, next to the Y.",
          keywords: ['on the right', 'next to'],
          speakingPrompt: 'Say out loud: describe your school using "on the left" and "next to".',
          audioScript: 'The museum is on the right, next to the park.',
        },
      ),
    },
    {
      type: 'tap_word',
      title: 'Listen & Tap: Direction Words',
      skillLabel: 'Listening',
      skillIcon: '👂',
      mode: 'in-class',
      content: items(
        {
          answer: 'straight',
          words: ['straight', 'street', 'strong', 'stripe'],
          audioScript: 'straight',
          feedback: "Perfect ear! 'Straight' is the sound-alike trap — you heard the real one. 👂",
          miniLesson: "SOUND TIP: 'straight' (/streɪt/) rhymes with 'late'; 'street' (/striːt/) rhymes with 'meet'. One sound separates them!",
          keywords: ['straight', 'street'],
          speakingPrompt: 'Say both out loud: straight... street... — can you hear the difference?',
        },
        {
          answer: 'left',
          words: ['left', 'lift', 'loft', 'let'],
          audioScript: 'left',
          feedback: 'Nailed it! Left is the direction your heart is on. ❤️',
          miniLesson: "MEMORY HOOK: your heart is on your LEFT side — that is how you never mix up left and right.",
          keywords: ['left', 'right'],
          speakingPrompt: 'Point to your left and say: "This is my left."',
        },
        {
          answer: 'corner',
          words: ['corner', 'camera', 'corn', 'carrot'],
          audioScript: 'corner',
          feedback: "You caught 'corner' — the word that turns sentences! 🔄",
          miniLesson: "WORD POWER: 'corner' = where two streets meet. 'Around the corner' = very close by.",
          keywords: ['corner', 'around the corner'],
          speakingPrompt: 'Say: "The café is around the corner."',
        },
        {
          answer: 'cross',
          words: ['cross', 'cost', 'course', 'crow'],
          audioScript: 'cross',
          feedback: "Yes! 'Cross the street' means go from one side to the other. 🚸",
          miniLesson: "VERB POWER: 'to cross' = to go across. Always cross at the zebra crossing!",
          keywords: ['cross', 'zebra crossing'],
          speakingPrompt: 'Say: "I cross the street at the zebra crossing."',
        },
      ),
    },
    {
      type: 'html5',
      title: 'Flip Cards: Direction Phrases',
      skillLabel: 'Vocabulary',
      skillIcon: '🃏',
      mode: 'in-class',
      content: items({
        html: `<style>
.fc{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.fcard{flex:1 1 45%;min-height:130px;perspective:800px;cursor:pointer}
.fcard-in{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s}
.fcard.flip .fcard-in{transform:rotateY(180deg)}
.fcard-f,.fcard-b{position:absolute;inset:0;backface-visibility:hidden;border-radius:16px;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-weight:800;font-size:14px;line-height:1.4}
.fcard-f{background:#e6f6ff;border:2px solid #7dd3fc;color:#0284c7}
.fcard-b{background:#1CB0F6;color:#fff;transform:rotateY(180deg)}
</style>
<div style="font-weight:900;color:#374151">👆 Tap each card to flip it — English on the front, your language on the back!</div>
<div class="fc" id="fdeck">
  <div class="fcard" onclick="this.classList.toggle('flip')"><div class="fcard-in"><div class="fcard-f">🚶 go straight</div><div class="fcard-b">seguir recto<br><span style="font-size:11px;opacity:.9">Go straight to the end of the street.</span></div></div></div>
  <div class="fcard" onclick="this.classList.toggle('flip')"><div class="fcard-in"><div class="fcard-f">↩️ turn left</div><div class="fcard-b">girar a la izquierda<br><span style="font-size:11px;opacity:.9">Turn left at the bank.</span></div></div></div>
  <div class="fcard" onclick="this.classList.toggle('flip')"><div class="fcard-in"><div class="fcard-f">↪️ turn right</div><div class="fcard-b">girar a la derecha<br><span style="font-size:11px;opacity:.9">Turn right at the traffic lights.</span></div></div></div>
  <div class="fcard" onclick="this.classList.toggle('flip')"><div class="fcard-in"><div class="fcard-f">🚸 cross the street</div><div class="fcard-b">cruzar la calle<br><span style="font-size:11px;opacity:.9">Cross the street at the zebra crossing.</span></div></div></div>
</div>`,
        feedback: 'Great flipping! You now know the four key direction phrases. 🗺️',
      }),
    },
  ],
  test: {
    tasks: [
      {
        type: 'read_select',
        words: ['bakery', 'florbnik', 'hospital', 'smorble', 'museum', 'drimble', 'pharmacy', 'vexlite', 'library', 'plonket', 'café', 'blimber'],
        real: ['bakery', 'hospital', 'museum', 'pharmacy', 'library', 'café'],
      },
      {
        type: 'fill_blanks',
        items: ['The {{bak:bakery}} sells fresh bread.', 'Where is the {{mus:museum}}?', 'The park is {{on:on}} the left.', 'You buy medicine at the {{pha:pharmacy}}.'],
      },
      {
        type: 'write_photo',
        image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800',
        alt: 'A city street with shops',
        prompt: 'Write about the photo. What places can you see? What do people do there?',
        minWords: 30,
        sample: 'This is a busy city street. There is a bakery on the left — the bread smells amazing. Next to the bakery, there is a small café where people drink coffee. Across the street, I can see a museum and a train station. People cross the street at the zebra crossing.',
      },
    ],
  },
};

const section3: Lav2Section = {
  title: '🎪 City Adventure',
  colour: '#FF9600',
  xpReward: 150,
  slides: [
    {
      heading: 'The Grand Finale',
      body: 'Now you\u2019re ready for the City Adventure! Use everything you learned: places, directions, and polite questions.',
      example: 'Excuse me, is the zoo near the museum?',
      colour: '#FF9600',
    },
    {
      heading: 'Polite Phrases',
      body: '"Excuse me", "thank you", "you\u2019re welcome" — politeness opens every door.',
      example: 'Thank you so much for your help!',
      colour: '#FF9600',
    },
    {
      heading: 'Boss Challenge',
      body: 'The cat must reach the zoo before sunset! Complete every activity to win. 🏆',
      example: '',
      colour: '#FF9600',
    },
  ],
  activities: [
    {
      type: 'matching',
      title: 'Vocabulary Review',
      skillLabel: 'Vocabulary',
      skillIcon: '📚',
      mode: 'homework',
      content: items(
        { word: 'zoo', definition: 'a place where you see animals' },
        { word: 'library', definition: 'a quiet place with books to read' },
        { word: 'market', definition: 'an outdoor place with many small shops' },
        { word: 'bus stop', definition: 'a place where buses pick up people' },
        { word: 'parking lot', definition: 'a place where you leave your car' },
      ),
    },
    {
      type: 'multiple_choice',
      title: 'Boss Challenge: City Quiz',
      skillLabel: 'Grammar',
      skillIcon: '🧠',
      mode: 'in-class',
      content: items(
        {
          question: 'Excuse me, ___ is the nearest bus stop?',
          options: ['where', 'what', 'who'],
          answer: 'where',
          feedback: "We ask 'where is...' for places. 📍",
          miniLesson: "Question word: **where** asks for a *place*. What asks for a thing, who asks for a person — so for the bus stop you need **where is...**.",
          keywords: ['where is'],
          audioScript: 'Excuse me, where is the nearest bus stop?',
        },
        {
          question: 'The zoo is ___ the left, next to the museum.',
          options: ['at', 'on', 'in'],
          answer: 'on',
          feedback: "'On the left' / 'on the right' are fixed phrases. 👈",
          miniLesson: "Fixed phrase: **on the left** and **on the right** always use *on* — never at or in. Picture the map: the zoo sits ON the left side, next to the museum.",
          keywords: ['on the left'],
          audioScript: 'The zoo is on the left, next to the museum.',
        },
        {
          question: 'You want to read quietly for an hour. Where do you go?',
          options: ['The library', 'The market', 'The parking lot'],
          answer: 'The library',
          feedback: 'A library is quiet and full of books. 📚',
          miniLesson: "Read the mood words: **quiet** and **read** point to the library — markets are loud and parking lots are empty. Match the activity to the place.",
          keywords: ['library', 'quiet'],
          context: 'The cat wants a quiet afternoon.',
          contextTitle: 'Story',
          audioScript: 'You want to read quietly for an hour. Where do you go?',
        },
      ),
    },
    {
      type: 'audio_matching',
      title: 'Listening: Voices of the City',
      skillLabel: 'Listening',
      skillIcon: '👂',
      mode: 'in-class',
      content: items(
        { word: 'bakery', definition: 'You smell fresh bread and hear the oven here.', audioScript: 'You smell fresh bread and hear the oven here.' },
        { word: 'train station', definition: 'You hear announcements and trains arriving here.', audioScript: 'You hear announcements and trains arriving here.' },
        { word: 'library', definition: 'It is so quiet here that you can hear a page turn.', audioScript: 'It is so quiet here that you can hear a page turn.' },
        { word: 'park', definition: 'You hear birds and children playing here.', audioScript: 'You hear birds and children playing here.' },
      ),
    },
    {
      type: 'pronunciation',
      title: 'Speak Like a Local',
      skillLabel: 'Speaking',
      skillIcon: '🎤',
      mode: 'in-class',
      content: items(
        {
          sentence: 'Excuse me, how do I get to the zoo?',
          phonetic: '/ɪkˈskjuːz miː, haʊ daɪ ɡet tə ðə zuː/',
          tip: "Stress the words 'get' and 'zoo' — and keep 'Excuse me' soft and polite.",
          feedback: 'Lovely intonation! Your question sounds super natural. 🎙️',
        },
        {
          sentence: 'Turn right at the traffic lights.',
          phonetic: '/tɜːn raɪt æt ðə ˈtræfɪk laɪts/',
          tip: "Link 'turn' and 'right' together: 'turn-right'.",
          feedback: 'Beautiful rhythm! The lights are green for you. 🚦',
        },
      ),
    },
    {
      type: 'speaking',
      title: 'Speaking: Ask Like a Local',
      skillLabel: 'Speaking',
      skillIcon: '🎤',
      mode: 'in-class',
      content: items(
        {
          sentence: 'Excuse me, where is the nearest bank?',
          phonetic: '/ɪkˈskjuːz miː, weər ɪz ðə ˈnɪərɪst bæŋk/',
          tip: "Stress 'WHERE' and 'NEAR-est' — and keep 'Excuse me' soft and polite.",
          feedback: 'Wonderful! You sound like a friendly local already. 🏦',
          miniLesson: "PRONUNCIATION: 'nearest' = /ˈnɪərɪst/ — the 'ea' sounds like 'ear'. Compare: near → nearest.",
          keywords: ['nearest', 'Excuse me'],
          speakingPrompt: 'Now ask about the nearest café using the same pattern.',
        },
        {
          sentence: 'Is it far from here?',
          phonetic: '/ɪz ɪt fɑː frəm hɪər/',
          tip: "Make it a question: rise your voice on 'here'. 'Far' rhymes with 'car'.",
          feedback: 'Perfect question melody! Your intonation went up at the end. 🎵',
          miniLesson: "QUESTION RHYTHM: yes/no questions rise at the end: 'Is it far from HERE?' — the voice lifts on the last word.",
          keywords: ['far', 'Is it ... from here?'],
          speakingPrompt: 'Ask a friend: "Is the museum far from here?"',
        },
      ),
    },
    {
      type: 'story',
      title: 'Story: The Cat\u2019s Lost Keys',
      skillLabel: 'Reading',
      skillIcon: '📖',
      mode: 'homework',
      content: items(
        {
          paragraphs: [
            { emoji: '🐱', text: 'Momo the cat woke up early and hungry. He wanted a croissant from the bakery — but his keys were gone!' },
            { emoji: '🔑', text: '"Excuse me," Momo said to the baker, "have you seen my keys? I need to get home." The baker smiled. "Check the supermarket — I saw you there this morning."' },
            { emoji: '🛒', text: 'Momo crossed the street at the zebra crossing and turned left at the bank. The supermarket was on the right, next to the pharmacy.' },
            { emoji: '💊', text: 'In the supermarket, the manager shook her head. "No keys here. Try the park — you always relax there after shopping."' },
            { emoji: '🌳', text: 'Momo went straight ahead, past the museum, and into the park. And there, under the big tree on the left, his keys were shining in the sun!' },
            { emoji: '🥐', text: '"Thank you, city!" Momo purred. He bought two croissants from the bakery and walked home — on the right side, of course.' },
          ],
          feedback: 'A sweet ending! You read a whole story in English — that is a real milestone. 📚',
          miniLesson: "STORY RECAP: the story recycled 'excuse me', 'turn left at', 'on the right', 'next to', 'go straight ahead', 'cross the street', 'pharmacy', 'bakery', 'supermarket', 'park' — all your city words in one adventure.",
          keywords: ['cross the street', 'turn left at', 'on the right', 'next to'],
          speakingPrompt: 'Retell the story in 3 sentences: where did Momo find his keys?',
        },
        {
          question: 'What did Momo want from the bakery?',
          options: ['A croissant', 'A key', 'Medicine'],
          answer: 'A croissant',
          feedback: 'Exactly — he was hungry for a croissant! 🥐',
          miniLesson: 'Remember: the bakery sells bread and cakes — and croissants!',
          keywords: ['croissant', 'bakery'],
          speakingPrompt: 'Say: "The bakery sells fresh bread."',
          audioScript: 'What did Momo want from the bakery?',
        },
        {
          question: 'Where did Momo find his keys?',
          options: ['Under a tree in the park', 'At the pharmacy', 'In the museum'],
          answer: 'Under a tree in the park',
          feedback: 'Yes! Under the big tree, on the left of the park. 🌳',
          miniLesson: "Position words: 'under' (below), 'on the left' (left side), 'past' (beyond) — small words, big meaning.",
          keywords: ['under', 'on the left', 'past'],
          speakingPrompt: 'Say: "The keys were under the tree on the left."',
          audioScript: 'Where did Momo find his keys?',
        },
        {
          statement: 'Momo crossed the street at the zebra crossing.',
          isTrue: true,
          feedback: 'Right! Safety first — always at the zebra crossing. 🚸',
          miniLesson: "Reminder: 'cross the street' + 'at the zebra crossing' — a complete, safe sentence.",
          keywords: ['zebra crossing'],
          speakingPrompt: 'Say: "I cross the street at the zebra crossing."',
          audioScript: 'Momo crossed the street at the zebra crossing.',
        },
      ),
    },
    {
      type: 'html5',
      title: 'Mini-Game: Memory Match',
      skillLabel: 'Game',
      skillIcon: '🎮',
      mode: 'homework',
      content: items({
        html: `<style>
.mg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.mcard{min-height:64px;background:#fff;border:2px solid #e5e7eb;border-radius:14px;font-size:26px;transition:all .15s}
.mcard.on{background:#fff7ed;border-color:#FF9600}
.mcard.ok{background:#f0fdf4;border-color:#58CC02}
.mcard span{pointer-events:none}
</style>
<div style="font-weight:900;color:#374151">🧠 Find all the animal pairs! Tap two cards at a time.</div>
<div class="mg" id="mg"></div>
<div id="mg-msg" style="text-align:center;font-weight:900;margin-top:12px;color:#9ca3af">Pairs found: 0 / 6</div>
<script>
(function(){
  var em=['🐶','🐱','🐵','🦊','🐻','🐼'], cards=[];
  em.forEach(function(e){ cards.push(e,e); });
  for(var i=cards.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=cards[i]; cards[i]=cards[j]; cards[j]=t; }
  var open=[], lock=false, done=0;
  var box=document.getElementById('mg');
  box.innerHTML=cards.map(function(c,i){ return '<button class="mcard" data-i="'+i+'"><span style="opacity:0">'+c+'</span></button>'; }).join('');
  box.onclick=function(ev){
    var b=ev.target.closest('.mcard');
    if(!b||lock||b.classList.contains('on')||b.classList.contains('ok')) return;
    b.classList.add('on'); open.push(b);
    if(open.length===2){
      lock=true;
      if(open[0].textContent===open[1].textContent){
        done++; open.forEach(function(o){ o.classList.add('ok'); });
        var msg=document.getElementById('mg-msg');
        if(msg){ msg.textContent=done===6?'🎉 You found all 6 pairs! Perfect memory!':'Pairs found: '+done+' / 6'; }
        open=[]; lock=false;
      } else {
        setTimeout(function(){ open.forEach(function(o){ o.classList.remove('on'); }); open=[]; lock=false; }, 700);
      }
    }
  };
})();
</script>`,
        feedback: 'Amazing memory! You matched every pair like a champion. 🧠',
      }),
    },
  ],
};

const section4: Lav2Section = {
  title: '🏆 Mastery Review',
  colour: '#A855F7',
  xpReward: 200,
  slides: [
    {
      heading: 'The Mastery Gauntlet',
      body: 'One final arena to prove you can handle the whole city: places, directions, listening, and speaking — all together. 🏆',
      example: 'You know more English than you think!',
      colour: '#A855F7',
    },
    {
      heading: 'Your Weak Spots',
      body: 'The game remembers your mistakes. Turn them into wins and walk out stronger!',
      example: 'Open ⚙️ Settings → Self-Study Mode to redo only your incorrect answers.',
      colour: '#A855F7',
    },
    {
      heading: 'Final Boss',
      body: 'Complete every review round to earn the Mastery crown. The cat is counting on you! 🐱👑',
      example: '',
      colour: '#A855F7',
    },
  ],
  activities: [
    {
      type: 'multiple_choice',
      title: 'Weak-Spot Review: Tricky Choices',
      skillLabel: 'Review',
      skillIcon: '🧠',
      mode: 'homework',
      content: items(
        {
          question: 'You have a headache. Where do you go?',
          options: ['Pharmacy', 'Supermarket', 'Café'],
          answer: 'Pharmacy',
          feedback: 'Medicine comes from the pharmacy — not the supermarket. 💊',
          miniLesson: "Pain = pharmacy: for a **headache** you buy medicine, and medicine lives at the **pharmacy**. The supermarket sells food, the café sells coffee — read the symptom first.",
          keywords: ['pharmacy', 'medicine'],
          context: 'Your head hurts after the long walk.',
          contextTitle: 'Story',
          audioScript: 'You have a headache. Where do you go?',
        },
        {
          question: 'The museum is ___ the left, next to the train station.',
          options: ['on', 'at', 'in'],
          answer: 'on',
          feedback: "Correct! It's always 'on the left' or 'on the right'. 👈",
          miniLesson: "RULE: 'on the left/right' are fixed phrases — we say ON, never AT or IN. Think of the page: the picture is ON the left side.",
          keywords: ['on the left', 'on the right'],
          speakingPrompt: 'Say out loud: "The museum is on the left, next to the train station."',
          audioScript: 'The museum is on the left, next to the train station.',
        },
        {
          question: 'Excuse me, ___ can I buy a bus ticket?',
          options: ['where', 'what', 'who'],
          answer: 'where',
          feedback: "'Where' asks for a place — the ticket office. 🎫",
          miniLesson: "Same rule, new sentence: **where** + can + I + verb — *where can I buy a bus ticket?* You buy things AT a place, so the question is where.",
          keywords: ['where can I'],
          audioScript: 'Excuse me, where can I buy a bus ticket?',
        },
        {
          question: "Lily's first stop was the bakery. What did she buy there?",
          options: ['Fresh bread', 'Medicine', 'A book'],
          answer: 'Fresh bread',
          feedback: 'The bakery sells fresh bread — that was her first stop. 🥖',
          miniLesson: "Story detail: the order was **bakery → supermarket → pharmacy → park**, and the bakery is famous for *fresh bread* — medicine and books live in other shops.",
          keywords: ['bakery', 'fresh bread'],
          context: "Lily's day: bakery → supermarket → pharmacy → park.",
          contextTitle: 'Story',
          audioScript: "Lily's first stop was the bakery. What did she buy there?",
        },
      ),
    },
    {
      type: 'matching',
      title: 'Boss Round: The Whole City',
      skillLabel: 'Vocabulary',
      skillIcon: '🗺️',
      mode: 'in-class',
      content: items(
        { word: 'bakery', definition: 'a shop that sells bread and cakes' },
        { word: 'bookshop', definition: 'a shop that sells books' },
        { word: 'pharmacy', definition: 'a shop where you buy medicine' },
        { word: 'café', definition: 'a small restaurant for coffee and snacks' },
        { word: 'museum', definition: 'a building where you see art and history' },
        { word: 'hospital', definition: 'a place where doctors help sick people' },
        { word: 'train station', definition: 'a place where trains arrive and leave' },
        { word: 'park', definition: 'a green place to relax outside' },
      ),
    },
    {
      type: 'scramble',
      title: 'Boss Sentences',
      skillLabel: 'Writing',
      skillIcon: '✍️',
      mode: 'in-class',
      content: items(
        {
          chunks: ['Excuse', 'me,', 'where', 'is', 'the', 'nearest', 'pharmacy?'],
          answer: 'Excuse me, where is the nearest pharmacy?',
          feedback: 'Perfect polite question! The nearest pharmacy is just around the corner. 💊',
          miniLesson: "POLITE QUESTION FORMULA: 'Excuse me' (attention) + 'where is' (question) + 'the nearest' (superlative) + place. Order matters!",
          keywords: ['Excuse me', 'where is', 'nearest'],
          speakingPrompt: 'Ask out loud for the nearest bookshop using the same formula.',
        },
        {
          chunks: ['Cross', 'the', 'street', 'at', 'the', 'zebra', 'crossing.'],
          answer: 'Cross the street at the zebra crossing.',
          feedback: 'Always cross at the zebra crossing — the safe spot. 🚸',
          miniLesson: "Safety rule: **cross + the street + at + the zebra crossing** — the crossing is the *safe* place with white stripes. Verb first: Cross the street.",
          keywords: ['zebra crossing', 'cross the street'],
        },
      ),
    },
    {
      type: 'dictation',
      title: 'Final Listening Boss',
      skillLabel: 'Listening',
      skillIcon: '👂',
      mode: 'homework',
      content: items(
        {
          audioScript: 'Turn left at the museum and go straight to the park.',
          answer: 'Turn left at the museum and go straight to the park.',
          feedback: 'The route: turn left at the museum, then go straight to the park. 🗺️',
          miniLesson: "Chained directions: **turn left AT a place**, then **go straight TO a place** — at marks the turning point, to marks the destination.",
          keywords: ['turn left at', 'go straight to'],
        },
        {
          audioScript: 'The best café in town is next to the bookshop.',
          answer: 'The best café in town is next to the bookshop.',
          feedback: "'Next to' — the café is beside the bookshop. ☕",
          miniLesson: "Position word: **next to** means *beside* — the best café in town is next to the bookshop. Hear the superlative too: *the best* = number one.",
          keywords: ['next to', 'the best'],
        },
      ),
    },
    {
      type: 'radio',
      title: 'DuoRadio: The Lost Tourist',
      skillLabel: 'Listening',
      skillIcon: '📻',
      mode: 'in-class',
      content: items(
        {
          lines: [
            { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'Welcome back to DuoRadio! I am Maya, and today we follow Leo the tourist.' },
            { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'Excuse me! Excuse me! I need help. Where is the train station?' },
            { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'Leo, you need a map. Look — go straight ahead, then turn left at the bank.' },
            { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'Turn left at the bank... got it! And what about the museum?' },
            { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'The museum is on the right, next to the park. You cannot miss it.' },
            { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'Is it far from here? My feet are tired!' },
            { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'No, it is around the corner! Cross the street at the zebra crossing and you are there.' },
            { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'Perfect! Thank you so much. And where can I buy a coffee?' },
            { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'The best café in town is next to the bookshop — they sell croissants too!' },
            { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'A croissant after the museum... now that is a plan. See you, Maya!' },
            { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'See you, Leo! And remember: always cross at the zebra crossing. Stay safe!' },
          ],
          feedback: 'You listened to the whole episode — and every word was your city vocabulary. 📻',
          miniLesson: "EPISODE RECAP: 'go straight ahead', 'turn left at the bank', 'on the right, next to the park', 'around the corner', 'cross the street at the zebra crossing' — the full direction toolkit in one conversation.",
          keywords: ['go straight', 'turn left at', 'around the corner', 'next to'],
          speakingPrompt: 'Act out the episode: be Leo and ask Maya for directions to the café.',
        },
        {
          question: 'What does Leo want to find first?',
          options: ['The train station', 'The museum', 'A café'],
          answer: 'The train station',
          feedback: 'Right! First stop: the train station. 🚉',
          miniLesson: "Question focus: 'Where is...?' — Leo\u2019s first words were 'Excuse me! Where is the train station?'",
          keywords: ['train station'],
          speakingPrompt: 'Say: "Excuse me, where is the train station?"',
          audioScript: 'What does Leo want to find first?',
        },
        {
          question: 'Where is the museum?',
          options: ['On the right, next to the park', 'Turn left at the bank', 'Next to the bookshop'],
          answer: 'On the right, next to the park',
          feedback: 'Exactly — on the right, next to the park. 🖼️',
          miniLesson: "Position chain: 'on the right' (side) + 'next to the park' (neighbor) — one sentence, two clues.",
          keywords: ['on the right', 'next to'],
          speakingPrompt: 'Say: "The museum is on the right, next to the park."',
          audioScript: 'Where is the museum?',
        },
        {
          question: 'What does Maya say about crossing the street?',
          options: ['Always cross at the zebra crossing', 'Never cross the street', 'Cross anywhere you like'],
          answer: 'Always cross at the zebra crossing',
          feedback: 'Safe and correct — the zebra crossing is the safe spot! 🚸',
          miniLesson: "Safety language: 'always' + imperative: 'Always cross at the zebra crossing.'",
          keywords: ['always', 'zebra crossing'],
          speakingPrompt: 'Say: "I always cross at the zebra crossing."',
          audioScript: 'What does Maya say about crossing the street?',
        },
      ),
    },
    {
      type: 'html5',
      title: 'Boss Arena: Quiz Showdown',
      skillLabel: 'Game',
      skillIcon: '⚔️',
      mode: 'in-class',
      content: items({
        html: `<style>
.qz{margin-top:10px}
.qz-q{font-weight:900;color:#374151;margin-bottom:10px}
.qz-opt{display:block;width:100%;text-align:left;padding:12px;border:2px solid #e5e7eb;border-radius:12px;background:#fff;font-weight:700;font-size:14px;color:#374151;margin-bottom:8px;cursor:pointer}
.qz-opt.ok{background:#f0fdf4;border-color:#58CC02;color:#166534}
.qz-opt.bad{background:#fef2f2;border-color:#f87171;color:#b91c1c}
.qz-opt:disabled{opacity:.75;cursor:default}
.qz-score{font-weight:900;color:#6b7280;margin:10px 0}
.qz-done{background:#fffbeb;border:2px solid #fde68a;border-radius:14px;padding:12px;text-align:center;font-weight:900;color:#a16207;margin-top:10px}
</style>
<div style="font-weight:900;color:#374151">⚔️ Five questions. No mercy. Answer them all!</div>
<div class="qz" id="qz"></div>
<div class="qz-score" id="qz-score">Score: 0 / 5</div>
<script>
(function(){
  var QS=[
    {q:"1. Which word means to travel to work or school?",o:["commute","sleep","eat"],a:0},
    {q:"2. Choose the polite question:",o:["Where museum?","Excuse me, where is the museum?","Museum where?"],a:1},
    {q:"3. She ___ up at 6 AM every day.",o:["wake","wakes","waking"],a:1},
    {q:"4. On the left means:",o:["your left side","your right side","straight ahead"],a:0},
    {q:"5. The train station is ___ the right.",o:["at","in","on"],a:2}
  ];
  var qz=document.getElementById('qz'), sc=document.getElementById('qz-score'), qi=0, score=0, locked=false;
  function render(){
    if(qi>=QS.length){ qz.innerHTML='<div class="qz-done">'+(score===QS.length?'👑 PERFECT! You aced the Boss Arena!':'🎉 Boss defeated! Score: '+score+'/'+QS.length)+'</div>'; sc.textContent='Final score: '+score+' / '+QS.length; return; }
    var it=QS[qi];
    var html='<div class="qz-q">'+it.q+'</div>';
    it.o.forEach(function(o,i){ html+='<button class="qz-opt" data-i="'+i+'">'+String.fromCharCode(65+i)+'. '+o+'</button>'; });
    qz.innerHTML=html;
  }
  qz.onclick=function(ev){
    if(locked) return;
    var b=ev.target.closest('.qz-opt'); if(!b) return;
    var i=+b.getAttribute('data-i'), it=QS[qi];
    locked=true;
    if(i===it.a){ score++; b.classList.add('ok'); }
    else { b.classList.add('bad'); qz.querySelectorAll('.qz-opt')[it.a].classList.add('ok'); }
    sc.textContent='Score: '+score+' / '+QS.length;
    setTimeout(function(){ qi++; locked=false; render(); }, 900);
  };
  render();
})();
</script>`,
        feedback: 'Boss defeated! You cleared the whole city challenge. 👑',
      }),
    },
  ],
  test: {
    tasks: [
      {
        type: 'fill_blanks',
        items: ['The {{bak:bakery}} sells fresh bread.', 'Where is the {{mus:museum}}?', 'Turn {{lef:left}} at the bank.', 'The park is {{on:on}} the right.'],
      },
      {
        type: 'listen_type',
        audio: 'The museum is on the left, next to the park.',
        answer: 'The museum is on the left, next to the park.',
      },
      {
        type: 'read_complete',
        passage: 'Welcome to Greenfield! The {{bak:bakery}} on Main Street sells fresh bread every morning. If you need medicine, the {{pha:pharmacy}} is {{ac:across}} the street. The {{mus:museum}} is my favorite place — it is {{ne:next}} to the park, so you can read under a tree after your visit.',
      },
      {
        type: 'interactive_reading',
        passage: 'Lily loves her neighborhood. Every morning she buys fresh bread at the bakery on Main Street. The bakery is next to a small café where her brother works. After breakfast, she walks past the museum and reads in the park. The park is on the left, across from the train station.',
        steps: [
          { kind: 'highlight', prompt: 'Click the sentence that tells where Lily buys bread.', answer: 'Every morning she buys fresh bread at the bakery on Main Street.' },
          { kind: 'title', prompt: 'Choose the best title.', options: ['Lily\u2019s Morning Walk', 'A Day at the Museum', 'The Train Station'], answer: 'Lily\u2019s Morning Walk' },
          { kind: 'complete', prompt: 'The café is next to ___.', options: ['the bakery', 'the train station', 'the park'], answer: 'the bakery' },
          { kind: 'complete', prompt: 'The park is ___ the train station.', options: ['across from', 'inside', 'behind'], answer: 'across from' },
        ],
      },
      {
        type: 'interactive_listening',
        lines: [
          { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'Leo! You look lost. Do you need help?' },
          { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'Yes! Where is the pharmacy? I need medicine for my headache.' },
          { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'Go straight ahead. The pharmacy is across the street from the bakery.' },
          { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'Across from the bakery — and then?' },
          { character: 'Maya', emoji: '🦊', voiceHint: 'female', text: 'Then turn left at the museum. It is the building with the red door!' },
          { character: 'Leo', emoji: '🐻', voiceHint: 'male', text: 'Thank you, Maya. You are a great city guide!' },
        ],
        questions: [
          { question: 'What does Leo need?', options: ['Medicine', 'Bread', 'A book'], answer: 'Medicine' },
          { question: 'Where is the pharmacy?', options: ['Across from the bakery', 'Next to the museum', 'In the park'], answer: 'Across from the bakery' },
          { question: 'What color is the museum door?', options: ['Red', 'Blue', 'Green'], answer: 'Red' },
        ],
        summary: 'Leo needs {{med:medicine}}. The pharmacy is across from the {{bak:bakery}}, and he must turn {{lef:left}} at the {{mus:museum}}.',
      },
      {
        type: 'speak_photo',
        image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800',
        alt: 'A busy city corner',
        prompt: 'Describe this city photo aloud for 30–90 seconds. What places and people do you see?',
        sample: 'In this photo I can see a busy city corner. There are shops on the right, and many people cross the street at the crossing. I think there is a café on the corner because people are drinking coffee outside.',
      },
      {
        type: 'interactive_writing',
        prompt: 'A new student is coming to your town. Write directions from the train station to your favorite place (40+ words).',
        minWords: 40,
        followUp: 'Now warn the new student about one thing to avoid in your town. Write 2-3 sentences.',
        sample: 'Welcome! From the train station, go straight ahead for two minutes. Turn left at the bank — there is only one bank. My favorite place is the museum: it is on the right, next to the park. You cannot miss it!',
      },
      {
        type: 'read_speak',
        prompt: 'Describe the neighborhood where you live. Where is the nearest bakery, café or park? Speak for 30–90 seconds.',
        sample: 'I live near a small park. The nearest bakery is around the corner — it is on the left, next to a bookshop. There is also a café across the street from the park. I go there every morning.',
      },
      {
        type: 'interactive_speaking',
        turns: [
          { character: 'Maya', emoji: '🦊', text: 'Hi! Where do you live — describe your street!' },
          { character: 'Leo', emoji: '🐻', text: 'What is the most important place in your neighborhood, and where is it?' },
          { character: 'Maya', emoji: '🦊', text: 'How do I get from the train station to your home? Give me directions!' },
          { character: 'Leo', emoji: '🐻', text: 'Last one: what can someone buy around the corner from you?' },
        ],
        sample: 'I live on a quiet street. There is a bakery on the corner and a pharmacy across the street. To get to my home: go straight, turn right at the museum, and it is on your left. Around the corner you can buy fresh bread and coffee.',
      },
      {
        type: 'speaking_sample',
        topic: 'Speak for 1–3 minutes: "A perfect day in my town." Where do you go, what do you do, and who do you meet?',
        sample: 'A perfect day in my town starts at the bakery — I buy fresh bread. Then I walk to the park and read under a tree. In the afternoon, I visit the museum with a friend. We finish the day at the café next to the bookshop.',
      },
    ],
  },
};

export const buildLearningAppV2Mock = (learnerName?: string): Lav2Data => ({
  title: 'Around Town — Directions & Places',
  description: `Help the cat explore the city: places, directions, and polite questions! 🐱🗺️ ${learnerName ? `Prepared for ${learnerName}.` : ''}`,
  sections: [section1, section2, section3, section4],
});

export const buildLearningAppV2MockJson = (learner?: { name?: string }): string =>
    JSON.stringify(buildLearningAppV2Mock(learner?.name), null, 2);