import {FlipbookJSON, LessonConfig } from './flipbookTypes';
import { Learner } from '../types';

export function createEnchantedDemoBook(config?: Partial<LessonConfig>, learner?: Learner):FlipbookJSON {
  const learnerName = learner?.name || config?.learnerName || 'Luna';
  const avatarEmoji = learner?.avatar || '🧚‍♀️';
  const petEmoji = learner?.petType === 'Cat' ? '🐱' : learner?.petType === 'Dog' ? '🐶' : learner?.petType === 'Bird' ? '🦜' : learner?.petType === 'Fish' ? '🐠' : '🦄';

  return {
    title: `${learnerName}'s Enchanted Kingdom & The Crystal Cave`,
    subtitle: 'A 3D Flip Book Adventure in Spoken English, Song, & Word Magic',
    level: 'A2',
    estimatedMinutes: 55,
    theme: 'fairy',
    coverImageUrl: learner?.photoDataUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    learnerPhotoDataUrl: learner?.photoDataUrl,
    adventurerPhotos: learner?.adventurerPhotos || [],
    learnerAvatarEmoji: avatarEmoji,
    learnerPetEmoji: petEmoji,
    characters: [
      {
        name: 'Wizard Dan',
        emoji: '🧙‍♂️',
        gender: 'Male',
        archetype: 'Mage',
        azureVoice: 'en-US-GuyNeural',
        pitch: 0.85,
        rate: 0.92,
        dialogueStyle: 'Wise mentor who guides spells with patience'
      },
      {
        name: 'Diego Wave',
        emoji: '🧜‍♂️',
        gender: 'Male',
        archetype: 'Mermaid',
        azureVoice: 'en-US-ChristopherNeural',
        pitch: 1.05,
        rate: 1.0,
        dialogueStyle: 'Ocean explorer who loves discovery and challenges'
      },
      {
        name: 'Countess Vespera',
        emoji: '🧛‍♀️',
        gender: 'Female',
        archetype: 'Vampire',
        azureVoice: 'en-US-JennyNeural',
        pitch: 0.95,
        rate: 0.95,
        dialogueStyle: 'Gentle nocturnal scholar who speaks with mystery'
      },
      {
        name: `${learnerName} the Brave`,
        emoji: avatarEmoji,
        gender: 'Female',
        archetype: 'Fairy',
        azureVoice: 'en-US-AnaNeural',
        pitch: 1.25,
        rate: 1.05,
        dialogueStyle: 'Enthusiastic hero learning magical English spells'
      }
    ],
    mascot: {
      name: 'Whiskers',
      emoji: '😺',
      personality: 'Playful, encouraging, and full of helpful word clues',
      catchphrases: [
        'Paw-some pronunciation! Say it loud and proud!',
        'Look for clues in the pictures before you choose!',
        'Your magical brain power is leveling up!'
      ],
      azureVoice: 'en-US-AriaNeural'
    },
    xpTotal: 420,
    learningObjectives: [
      'Master 5 target adventure words: crystal, discover, brave, curious, whisper',
      'Speak in complete sentences using past and present action verbs',
      'Sing the Phonics Adventure Song and answer listening questions',
      'Demonstrate social-emotional self-talk and complete a real-world oral mission'
    ],
    successCriteria: [
      'I can pronounce all 5 magic words aloud with confidence',
      'I can solve the interactive sorting, memory, and sentence puzzles',
      'I can sing the karaoke lyrics with correct rhythm',
      'I can complete the writing exit ticket and claim my Master Badge'
    ],
    vocabulary: [
      {
        word: 'crystal',
        meaning: 'a shiny, glowing rock with magical facets',
        example: 'Diego found a sparkling crystal beneath the waterfall.',
        emoji: '💎',
        imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        audioPronunciationText: 'crystal',
        speakerCharacter: 'Diego Wave'
      },
      {
        word: 'discover',
        meaning: 'to find something new for the very first time',
        example: `${learnerName} and ${petEmoji} discover a hidden golden door!`,
        emoji: '🗺️',
        imageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&auto=format&fit=crop&q=80',
        audioPronunciationText: 'discover',
        speakerCharacter: 'Wizard Dan'
      },
      {
        word: 'brave',
        meaning: 'ready to try even when something feels challenging',
        example: 'Countess Vespera was brave when entering the ancient castle.',
        emoji: '🛡️',
        // NOTE: the old Unsplash asset for this card 404s (returns an ORB error in
        // browsers) so the vocabulary photo silently vanished. Point it at a
        // verified, live castle image instead.
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        audioPronunciationText: 'brave',
        speakerCharacter: 'Countess Vespera'
      },
      {
        word: 'curious',
        meaning: 'eager to learn, explore, and ask good questions',
        example: 'Whiskers is curious about the glowing magical runes.',
        emoji: '🔍',
        imageUrl: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600&auto=format&fit=crop&q=80',
        audioPronunciationText: 'curious',
        speakerCharacter: 'Whiskers'
      },
      {
        word: 'whisper',
        meaning: 'to speak very softly and quietly',
        example: 'They whisper the secret password to open the magic chest.',
        emoji: '🤫',
        imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&auto=format&fit=crop&q=80',
        audioPronunciationText: 'whisper',
        speakerCharacter: 'Wizard Dan'
      }
    ],
    sections: [
      {
        id: 'sec-prologue',
        title: 'Chapter 1: The Magic Door in the Kingdom',
        type: 'story',
        emoji: '📖',
        color: 'purple',
        duration: 8,
        objective: 'Follow the dialogue and discover the mysterious door',
        content: `Deep within the Emerald Forest of the Kingdom, ${learnerName} ${avatarEmoji} and ${petEmoji} were walking along the sunlit path. Suddenly, Diego Wave 🧜‍♂️ emerged from the stream, pointing toward a stone wall overgrown with glowing vines. Countess Vespera 🧛‍♀️ flew down gently from the tall oak tree with an ancient leather scroll in her hands.`,
        readAloudText: `Deep within the Emerald Forest, ${learnerName} and their loyal pet walked along the sunlit path. Diego Wave called out from the stream: Look over here! A sparkling crystal door is hidden behind the ancient vines! Countess Vespera opened her book of spells and smiled gently.`,
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
        dialogues: [
          {
            speaker: 'Diego Wave',
            emoji: '🧜‍♂️',
            azureVoice: 'en-US-ChristopherNeural',
            text: 'Look over here, friends! I see blue light shimmering behind the vines!'
          },
          {
            speaker: 'Countess Vespera',
            emoji: '🧛‍♀️',
            azureVoice: 'en-US-JennyNeural',
            text: 'Fascinating! The stone runes require a brave speaker to whisper the magic words.'
          },
          {
            speaker: 'Wizard Dan',
            emoji: '🧙‍♂️',
            azureVoice: 'en-US-GuyNeural',
            text: `Remember our lesson, ${learnerName}! Use your clearest voice and pronounce each sound.`
          }
        ],
        activities: [
          {
            id: 'act-story-choice',
            type: 'storyChoice',
            title: 'Choose the Adventure Path',
            emoji: '🗺️',
            prompt: 'How should the heroes open the mysterious crystal door?',
            instruction: 'Tap the best adventure choice to continue the story.',
            mascotTip: 'Whiskers says: Real heroes use their words and brainpower!',
            feedbackCorrect: 'Magnificent choice! The crystal glowed warmly and the door slid open with a chime!',
            feedbackIncorrect: 'Nothing happened. Try speaking the magic words instead!',
            points: 30,
            storyChoices: [
              {
                choice: "Step forward, take a deep breath, and whisper: 'We are curious and brave!'",
                outcome: "The vines gently parted and the crystal door unlocked with golden sparkles!",
                nextPlot: "Inside lies the Sunlit Hall of Ancient Riddles.",
                best: true,
                bonusXp: 15
              },
              {
                choice: "Try to push the heavy stone door with muscle power alone",
                outcome: "The door is far too heavy and made of enchanted stone.",
                nextPlot: "Countess Vespera reminds you to use magic words.",
                best: false
              },
              {
                choice: "Turn around and head back to camp",
                outcome: "The adventure waits for another day.",
                nextPlot: "Diego encourages you: Don't give up! We can do this!",
                best: false
              }
            ]
          },
          {
            id: 'act-true-false-1',
            type: 'trueFalse',
            title: 'Story Comprehension Check',
            emoji: '⚖️',
            prompt: 'Diego Wave discovered blue light shimmering behind the vines.',
            instruction: 'Is this statement TRUE or FALSE?',
            mascotTip: 'Think back to what Diego said by the stream!',
            feedbackCorrect: 'Spot on! Diego called out when he saw the blue shimmering light!',
            feedbackIncorrect: 'Listen again: Diego saw the light behind the stone wall.',
            points: 20,
            correct: true,
            explanation: "Diego said: 'I see blue light shimmering behind the vines!'"
          }
        ]
      },
      {
        id: 'sec-song',
        title: 'Chapter 2: The Curious Explorer Sing-Along',
        type: 'song',
        emoji: '🎵',
        color: 'pink',
        duration: 7,
        objective: 'Practice rhythm, intonation, and vowel pronunciation through song',
        content: 'Sing together with Diego, Vespera, and Wizard Dan! Follow the highlighted words and tap to hear each line.',
        readAloudText: 'I am curious, I ask why! I am brave and I will try! We discover something new, with words of magic, bright and true!',
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
        youtubeId: 'jofNR_WkoCE',
        activities: [
          {
            id: 'act-karaoke-1',
            type: 'songKaraoke',
            title: 'Interactive Karaoke Stage',
            emoji: '🎤',
            prompt: 'Sing the song with the melody! Tap any line to hear it with Azure voice.',
            instruction: 'Practice singing aloud 2 times to unlock the 50 XP bonus.',
            mascotTip: 'Whiskers says: Tap each line and sing along with confidence!',
            feedbackCorrect: 'Superstar singing! Your rhythm and pitch were fantastic! 🌟',
            feedbackIncorrect: 'Keep practicing the rhythm! You got this!',
            points: 40,
            lyrics: [
              'I am curious, I ask why, 🌟',
              'I am brave, I touch the sky! 🛡️',
              'With my friends I walk the way, 👫',
              'We discover words today! 💎',
              'Whisper soft and speak out clear, 🤫',
              'English magic is right here! ✨'
            ]
          },
          {
            id: 'act-listen-choose-1',
            type: 'listenChoose',
            title: 'Listen & Identify Sound',
            emoji: '👂',
            prompt: 'Listen to the audio clip. Which word does Wizard Dan say?',
            instruction: 'Tap the speaker to listen, then pick the matching word.',
            readAloudText: 'whisper',
            mascotTip: 'Listen closely for the quiet /w/ and /sp/ sound!',
            feedbackCorrect: 'Perfect ear! You identified "whisper" instantly!',
            feedbackIncorrect: 'Listen once more: it starts with "wh" and ends in "er".',
            points: 25,
            options: ['whisper', 'whistle', 'winter', 'winner'],
            correct: 'whisper'
          }
        ]
      },
      {
        id: 'sec-workshop',
        title: 'Chapter 3: The Language Puzzle Workshop',
        type: 'practice',
        emoji: '🎮',
        color: 'green',
        duration: 10,
        objective: 'Hands-on practice: matching, category sorting, cloze sentences, and syntax building',
        content: 'Solve the word puzzles to power up the Kingdom crystal grid and earn gems for the reward shop.',
        readAloudText: 'Welcome to the Language Puzzle Workshop! Match the words, sort the power cards, and assemble the magic sentences.',
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1000&auto=format&fit=crop&q=80',
        activities: [
          {
            id: 'act-match-pairs-1',
            type: 'matchingPairs',
            title: 'Match Words & Meanings',
            emoji: '🔗',
            prompt: 'Connect each magic word on the left with its correct meaning on the right.',
            instruction: 'Tap a word on the left, then tap its matching meaning on the right.',
            mascotTip: 'Take your time and look for clue words!',
            feedbackCorrect: 'All pairs connected perfectly! You mastered the definitions!',
            feedbackIncorrect: 'Check your connections and try again.',
            points: 35,
            pairs: [
              { left: 'crystal 💎', right: 'a glowing magical stone' },
              { left: 'discover 🗺️', right: 'to find something brand new' },
              { left: 'brave 🛡️', right: 'ready to try hard things' },
              { left: 'curious 🔍', right: 'wants to explore and learn' }
            ]
          },
          {
            id: 'act-drag-sort-1',
            type: 'dragDropSort',
            title: 'Sort Power Cards into Chests',
            emoji: '🧲',
            prompt: 'Sort the word cards into Actions (Things you DO) vs Qualities (How you ARE).',
            instruction: 'Drag cards into the chests or tap to assign them.',
            mascotTip: 'Ask yourself: Can I DO this, or is it a feeling/quality?',
            feedbackCorrect: 'Awesome sorting! All cards placed in the right treasure chest!',
            feedbackIncorrect: 'Check which words are action verbs and which are character traits.',
            points: 35,
            items: ['discover', 'whisper', 'sing', 'explore', 'brave', 'curious', 'happy', 'kind'],
            categories: [
              {
                name: 'Action Verbs (Things to Do)',
                emoji: '⚡',
                items: ['discover', 'whisper', 'sing', 'explore'],
                color: 'blue'
              },
              {
                name: 'Hero Traits (How You Are)',
                emoji: '💖',
                items: ['brave', 'curious', 'happy', 'kind'],
                color: 'pink'
              }
            ]
          },
          {
            id: 'act-sentence-builder-1',
            type: 'sentenceBuilder',
            title: 'Sentence Builder: The Secret Cave',
            emoji: '🧱',
            prompt: 'Assemble the scrambled word tiles into a grammatically correct sentence.',
            instruction: 'Tap the words in order from left to right.',
            mascotTip: 'Remember: Start with the capital letter and end with the period!',
            feedbackCorrect: 'Grammar perfection! "We discover a shiny blue crystal." is 100% correct!',
            feedbackIncorrect: 'Not quite in order yet. Tap a tile to put it back and try again!',
            points: 30,
            items: ['blue', 'discover', 'We', 'crystal.', 'a', 'shiny'],
            correctOrder: ['We', 'discover', 'a', 'shiny', 'blue', 'crystal.']
          },
          {
            id: 'act-fill-blank-1',
            type: 'fillBlank',
            title: 'Fill in the Missing Magic Spells',
            emoji: '✍️',
            prompt: 'Select the missing word to complete each sentence.',
            instruction: 'Tap the best choice capsule for each blank.',
            mascotTip: 'Read the full sentence in your head to check if it sounds right!',
            feedbackCorrect: 'Both sentences are complete and crystal clear!',
            feedbackIncorrect: 'Review the word meanings and try again.',
            points: 30,
            blanks: [
              {
                sentence: 'Countess Vespera is ___ to learn about daytime magic.',
                answer: 'curious',
                choices: ['curious', 'sleepy', 'loud'],
                hint: 'She wants to explore and ask questions!'
              },
              {
                sentence: 'Diego had to ___ so he would not wake the sleeping dragon.',
                answer: 'whisper',
                choices: ['shout', 'whisper', 'jump'],
                hint: 'Speak very softly!'
              }
            ]
          }
        ]
      },
      {
        id: 'sec-speed-memory',
        title: 'Chapter 4: Speed Arena & Pronunciation Lab',
        type: 'practice',
        emoji: '⚡',
        color: 'cyan',
        duration: 8,
        objective: 'Build automaticity and oral fluency through timed races and speech recognition',
        content: 'Train your brain reaction speed with 3D memory flips, the word order sprint, and oral pronunciation feedback.',
        readAloudText: 'Welcome to the Speed Arena! Test your memory, race the clock, and practice speaking aloud with the microphone.',
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80',
        activities: [
          {
            id: 'act-memory-1',
            type: 'memoryMatch',
            title: '3D Memory Card Flip',
            emoji: '🧠',
            prompt: 'Flip the cards to match each vocabulary word with its picture emoji and definition!',
            instruction: 'Tap any two cards to reveal them. Find all 3 pairs with fewest moves!',
            mascotTip: 'Remember card positions as you flip!',
            feedbackCorrect: 'Outstanding memory! All pairs matched with champion speed!',
            feedbackIncorrect: 'Keep flipping to find the matching pair!',
            points: 35,
            pairs: [
              { left: '💎 Crystal', right: 'Glowing Rock' },
              { left: '🗺️ Discover', right: 'Find Something' },
              { left: '🛡️ Brave', right: 'Not Afraid' }
            ]
          },
          {
            id: 'act-word-race-1',
            type: 'wordOrderRace',
            title: 'Word Order Speed Sprint',
            emoji: '🏁',
            prompt: 'Fast race! Tap the words in order before time runs out to make your mascot sprint!',
            instruction: 'Tap: [ Diego ] [ is ] [ a ] [ brave ] [ explorer. ]',
            mascotTip: 'Go as fast as you can!',
            feedbackCorrect: 'Lightning speed! You crossed the finish line with maximum XP!',
            feedbackIncorrect: 'Try again to get the gold speed trophy!',
            points: 30,
            items: ['explorer.', 'is', 'Diego', 'brave', 'a'],
            correctOrder: ['Diego', 'is', 'a', 'brave', 'explorer.']
          },
          {
            id: 'act-speak-repeat-1',
            type: 'speakRepeat',
            title: 'Speak & Pronounce Challenge',
            emoji: '🗣️',
            prompt: 'Listen to the target phrase, then tap the mic and say it aloud clearly!',
            instruction: 'Say: "I am curious and brave today!"',
            readAloudText: 'I am curious and brave today!',
            mascotTip: 'Pronounce the "s" in curious and "v" in brave clearly!',
            feedbackCorrect: 'Crystal clear pronunciation! 100% match score! 🌟',
            feedbackIncorrect: 'Good effort! Speak clearly into the microphone and try once more.',
            points: 40
          }
        ]
      },
      {
        id: 'sec-sel-life',
        title: 'Chapter 5: Social-Emotional Skills & Real-World Quest',
        type: 'sel',
        emoji: '💛',
        color: 'amber',
        duration: 7,
        objective: 'Develop self-awareness, positive self-talk, and transfer English to everyday life',
        content: 'True heroes use English not just in books, but to connect with friends, share feelings, and help their community.',
        readAloudText: 'Great learners check in with their feelings and practice positive self-talk. Let us see how you feel today and prepare your real-world mission.',
        imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1000&auto=format&fit=crop&q=80',
        activities: [
          {
            id: 'act-sel-checkin-1',
            type: 'reflectionSEL',
            title: 'Feelings Check-In & Kind Self-Talk',
            emoji: '💛',
            prompt: 'When you try a difficult new English word and make a mistake, what is the best thing to tell yourself?',
            instruction: 'Choose the most encouraging, growth-mindset thought.',
            mascotTip: 'Whiskers says: Mistakes are proof that your brain is growing!',
            feedbackCorrect: 'Inspiring mindset! "Mistakes help me learn and get stronger" is the mark of a true champion!',
            feedbackIncorrect: 'Remember: Be as kind to yourself as you are to your best friend.',
            points: 25,
            options: [
              'Mistakes help me learn, and I can try one more clue! 🌟',
              'I should give up and never speak English again.',
              'I must always be perfect on the very first try.'
            ],
            correct: 'Mistakes help me learn, and I can try one more clue! 🌟'
          },
          {
            id: 'act-real-life-1',
            type: 'realLifeMission',
            title: 'Real-World Action Mission',
            emoji: '🌍',
            prompt: 'Take your English magic into real life this week! Complete these three fun missions.',
            instruction: 'Check off the missions you promise to complete before our next lesson.',
            mascotTip: 'Practice the roleplay line with a parent, friend, or your pet!',
            feedbackCorrect: 'Mission accepted! You are an official Ambassador of English Magic! 🚀',
            feedbackIncorrect: 'Select your mission goals to continue!',
            points: 30,
            checklist: [
              'Ask a family member or friend: "What is something you are curious about?" in English 🔍',
              'Find one shiny object in your room and call it your "magic crystal" 💎',
              'Whisper one kind compliment to a classmate or family member 🤫'
            ],
            roleplayPrompt: 'Roleplay: "Hello! I discovered a new word today: crystal! Do you want to see my drawing?"'
          }
        ]
      },
      {
        id: 'sec-arcade',
        title: 'Chapter 6: The Grand Arcade of Enchanted Games',
        type: 'quest',
        emoji: '🕹️',
        color: 'cyan',
        duration: 12,
        objective: 'Achieve automatic word recall through 12 high-fidelity arcade games',
        content: 'The Kingdom Arcade has lit up! Every cabinet is a magic game. Win tokens in each cabinet and the Crystal Cave trophy vault will open for your certificate ceremony!',
        readAloudText: 'Welcome to the Grand Arcade of Enchanted Games! Spell, pop, whack, listen, spin, search, rhyme, clap, draw, race and flip your way to mastery!',
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000&auto=format&fit=crop&q=80',
        activities: [
          {
            id: 'act-spelling-bee-1',
            type: 'spellingBee',
            title: 'Spelling Bee Tiles',
            emoji: '🐝',
            prompt: 'Hear the word, then tap the letter tiles in the right order to spell it!',
            instruction: 'Tap the speaker first, then build the word letter by letter.',
            mascotTip: 'Whiskers says: Say each letter sound aloud as you tap!',
            feedbackCorrect: 'Champion speller! Every letter in perfect order!',
            feedbackIncorrect: 'That letter does not fit yet — listen again!',
            points: 30,
            items: ['crystal', 'brave'],
            distractorLetters: ['x', 'q']
          },
          {
            id: 'act-balloon-pop-1',
            type: 'balloonPop',
            title: 'Balloon Word Pop',
            emoji: '🎈',
            prompt: 'Pop ONLY the balloons with the target word — let the decoys float by!',
            instruction: 'Pop every balloon that says the target word.',
            mascotTip: 'Whiskers says: Read first, then pop! Speed comes after accuracy.',
            feedbackCorrect: 'Pop-tacular reading! You spotted every single word!',
            feedbackIncorrect: 'Oops! Read the balloon before you pop it!',
            points: 30,
            word: 'crystal',
            options: ['crystal', 'brave', 'whisper', 'curious']
          },
          {
            id: 'act-whack-a-mole-1',
            type: 'whackAMole',
            title: 'Whack-a-Word',
            emoji: '⚒️',
            prompt: 'Whack only the moles wearing the target word before time runs out!',
            instruction: 'Whack the target word moles; avoid the decoy moles!',
            mascotTip: 'Whiskers says: Keep your eyes on the target word!',
            feedbackCorrect: 'Mole Master! Your word recognition is lightning fast!',
            feedbackIncorrect: 'Good try! Whack only the target word next time!',
            points: 30,
            word: 'crystal',
            options: ['brave', 'whisper'],
            seconds: 30
          },
          {
            id: 'act-bingo-listener-1',
            type: 'bingoListener',
            title: 'Listening Bingo Board',
            emoji: '🎧',
            prompt: 'Listen to each word and stamp it on your bingo board!',
            instruction: 'Press the speaker, listen, and stamp the matching square.',
            mascotTip: 'Whiskers says: Listen for the first sound — it is the biggest clue!',
            feedbackCorrect: 'BINGO! Five words stamped with golden ears!',
            feedbackIncorrect: 'Listen again — stamp only the word you hear!',
            points: 30,
            options: ['crystal', 'brave', 'whisper', 'curious', 'discover']
          },
          {
            id: 'act-spin-wheel-1',
            type: 'spinWheel',
            title: 'Speaking Prize Wheel',
            emoji: '🎡',
            prompt: 'Spin the enchanted wheel and say the word in your own full sentence!',
            instruction: 'Spin, then say a complete sentence with the word you land on.',
            mascotTip: 'Whiskers says: Big voice, brave sentence, then claim your prize!',
            feedbackCorrect: 'What a superstar sentence! The crowd goes wild!',
            feedbackIncorrect: 'Try a longer sentence next spin!',
            points: 30,
            options: ['crystal', 'brave', 'whisper', 'curious', 'discover']
          },
          {
            id: 'act-odd-one-out-1',
            type: 'oddOneOut',
            title: 'Odd One Out Detective',
            emoji: '🕵️',
            prompt: 'Three words are action verbs — one is a feeling. Tap the odd one out!',
            instruction: 'Tap the word that does not belong with the others.',
            mascotTip: 'Whiskers says: Ask yourself — can I DO this word?',
            feedbackCorrect: 'Sharp detective eye! Happy was the only feeling word!',
            feedbackIncorrect: 'Look again — which one cannot be an action?',
            points: 25,
            options: ['run', 'jump', 'happy', 'swim'],
            odd: 'happy',
            explanation: 'Run, jump and swim are things you DO. Happy is a feeling — it was the odd one out!'
          },
          {
            id: 'act-word-search-1',
            type: 'wordSearch',
            title: 'Magic Word Search',
            emoji: '🔍',
            prompt: 'Hidden words lurk in the grid! Tap the first letter, then the last letter to catch them.',
            instruction: 'Tap a starting letter, then an ending letter in a straight line.',
            mascotTip: 'Whiskers says: Search row by row, like reading a story!',
            feedbackCorrect: 'Word Detective gold badge! Every hidden word captured!',
            feedbackIncorrect: 'Not in the grid — pick two letters in a straight line!',
            points: 30,
            gridWords: ['CRYSTAL', 'BRAVE', 'MAGIC']
          },
          {
            id: 'act-rhyme-match-1',
            type: 'rhymeMatch',
            title: 'Rhyme Time Match',
            emoji: '🎵',
            prompt: 'Match the words that rhyme — same ending sound, different beginning!',
            instruction: 'Tap a word on the left, then its rhyming partner on the right.',
            mascotTip: 'Whiskers says: Say both words aloud — let your ears decide!',
            feedbackCorrect: 'Rhyme Master! Your ears hear the music of English!',
            feedbackIncorrect: 'Say them aloud — do the endings sound the same?',
            points: 30,
            pairs: [
              { left: 'cat 🐱', right: 'hat 🎩' },
              { left: 'star ⭐', right: 'car 🚗' },
              { left: 'cake 🎂', right: 'lake 🏞️' }
            ]
          },
          {
            id: 'act-syllable-count-1',
            type: 'syllableCount',
            title: 'Syllable Clap Counter',
            emoji: '👏',
            prompt: 'Clap the beats of each word, then choose how many syllables you heard!',
            instruction: 'Clap along with the speaker, then tap the number.',
            mascotTip: 'Whiskers says: Your chin drops once for every syllable — feel it!',
            feedbackCorrect: 'Rhythm Master! You can feel the heartbeat of every word!',
            feedbackIncorrect: 'Clap slower and count with the speaker!',
            points: 25,
            syllables: [
              { word: 'cat', count: 1 },
              { word: 'magic', count: 2 },
              { word: 'curious', count: 3 }
            ]
          },
          {
            id: 'act-drawing-pad-1',
            type: 'drawingPad',
            title: 'Enchanted Drawing Pad',
            emoji: '🎨',
            prompt: 'Draw your favorite magic word, then say it aloud three times!',
            instruction: 'Pick a color, draw the word meaning, then claim your stars.',
            mascotTip: 'Whiskers says: Drawing a word makes your memory twice as strong!',
            feedbackCorrect: 'What a masterpiece! Artist AND spellcaster!',
            feedbackIncorrect: 'Make your drawing, then save it!',
            points: 25,
            task: 'Draw the crystal cave with the glowing crystal inside!'
          },
          {
            id: 'act-typing-race-1',
            type: 'typingRace',
            title: 'Typing Race Challenge',
            emoji: '⌨️',
            prompt: 'Type the full sentence before the timer ends — every correct letter counts!',
            instruction: 'Type the target sentence exactly and finish before 60 seconds.',
            mascotTip: 'Whiskers says: Accuracy first, then speed builds on its own!',
            feedbackCorrect: 'Lightning fingers! Sentence typed with perfect spelling!',
            feedbackIncorrect: 'So close! Check the spelling and try once more!',
            points: 35,
            correctOrder: ['We', 'discover', 'a', 'shiny', 'blue', 'crystal.'],
            seconds: 60
          },
          {
            id: 'act-flashcards-1',
            type: 'flashcardTrainer',
            title: 'Memory Vault Flashcards',
            emoji: '🃏',
            prompt: 'Flip each card, say the word, mark it known — master the whole vault!',
            instruction: 'Flip, say aloud, then mark it when you know it.',
            mascotTip: 'Whiskers says: Say it before you flip — peeking is for checking!',
            feedbackCorrect: 'Memory Vault complete! All cards mastered forever!',
            feedbackIncorrect: 'Keep flipping — mastery is one card away!',
            points: 30,
            pairs: [
              { left: '💎 crystal', right: 'a glowing magic rock' },
              { left: '🛡️ brave', right: 'ready to try hard things' },
              { left: '🗺️ discover', right: 'to find something brand new' },
              { left: '🔍 curious', right: 'eager to explore and learn' },
              { left: '🤫 whisper', right: 'to speak very softly' }
            ]
          }
        ]
      }
    ],
    exitTicket: {
      id: 'act-exit-ticket',
      type: 'writingMission',
      title: 'Grand Finale Exit Ticket & Storyteller Badge',
      emoji: '🎟️',
      prompt: `Write two magical sentences about what ${learnerName} and ${petEmoji} discovered in the cave!`,
      instruction: 'Use at least two words from the word bank below.',
      mascotTip: 'Tap any sentence starter chip to add it directly into your writing!',
      feedbackCorrect: 'Masterpiece writing! You earned your Master Storyteller Badge & Certificate! 🏆✨',
      feedbackIncorrect: 'Try using at least two words from your magic word bank!',
      points: 40,
      sentenceFrames: [
        'Today we discovered a ___ in the cave.',
        'My friend Diego was very ___ when we explored.',
        'I felt ___ and excited to learn!'
      ],
      wordBank: ['crystal', 'discover', 'brave', 'curious', 'whisper', 'magic']
    },
    teacherNotes: [
      'Encourage the student to act out the dialogue roles with different voices (Diego deep ocean voice, Vespera spooky-cute voice).',
      'Use the karaoke song at the start of review sessions as a warm-up drill.',
      'Check back on the real-world mission during the next session log!'
    ]
  };
}
