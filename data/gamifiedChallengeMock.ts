/**
 * Gamified Challenge — mock theme data (ported from the Gamified-Challnege
 * app's escapeRoom theme: days 0, 1, 5 and 6 cover every tab type — lesson,
 * vocab, grammar, reading, listening, dialogue, speaking, writing, dictation,
 * quiz, drag-drop clues and the boss battle).
 */
import type { GamifiedThemeData } from '../pages/gamified/gamifiedTypes';

const ESCAPE_IMAGES = [
  'https://loremflickr.com/1920/1080/dark,room,creepy?lock=1',
  'https://loremflickr.com/1920/1080/dark,room,creepy?lock=2',
  'https://loremflickr.com/1920/1080/dark,room,creepy?lock=3',
  'https://loremflickr.com/1920/1080/dark,room,creepy?lock=4',
  'https://loremflickr.com/1920/1080/dark,room,creepy?lock=5',
  'https://loremflickr.com/1920/1080/dark,room,creepy?lock=6',
  'https://loremflickr.com/1920/1080/dark,room,creepy?lock=7',
];

export const buildGamifiedChallengeMock = (learnerName?: string): GamifiedThemeData => ({
  id: 'escape-room',
  name: '🪚 SAW: Escape Room',
  description: 'Survive 7 days of deadly language traps. Each wrong answer brings you closer to doom.',
  icon: '🪚',
  welcomeTitle: '🪚 Welcome to the Game',
  welcomeSubtitle: 'I want to play a game. For 7 days, your vocabulary is your lifeline. Every word matters. Every mistake... has consequences.',
  colorPrimary: '#8b0000',
  colorSecondary: '#1a0000',
  backgroundImages: ESCAPE_IMAGES,
  soundTheme: 'horror',
  narratorVoicePreference: 'Microsoft',
  masterCode: 'FREEDOM',
  startDate: new Date().toISOString().slice(0, 10),
  days: [
    {
      dayNumber: 0,
      title: 'The Awakening',
      subtitle: 'You wake up chained to a desk. A screen flickers on...',
      skill: 'vocabulary',
      narratorIntro: 'You open your eyes. The room is dark. Cold metal bites your wrists. A television crackles to life, and a voice speaks: "Hello. I want to play a game. Before you are the tools of language. Master them, and you will be free. Fail, and the room will consume you." The first lesson appears on the screen.',
      narratorOutro: 'The chains loosen slightly. You have earned a moment of respite. But this is only the beginning. Tomorrow, the real test begins.',
      backgroundImage: 'https://loremflickr.com/1920/1080/dark,room,creepy?lock=8',
      artifactEmoji: '⛓️',
      artifactName: 'Chains of Ignorance',
      unlockCode: 'FREEDOM',
      codeHint: 'What is the opposite of captivity? (7 letters)',
      lesson: {
        title: 'Survival Vocabulary: Essential Words for Escape',
        content: 'In this dire situation, you must learn the vocabulary of survival. These words will be your weapons against the traps that await.',
        sections: [
          {
            title: 'The Captor\'s Message',
            type: 'text',
            content: 'Read the following message carefully. Every word matters. Hidden within this text is the code to your FREEDOM.\n\n"Dear captive, you have been selected for a special purpose. Your linguistic abilities will be tested. The key to your survival lies in understanding. You must demonstrate mastery of these essential terms: ESCAPE means to break free from confinement. DECIPHER means to decode or interpret something obscure. CLUE is a piece of evidence that leads to solving a mystery. TRAP is a device designed to catch or harm. SURVIVAL is the state of continuing to live despite danger. COURAGE means the ability to face fear. The opposite of captivity is FREEDOM - remember this word, for it may save your life."'
          },
          {
            title: 'Grammar Trap',
            type: 'exercise',
            content: 'The captor has left grammatical traps. Fix each sentence or face the consequences.\n\n1. "He don\'t know where the key is." → Correct: "He doesn\'t know where the key is."\n2. "The prisoners was scared." → Correct: "The prisoners were scared."\n3. "She runned to the door." → Correct: "She ran to the door."'
          },
          {
            title: '⚠️ WARNING',
            type: 'warning',
            content: 'The fear meter is watching. Wrong answers will increase your fear level. At 100%, the game ends. Choose wisely.'
          },
          {
            title: 'Dialogue: The Guard',
            type: 'dialogue',
            content: 'Guard: "You think you can escape? Nobody escapes."\nYou: "I will find a way. Every puzzle has a solution."\nGuard: "Words won\'t save you here."\nYou: "Words are the only weapon I need."'
          }
        ]
      },
      vocabulary: [
        { word: 'escape', translation: '', definition: 'To break free from confinement or control', example: 'The prisoner planned to escape at midnight.', partOfSpeech: 'verb' },
        { word: 'decipher', translation: '', definition: 'To decode or interpret something difficult to understand', example: 'She tried to decipher the ancient text.', partOfSpeech: 'verb' },
        { word: 'clue', translation: '', definition: 'A piece of evidence that helps solve a puzzle or mystery', example: 'The detective found an important clue.', partOfSpeech: 'noun' },
        { word: 'trap', translation: '', definition: 'A device or situation designed to catch someone', example: 'They set a trap for the intruder.', partOfSpeech: 'noun' },
        { word: 'survival', translation: '', definition: 'The state of continuing to live, especially in danger', example: 'Survival depends on quick thinking.', partOfSpeech: 'noun' },
        { word: 'captivity', translation: '', definition: 'The state of being imprisoned or confined', example: 'The animal was kept in captivity.', partOfSpeech: 'noun' },
        { word: 'courage', translation: '', definition: 'The ability to face fear, pain, or danger', example: 'It takes courage to speak the truth.', partOfSpeech: 'noun' },
        { word: 'confinement', translation: '', definition: 'The state of being enclosed in a space', example: 'Solitary confinement is a harsh punishment.', partOfSpeech: 'noun' },
      ],
      grammar: [
        {
          rule: 'Subject-Verb Agreement',
          explanation: 'The verb must agree with the subject in number. Singular subjects take singular verbs.',
          examples: ['He runs (not "he run")', 'They escape (not "they escapes")'],
          exercises: [
            { instruction: 'Choose the correct form', sentence: 'The prisoner ___ to escape.', answer: 'wants', options: ['want', 'wants', 'wanting'] },
            { instruction: 'Choose the correct form', sentence: 'The guards ___ watching.', answer: 'are', options: ['is', 'are', 'be'] },
          ]
        }
      ],
      reading: {
        text: 'The room was dark and cold. A single light bulb hanged from the ceiling, casting eerie shadows on the walls. The prisoner looked around desperate, searching for any means of escape. On the table, there was a note writed in red ink. It readed: "Your freedom depends on your ability to understood these words. Find the errors, fix them, and the door will opens." The prisoner picked up the note with trembling hands and began to studied it carefully.',
        glitchWords: [
          { text: 'hanged', isGlitch: true, correction: 'hung' },
          { text: 'desperate', isGlitch: true, correction: 'desperately' },
          { text: 'writed', isGlitch: true, correction: 'written' },
          { text: 'readed', isGlitch: true, correction: 'read' },
          { text: 'understood', isGlitch: true, correction: 'understand' },
          { text: 'opens', isGlitch: true, correction: 'open' },
          { text: 'studied', isGlitch: true, correction: 'study' },
        ],
        comprehensionQuestions: [
          { question: 'Where was the prisoner?', options: ['In a garden', 'In a dark room', 'In a library', 'In a hospital'], correct: 1, explanation: 'The text says "The room was dark and cold."' },
          { question: 'What was on the table?', options: ['A key', 'A knife', 'A note', 'A phone'], correct: 2, explanation: 'The text mentions "a note written in red ink."' },
        ]
      },
      listening: [
        { text: 'The key to escape lies in understanding every word.', hiddenWord: 'escape', hint: 'To break free (6 letters)' },
        { text: 'Courage is the weapon against fear.', hiddenWord: 'courage', hint: 'Bravery (7 letters)' },
      ],
      dialogue: {
        scenario: 'You are chained in a dark room. A masked figure appears on screen. You must negotiate your way to getting information about the escape route.',
        characters: ['Jigsaw', 'You'],
        turns: [
          {
            narrator: 'The screen flickers. A puppet with red spirals on its cheeks appears. Its mechanical jaw moves as it speaks.',
            character: 'Jigsaw',
            question: 'The puppet asks: "I will give you one chance. Choose your words carefully. How do you respond to your captor?"',
            options: [
              { text: '"Please let me go! I\'ll do anything!"', outcome: 'neutral', response: 'Begging shows weakness. The puppet laughs. "Desperation is not a strategy. Try again."', points: 5 },
              { text: '"I understand the game. I\'m ready to play."', outcome: 'survive', response: 'The puppet nods slowly. "Interesting. Intelligence is a valuable tool. You may proceed to the first challenge."', points: 20 },
              { text: '"This is insane! You can\'t keep me here!"', outcome: 'die', response: 'The puppet tilts its head. "Anger clouds judgment." A dart shoots from the wall. You feel dizzy...', points: 0 },
            ]
          },
          {
            narrator: 'A compartment opens in the wall, revealing a riddle carved into metal.',
            character: 'Jigsaw',
            question: '"To proceed, you must answer: What has keys but no locks, space but no room, and you can enter but cannot go inside?"',
            options: [
              { text: '"A keyboard!"', outcome: 'survive', response: '"Correct. The mind is sharper than any blade." A panel slides open revealing a hallway.', points: 25 },
              { text: '"A house?"', outcome: 'die', response: '"Wrong. The walls begin to close in..."', points: 0 },
              { text: '"A map?"', outcome: 'neutral', response: '"Incorrect, but not entirely foolish. Think harder."', points: 5 },
            ]
          }
        ]
      },
      speaking: [
        { text: 'I will escape from this prison and find my freedom', targetAccuracy: 70, clueOnSuccess: 'The code starts with F', mode: 'normal' },
        { text: 'Courage is not the absence of fear but the triumph over it', targetAccuracy: 65, clueOnSuccess: 'The code ends with M', mode: 'shout' },
      ],
      writing: [
        { prompt: 'Write a short message (at least 30 words) to a fellow prisoner explaining your escape plan. Use at least 3 vocabulary words from today\'s lesson.', minWords: 30, keywords: ['escape', 'courage', 'survival'], sampleAnswer: 'Dear fellow prisoner, I have devised an escape plan that requires courage and determination. Our survival depends on working together. We must decipher the clues left by our captor and find the hidden key. Tonight, when the guards change shifts, we make our move toward freedom.' },
      ],
      dictation: [
        { text: 'The prisoner must find the courage to escape.', speed: 'slow' },
        { text: 'Every clue brings us closer to freedom.', speed: 'normal' },
      ],
      quiz: [
        { question: 'What does "decipher" mean?', options: ['To destroy', 'To decode or interpret', 'To build', 'To run away'], correct: 1, explanation: '"Decipher" means to decode or interpret something obscure.', codeFragment: 'F' },
        { question: 'Which word means "the state of being imprisoned"?', options: ['Freedom', 'Courage', 'Captivity', 'Escape'], correct: 2, explanation: '"Captivity" means the state of being imprisoned or confined.', codeFragment: 'RE' },
        { question: 'Complete: "He ___ to escape." (Past tense of "try")', options: ['tryed', 'tried', 'tryd', 'trying'], correct: 1, explanation: 'The past tense of "try" is "tried" (y changes to i, add -ed).', codeFragment: 'ED' },
        { question: 'What is the noun form of "survive"?', options: ['Surviving', 'Survivor', 'Survival', 'Survivance'], correct: 2, explanation: 'The noun form of "survive" is "survival".', codeFragment: 'OM' },
      ],
      fearMeterImpact: 10,
      timeLimit: 1800,
      pointsAvailable: 200,
    },
    {
      dayNumber: 1,
      title: 'The Listening Room',
      subtitle: 'Sounds echo through the walls. Decipher them or be silenced forever.',
      skill: 'listening',
      narratorIntro: 'Day two. The room has changed. Speakers line every wall. Strange sounds fill the air - whispers, echoes, fragments of words. A new message appears: "Today you must listen. The sounds carry secrets. Miss a single word, and the silence will swallow you whole." Your ears are your only weapon now.',
      narratorOutro: 'The speakers fall silent. You have proven your ears are sharp. But can your eyes match them? Tomorrow brings a new kind of horror.',
      backgroundImage: 'https://loremflickr.com/1920/1080/dark,room,creepy?lock=9',
      artifactEmoji: '👂',
      artifactName: 'The Listening Ear',
      unlockCode: 'WHISPER',
      codeHint: 'Speaking very quietly (7 letters)',
      lesson: {
        title: 'The Art of Listening: Sounds of Survival',
        content: 'In the listening room, every sound matters. Today you will train your ears to catch crucial information from spoken English.',
        sections: [
          {
            title: 'Audio Transcript',
            type: 'text',
            content: 'The following transcript plays over the speakers in the room. Listen carefully - a WHISPER can be louder than a scream.\n\n"In moments of crisis, communication becomes essential. The ability to understand spoken language can mean the difference between life and death. Pay attention to tone, pitch, and rhythm. A whisper carries as much meaning as a shout. The hidden frequencies contain your salvation. Listen for the word that means speaking very softly - that is your key to the next room."'
          },
          {
            title: 'Pronunciation Guide',
            type: 'exercise',
            content: 'Key sounds to distinguish:\n• "th" vs "t" - "think" vs "tin"\n• "l" vs "r" - "light" vs "right"\n• "v" vs "w" - "very" vs "wary"\n• Short vs Long vowels - "ship" vs "sheep"'
          },
          {
            title: 'Dialogue: The Voice in the Walls',
            type: 'dialogue',
            content: 'Voice: "Can you hear me? Listen closely..."\nYou: "Who are you? Where are you speaking from?"\nVoice: "I am trapped like you. In the room next door. We must whisper so they don\'t hear us."\nYou: "How do we get out?"\nVoice: "The code... it\'s hidden in the sounds. Listen to every frequency."'
          }
        ]
      },
      vocabulary: [
        { word: 'whisper', translation: '', definition: 'To speak very softly', example: 'She whispered the secret code.', partOfSpeech: 'verb' },
        { word: 'echo', translation: '', definition: 'A repeated sound caused by reflection', example: 'His voice echoed in the empty room.', partOfSpeech: 'noun' },
        { word: 'frequency', translation: '', definition: 'The rate of vibration of sound waves', example: 'The radio operates on a specific frequency.', partOfSpeech: 'noun' },
        { word: 'deafening', translation: '', definition: 'Extremely loud', example: 'The explosion was deafening.', partOfSpeech: 'adjective' },
        { word: 'muffled', translation: '', definition: 'Made quieter or less clear', example: 'The muffled sounds came through the wall.', partOfSpeech: 'adjective' },
        { word: 'eavesdrop', translation: '', definition: 'To secretly listen to a conversation', example: 'He tried to eavesdrop on their plan.', partOfSpeech: 'verb' },
      ],
      grammar: [
        {
          rule: 'Present Continuous Tense',
          explanation: 'Used for actions happening right now. Form: am/is/are + verb-ing',
          examples: ['I am listening to the sounds.', 'The speakers are playing strange noises.'],
          exercises: [
            { instruction: 'Fill in the blank', sentence: 'I ___ (listen) to the echo.', answer: 'am listening', options: ['am listening', 'listen', 'listened'] },
            { instruction: 'Fill in the blank', sentence: 'The voice ___ (whisper) through the wall.', answer: 'is whispering', options: ['is whispering', 'whispers', 'whispered'] },
          ]
        }
      ],
      reading: {
        text: 'The listening room was filled with speakres mounted on every wall. Strange sounds was playing constantly - some loud, some barely audible. The prisoner had to concentrated on each sound, trying to extract meaning from the chaos. A voice keeped repeating a phrase, but it was to quiet to understand. She pressed her ear against the wall and heared a faint whisper: "The code is hidded in the frequency."',
        glitchWords: [
          { text: 'speakres', isGlitch: true, correction: 'speakers' },
          { text: 'was', isGlitch: true, correction: 'were' },
          { text: 'concentrated', isGlitch: true, correction: 'concentrate' },
          { text: 'keeped', isGlitch: true, correction: 'kept' },
          { text: 'to', isGlitch: true, correction: 'too' },
          { text: 'heared', isGlitch: true, correction: 'heard' },
          { text: 'hidded', isGlitch: true, correction: 'hidden' },
        ],
        comprehensionQuestions: [
          { question: 'What was on the walls?', options: ['Paintings', 'Speakers', 'Windows', 'Chains'], correct: 1, explanation: 'Speakers were mounted on every wall.' },
        ]
      },
      listening: [
        { text: 'The echo reveals what the eyes cannot see.', hiddenWord: 'echo', hint: 'A repeated sound (4 letters)' },
        { text: 'Sometimes a whisper is more powerful than a scream.', hiddenWord: 'whisper', hint: 'Speaking very softly (7 letters)' },
        { text: 'The frequency of the signal changes every minute.', hiddenWord: 'frequency', hint: 'Rate of sound vibration (9 letters)' },
      ],
      dialogue: {
        scenario: 'You hear a voice through the wall. Another prisoner is trying to communicate. You must listen carefully and respond appropriately.',
        characters: ['Mystery Voice', 'You'],
        turns: [
          {
            narrator: 'A faint tapping comes from behind the east wall. Then a muffled voice breaks through.',
            character: 'Mystery Voice',
            question: 'The voice whispers: "Can you hear me? Tap twice if yes." What do you do?',
            options: [
              { text: 'Tap twice on the wall', outcome: 'survive', response: '"Good. Listen carefully. The guard changes shift in 10 minutes. I have a plan."', points: 20 },
              { text: 'Shout "YES I CAN HEAR YOU!"', outcome: 'die', response: 'Alarms blare. The guards heard you. Gas fills the room...', points: 0 },
              { text: 'Stay silent and listen', outcome: 'neutral', response: '"Hello? Are you there? ...I thought I heard someone." The voice fades.', points: 5 },
            ]
          }
        ]
      },
      speaking: [
        { text: 'I can hear the whisper echoing through the walls', targetAccuracy: 70, clueOnSuccess: 'The code has 7 letters', mode: 'whisper' },
      ],
      writing: [
        { prompt: 'Describe the sounds you hear in the listening room. Use at least 5 descriptive adjectives. (30+ words)', minWords: 30, keywords: ['echo', 'whisper', 'muffled'], sampleAnswer: 'The listening room is filled with eerie, muffled sounds. A faint whisper echoes from every direction, creating a deafening cacophony of noise. The mysterious, haunting frequencies seem to pulse with a rhythmic pattern, growing louder and softer in an unpredictable cycle.' },
      ],
      dictation: [
        { text: 'Listen carefully to every whisper in the room.', speed: 'slow' },
        { text: 'The echo carries a hidden message.', speed: 'normal' },
      ],
      quiz: [
        { question: 'What does "eavesdrop" mean?', options: ['To speak loudly', 'To secretly listen', 'To run away', 'To write a letter'], correct: 1, explanation: '"Eavesdrop" means to secretly listen to a conversation.', codeFragment: 'WH' },
        { question: '"The sound was ___" - choose the word meaning "very quiet"', options: ['deafening', 'muffled', 'echoing', 'screaming'], correct: 1, explanation: '"Muffled" means made quieter or less clear.', codeFragment: 'ISP' },
        { question: 'Which tense: "I am listening"?', options: ['Past simple', 'Present continuous', 'Future', 'Past perfect'], correct: 1, explanation: '"am listening" is present continuous tense.', codeFragment: 'ER' },
      ],
      fearMeterImpact: 15,
      timeLimit: 1800,
      pointsAvailable: 200,
    },
    {
      dayNumber: 5,
      title: 'The Integration Chamber',
      subtitle: 'All clues converge. Connect the pieces or face the final trap.',
      skill: 'integration',
      narratorIntro: 'Day six. All the rooms you have survived connect to this central chamber. Your clues, your words, your courage - everything must come together. The voice is urgent now: "This is your penultimate test. Combine what you have learned. Match the clues. Drag the pieces into place. The final code awaits those who can integrate all their knowledge."',
      narratorOutro: 'The pieces have fallen into place. Tomorrow is the final day. The boss battle awaits. Rest now, for you will need every ounce of strength.',
      backgroundImage: 'https://loremflickr.com/1920/1080/dark,room,creepy?lock=13',
      artifactEmoji: '🧩',
      artifactName: 'The Master Puzzle',
      unlockCode: 'COMBINE',
      codeHint: 'To put together; to merge (7 letters)',
      lesson: {
        title: 'Integration: Connecting All Skills',
        content: 'Today everything you have learned comes together. Vocabulary, grammar, reading, listening, speaking, and writing unite as one.',
        sections: [
          {
            title: 'The Master Text',
            type: 'text',
            content: 'To COMBINE all your skills, read this comprehensive passage:\n\n"Language mastery requires the integration of multiple abilities. A skilled communicator must read with comprehension, listen with attention, speak with clarity, and write with precision. These four skills do not exist in isolation - they combine to create true fluency. When you can seamlessly switch between reading a text, discussing its meaning, listening to others\' perspectives, and writing your own analysis, you have achieved integration."'
          },
          {
            title: 'Clue Assembly',
            type: 'exercise',
            content: 'Match each day\'s clue to its meaning:\n• Day 0: FREEDOM - The goal of escape\n• Day 1: WHISPER - Communication in secrecy\n• Day 2: CHAPTER - Structure of knowledge\n• Day 3: SILENCE - Power of restraint\n• Day 4: WRITTEN - Permanence of words\n• Day 5: COMBINE - Unity of skills'
          }
        ]
      },
      vocabulary: [
        { word: 'integrate', translation: '', definition: 'To combine parts into a whole', example: 'We need to integrate all the data.', partOfSpeech: 'verb' },
        { word: 'synthesize', translation: '', definition: 'To combine elements to form a coherent whole', example: 'She synthesized information from multiple sources.', partOfSpeech: 'verb' },
        { word: 'converge', translation: '', definition: 'To come together from different directions', example: 'All paths converge at the center.', partOfSpeech: 'verb' },
        { word: 'comprehensive', translation: '', definition: 'Including everything; complete', example: 'The test was comprehensive.', partOfSpeech: 'adjective' },
      ],
      grammar: [
        {
          rule: 'Conditional Sentences (If + will)',
          explanation: 'First conditional: If + present simple, will + infinitive. Used for likely future situations.',
          examples: ['If you combine the clues, you will find the answer.', 'If she studies hard, she will pass.'],
          exercises: [
            { instruction: 'Complete the conditional', sentence: 'If we ___ (combine) our knowledge, we ___ (escape).', answer: 'combine / will escape', options: ['combine / will escape', 'combined / would escape', 'combining / escaping'] },
          ]
        }
      ],
      reading: {
        text: 'All the clues was finally coming together. The prisoner had collected fragments from each room - a word here, a symbol there. Now she needed to combinate them into a single solution. If she would integrate all her knowledge, the final door will open. "I has learned so much," she thinked. "Vocabulary, grammar, listening, speaking, writing - they all connects. The answer is in the combination."',
        glitchWords: [
          { text: 'was', isGlitch: true, correction: 'were' },
          { text: 'combinate', isGlitch: true, correction: 'combine' },
          { text: 'would', isGlitch: true, correction: 'could' },
          { text: 'will', isGlitch: true, correction: 'would' },
          { text: 'has', isGlitch: true, correction: 'have' },
          { text: 'thinked', isGlitch: true, correction: 'thought' },
          { text: 'connects', isGlitch: true, correction: 'connect' },
        ],
        comprehensionQuestions: [
          { question: 'What did the prisoner collect?', options: ['Weapons', 'Food', 'Clue fragments', 'Keys'], correct: 2, explanation: 'The prisoner collected fragments (clues) from each room.' },
        ]
      },
      listening: [
        { text: 'When all skills combine, true mastery emerges.', hiddenWord: 'combine', hint: 'To put together (7 letters)' },
      ],
      dialogue: {
        scenario: 'All previous characters appear as holograms in the integration chamber. You must navigate a group conversation.',
        characters: ['Jigsaw', 'Ghost', 'Voice Judge'],
        turns: [
          {
            narrator: 'Three holographic figures materialize around you, each representing a past challenge.',
            character: 'Jigsaw',
            question: '"You have made it this far. But can you combine everything you\'ve learned? Tell me - what connects all the codes?"',
            options: [
              { text: '"Each code represents a language skill - they combine to show the path to mastery."', outcome: 'survive', response: '"Impressive. You see the pattern. The integration is complete." All three figures bow.', points: 30 },
              { text: '"I just memorized them. Does it matter?"', outcome: 'neutral', response: '"Memorization without understanding is a cage of its own."', points: 5 },
              { text: '"Leave me alone! I\'m tired of games!"', outcome: 'die', response: '"Exhaustion leads to errors. Errors lead to consequences." The floor opens beneath you...', points: 0 },
            ]
          }
        ]
      },
      speaking: [
        { text: 'I will combine all my knowledge to solve the final puzzle', targetAccuracy: 70, clueOnSuccess: 'The code means to merge things together', mode: 'normal' },
      ],
      writing: [
        { prompt: 'Write a summary (40+ words) of everything you have learned over the past 5 days. Use vocabulary from each day.', minWords: 40, keywords: ['escape', 'whisper', 'chapter', 'silence', 'written', 'combine'], sampleAnswer: 'Over five days, I have escaped the chains of ignorance. I learned to whisper secrets and listen carefully. Each chapter of my journey has written new knowledge into my mind. In silence, I found strength. Now I combine all these skills to face the final challenge.' },
      ],
      dictation: [
        { text: 'If you combine all the clues, you will find the answer.', speed: 'normal' },
      ],
      quiz: [
        { question: '"Synthesize" means:', options: ['To destroy', 'To combine into a whole', 'To separate', 'To ignore'], correct: 1, explanation: '"Synthesize" means to combine elements to form a coherent whole.', codeFragment: 'COM' },
        { question: 'First conditional: "If I study, I ___ pass."', options: ['would', 'will', 'can', 'should'], correct: 1, explanation: 'First conditional uses "will" for likely future outcomes.', codeFragment: 'BI' },
        { question: '"Converge" means:', options: ['To separate', 'To come together', 'To disappear', 'To explode'], correct: 1, explanation: '"Converge" means to come together from different directions.', codeFragment: 'NE' },
      ],
      dragDropClues: [
        { clue: 'Day 0: FREEDOM', match: 'Vocabulary - Breaking free from ignorance' },
        { clue: 'Day 1: WHISPER', match: 'Listening - Hearing the quiet truth' },
        { clue: 'Day 2: CHAPTER', match: 'Reading - Sections of knowledge' },
        { clue: 'Day 3: SILENCE', match: 'Speaking - Knowing when not to speak' },
        { clue: 'Day 4: WRITTEN', match: 'Writing - Permanent expression' },
        { clue: 'Day 5: COMBINE', match: 'Integration - Unity of all skills' },
      ],
      fearMeterImpact: 20,
      timeLimit: 1800,
      pointsAvailable: 300,
    },
    {
      dayNumber: 6,
      title: 'The Final Game',
      subtitle: 'BOSS BATTLE: Face the Language Master in a battle of wits.',
      skill: 'boss-battle',
      narratorIntro: 'The final day. The last door opens to reveal an arena. In its center stands the Language Master - a towering figure made of swirling letters and words. The voice speaks for the last time: "This is the end game. Answer quickly. Answer correctly. The Language Master attacks with confusion and doubt. Your weapon is everything you have learned. Survive the boss battle, and you earn your freedom. Forever."',
      narratorOutro: 'CONGRATULATIONS. You have defeated the Language Master. The doors open. Light floods in. You are free. Your language skills have evolved beyond measure. You are no longer a prisoner - you are a master. 🎉🏆',
      backgroundImage: 'https://loremflickr.com/1920/1080/dark,room,creepy?lock=14',
      artifactEmoji: '💀',
      artifactName: 'The Language Master\'s Skull',
      unlockCode: 'VICTORY',
      codeHint: 'The result of winning a battle (7 letters)',
      lesson: {
        title: 'Boss Battle: The Ultimate Language Challenge',
        content: 'Everything comes down to this moment. All skills, all vocabulary, all grammar - weaponized for the final confrontation.',
        sections: [
          {
            title: 'The Arena',
            type: 'text',
            content: 'VICTORY awaits the worthy. The Language Master speaks in riddles:\n\n"I am the sum of all words ever spoken, written, whispered, and screamed. I am grammar and vocabulary, reading and listening, speaking and writing. I am language itself. To defeat me, you must prove you understand me. Answer my questions swiftly, for time is your enemy. Each correct answer weakens me. Each wrong answer... strengthens me."'
          },
          {
            title: '⚠️ BOSS MECHANICS',
            type: 'warning',
            content: 'The Boss Battle is timed! Each question has a strict time limit. Wrong answers increase the boss\'s power (and your fear meter).'
          }
        ]
      },
      vocabulary: [
        { word: 'triumph', translation: '', definition: 'A great victory or achievement', example: 'Their triumph was celebrated by all.', partOfSpeech: 'noun' },
        { word: 'conquer', translation: '', definition: 'To overcome or defeat', example: 'She conquered her fear of speaking.', partOfSpeech: 'verb' },
        { word: 'persevere', translation: '', definition: 'To continue despite difficulty', example: 'You must persevere through challenges.', partOfSpeech: 'verb' },
        { word: 'resilient', translation: '', definition: 'Able to recover from setbacks', example: 'Resilient learners never give up.', partOfSpeech: 'adjective' },
        { word: 'mastery', translation: '', definition: 'Complete skill or knowledge', example: 'Language mastery requires dedication.', partOfSpeech: 'noun' },
      ],
      grammar: [
        {
          rule: 'Mixed Tenses Review',
          explanation: 'All tenses together: past, present, future, perfect, continuous.',
          examples: ['I learned (past). I am learning (present continuous). I will learn (future). I have learned (present perfect).'],
          exercises: [
            { instruction: 'Identify the tense', sentence: 'I have been studying for seven days.', answer: 'present perfect continuous', options: ['present simple', 'present perfect continuous', 'past simple'] },
          ]
        }
      ],
      reading: {
        text: 'The Language Master was a terrifyng sight. Made entirely of swirling letters and glowing words, it towered over the prisoner. "You has come far," it speaked, its voice echoing from a thousand mouths. "But the final test is the most hardest of all. Every skill you have learn must be demonstated now. There is no room for error." The prisoner standed tall and drawed a deep breath.',
        glitchWords: [
          { text: 'terrifyng', isGlitch: true, correction: 'terrifying' },
          { text: 'has', isGlitch: true, correction: 'have' },
          { text: 'speaked', isGlitch: true, correction: 'spoke' },
          { text: 'most hardest', isGlitch: true, correction: 'hardest' },
          { text: 'learn', isGlitch: true, correction: 'learned' },
          { text: 'demonstated', isGlitch: true, correction: 'demonstrated' },
          { text: 'standed', isGlitch: true, correction: 'stood' },
          { text: 'drawed', isGlitch: true, correction: 'drew' },
        ],
        comprehensionQuestions: [
          { question: 'What was the Language Master made of?', options: ['Stone', 'Metal', 'Letters and words', 'Fire'], correct: 2, explanation: 'It was made entirely of swirling letters and glowing words.' },
        ]
      },
      listening: [
        { text: 'Victory belongs to those who never stop learning.', hiddenWord: 'victory', hint: 'Winning result (7 letters)' },
      ],
      dialogue: {
        scenario: 'The final confrontation with the Language Master. Your responses determine the ending.',
        characters: ['Language Master', 'You'],
        turns: [
          {
            narrator: 'The massive figure of the Language Master looms before you. Lightning crackles between the letters that form its body.',
            character: 'Language Master',
            question: '"Mortal, you stand before the sum of all language. What is your final answer? What have you learned in these seven days?"',
            options: [
              { text: '"I have learned that language is not just words - it is courage, understanding, and connection. I am ready."', outcome: 'survive', response: '"Then you have truly understood." The Language Master bows and dissolves into a shower of golden letters. VICTORY IS YOURS! 🏆', points: 50 },
              { text: '"I have learned enough. Let me go."', outcome: 'neutral', response: '"Enough? There is always more to learn. But you have earned your partial freedom."', points: 15 },
              { text: '"I haven\'t learned anything. This was all pointless."', outcome: 'die', response: '"Then you must repeat the cycle." The world resets to Day 0...', points: 0 },
            ]
          }
        ]
      },
      speaking: [
        { text: 'I have conquered the Language Master and achieved victory', targetAccuracy: 65, clueOnSuccess: 'VICTORY is yours!', mode: 'shout' },
      ],
      writing: [
        { prompt: 'Write your victory speech (50+ words). Summarize your 7-day journey and what you learned about language.', minWords: 50, keywords: ['victory', 'learned', 'mastery', 'courage'], sampleAnswer: 'Today I stand victorious. Over seven days, I have conquered fear, mastered vocabulary, navigated labyrinths of text, and found my voice. Language is more than grammar rules and word lists - it is the key to freedom, connection, and understanding. I have persevered through every challenge, and this victory belongs not just to me, but to every learner who refuses to give up.' },
      ],
      dictation: [
        { text: 'Victory belongs to those who persevere.', speed: 'normal' },
        { text: 'The Language Master has been defeated at last.', speed: 'fast' },
      ],
      quiz: [
        { question: '"Persevere" means:', options: ['To give up', 'To continue despite difficulty', 'To sleep', 'To run'], correct: 1, explanation: '"Persevere" means to continue despite difficulty.', codeFragment: 'VIC' },
        { question: '"Resilient" describes someone who:', options: ['Gives up easily', 'Recovers from setbacks', 'Is always angry', 'Is very tall'], correct: 1, explanation: '"Resilient" means able to recover from setbacks.', codeFragment: 'TO' },
        { question: 'Final question: What tense is "I have been studying"?', options: ['Past simple', 'Present perfect', 'Present perfect continuous', 'Future'], correct: 2, explanation: 'have been + verb-ing = present perfect continuous', codeFragment: 'RY' },
      ],
      bossBattle: [
        { question: 'Past tense of "swim":', options: ['swimmed', 'swam', 'swum', 'swimming'], correct: 1, timeLimit: 8 },
        { question: '"She ___ to the store yesterday."', options: ['goes', 'going', 'went', 'gone'], correct: 2, timeLimit: 8 },
        { question: 'Which is correct?', options: ['more better', 'more good', 'better', 'most better'], correct: 2, timeLimit: 6 },
        { question: '"They ___ finished the project."', options: ['has', 'have', 'having', 'had been'], correct: 1, timeLimit: 8 },
        { question: '"If I ___ rich, I would travel."', options: ['am', 'were', 'was been', 'being'], correct: 1, timeLimit: 8 },
        { question: 'Opposite of "victory":', options: ['triumph', 'success', 'defeat', 'glory'], correct: 2, timeLimit: 6 },
        { question: '"She speaks ___ than her brother."', options: ['more fluently', 'more fluent', 'fluentlier', 'most fluently'], correct: 0, timeLimit: 8 },
        { question: 'Which sentence is CORRECT?', options: ['He don\'t like it', 'He doesn\'t likes it', 'He doesn\'t like it', 'He not like it'], correct: 2, timeLimit: 8 },
        { question: '"The book was ___ by a famous author."', options: ['write', 'wrote', 'written', 'writing'], correct: 2, timeLimit: 6 },
        { question: '"I have been ___ English for 7 days."', options: ['study', 'studied', 'studying', 'studies'], correct: 2, timeLimit: 8 },
      ],
      fearMeterImpact: 25,
      timeLimit: 1200,
      pointsAvailable: 500,
    },
  ],
});

export const buildGamifiedChallengeMockJson = (learner?: { name?: string }): string =>
  JSON.stringify(buildGamifiedChallengeMock(learner?.name), null, 2);