import type { Lesson } from './types';

export const DEMO_LESSON: Lesson = {
  metadata: {
    title: 'Big Buck Bunny – Emotions & Nature Vocabulary',
    targetLanguage: 'English',
    cefrLevel: 'B1',
    estimatedDurationSeconds: 596,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    learnerL1: 'es',
  },
  globalSettings: {
    pointsToLevelUp: 500,
    enableStreak: true,
    suspenseSounds: true,
  },
  learnerProfile: {
    name: 'Alex',
    level: 'B1',
    nativeLanguage: 'Spanish',
    goals: 'Improve speaking and vocabulary for travel and movies',
    interests: 'Nature, animals, adventure films',
    facts: 'Loves outdoor activities, has a pet rabbit',
  },
  badges: [
    {
      id: 'first_answer',
      name: 'First Step',
      emoji: '👣',
      rarity: 'common',
      condition: 'Complete your first activity',
      description: 'You took your first step on this journey!',
    },
    {
      id: 'word_master',
      name: 'Word Master',
      emoji: '📚',
      rarity: 'rare',
      condition: 'Answer 3 vocabulary activities correctly',
      description: 'You are mastering new vocabulary!',
    },
    {
      id: 'streak_5',
      name: 'On Fire',
      emoji: '🔥',
      rarity: 'epic',
      condition: 'Get a 5-streak',
      description: 'Five in a row! You\'re unstoppable!',
    },
    {
      id: 'perfect_speaker',
      name: 'Perfect Speaker',
      emoji: '🎤',
      rarity: 'legendary',
      condition: 'Complete a speaking activity',
      description: 'Your pronunciation is legendary!',
    },
    {
      id: 'nature_explorer',
      name: 'Nature Explorer',
      emoji: '🌿',
      rarity: 'rare',
      condition: 'Complete the nature segment',
      description: 'You explored the world of nature vocabulary!',
    },
  ],
  segments: [
    {
      id: 'seg1',
      title: 'Opening Scene – The Meadow',
      startTime: 0,
      endTime: 60,
      activities: [
        {
          id: 'act1',
          type: 'flashcard',
          timestamp: 8,
          title: '🌿 Warm-Up: Meadow Vocabulary',
          lessonContent: {
            warmUp: 'You just saw a beautiful open field in the film. In English, we call this a "meadow". Have you ever been to a meadow? What did it feel like?',
            form: '"Meadow" is a noun (countable). Plural: meadows. Used with articles: a meadow, the meadow.',
            meaning: 'A meadow is a field of grass, especially one used for hay or pasture, often with wildflowers.',
            use: 'We use "meadow" in nature descriptions, poetry, travel writing, and casual conversation about landscapes.',
            personalizedExamples: [
              'The rabbit hopped through the sunny meadow.',
              'On your next hike, you might cross a beautiful mountain meadow.',
              'I love reading in a meadow on sunny days.',
            ],
            lifeApplication: 'When you travel or watch nature documentaries, you can use "meadow" to describe open grassy areas — great for travel blogs or conversations!',
          },
          content: {
            cards: [
              { front: '🌿 MEADOW', back: 'A field of grass with wildflowers', example: 'The bunny ran across the meadow.', pronunciation: 'MED-oh', translation: 'prado, pradera' },
              { front: '🌸 SERENE', back: 'Calm and peaceful', example: 'The forest was serene and quiet.', pronunciation: 'suh-REEN', translation: 'sereno, tranquilo' },
              { front: '🌳 CANOPY', back: 'The upper layer of tree branches forming a cover', example: 'Sunlight filtered through the canopy.', pronunciation: 'KAN-uh-pee' },
              { front: '🍃 LUSH', back: 'Growing abundantly, rich in vegetation', example: 'The lush green meadow stretched for miles.', pronunciation: 'LUSH' },
              { front: '🌞 TRANQUIL', back: 'Free from disturbance, peaceful', example: 'They sat in tranquil silence.', pronunciation: 'TRAN-kwil' },
            ],
          },
          correctFeedback: 'Excellent! You know your nature vocabulary! 🌿',
          incorrectFeedback: 'Keep trying! Nature words take practice. 🌱',
          catFeedback: {
            correct: 'Purrfect! You really know your meadows! I wish I could roll in the grass right meow!',
            incorrect: 'Don\'t worry, even cats get lost in meadows sometimes. Try again!',
          },
          points: 50,
          requiredForNext: false,
          difficulty: 'easy',
          emoji: '🌿',
          color: 'green',
        },
        {
          id: 'act2',
          type: 'multipleChoice',
          timestamp: 30,
          title: '🔍 Comprehension Check',
          lessonContent: {
            warmUp: 'Let\'s check what you noticed in the opening scene!',
            meaning: '"Wander" means to walk slowly without a fixed direction, often enjoying the surroundings.',
            use: 'We wander when we are relaxed, exploring, or lost. It implies freedom and no rush.',
            personalizedExamples: [
              'The bunny wandered through the flowers.',
              'On your trips, do you like to wander around new cities?',
              'I wander through the park when I need to relax.',
            ],
          },
          content: {
            question: 'What does it mean when we say someone "wandered through the meadow"?',
            options: [
              { id: 'o1', text: 'They ran very fast through it', isCorrect: false },
              { id: 'o2', text: 'They walked slowly without a fixed direction', isCorrect: true },
              { id: 'o3', text: 'They jumped over the field', isCorrect: false },
              { id: 'o4', text: 'They drove through it in a car', isCorrect: false },
            ],
          },
          correctFeedback: 'Spot on! "Wander" perfectly captures that relaxed, free movement! 🎉',
          incorrectFeedback: '"Wander" implies slow, free movement — no rush, no direction. Think of a lazy Sunday walk!',
          catFeedback: {
            correct: 'Meow! You wandered right to the correct answer! I wander around my house looking for snacks too!',
            incorrect: 'Mrrrow! Think about how cats wander... slowly, curiously, no destination. That\'s "wander"!',
          },
          points: 40,
          requiredForNext: false,
          difficulty: 'easy',
          emoji: '🔍',
          color: 'teal',
        },
      ],
    },
    {
      id: 'seg2',
      title: 'The Forest Characters',
      startTime: 60,
      endTime: 180,
      activities: [
        {
          id: 'act3',
          type: 'fillBlanks',
          timestamp: 75,
          title: '✏️ Fill in the Blanks',
          lessonContent: {
            warmUp: 'The animals in the film show strong emotions. Let\'s practice describing feelings!',
            form: 'Adjectives for emotions: angry, curious, frightened, playful, aggressive. They come before nouns or after "be".',
            meaning: 'These words describe internal states that affect behavior.',
            use: 'Use these in storytelling, descriptions, and conversations about feelings.',
            personalizedExamples: [
              'The squirrels were playful but became aggressive when provoked.',
              'Have you ever felt frightened while watching a movie?',
              'Your rabbit probably feels curious when exploring new spaces!',
            ],
          },
          content: {
            sentence: 'The big bunny was ___ when the squirrels disturbed his ___.',
            blanks: ['angry', 'peace'],
          },
          correctFeedback: 'Perfect fill! You understand the emotions of our bunny hero! 💪',
          incorrectFeedback: 'The bunny was definitely not happy! Think about how you feel when someone bothers you.',
          catFeedback: {
            correct: 'Yes! Even big fluffy bunnies get angry! I get angry when my food bowl is empty. Fill it, please!',
            incorrect: 'Think about how the bunny felt when disturbed from his nap... That\'s how I feel on Mondays.',
          },
          points: 60,
          requiredForNext: false,
          difficulty: 'medium',
          emoji: '✏️',
          color: 'orange',
        },
        {
          id: 'act4',
          type: 'matching',
          timestamp: 110,
          title: '🔗 Match the Vocabulary',
          lessonContent: {
            warmUp: 'Let\'s connect words with their meanings!',
            form: 'These are all adjectives used to describe animals and their behavior.',
            meaning: 'Understanding animal behavior vocabulary helps in nature discussions and storytelling.',
            use: 'Use these in wildlife documentaries, nature writing, and everyday animal descriptions.',
            personalizedExamples: [
              'Your rabbit might be timid at first but becomes curious.',
              'Aggressive animals are often frightened deep down.',
            ],
          },
          content: {
            pairs: [
              { left: 'Timid', right: 'Easily frightened, shy' },
              { left: 'Aggressive', right: 'Ready to attack or confront' },
              { left: 'Playful', right: 'Fond of games and fun' },
              { left: 'Curious', right: 'Eager to know or learn something' },
              { left: 'Gentle', right: 'Mild in temperament, kind' },
            ],
          },
          correctFeedback: 'Amazing matching skills! You are a vocabulary connector! 🔗',
          incorrectFeedback: 'Good try! These animal behavior words are important. Read them again carefully.',
          catFeedback: {
            correct: 'Meow! Perfect matches! I am very curious and playful myself... and a little aggressive at 3am.',
            incorrect: 'Hmm, cats are curious creatures. Be curious about these word meanings!',
          },
          points: 70,
          requiredForNext: false,
          difficulty: 'medium',
          emoji: '🔗',
          color: 'green',
        },
        {
          id: 'act5',
          type: 'speaking',
          timestamp: 150,
          title: '🎤 Speaking Practice',
          lessonContent: {
            warmUp: 'Time to use your voice! Speaking is the most important skill.',
            form: 'Use "The [animal] [verb+ed]..." structure for past tense storytelling.',
            meaning: 'Describing actions in the past using simple past tense.',
            use: 'Great for retelling stories, recounting events, and movie discussions.',
            personalizedExamples: [
              'The bunny wandered through the meadow.',
              'The squirrels played tricks on the butterfly.',
            ],
            lifeApplication: 'Use this when telling friends about movies you watched or trips you took!',
          },
          content: {
            expectedSentence: 'The big bunny wandered through the beautiful meadow',
          },
          correctFeedback: 'Fantastic speaking! Your pronunciation is improving! 🎤✨',
          incorrectFeedback: 'Good attempt! Try to clearly say each word. Slow down a little.',
          catFeedback: {
            correct: 'Meow! Your voice is music to my furry ears! Even better than my midnight concerts!',
            incorrect: 'Practice makes purrfect! Try speaking a little slower and clearer.',
          },
          points: 80,
          requiredForNext: false,
          difficulty: 'medium',
          emoji: '🎤',
          color: 'purple',
        },
      ],
    },
    {
      id: 'seg3',
      title: 'The Chase & Emotions',
      startTime: 180,
      endTime: 350,
      activities: [
        {
          id: 'act6',
          type: 'trueFalse',
          timestamp: 200,
          title: '✅ True or False',
          lessonContent: {
            warmUp: 'How well were you paying attention to the story?',
            meaning: 'Inferring meaning from visual context is a key language skill.',
            use: 'We use inferences in academic reading, movie analysis, and everyday conversations.',
          },
          content: {
            question: 'The small animals in the film are friendly towards the bunny from the beginning.',
            answer: false,
          },
          correctFeedback: 'Correct! They were actually quite mischievous at first! 🎯',
          incorrectFeedback: 'Look again! The small animals were playing tricks on the bunny.',
          catFeedback: {
            correct: 'Right! Those little critters were NOT friendly. I know mischief when I see it.',
            incorrect: 'Were we watching the same film? Those squirrels were up to no good!',
          },
          points: 30,
          requiredForNext: false,
          difficulty: 'easy',
          emoji: '✅',
          color: 'teal',
        },
        {
          id: 'act7',
          type: 'dragDrop',
          timestamp: 240,
          title: '🧩 Sequence the Events',
          lessonContent: {
            warmUp: 'Let\'s put the story events in the right order!',
            form: 'Sequence words: first, then, after that, finally — used to organize events in time.',
            meaning: 'Sequencing helps us understand and retell stories clearly.',
            use: 'Essential for storytelling, presentations, and academic writing.',
          },
          content: {
            items: [
              'The bunny was resting peacefully',
              'The small animals disturbed him',
              'The bunny became angry',
              'The bunny chased the animals',
              'Everyone learned a lesson',
            ],
            targets: ['First', 'Then', 'After that', 'Next', 'Finally'],
          },
          correctFeedback: 'Perfect sequence! You tell stories like a pro! 📖',
          incorrectFeedback: 'Think about the order events happened in the film.',
          catFeedback: {
            correct: 'Purrfect story order! You could write books! I would read them... between naps.',
            incorrect: 'Hmm, even I get confused about the order of my nine lives. Try again!',
          },
          points: 60,
          requiredForNext: false,
          difficulty: 'medium',
          emoji: '🧩',
          color: 'orange',
        },
        {
          id: 'act8',
          type: 'wouldYouRather',
          timestamp: 290,
          title: '🤔 Would You Rather?',
          lessonContent: {
            warmUp: 'Fun discussion question! These help us practice expressing preferences.',
            form: '"Would you rather [verb]... or [verb]...?" — conditional preference structures.',
            meaning: 'Expressing preferences and giving reasons is key in conversation.',
            use: 'Great for social conversations, debates, and getting to know people.',
          },
          content: {
            wouldYouOption1: 'Be as big and strong as the bunny and scare everyone away?',
            wouldYouOption2: 'Be small and fast like the squirrels and play tricks on others?',
          },
          correctFeedback: 'Great choice and reasoning! You\'re a natural conversationalist! 💬',
          incorrectFeedback: 'Any answer is fine — just explain your reasoning!',
          catFeedback: {
            correct: 'I would rather be a cat, obviously. But great discussion point!',
            incorrect: 'No wrong answers here! Just tell me WHY. I love gossip.',
          },
          points: 40,
          requiredForNext: false,
          difficulty: 'easy',
          emoji: '🤔',
          color: 'purple',
        },
        {
          id: 'act9',
          type: 'wordScramble',
          timestamp: 330,
          title: '🔤 Unscramble the Word',
          lessonContent: {
            warmUp: 'Time for a fun word puzzle!',
            meaning: '"Butterfly" — a beautiful insect that transforms from a caterpillar.',
            use: 'Butterflies appear throughout the film. The word is great for nature descriptions.',
          },
          content: {
            scrambledWord: 'YREFTLTUB',
            correctWord: 'BUTTERFLY',
          },
          correctFeedback: 'You unscrambled it! BUTTERFLY — beautiful and symbolic of transformation! 🦋',
          incorrectFeedback: 'Hint: It\'s a beautiful flying insect that appears in the film!',
          catFeedback: {
            correct: 'BUTTERFLY! I love chasing those! You\'re almost as fast as me!',
            incorrect: 'I see butterflies in my dreams. Think... fluttery... colorful... garden...',
          },
          points: 40,
          requiredForNext: false,
          difficulty: 'medium',
          emoji: '🦋',
          color: 'gold',
        },
      ],
    },
    {
      id: 'seg4',
      title: 'Resolution & Reflection',
      startTime: 350,
      endTime: 596,
      activities: [
        {
          id: 'act10',
          type: 'predictNext',
          timestamp: 370,
          title: '🔮 Predict What Happens',
          lessonContent: {
            warmUp: 'Critical thinking time! What do YOU think will happen next?',
            form: 'Future predictions: "I think... will...", "I predict...", "Maybe..."',
            meaning: 'Making predictions develops critical thinking and future tense mastery.',
            use: 'Use prediction language in discussions, meetings, and academic contexts.',
          },
          content: {
            question: 'What do you think the bunny will do with the small animals who bothered him?',
            predictOptions: [
              { text: 'Forgive them and become friends', consequence: 'A happy ending showing the power of forgiveness! Like the Spanish concept of "reconciliación".' },
              { text: 'Chase them away permanently', consequence: 'A dramatic but less satisfying ending — conflict without resolution.' },
              { text: 'Teach them a lesson first, then forgive', consequence: 'The most realistic outcome — consequences + reconciliation!' },
              { text: 'Ignore them completely', consequence: 'Sometimes ignoring problems makes them go away... or get worse!' },
            ],
          },
          correctFeedback: 'Brilliant prediction! You think like a storyteller! 🔮',
          incorrectFeedback: 'All predictions are valid — what matters is your reasoning!',
          catFeedback: {
            correct: 'I predicted you\'d get this right! I\'m psychic. Or just well-read.',
            incorrect: 'All predictions are good! The real question is: what would YOU do?',
          },
          points: 50,
          requiredForNext: false,
          difficulty: 'medium',
          emoji: '🔮',
          color: 'purple',
        },
        {
          id: 'act11',
          type: 'discussion',
          timestamp: 420,
          title: '💬 Discussion Time',
          lessonContent: {
            warmUp: 'Let\'s go deeper! Discussion skills are crucial for B1 and beyond.',
            form: 'Discussion phrases: "In my opinion...", "I believe...", "From my perspective...", "On the other hand..."',
            meaning: 'These phrases help structure arguments and express views politely.',
            use: 'Essential for academic discussions, job interviews, and social conversations.',
          },
          content: {
            discussionPrompt: 'The bunny chose to stand up for himself when bullied by the small animals. Do you think standing up to bullies is always the right choice? How does this relate to situations in your own life?',
          },
          correctFeedback: 'Excellent discussion point! You\'re thinking deeply about real-world applications! 🌍',
          incorrectFeedback: 'Try to give a more detailed answer with examples from your experience.',
          catFeedback: {
            correct: 'Deep thoughts! I avoid conflicts by hiding under the sofa. Not sure that\'s better.',
            incorrect: 'Come on, I know you have opinions! Cats always have opinions. Share yours!',
          },
          points: 60,
          requiredForNext: false,
          difficulty: 'hard',
          emoji: '💬',
          color: 'blue',
        },
        {
          id: 'act12',
          type: 'ordering',
          timestamp: 470,
          title: '📋 Order the Phrases',
          lessonContent: {
            warmUp: 'Let\'s organize a mini-summary of the film using time expressions!',
            form: 'Sequencing connectors: "To begin with", "Shortly after", "Meanwhile", "Eventually", "In the end"',
            meaning: 'These connectors help create coherent narratives.',
            use: 'Perfect for writing summaries, reports, and telling stories.',
          },
          content: {
            orderedItems: [
              'To begin with, the bunny enjoyed a peaceful morning in the meadow.',
              'Shortly after, three small animals began playing pranks.',
              'Meanwhile, the bunny\'s patience was running out.',
              'Eventually, he decided to fight back cleverly.',
              'In the end, harmony was restored in the forest.',
            ],
          },
          correctFeedback: 'Perfect order! Your narrative structure is excellent! 📖',
          incorrectFeedback: 'Think about the time expressions as clues for the order!',
          catFeedback: {
            correct: 'Excellent story structure! You write better than my memoir "Nine Lives of Chaos".',
            incorrect: 'The time words are clues! "To begin with" = first. "In the end" = last. Simple!',
          },
          points: 60,
          requiredForNext: false,
          difficulty: 'hard',
          emoji: '📋',
          color: 'teal',
        },
        {
          id: 'act13',
          type: 'voiceOver',
          timestamp: 520,
          title: '🎬 Voice Over – Be the Narrator!',
          lessonContent: {
            warmUp: 'Now YOU become the narrator of the film! This is the ultimate speaking challenge.',
            form: 'Narrator present tense: "The bunny walks...", "He sees...", "The animals run..."',
            meaning: 'Present tense narration creates immediacy and drama.',
            use: 'Used in documentaries, sports commentary, and live reporting.',
          },
          content: {
            question: 'Record your voice narrating this scene: "The mighty bunny surveys his peaceful meadow, unaware of the mischief about to unfold..."',
          },
          correctFeedback: 'You\'re a natural narrator! Hollywood would be lucky to have you! 🎬',
          incorrectFeedback: 'Try again! Speak clearly and with emotion.',
          catFeedback: {
            correct: 'Your voice is amazing! Much better than the birds outside my window.',
            incorrect: 'Be the narrator! Channel your inner David Attenborough!',
          },
          points: 100,
          requiredForNext: false,
          difficulty: 'hard',
          emoji: '🎬',
          color: 'gold',
        },
        {
          id: 'act14',
          type: 'reflection',
          timestamp: 570,
          title: '📝 Personal Reflection',
          lessonContent: {
            warmUp: 'Final activity! Reflection deepens learning.',
            form: 'Reflective writing uses "I learned...", "I realized...", "I will try to..."',
            meaning: 'Connecting learning to personal experience makes it memorable.',
            use: 'Great for journaling, portfolios, and self-improvement.',
          },
          content: {
            reflectionPrompt: 'What is one English word or phrase from this lesson that you will use this week? How and when will you use it? Give a specific situation from your daily life.',
          },
          correctFeedback: 'Beautiful reflection! Connecting language to real life is the key to fluency! 🌟',
          incorrectFeedback: 'Try to be more specific about when and how you will use the new language.',
          catFeedback: {
            correct: 'I reflect every time I sit in a sunny window. Good for the soul and vocabulary!',
            incorrect: 'Think about YOUR life. When would this word be useful for you specifically?',
          },
          points: 80,
          requiredForNext: false,
          difficulty: 'medium',
          emoji: '📝',
          color: 'pink',
        },
      ],
    },
  ],
};

