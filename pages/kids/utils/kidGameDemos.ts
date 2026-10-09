/* ════════════════════════════════════════════════════════════════════════════
   🎮 DEMO GAMES — a finished example of every game, hand-written
   ════════════════════════════════════════════════════════════════════════════

   Two jobs, and both matter:

   1. **Play works with no AI at all.** A tutor who opens the Game Studio can press play
      on any game and use it in a lesson in the next thirty seconds. That is what makes
      the shelf trustworthy before a single prompt has been copied.
   2. **The target quality is visible.** A prompt is a specification, and specifications
      are easier to judge against a worked example — these scripts show exactly how many
      rounds, how big the options are, how short the feedback is, and how little text a
      very young child is asked to look at. They are the reference the AI's output is
      compared to in a tutor's head.

   Every script below is written to the contract in `kidGameCatalog.ts` and has been played
   through the real engines, so the fields are the ones the engines actually read.
   ════════════════════════════════════════════════════════════════════════════ */

import type { KidGameScript } from './kidGameCatalog';

export const DEMO_GAMES: Record<string, KidGameScript> = {
  /* ── Very Young ────────────────────────────────────────────────────────── */
  lookListenPoint: {
    title: 'Listen & Point — On the Farm',
    gameId: 'lookListenPoint',
    band: 'veryYoung',
    topic: 'farm animals',
    howToPlay:
      'Press ▶ on a round to hear the word. The child points at the picture — that is the whole answer. If they point at the wrong one, press it with them and say the word together, then move on.',
    plenary: ['Everyone clapped for the duck! 🦆 Quack quack!', 'Say goodbye to the animals 👋'],
    rounds: [
      {
        id: 'llp-1',
        type: 'listenChoose',
        prompt: '🦆 Who says quack quack?',
        readAloudText: 'duck',
        options: ['🦆 duck', '🐮 cow', '🐈 cat'],
        correct: '🦆 duck',
        points: 0,
        feedbackCorrect: 'Yes! The duck says quack quack! 🎉',
        feedbackIncorrect: 'Nearly! Listen again — quack quack 🦆',
        mascotTip: 'Point with the child the first time, then let them do it alone.',
      },
      {
        id: 'llp-2',
        type: 'listenChoose',
        prompt: '🐮 Who says moo?',
        readAloudText: 'cow',
        options: ['🐕 dog', '🐮 cow', '🐑 sheep'],
        correct: '🐮 cow',
        points: 0,
        feedbackCorrect: 'The cow! Moo! 🎉',
        feedbackIncorrect: 'Try again — mooooo 🐮',
      },
      {
        id: 'llp-3',
        type: 'listenChoose',
        prompt: '🐕 Who says woof?',
        readAloudText: 'dog',
        options: ['🐈 cat', '🐕 dog', '🦆 duck'],
        correct: '🐕 dog',
        points: 0,
        feedbackCorrect: 'Woof woof! You found the dog! 🎉',
        feedbackIncorrect: 'Nearly! Woof woof 🐕',
      },
    ],
  },

  photoMatch: {
    title: 'Real Photo Match — Fruit & Animals',
    gameId: 'photoMatch',
    band: 'veryYoung',
    topic: 'first words',
    howToPlay:
      'Say the word on the left, then tap the photograph of the real thing. Every picture here is a real photograph fetched from Wikimedia Commons, not a drawing — so let the child look before they tap, and say the word again if they hesitate. If they tap the wrong one, point at the right photograph together and move on.',
    plenary: [
      'Everyone found the real strawberry! 🍓',
      'Tap your own favourite one and say its name.',
    ],
    rounds: [
      {
        id: 'pm-1',
        type: 'matchingPairs',
        prompt: '📷 Tap the word, then tap its photograph',
        readAloudText: 'strawberry',
        pairs: [
          { left: '🍓 strawberry', right: 'a red strawberry' },
          { left: '🐘 elephant', right: 'an elephant' },
          { left: '🐝 bee', right: 'a bee on a flower' },
        ],
        points: 0,
        feedbackCorrect: 'You matched them all! 🎉',
        feedbackIncorrect: 'Nearly! Have another look 💛',
        heroEmoji: '📷',
      },
    ],
  },

  pointAndSay: {
    title: 'Point & Say — My First Words',
    gameId: 'pointAndSay',
    band: 'veryYoung',
    topic: 'first words',
    howToPlay:
      'Press 🔊 so the screen says the word, then say it with the child three times: slowly, then normally, then loudly. Press the big button to move on. The microphone is optional — the tutor repeating with the child is what counts.',
    plenary: ['You said duck, cow and cat! 👏'],
    rounds: [
      {
        id: 'pas-1',
        type: 'speakRepeat',
        prompt: '🦆 Say it with me!',
        readAloudText: 'duck',
        characterEmoji: '🦆',
        points: 0,
        feedbackCorrect: 'You said duck! 🎉',
        feedbackIncorrect: 'Let\'s try it again — duck!',
      },
      {
        id: 'pas-2',
        type: 'speakRepeat',
        prompt: '🐮 Your turn!',
        readAloudText: 'cow',
        characterEmoji: '🐮',
        points: 0,
        feedbackCorrect: 'Beautiful! Moo! 🎉',
      },
      {
        id: 'pas-3',
        type: 'speakRepeat',
        prompt: '🐈 One more!',
        readAloudText: 'cat',
        characterEmoji: '🐈',
        points: 0,
        feedbackCorrect: 'Meow! You said cat! 🎉',
      },
    ],
  },

  singAndDo: {
    title: 'Sing & Do — The Duck Song',
    gameId: 'singAndDo',
    band: 'veryYoung',
    topic: 'farm animals song',
    howToPlay:
      'Press ▶ to hear a line, then sing it together with the action in brackets. Do the actions yourself — the child copies you, not the screen.',
    plenary: ['Sing it once more on the way to the door! 🎵'],
    rounds: [
      {
        id: 'sad-1',
        type: 'songKaraoke',
        prompt: '🎵 The Duck Song',
        lyrics: [
          'Duck, duck, quack quack quack 🦆',
          'Waddle, waddle, waddle back 👣',
          'Duck, duck, in the pond 💧',
          'Quack quack quack, bye-bye! 👋',
        ],
        singAlongPacing: 1500,
        points: 0,
        feedbackCorrect: 'Beautiful singing! 🌟',
      },
      {
        id: 'sad-2',
        type: 'songKaraoke',
        prompt: '🎵 Now change one word: sing it about the COW',
        lyrics: ['Cow, cow, moo moo moo 🐮', 'Stomp, stomp, stomp back 👣', 'Cow, cow, in the field 🌾', 'Moo moo moo, bye-bye! 👋'],
        singAlongPacing: 1500,
        points: 0,
        feedbackCorrect: 'You made a new song! 🎉',
      },
    ],
  },

  moveAndDo: {
    title: 'Move & Do — Follow Me',
    gameId: 'moveAndDo',
    band: 'veryYoung',
    topic: 'actions and body',
    howToPlay:
      'Say the command twice and do it yourself. The child copies. Tick each one when it is done — the ticks are for you, not for the child.',
    plenary: ['Everyone sit down slowly... and breathe 🧘'],
    rounds: [
      {
        id: 'mad-1',
        type: 'realLifeMission',
        prompt: '🤸 Do what I say!',
        checklist: [
          'Jump like a frog 🐸',
          'Clap your hands 👏',
          'Touch your nose 👃',
          'Find something blue 💙',
          'Give me the duck 🦆',
        ],
        roleplayPrompt: 'Now the child gives YOU a command — and you do it!',
        points: 0,
        feedbackCorrect: 'You did everything! 🎉',
      },
    ],
  },

  peekAndFind: {
    title: 'Where Is It? — Hide and Find',
    gameId: 'peekAndFind',
    band: 'veryYoung',
    topic: 'animal words',
    howToPlay:
      'Cover the screen with your hand or a cloth before the round starts, then say "where is the duck?" and lift it. Two pictures only: the child taps or points.',
    plenary: ['Peek-a-boo! The duck was here all along 🦆'],
    rounds: [
      {
        id: 'paf-1',
        type: 'multipleChoice',
        prompt: '🙈 Where is the duck hiding?',
        options: [{ text: '🦆 duck', isCorrect: true }, { text: '🐸 frog' }],
        points: 0,
        feedbackCorrect: 'Found it! Quack quack! 🎉',
        feedbackIncorrect: 'Not yet — look for the yellow duck 💛',
      },
      {
        id: 'paf-2',
        type: 'multipleChoice',
        prompt: '🙈 Where is the cat hiding?',
        options: [{ text: '🐶 dog' }, { text: '🐈 cat', isCorrect: true }],
        points: 0,
        feedbackCorrect: 'There she is — meow! 🎉',
        feedbackIncorrect: 'Almost! The cat says meow 🐈',
      },
      {
        id: 'paf-3',
        type: 'multipleChoice',
        prompt: '🙈 Where is the ball?',
        options: [{ text: '⚽ ball', isCorrect: true }, { text: '🚗 car' }],
        points: 0,
        feedbackCorrect: 'You found the ball! ⚽',
        feedbackIncorrect: 'Try again — look for the round one ⚽',
      },
    ],
  },

  sortForThePet: {
    title: 'Sort It Out — Food or Toy?',
    gameId: 'sortForThePet',
    band: 'veryYoung',
    topic: 'categorising everyday things',
    howToPlay:
      'Tap a thing, then tap the basket. The child can also just point and you drag it — say the word out loud every time it lands.',
    plenary: ['The pet is full and happy! 🐶'],
    rounds: [
      {
        id: 'sftp-1',
        type: 'dragDropSort',
        prompt: '🧺 Put the food in the bowl and the toys in the box',
        items: ['🍎 apple', '🧸 teddy', '🍌 banana', '🪀 yo-yo', '🧀 cheese', '🚗 car'],
        categories: [
          { name: 'Eat it', emoji: '🍽️', items: ['🍎 apple', '🍌 banana', '🧀 cheese'] },
          { name: 'Play with it', emoji: '🧺', items: ['🧸 teddy', '🪀 yo-yo', '🚗 car'] },
        ],
        points: 0,
        feedbackCorrect: 'You sorted everything! 🎉',
        feedbackIncorrect: 'Almost! Try the other basket 🧺',
      },
    ],
  },

  popIt: {
    title: 'Pop It! — Farm Friends',
    gameId: 'popIt',
    band: 'veryYoung',
    topic: 'farm animals',
    howToPlay:
      'Say the target word out loud first, then let the child tap the balloon. The right one pops with a cheer; a wrong one only wobbles — say "not that one" and point at the right balloon together. Two or three rounds is plenty for a two-year-old.',
    plenary: ['POP! Everyone clapped for the duck 🎉', 'Wave bye-bye to the balloons 👋'],
    rounds: [
      {
        id: 'pop-1',
        type: 'balloonPop',
        prompt: '🎈 Pop the duck!',
        word: '🦆 duck',
        options: ['🦆 duck', '🐮 cow', '🐈 cat', '🐸 frog'],
        points: 0,
        heroEmoji: '🎈',
        mascotTip: 'Say the word, then point with the child the first time.',
        feedbackCorrect: 'POP! You found the duck! 🎉',
        feedbackIncorrect: 'Not that one — look for the duck 🦆',
      },
      {
        id: 'pop-2',
        type: 'balloonPop',
        prompt: '🎈 Pop the cow!',
        word: '🐮 cow',
        options: ['🐕 dog', '🐮 cow', '🐑 sheep', '🦆 duck'],
        points: 0,
        heroEmoji: '🎈',
        feedbackCorrect: 'POP! Moo! You found the cow! 🎉',
        feedbackIncorrect: 'Nearly — moooo says the cow 🐮',
      },
      {
        id: 'pop-3',
        type: 'balloonPop',
        prompt: '🎈 Pop the cat!',
        word: '🐈 cat',
        options: ['🐈 cat', '🦆 duck', '🐖 pig', '🐮 cow'],
        points: 0,
        heroEmoji: '🎈',
        feedbackCorrect: 'POP! Meow! The cat! 🎉',
        feedbackIncorrect: 'Try again — listen: meow 🐈',
      },
    ],
  },

  listeningBingo: {
    title: 'Listening Bingo — On the Farm',
    gameId: 'listeningBingo',
    band: 'veryYoung',
    topic: 'farm animals',
    howToPlay:
      'Press the speaker and let the screen say one word. Children stamp that picture — one child taps if you are sharing one screen. Press "Say it again" as often as they need it: repeating is listening practice, not cheating. The game is won at five stamps.',
    plenary: ['BINGO! Everybody listened beautifully 🎧', 'Say one animal you heard today 🐮'],
    rounds: [
      {
        id: 'bin-1',
        type: 'bingoListener',
        prompt: '🎧 Listen and stamp the animal you hear!',
        options: ['🦆 duck', '🐮 cow', '🐈 cat', '🐕 dog', '🐑 sheep', '🐖 pig'],
        points: 0,
        heroEmoji: '🎧',
        mascotTip: 'Play it once with the whole class answering, then let one child tap.',
        feedbackCorrect: 'BINGO! Brilliant listening ears! 🎉',
      },
      {
        id: 'bin-2',
        type: 'bingoListener',
        prompt: '🎧 Now the zoo! Stamp what you hear.',
        options: ['🦁 lion', '🐘 elephant', '🐒 monkey', '🐍 snake', '🦓 zebra', '🦒 giraffe'],
        points: 0,
        heroEmoji: '🎧',
        feedbackCorrect: 'BINGO again! Your ears are magic! 🎉',
      },
    ],
  },

  rhymeTime: {
    title: 'Rhyme Time — Sound Pairs',
    gameId: 'rhymeTime',
    band: 'veryYoung',
    topic: 'rhyming words',
    howToPlay:
      'Say each pair aloud twice before anyone chooses: "duck … truck — they end the same!". Then the child taps one picture on the left and one on the right. When a rhyme lands, the whole class claps the two words together.',
    plenary: ['We heard duck–truck and cat–hat 🎵', 'Clap the rhymes one more time 👏'],
    rounds: [
      {
        id: 'rhy-1',
        type: 'rhymeMatch',
        prompt: '🎵 Find the pairs that rhyme!',
        pairs: [
          { left: '🦆 duck', right: '🚚 truck' },
          { left: '🐱 cat', right: '🎩 hat' },
          { left: '⭐ star', right: '🚗 car' },
        ],
        points: 0,
        heroEmoji: '🎵',
        mascotTip: 'Exaggerate the ending sound — "du-ck, tru-ck" — and let them hear it.',
        feedbackCorrect: 'You heard the rhyming sounds! 🎉',
      },
      {
        id: 'rhy-2',
        type: 'rhymeMatch',
        prompt: '🎵 Three more rhymes — listen to the ends!',
        pairs: [
          { left: '🐝 bee', right: '🌳 tree' },
          { left: '🐭 mouse', right: '🏠 house' },
          { left: '🐸 frog', right: '🐕 dog' },
        ],
        points: 0,
        heroEmoji: '🎵',
        feedbackCorrect: 'Rhyme master! Your ears hear the sounds! 🎉',
      },
    ],
  },

  /* ── Young ─────────────────────────────────────────────────────────────── */
  quizShow: {
    title: 'Big Quiz Show — Farm Words',
    gameId: 'quizShow',
    band: 'young',
    topic: 'farm animals and simple sentences',
    howToPlay:
      'Read the question aloud, count down from three, then let a different child answer each round. Stars are for the class together, not for individuals.',
    plenary: ['Which word was hardest? Say it three times before you go.'],
    rounds: [
      {
        id: 'qs-1',
        type: 'multipleChoice',
        prompt: 'Which animal gives us milk?',
        options: ['the hen', 'the cow', 'the duck', 'the horse'],
        correct: 'the cow',
        points: 20,
        feedbackCorrect: 'Yes — the cow! 🐮',
        feedbackIncorrect: 'Nearly. It is the one that says moo.',
      },
      {
        id: 'qs-2',
        type: 'multipleChoice',
        prompt: 'Which sentence is in the past?',
        options: ['I feed the hen.', 'I fed the hen.', 'I am feeding the hen.', 'I will feed the hen.'],
        correct: 'I fed the hen.',
        points: 25,
        feedbackCorrect: 'Exactly — fed is past. ⭐',
        feedbackIncorrect: 'Look for the verb that already happened.',
      },
      {
        id: 'qs-3',
        type: 'multipleChoice',
        prompt: 'A baby sheep is called...',
        options: ['a colt', 'a lamb', 'a calf', 'a chick'],
        correct: 'a lamb',
        points: 25,
        feedbackCorrect: 'A lamb! 🐑',
        feedbackIncorrect: 'It rhymes with jam.',
      },
      {
        id: 'qs-4',
        type: 'multipleChoice',
        prompt: 'Where do fish live?',
        options: ['in a nest', 'in a barn', 'in a pond', 'in a field'],
        correct: 'in a pond',
        points: 20,
        feedbackCorrect: 'In the pond! 💧',
        feedbackIncorrect: 'It is the one with water.',
      },
      {
        id: 'qs-5',
        type: 'multipleChoice',
        prompt: 'Last lesson\'s word: what does "tired" mean?',
        options: ['needing to sleep', 'feeling hungry', 'feeling angry', 'feeling cold'],
        correct: 'needing to sleep',
        points: 15,
        feedbackCorrect: 'You remembered! 😴',
        feedbackIncorrect: 'It is what you feel after a long day.',
      },
      {
        id: 'qs-6',
        type: 'multipleChoice',
        prompt: 'Last lesson: which is a feeling?',
        options: ['run', 'jump', 'happy', 'swim'],
        correct: 'happy',
        points: 15,
        feedbackCorrect: 'Happy is a feeling! 😊',
        feedbackIncorrect: 'Three of them are actions.',
      },
    ],
  },

  memoryPairs: {
    title: 'Memory Pairs — Animals',
    gameId: 'memoryPairs',
    band: 'young',
    topic: 'animal vocabulary',
    howToPlay:
      'Two children turn one card each per turn. Every card turned gets said out loud by the whole class — that is the language practice in this game.',
    plenary: ['How many pairs did we find? Count them with me.'],
    rounds: [
      {
        id: 'mp-1',
        type: 'memoryMatch',
        prompt: '🧠 Find the pairs: the word and the picture',
        pairs: [
          { left: 'duck', right: '🦆' },
          { left: 'cow', right: '🐮' },
          { left: 'cat', right: '🐈' },
          { left: 'dog', right: '🐕' },
          { left: 'horse', right: '🐴' },
          { left: 'sheep', right: '🐑' },
        ],
        points: 40,
        feedbackCorrect: 'Great memory! 🎉',
      },
    ],
  },

  buildTheWord: {
    title: 'Build the Word — the -at family',
    gameId: 'buildTheWord',
    band: 'young',
    topic: 'the -at word family',
    howToPlay:
      'Press 🔊 to hear the word, then the child taps the letters in order. Let them hear it as many times as they want — that repetition is the lesson.',
    plenary: ['We built four words with -at. Can you say one without looking?'],
    rounds: [
      {
        id: 'btw-1',
        type: 'spellingBee',
        prompt: '🐝 Build the word you hear',
        items: ['cat', 'hat', 'mat', 'bat'],
        distractorLetters: ['o', 'e'],
        points: 40,
        feedbackCorrect: 'Perfect spelling! 🏆',
        feedbackIncorrect: 'Listen again and try the letters in order.',
      },
    ],
  },

  sortIt: {
    title: 'Sort Into Buckets — Past or Present',
    gameId: 'sortIt',
    band: 'young',
    topic: 'past and present verbs',
    howToPlay:
      'Sort one word at a time as a class, asking "did it already happen?" before anyone touches the screen. Keep the reason spoken, not silent.',
    plenary: ['Pick one past verb and say what you did with it yesterday.'],
    rounds: [
      {
        id: 'si-1',
        type: 'dragDropSort',
        prompt: '🗂️ Sort the verbs: past or present?',
        items: ['walked', 'walk', 'ate', 'eat', 'played', 'play'],
        categories: [
          { name: 'Past', emoji: '⏪', items: ['walked', 'ate', 'played'] },
          { name: 'Present', emoji: '▶️', items: ['walk', 'eat', 'play'] },
        ],
        points: 30,
        feedbackCorrect: 'Every one in the right bucket! ⭐',
        feedbackIncorrect: 'One slipped — check it again.',
      },
      {
        id: 'si-2',
        type: 'dragDropSort',
        prompt: '🗂️ Now sort by sound: long vowel or short vowel?',
        items: ['cake', 'cat', 'bike', 'ship', 'rope', 'dog'],
        categories: [
          { name: 'Long vowel', emoji: '📏', items: ['cake', 'bike', 'rope'] },
          { name: 'Short vowel', emoji: '✂️', items: ['cat', 'ship', 'dog'] },
        ],
        points: 30,
        feedbackCorrect: 'You heard the vowels! 🎉',
      },
    ],
  },

  sentenceBuild: {
    title: 'Sentence Builder — On the Farm',
    gameId: 'sentenceBuild',
    band: 'young',
    topic: 'word order in simple sentences',
    howToPlay:
      'Say the sentence aloud first, then let the child build it from the tiles. Read it back together when it is finished — hearing the finished sentence is the reward.',
    plenary: ['Build one sentence about your own day, out loud.'],
    rounds: [
      {
        id: 'sb-1',
        type: 'sentenceBuilder',
        prompt: '🧱 Put the words in order',
        correctOrder: ['The', 'duck', 'swims', 'in', 'the', 'pond'],
        distractors: ['swim'],
        points: 30,
        feedbackCorrect: 'That reads perfectly! ⭐',
      },
      {
        id: 'sb-2',
        type: 'sentenceBuilder',
        prompt: '🧱 Make the question',
        correctOrder: ['Where', 'is', 'the', 'little', 'duck', '?'],
        distractors: ['are'],
        points: 30,
        feedbackCorrect: 'A real question! ⭐',
      },
    ],
  },

  storyPath: {
    title: 'Choose the Path — The Dark Cave',
    gameId: 'storyPath',
    band: 'young',
    topic: 'prediction and storytelling',
    howToPlay:
      'Read the situation, then let the class vote with hands. Whichever wins, tell it with drama. There are no wrong choices in this game.',
    plenary: ['Tell the story again at home — but choose the other path this time.'],
    rounds: [
      {
        id: 'sp-1',
        type: 'storyChoice',
        prompt: 'The duck sees a dark cave. What should we do?',
        storyChoices: [
          { choice: '🐣 Peek inside carefully', outcome: 'You see a shiny stone!', nextPlot: 'The stone glows — someone is inside.', best: true, bonusXp: 20 },
          { choice: '🏃 Run back to the pond', outcome: 'Your friends are waiting for news.', nextPlot: 'They ask you to tell the story.', bonusXp: 10 },
        ],
        points: 25,
        feedbackCorrect: 'What a choice! 🌟',
      },
      {
        id: 'sp-2',
        type: 'storyChoice',
        prompt: 'Inside, a small voice says "help me". What do you do?',
        storyChoices: [
          { choice: '🔦 Call out "who is there?"', outcome: 'A tiny frog hops out.', nextPlot: 'The frog knows the way home.', best: true, bonusXp: 20 },
          { choice: '🤝 Hold out your wing', outcome: 'Someone takes it!', nextPlot: 'You lead them into the light.', bonusXp: 15 },
        ],
        points: 25,
        feedbackCorrect: 'Brave and kind! 🌟',
      },
    ],
  },

  oddOneOut: {
    title: 'Odd One Out — Think and Say Why',
    gameId: 'oddOneOut',
    band: 'young',
    topic: 'word classes and reasoning',
    howToPlay:
      'The child taps the odd one, then has to say why. No reason, no star — the sentence is the answer, not the tap.',
    plenary: ['Make your own odd-one-out for me next lesson.'],
    rounds: [
      {
        id: 'ooo-1',
        type: 'oddOneOut',
        prompt: '🤔 Which one does not belong?',
        options: ['run', 'jump', 'happy', 'swim'],
        odd: 'happy',
        explanation: 'happy is a feeling; the others are actions',
        points: 25,
        feedbackCorrect: 'Right — and that is the reason!',
        feedbackIncorrect: 'Think: three of them are the same kind of word.',
      },
      {
        id: 'ooo-2',
        type: 'oddOneOut',
        prompt: '🤔 Which one does not belong?',
        options: ['cat', 'hat', 'dog', 'mat'],
        odd: 'dog',
        explanation: 'cat, hat and mat all rhyme — dog does not',
        points: 25,
        feedbackCorrect: 'You heard the rhyme! 🎉',
      },
      {
        id: 'ooo-3',
        type: 'oddOneOut',
        prompt: '🤔 Which one does not belong?',
        options: ['cow', 'sheep', 'horse', 'car'],
        odd: 'car',
        explanation: 'a car is a machine; the others are farm animals',
        points: 25,
        feedbackCorrect: 'Exactly! 🐮',
      },
    ],
  },

  classBoard: {
    title: 'Class Board Game — Spin and Do',
    gameId: 'classBoard',
    band: 'young',
    topic: 'mixed review',
    howToPlay:
      'One spin per team. The team has 30 seconds for the task, then the next team spins. Keep the tasks light — this is the fun half of the lesson.',
    plenary: ['Which task was hardest? That is what we practise next time.'],
    rounds: [
      {
        id: 'cb-1',
        type: 'spinWheel',
        prompt: '🎲 Spin and do the task',
        options: [
          'Say a sentence with "duck"',
          'Spell "pond"',
          'Act out "swim"',
          'Name three animals with wings',
          'Make a question with "where"',
          'Teach your team one new word',
        ],
        points: 20,
        feedbackCorrect: 'Great turn! ⭐',
      },
    ],
  },

  wordHunt: {
    title: 'Word Hunt — Pond Words',
    gameId: 'wordHunt',
    band: 'young',
    topic: 'familiar spelling patterns',
    howToPlay:
      'One finder at a time, the rest of the class watching for the letters. Say the word when it is found, not before.',
    plenary: ['Cover the list: can you spell two of them from memory?'],
    rounds: [
      {
        id: 'wh-1',
        type: 'wordSearch',
        prompt: '🔍 Find: duck, pond, swim, wing',
        gridWords: ['duck', 'pond', 'swim', 'wing'],
        points: 30,
        feedbackCorrect: 'All the words found! 🔍',
      },
      {
        id: 'wh-2',
        type: 'wordSearch',
        prompt: '🔍 Find the -at family: cat, hat, mat, bat',
        gridWords: ['cat', 'hat', 'mat', 'bat'],
        points: 30,
        feedbackCorrect: 'Every -at word! 🎉',
      },
    ],
  },

  trueOrFalse: {
    title: 'True or False — The Duck Story',
    gameId: 'trueOrFalse',
    band: 'young',
    topic: 'comprehension of a short text',
    howToPlay:
      'Read each statement, count three, then everyone answers on the same beat: thumbs up or thumbs down. Ask one child to correct the false ones.',
    plenary: ['Tell me one thing that really happened in the story.'],
    rounds: [
      {
        id: 'tof-1',
        type: 'trueFalse',
        prompt: 'The duck swims in the pond.',
        correct: true,
        points: 15,
        feedbackCorrect: 'True — you remembered! ⭐',
      },
      {
        id: 'tof-2',
        type: 'trueFalse',
        prompt: 'The cow flies over the barn.',
        correct: false,
        points: 15,
        feedbackCorrect: 'False — cows do not fly! 🐮',
      },
      {
        id: 'tof-3',
        type: 'trueFalse',
        prompt: 'The frog lives in the water.',
        correct: true,
        points: 15,
        feedbackCorrect: 'True — frogs love water! 🐸',
      },
      {
        id: 'tof-4',
        type: 'trueFalse',
        prompt: 'The duck has four legs.',
        correct: false,
        points: 15,
        feedbackCorrect: 'False — a duck has two legs and two wings!',
      },
      {
        id: 'tof-5',
        type: 'trueFalse',
        prompt: 'The pond is made of water.',
        correct: true,
        points: 15,
        feedbackCorrect: 'True! 💧',
      },
    ],
  },

  clapSyllables: {
    title: 'Clap the Syllables — Animal Beats',
    gameId: 'clapSyllables',
    band: 'young',
    topic: 'animals and word beats',
    howToPlay:
      'Say the word slowly and clap the beats with the class, then let one child press the number. Do the first two words all together so the pattern is obvious, then take hands. Words are written with hyphens on screen so the tutor can see the beats before the children answer.',
    plenary: ['We clapped cat, rab-bit and but-ter-fly 👏', 'Clap your own name and count the beats!'],
    rounds: [
      {
        id: 'syl-1',
        type: 'syllableCount',
        prompt: '👏 Clap the word, then press the number of beats',
        syllables: [
          { word: 'cat', count: 1 },
          { word: 'dog', count: 1 },
          { word: 'rab-bit', count: 2 },
          { word: 'ti-ger', count: 2 },
          { word: 'but-ter-fly', count: 3 },
          { word: 'cat-er-pil-lar', count: 4 },
        ],
        points: 25,
        heroEmoji: '👏',
        mascotTip: 'Clap on your own knee, not in the air — quieter rooms hear the beat better.',
        feedbackCorrect: 'You felt the beats! 👏',
        feedbackIncorrect: 'Clap it again — one beat for each clap.',
      },
      {
        id: 'syl-2',
        type: 'syllableCount',
        prompt: '👏 School words — clap and press',
        syllables: [
          { word: 'book', count: 1 },
          { word: 'pen-cil', count: 2 },
          { word: 'com-pu-ter', count: 3 },
          { word: 'dic-tion-ar-y', count: 4 },
        ],
        points: 25,
        heroEmoji: '👏',
        feedbackCorrect: 'Beats found! 👏',
      },
    ],
  },

  fastWords: {
    title: 'Fast Words — Tricky Lookalikes',
    gameId: 'fastWords',
    band: 'young',
    topic: 'high-frequency words',
    howToPlay:
      'Say the target word clearly, then start the timer. Only that word counts — the other words are the ones children mix it up with, and a wrong whack costs nothing but time. Play one round, say the target aloud again, play the next. Thirty seconds of this is worth ten minutes of copying.',
    plenary: ['went, want, was — say the tricky one again ⚡', 'Well done: quick eyes, careful reading!'],
    rounds: [
      {
        id: 'fast-1',
        type: 'whackAMole',
        prompt: '⚡ Hit only the word: went',
        word: 'went',
        options: ['want', 'was', 'when', 'wet'],
        seconds: 40,
        points: 30,
        heroEmoji: '⚡',
        mascotTip: 'Read the target out loud at the start of every round, not once at the beginning.',
        feedbackCorrect: 'Beautifully quick eyes! ⚡',
        feedbackIncorrect: 'Look at the ending — went ends in -ent.',
      },
      {
        id: 'fast-2',
        type: 'whackAMole',
        prompt: '⚡ Hit only the word: their',
        word: 'their',
        options: ['there', 'they', 'theirs', 'them'],
        seconds: 40,
        points: 30,
        heroEmoji: '⚡',
        feedbackCorrect: 'their — the belonging one! ⚡',
      },
      {
        id: 'fast-3',
        type: 'whackAMole',
        prompt: '⚡ Hit only the word: saw',
        word: 'saw',
        options: ['was', 'say', 'so', 'see'],
        seconds: 35,
        points: 30,
        heroEmoji: '⚡',
        feedbackCorrect: 'Fast and careful! ⚡',
      },
    ],
  },

  flashAndSay: {
    title: 'Flash & Say — Weather Words',
    gameId: 'flashAndSay',
    band: 'young',
    topic: 'weather vocabulary',
    howToPlay:
      'Turn the first card and read the word together, then let a child turn it and say the meaning before the class helps. When the class agrees the word is known, press "I know it" and go on. Nothing is lost by being unsure — that child gets the card again at the end.',
    plenary: ['Eight cards mastered 🏆', 'Pick one card and make a sentence with it.'],
    rounds: [
      {
        id: 'flash-1',
        type: 'flashcardTrainer',
        prompt: '🃏 Say the word, then turn the card',
        pairs: [
          { left: '☀️ sunny', right: 'the sun is out' },
          { left: '🌧️ drizzle', right: 'very light rain' },
          { left: '⛈️ storm', right: 'loud rain and thunder' },
          { left: '🌬️ windy', right: 'the wind is blowing' },
          { left: '❄️ snow', right: 'cold white flakes' },
          { left: '🌈 rainbow', right: 'colours after the rain' },
          { left: '☁️ cloudy', right: 'grey sky, no sun' },
          { left: '🌡️ hot', right: 'it feels very warm' },
        ],
        points: 30,
        heroEmoji: '🃏',
        mascotTip: 'Ask the class for a thumbs up before you press "I know it".',
        feedbackCorrect: 'Every card mastered! 🏆',
      },
      {
        id: 'flash-2',
        type: 'flashcardTrainer',
        prompt: '🃏 Second deck — feeling words',
        pairs: [
          { left: '😄 happy', right: 'feeling very good' },
          { left: '😢 sad', right: 'feeling unhappy' },
          { left: '😴 tired', right: 'needing sleep' },
          { left: '😮 surprised', right: 'did not expect it' },
          { left: '😱 scared', right: 'feeling afraid' },
          { left: '😌 calm', right: 'quiet and peaceful' },
        ],
        points: 30,
        heroEmoji: '🃏',
        feedbackCorrect: 'Feelings deck cleared! 🏆',
      },
    ],
  },
};

export const demoForGame = (gameId: string): KidGameScript | undefined => DEMO_GAMES[gameId];