export const DEMO_SUBTITLES = `WEBVTT

00:00:05.000 --> 00:00:10.000
Deep in a lush, serene meadow, a gentle giant rested peacefully.

00:00:10.500 --> 00:00:16.000
Big Buck Bunny wandered through the beautiful forest, enjoying the tranquil morning.

00:00:17.000 --> 00:00:22.000
The air was fresh, the canopy above filtered golden sunlight through lush green leaves.

00:00:23.000 --> 00:00:29.000
Colorful butterflies danced playfully around the flowers in the serene meadow.

00:00:30.000 --> 00:00:36.000
But lurking nearby, three mischievous animals were plotting their aggressive pranks.

00:00:37.000 --> 00:00:43.000
The timid chipmunk, the curious squirrel, and the playful rodent formed an unlikely team.

00:00:45.000 --> 00:00:51.000
Their target: the gentle, innocent bunny enjoying his peaceful morning.

00:00:53.000 --> 00:00:59.000
When disturbed, even the most gentle creature can become angry and defensive.

00:01:02.000 --> 00:01:08.000
The bunny's patience was tested as the mischievous trio continued their tricks.

00:01:10.000 --> 00:01:16.000
Eventually, the big bunny decided he would no longer tolerate the aggressive behavior.

00:02:00.000 --> 00:02:06.000
With determination in his eyes, the bunny wandered after them through the forest.

00:02:08.000 --> 00:02:14.000
The serene meadow witnessed a dramatic chase through the lush undergrowth.

00:03:00.000 --> 00:03:06.000
In the end, harmony was restored and the forest returned to its tranquil state.

00:03:08.000 --> 00:03:14.000
The lesson learned: every creature deserves respect and peaceful coexistence.`;
