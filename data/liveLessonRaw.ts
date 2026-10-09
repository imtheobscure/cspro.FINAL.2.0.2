import type { LiveLessonManual } from '../pages/live/liveTypes';

/**
 * Raw sample Live Lesson manual ("Present Perfect Tense in Action") copied verbatim
 * from the Live-Lessons sub-app. Kept as a plain object so sparse AI-pasted JSON can
 * be normalized against it.
 */
const rawLesson = {
  "metadata": {
    "lessonId": "lesson-001",
    "title": "Present Perfect Tense in Action",
    "description": "A dynamic, gamified lesson exploring the Present Perfect tense through real-world contexts, speaking activities, and interactive games.",
    "durationMinutes": 60,
    "learningObjectives": [
      "Use the present perfect to talk about experiences",
      "Distinguish between present perfect and simple past",
      "Ask and answer questions using 'Have you ever...?'",
      "Use time expressions: ever, never, already, yet, just"
    ],
    "targetLanguage": "en-US",
    "defaultLocale": "en",
    "phase": "speak",
    "level": "B1",
    "topic": "Present Perfect",
    "tags": [
      "grammar",
      "speaking",
      "interactive"
    ]
  },
  "learnerProfile": {
    "name": "Alex",
    "age": 22,
    "level": "B1",
    "interests": [
      "travel",
      "music",
      "technology"
    ],
    "avatarTier": "rare",
    "pastScores": [
      85,
      90,
      78
    ]
  },
  "globalSettings": {
    "timerBehaviour": "pause_allowed",
    "gamification": {
      "points": 100,
      "retryAllowed": true,
      "maxRetries": 3,
      "badgeConditions": [
        {
          "id": "perfect",
          "label": "Perfect Score",
          "icon": "⭐",
          "condition": "perfect_score"
        },
        {
          "id": "streak",
          "label": "On Fire",
          "icon": "🔥",
          "condition": "streak",
          "threshold": 3
        }
      ]
    },
    "confettiOnCorrect": true
  },
  "procedureBlocks": [
    {
      "id": "step-001",
      "title": "Warm-Up: Would You Rather?",
      "type": "would-you-rather",
      "phase": "speak",
      "durationSeconds": 300,
      "studentInstructions": "Hey Alex! Let's get warmed up. Look at each pair of options and pick the one you prefer. After choosing, explain WHY using a full sentence. Ready? Let's go!",
      "languageReference": {
        "sentenceStarters": [
          {
            "starter": "I would rather... because...",
            "purpose": "expressing preference"
          },
          {
            "starter": "I'd choose... since I have never...",
            "purpose": "linking to experience"
          },
          {
            "starter": "Actually, I have already...",
            "purpose": "sharing past experience"
          }
        ],
        "grammar": [
          {
            "rule": "Would rather + base verb (no 'to')",
            "example": "I would rather travel to Japan.",
            "color": "#6366f1"
          }
        ]
      },
      "ccqQuestions": [
        {
          "question": "If I say 'I would rather swim', am I talking about now or in general?",
          "answer": "In general — it's a preference.",
          "purpose": "Check understanding of 'would rather'"
        },
        {
          "question": "Can we say 'I would rather to swim'?",
          "answer": "No! We use the base verb — 'I would rather swim'.",
          "purpose": "Error correction"
        }
      ],
      "speakingQuestions": [
        {
          "question": "Tell us about an experience related to your choice!",
          "level": "guided",
          "targetLanguage": "Have you ever...?",
          "followUp": "When did you do that? How was it?"
        }
      ],
      "h5pActivity": {
        "type": "would-you-rather",
        "rounds": [
          {
            "id": "r1",
            "question": "Which experience sounds more exciting?",
            "optionA": {
              "id": "a",
              "text": "Bungee jumping off a bridge",
              "emoji": "🪂"
            },
            "optionB": {
              "id": "b",
              "text": "Swimming with sharks",
              "emoji": "🦈"
            },
            "speakingPrompts": [
              "Have you ever done anything adventurous? Tell me!",
              "Would you ever try the other option? Why or why not?",
              "What's the most exciting thing you have ever done?"
            ],
            "feedback": {
              "correctFeedback": "Great choice! Now tell me WHY using 'I would rather... because...'",
              "incorrectFeedback": "Both are valid! The key is explaining your reasoning."
            }
          },
          {
            "id": "r2",
            "question": "Which sounds like a better weekend?",
            "optionA": {
              "id": "a",
              "text": "Hiking to a mountain summit",
              "emoji": "🏔️"
            },
            "optionB": {
              "id": "b",
              "text": "Relaxing on a tropical beach",
              "emoji": "🏖️"
            },
            "speakingPrompts": [
              "Have you ever been to the mountains or the beach?",
              "Describe your ideal weekend using 'I would rather...'",
              "Ask me: 'Have you ever climbed a mountain?'"
            ],
            "feedback": {
              "correctFeedback": "Nice! Since you love travel, which places have you already visited?",
              "incorrectFeedback": "Both are amazing! Tell me more about your choice."
            }
          },
          {
            "id": "r3",
            "question": "Which food adventure would you pick?",
            "optionA": {
              "id": "a",
              "text": "Eating insects in Thailand",
              "emoji": "🦗"
            },
            "optionB": {
              "id": "b",
              "text": "Trying fugu (pufferfish) in Japan",
              "emoji": "🐡"
            },
            "speakingPrompts": [
              "Have you ever eaten something really unusual?",
              "What's the strangest food you have ever tried?",
              "Would you say 'I have never tried...' or 'I have already tried...'?"
            ],
            "feedback": {
              "correctFeedback": "Interesting choice! Now use 'I have never tried...' or 'I have already eaten...' to explain!",
              "incorrectFeedback": "Both are adventurous! Use the present perfect to share your experience."
            }
          },
          {
            "id": "r4",
            "question": "Which superpower would you prefer?",
            "optionA": {
              "id": "a",
              "text": "Flying anywhere instantly",
              "emoji": "🦅"
            },
            "optionB": {
              "id": "b",
              "text": "Speaking every language fluently",
              "emoji": "🗣️"
            },
            "speakingPrompts": [
              "If you could fly, which country would you visit first? Have you ever been there?",
              "How many languages have you studied so far?",
              "Use: 'I have always wanted to...' in your answer"
            ],
            "feedback": {
              "correctFeedback": "Fun choice! You said you love technology — have you ever imagined having real superpowers?",
              "incorrectFeedback": "Both would be amazing! Tell me what you would do with that power."
            }
          }
        ]
      },
      "gamification": {
        "points": 15,
        "retryAllowed": false,
        "maxRetries": 0
      }
    },
    {
      "id": "step-002",
      "title": "Learn: Present Perfect Form",
      "type": "accordion",
      "phase": "study",
      "durationSeconds": 420,
      "studentInstructions": "Alex, let's learn about the Present Perfect tense! Click each section below to explore how it works. Pay attention to the form, meaning, and when to use it. Try to make your own example after each section!",
      "languageReference": {
        "grammar": [
          {
            "rule": "Positive: Subject + have/has + past participle",
            "example": "She has visited Paris.",
            "color": "#10b981"
          },
          {
            "rule": "Negative: Subject + haven't/hasn't + past participle",
            "example": "I haven't seen that film.",
            "color": "#ef4444"
          },
          {
            "rule": "Question: Have/Has + subject + past participle?",
            "example": "Have you ever tried sushi?",
            "color": "#6366f1"
          }
        ],
        "vocabulary": [
          {
            "word": "ever",
            "definition": "at any time in your life (questions & negatives)",
            "example": "Have you ever been to Japan?",
            "color": "#f59e0b"
          },
          {
            "word": "never",
            "definition": "not at any time",
            "example": "I have never eaten snails.",
            "color": "#ef4444"
          },
          {
            "word": "already",
            "definition": "before now / earlier than expected",
            "example": "She has already finished.",
            "color": "#10b981"
          },
          {
            "word": "yet",
            "definition": "up until now (negatives & questions)",
            "example": "Have you eaten yet?",
            "color": "#8b5cf6"
          },
          {
            "word": "just",
            "definition": "a very short time ago",
            "example": "He has just arrived.",
            "color": "#06b6d4"
          }
        ]
      },
      "ccqQuestions": [
        {
          "question": "Do we know WHEN she visited Paris?",
          "answer": "No! Present perfect doesn't specify when.",
          "purpose": "Distinguish from simple past"
        },
        {
          "question": "Which is correct: 'I have seen him yesterday' or 'I saw him yesterday'?",
          "answer": "'I saw him yesterday' — past time expressions need simple past.",
          "purpose": "Time expression error"
        }
      ],
      "speakingQuestions": [
        {
          "question": "Make a true sentence about yourself using 'ever' or 'never'.",
          "level": "controlled"
        },
        {
          "question": "Ask your partner 'Have you ever...?' about something from the vocabulary list.",
          "level": "guided"
        }
      ],
      "h5pActivity": {
        "type": "accordion",
        "expandMultiple": true,
        "panels": [
          {
            "id": "p1",
            "title": "🟢 Positive Form",
            "content": "Form: Subject + have/has + past participle\n\n✅ I have visited London.\n✅ She has eaten sushi.\n✅ They have seen that film.\n\nRemember: Use 'has' with he/she/it, 'have' with everything else!\n\nMeaning: We use this to talk about experiences or actions connected to now.\n\nUse it when: The exact time is NOT important — the experience matters."
          },
          {
            "id": "p2",
            "title": "🔴 Negative Form",
            "content": "Form: Subject + haven't/hasn't + past participle\n\n❌ I haven't visited Japan (yet).\n❌ He hasn't finished his homework.\n❌ We haven't tried that restaurant.\n\nTip: 'yet' often goes at the END of negative sentences!\n\nMeaning: Something has NOT happened up to this moment.\n\nUse it when: You want to say something is still pending or hasn't occurred in your life."
          },
          {
            "id": "p3",
            "title": "🔵 Question Form",
            "content": "Form: Have/Has + subject + past participle?\n\n❓ Have you ever been to Paris?\n❓ Has she finished already?\n❓ Have they seen the new film?\n\nShort answers: Yes, I have. / No, I haven't.\n\nMeaning: Asking about someone's life experiences or recent actions.\n\nUse it when: You want to know if someone has had a particular experience."
          },
          {
            "id": "p4",
            "title": "⏰ Time Expressions",
            "content": "| Word | Use | Example |\n|------|-----|--------|\n| ever | questions | Have you ever tried...? |\n| never | negatives | I have never eaten... |\n| already | positive/question | She has already left. |\n| yet | negative/question | Haven't you eaten yet? |\n| just | positive | He has just arrived. |\n\nAlex, since you love travel, try using 'ever' and 'never' to talk about places you have or haven't visited!"
          },
          {
            "id": "p5",
            "title": "🌍 When to Use (Personalized for You!)",
            "content": "Use Present Perfect for:\n\n1. Life experiences (no specific time)\n→ 'Have you ever been skydiving?'\n\n2. Recent events with present relevance\n→ 'I have just spilled my coffee!'\n\n3. Unfinished time periods\n→ 'I have seen three films this week.'\n\nAlex, since you're interested in travel, music, and technology, try these:\n→ 'I have visited 5 countries so far.'\n→ 'I have never been to a live concert.'\n→ 'I have already tried the latest app.'"
          }
        ],
        "feedback": {
          "correctFeedback": "Excellent! You've explored all the key patterns of the Present Perfect.",
          "incorrectFeedback": "Let's review together. Focus on the time expressions."
        }
      },
      "gamification": {
        "points": 15,
        "retryAllowed": false,
        "maxRetries": 0
      }
    },
    {
      "id": "step-003",
      "title": "Quick Check: True or False",
      "type": "true-false",
      "phase": "study",
      "durationSeconds": 180,
      "studentInstructions": "Alex, let's see what you've learned! Read the sentence below carefully. Is it grammatically correct? Tap TRUE or FALSE!",
      "ccqQuestions": [
        {
          "question": "How would you correct this sentence if it's wrong?",
          "answer": "Change the verb form and check the time expression.",
          "purpose": "Self-correction practice"
        }
      ],
      "speakingQuestions": [
        {
          "question": "Can you explain what mistake the sentence makes?",
          "level": "controlled"
        }
      ],
      "h5pActivity": {
        "type": "true-false",
        "statement": "'She has went to the market yesterday' is a correct sentence.",
        "correct": false,
        "trueFeedback": "Actually, this sentence has two errors! 'Has went' should be 'went' (wrong tense with 'yesterday') AND the past participle of 'go' is 'gone', not 'went'.",
        "falseFeedback": "Correct! The sentence is wrong because: (1) 'yesterday' requires Simple Past, and (2) the past participle of 'go' is 'gone', not 'went'. The correct sentence would be: 'She went to the market yesterday.'",
        "feedback": {
          "correctFeedback": "Well spotted! Can you correct the sentence out loud?",
          "incorrectFeedback": "Look carefully — there are actually TWO mistakes here!",
          "ccqQuestions": [
            {
              "question": "What's the past participle of 'go'?",
              "answer": "Gone! (not went)"
            },
            {
              "question": "Why can't we use 'has' with 'yesterday'?",
              "answer": "Because 'yesterday' is a finished time — we need Simple Past."
            }
          ]
        }
      },
      "gamification": {
        "points": 10,
        "retryAllowed": true,
        "maxRetries": 2
      }
    },
    {
      "id": "step-004",
      "title": "Vocabulary Hunt: Mark the Key Words",
      "type": "mark-the-words",
      "phase": "study",
      "durationSeconds": 240,
      "studentInstructions": "Alex, read the paragraph below about Maria's travels. Your job: click on ALL the present perfect time expressions (words like 'ever', 'never', 'already', 'yet', 'just', 'recently'). How many can you find?",
      "languageReference": {
        "vocabulary": [
          {
            "word": "ever",
            "definition": "at any time",
            "color": "#f59e0b"
          },
          {
            "word": "never",
            "definition": "not at any time",
            "color": "#ef4444"
          },
          {
            "word": "already",
            "definition": "before now",
            "color": "#10b981"
          },
          {
            "word": "yet",
            "definition": "up until now",
            "color": "#8b5cf6"
          },
          {
            "word": "just",
            "definition": "very recently",
            "color": "#06b6d4"
          },
          {
            "word": "recently",
            "definition": "not long ago",
            "color": "#f97316"
          }
        ]
      },
      "speakingQuestions": [
        {
          "question": "Make your own sentence using one of the highlighted words.",
          "level": "guided"
        },
        {
          "question": "Alex, have you ever wanted to travel alone like Maria?",
          "level": "free"
        }
      ],
      "h5pActivity": {
        "type": "mark-the-words",
        "text": "Maria has just returned from her travels. She has already visited fifteen countries and has never been disappointed. Have you ever wondered what it's like to travel alone? She says she hasn't felt lonely yet. She has recently started a travel blog and has already gained thousands of followers.",
        "correctWords": [
          "just",
          "already",
          "never",
          "ever",
          "yet",
          "recently"
        ],
        "feedback": {
          "correctFeedback": "You found all the time expressions! These are the key signal words for Present Perfect.",
          "incorrectFeedback": "Almost! Remember: ever, never, already, yet, just, and recently are the main present perfect time signals."
        }
      },
      "gamification": {
        "points": 20,
        "retryAllowed": true,
        "maxRetries": 2
      }
    },
    {
      "id": "step-005",
      "title": "Practice: Fill in the Blanks",
      "type": "fill-in-blanks",
      "phase": "speak",
      "durationSeconds": 300,
      "studentInstructions": "Alex, complete each sentence with the correct present perfect form. Type the missing word(s) in each blank. Use the hints if you need help!",
      "h5pActivity": {
        "type": "fill-in-blanks",
        "textWithBlanks": "1. I [blank0] never [blank1] Japanese food before — I'd love to try it!\n2. [blank2] you ever [blank3] a famous person? That must have been exciting!\n3. She [blank4] already [blank5] the report, so we can start the meeting.\n4. They [blank6] just [blank7] back from their honeymoon in Bali.\n5. We [blank8] not [blank9] the new manager yet — have you?",
        "blanks": [
          {
            "id": "blank0",
            "correct": [
              "have"
            ],
            "hint": "First person auxiliary"
          },
          {
            "id": "blank1",
            "correct": [
              "tried",
              "eaten"
            ],
            "hint": "Past participle of 'try' or 'eat'"
          },
          {
            "id": "blank2",
            "correct": [
              "Have"
            ],
            "hint": "Question auxiliary for 'you'"
          },
          {
            "id": "blank3",
            "correct": [
              "met"
            ],
            "hint": "Past participle of 'meet'"
          },
          {
            "id": "blank4",
            "correct": [
              "has"
            ],
            "hint": "Third person auxiliary"
          },
          {
            "id": "blank5",
            "correct": [
              "finished",
              "written",
              "completed"
            ],
            "hint": "Past participle"
          },
          {
            "id": "blank6",
            "correct": [
              "have"
            ],
            "hint": "Plural auxiliary"
          },
          {
            "id": "blank7",
            "correct": [
              "come",
              "returned",
              "flown"
            ],
            "hint": "Past participle"
          },
          {
            "id": "blank8",
            "correct": [
              "have"
            ],
            "hint": "Plural auxiliary"
          },
          {
            "id": "blank9",
            "correct": [
              "met",
              "seen"
            ],
            "hint": "Past participle of 'meet' or 'see'"
          }
        ],
        "caseSensitive": false,
        "showSolutionButton": true,
        "retryButton": true,
        "feedback": {
          "correctFeedback": "Excellent, Alex! All blanks correct. Your present perfect is spot on!",
          "incorrectFeedback": "Some blanks need attention. Check: 1) have/has agreement, 2) past participle form.",
          "languageNote": "Remember irregular verbs! go → gone, see → seen, meet → met, eat → eaten"
        }
      },
      "gamification": {
        "points": 25,
        "retryAllowed": true,
        "maxRetries": 3
      }
    },
    {
      "id": "step-006",
      "title": "Speaking Game: Memory Match",
      "type": "memory-game",
      "phase": "speak",
      "durationSeconds": 480,
      "studentInstructions": "Alex, match each emoji with its experience! When you find a match, make a 'Have you ever...?' question about it. Say it out loud!",
      "speakingQuestions": [
        {
          "question": "For each pair you match, say: 'Have you ever...?'",
          "level": "guided"
        },
        {
          "question": "Tell me about your own experience with the matched topic!",
          "level": "free"
        }
      ],
      "h5pActivity": {
        "type": "memory-game",
        "difficulty": "medium",
        "timerEnabled": true,
        "pairs": [
          {
            "id": "p1",
            "cardA": "🗼",
            "cardB": "visited the Eiffel Tower",
            "type": "text-text"
          },
          {
            "id": "p2",
            "cardA": "🦈",
            "cardB": "swum with sharks",
            "type": "text-text"
          },
          {
            "id": "p3",
            "cardA": "🎸",
            "cardB": "played a musical instrument",
            "type": "text-text"
          },
          {
            "id": "p4",
            "cardA": "🚂",
            "cardB": "ridden a sleeper train",
            "type": "text-text"
          },
          {
            "id": "p5",
            "cardA": "🌋",
            "cardB": "climbed a volcano",
            "type": "text-text"
          },
          {
            "id": "p6",
            "cardA": "🍣",
            "cardB": "eaten raw fish",
            "type": "text-text"
          },
          {
            "id": "p7",
            "cardA": "🎭",
            "cardB": "performed on stage",
            "type": "text-text"
          },
          {
            "id": "p8",
            "cardA": "🌌",
            "cardB": "seen the Northern Lights",
            "type": "text-text"
          }
        ],
        "feedback": {
          "correctFeedback": "Match! Now say 'Have you ever...?' with this experience!",
          "incorrectFeedback": "Not quite! Try to remember where those cards are."
        }
      },
      "gamification": {
        "points": 30,
        "retryAllowed": true,
        "maxRetries": 2
      }
    },
    {
      "id": "step-007",
      "title": "Explore: World Map Hotspots",
      "type": "image-hotspots",
      "phase": "speak",
      "durationSeconds": 360,
      "studentInstructions": "Alex, explore the map below! Click each hotspot to learn about a location, then make a 'Have you ever...?' question about it. You can also add your own hotspots — try adding a place YOU have visited!",
      "speakingQuestions": [
        {
          "question": "Which place would you most like to visit? Have you ever been close to it?",
          "level": "free"
        },
        {
          "question": "Say: 'I have always wanted to go there because...'",
          "level": "guided"
        }
      ],
      "h5pActivity": {
        "type": "image-hotspots",
        "imageUrl": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&q=80",
        "imageAlt": "World map showing travel destinations",
        "showSpeakingQuestion": "Have you ever visited any of these amazing places? Click to explore and talk about them!",
        "hotspots": [
          {
            "id": "h1",
            "x": 22,
            "y": 40,
            "label": "New York",
            "content": "The city that never sleeps! Have you ever walked across the Brooklyn Bridge or seen a Broadway show?",
            "icon": "🗽",
            "type": "info"
          },
          {
            "id": "h2",
            "x": 48,
            "y": 35,
            "label": "Paris",
            "content": "The city of light! Have you ever eaten a real French croissant or climbed the Eiffel Tower?",
            "icon": "🗼",
            "type": "info"
          },
          {
            "id": "h3",
            "x": 72,
            "y": 38,
            "label": "Tokyo",
            "content": "A city of contrasts! Have you ever tried authentic ramen or visited a Japanese temple?",
            "icon": "🏯",
            "type": "info"
          },
          {
            "id": "h4",
            "x": 55,
            "y": 65,
            "label": "Kenya",
            "content": "Wildlife paradise! Have you ever seen the Great Migration or been on a safari?",
            "icon": "🦁",
            "type": "info"
          },
          {
            "id": "h5",
            "x": 80,
            "y": 75,
            "label": "Australia",
            "content": "Down Under! Have you ever snorkelled on the Great Barrier Reef or held a koala?",
            "icon": "🦘",
            "type": "info"
          }
        ],
        "feedback": {
          "correctFeedback": "Great exploration! Now tell me about a place you have always dreamed of visiting.",
          "incorrectFeedback": "Keep exploring! Each hotspot has a speaking prompt for you."
        }
      },
      "gamification": {
        "points": 20,
        "retryAllowed": false,
        "maxRetries": 0
      }
    },
    {
      "id": "step-008",
      "title": "Spot the Difference: Before & After",
      "type": "spot-the-difference",
      "phase": "speak",
      "durationSeconds": 300,
      "studentInstructions": "Alex, compare these two images carefully! Click on the differences you spot in Image A. After each find, describe the difference using a present perfect sentence like: 'The bag has changed colour' or 'A new item has appeared.'",
      "speakingQuestions": [
        {
          "question": "How have YOU changed since you started learning English?",
          "level": "free"
        },
        {
          "question": "Describe each difference using 'has changed', 'has appeared', or 'has been removed'.",
          "level": "guided"
        }
      ],
      "h5pActivity": {
        "type": "spot-the-difference",
        "imageA": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80",
        "imageB": "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80",
        "differences": [
          {
            "id": "d1",
            "x": 30,
            "y": 25,
            "radius": 10,
            "description": "The backpack has changed colour from blue to red"
          },
          {
            "id": "d2",
            "x": 65,
            "y": 45,
            "radius": 10,
            "description": "A camera has appeared on the table"
          },
          {
            "id": "d3",
            "x": 50,
            "y": 70,
            "radius": 10,
            "description": "The sunglasses have been removed"
          },
          {
            "id": "d4",
            "x": 80,
            "y": 30,
            "radius": 10,
            "description": "A new plant has been added in the corner"
          },
          {
            "id": "d5",
            "x": 15,
            "y": 60,
            "radius": 10,
            "description": "The book cover has changed"
          }
        ],
        "timeLimit": 120,
        "feedback": {
          "correctFeedback": "Amazing eyes, Alex! You spotted all the differences! Now practice: 'How have you changed since last year?'",
          "incorrectFeedback": "Good effort! Compare both images section by section and use 'has changed' to describe what you see.",
          "speakingQuestions": [
            {
              "question": "How have YOU changed since you started learning English?",
              "level": "free"
            }
          ]
        }
      },
      "gamification": {
        "points": 25,
        "retryAllowed": true,
        "maxRetries": 2
      }
    },
    {
      "id": "step-009",
      "title": "Truth or Dare: Present Perfect",
      "type": "truth-or-dare",
      "phase": "speak",
      "durationSeconds": 600,
      "studentInstructions": "Alex, choose Truth or Dare! For Truth questions, answer honestly using the present perfect. For Dares, you'll need to speak or perform using the target language. Press SPIN to get your card!",
      "h5pActivity": {
        "type": "truth-or-dare",
        "items": [
          {
            "type": "truth",
            "text": "Have you ever lied to get out of trouble? What happened?",
            "targetLanguage": "I have (never)..."
          },
          {
            "type": "truth",
            "text": "What's the most embarrassing thing you have ever done in public?",
            "targetLanguage": "The most embarrassing thing I have ever done is..."
          },
          {
            "type": "dare",
            "text": "Describe your dream holiday using 5 present perfect sentences!",
            "targetLanguage": "I have always dreamed of... / I have never been to..."
          },
          {
            "type": "truth",
            "text": "Have you ever eaten something really strange? What was it?",
            "targetLanguage": "Yes, I have eaten... / No, I have never..."
          },
          {
            "type": "dare",
            "text": "Interview me: ask 3 'Have you ever...?' questions and report back!",
            "targetLanguage": "He/She has (never)..."
          },
          {
            "type": "truth",
            "text": "What's the most amazing place you have ever visited?",
            "targetLanguage": "The most amazing place I have ever visited is..."
          },
          {
            "type": "dare",
            "text": "Make up a story about an adventure you WISH you had been on!",
            "targetLanguage": "I have always wanted to... / I have never had the chance to..."
          },
          {
            "type": "truth",
            "text": "Have you ever made a really big mistake? What have you learned from it?",
            "targetLanguage": "I have learned that... / Since then, I have..."
          }
        ],
        "feedback": {
          "correctFeedback": "Great use of present perfect! Tell me more details!",
          "incorrectFeedback": "Try again with the target language structure shown below the card."
        }
      },
      "gamification": {
        "points": 30,
        "retryAllowed": false,
        "maxRetries": 0
      }
    },
    {
      "id": "step-010",
      "title": "Review: Drag the Words",
      "type": "drag-the-words",
      "phase": "review",
      "durationSeconds": 300,
      "studentInstructions": "Alex, drag the correct words from the word bank to complete each present perfect sentence. Think about which word fits in each gap!",
      "h5pActivity": {
        "type": "drag-the-words",
        "textWithPlaceholders": "1. I [drag] never [drag] sushi before this trip.\n2. [drag] you ever [drag] a famous person?\n3. She [drag] already [drag] all her homework.\n4. We [drag] just [drag] the most amazing news!",
        "words": [
          {
            "id": "w1",
            "word": "have",
            "correctPosition": 1
          },
          {
            "id": "w2",
            "word": "eaten",
            "correctPosition": 2
          },
          {
            "id": "w3",
            "word": "Have",
            "correctPosition": 3
          },
          {
            "id": "w4",
            "word": "met",
            "correctPosition": 4
          },
          {
            "id": "w5",
            "word": "has",
            "correctPosition": 5
          },
          {
            "id": "w6",
            "word": "finished",
            "correctPosition": 6
          },
          {
            "id": "w7",
            "word": "have",
            "correctPosition": 7
          },
          {
            "id": "w8",
            "word": "heard",
            "correctPosition": 8
          }
        ],
        "feedback": {
          "correctFeedback": "Perfect placement, Alex! You've mastered the present perfect structure!",
          "incorrectFeedback": "Check the structure: subject + have/has + past participle",
          "languageNote": "Remember irregular past participles: eat → eaten, meet → met, hear → heard"
        }
      },
      "gamification": {
        "points": 20,
        "retryAllowed": true,
        "maxRetries": 3
      }
    },
    {
      "id": "step-011",
      "title": "Review: Flashcard Drill",
      "type": "flashcards",
      "phase": "review",
      "durationSeconds": 420,
      "studentInstructions": "Alex, let's drill those irregular verbs! Look at the base form, guess the past participle, then flip to check. Mark each card as 'Got It' or 'Still Learning'. Make a sentence with each one!",
      "h5pActivity": {
        "type": "flashcards",
        "shuffle": true,
        "spacedRepetition": true,
        "ttsEnabled": true,
        "cards": [
          {
            "id": "fc1",
            "front": "go",
            "back": "gone\n'Have you ever gone skydiving?'",
            "category": "irregular verbs"
          },
          {
            "id": "fc2",
            "front": "see",
            "back": "seen\n'I have seen that film three times!'",
            "category": "irregular verbs"
          },
          {
            "id": "fc3",
            "front": "eat",
            "back": "eaten\n'She has never eaten octopus.'",
            "category": "irregular verbs"
          },
          {
            "id": "fc4",
            "front": "meet",
            "back": "met\n'Have you met the new teacher?'",
            "category": "irregular verbs"
          },
          {
            "id": "fc5",
            "front": "write",
            "back": "written\n'I have written 10 emails today!'",
            "category": "irregular verbs"
          },
          {
            "id": "fc6",
            "front": "speak",
            "back": "spoken\n'Have you ever spoken in public?'",
            "category": "irregular verbs"
          },
          {
            "id": "fc7",
            "front": "fly",
            "back": "flown\n'They have flown to 20 countries!'",
            "category": "irregular verbs"
          },
          {
            "id": "fc8",
            "front": "drive",
            "back": "driven\n'He has never driven a sports car.'",
            "category": "irregular verbs"
          },
          {
            "id": "fc9",
            "front": "swim",
            "back": "swum\n'Have you ever swum in the ocean?'",
            "category": "irregular verbs"
          },
          {
            "id": "fc10",
            "front": "choose",
            "back": "chosen\n'She has chosen her university.'",
            "category": "irregular verbs"
          }
        ],
        "feedback": {
          "correctFeedback": "You know your irregular verbs, Alex! Keep practising with the ones you marked as 'still learning'.",
          "incorrectFeedback": "Don't worry — irregular verbs take time! The key is regular practice.",
          "speakingQuestions": [
            {
              "question": "Make your own sentence using any past participle you learned today.",
              "level": "free"
            }
          ]
        }
      },
      "gamification": {
        "points": 15,
        "retryAllowed": true,
        "maxRetries": 5
      }
    },
    {
      "id": "step-012",
      "title": "Reflection: Word Cloud",
      "type": "word-cloud",
      "phase": "review",
      "durationSeconds": 180,
      "studentInstructions": "Alex, what words come to mind when you think about today's lesson on the Present Perfect? Submit 3 words that represent your learning today!",
      "h5pActivity": {
        "type": "word-cloud",
        "prompt": "What words do you associate with the Present Perfect tense? Submit your top 3!",
        "seedWords": [
          "have",
          "has",
          "ever",
          "never",
          "already",
          "yet",
          "just",
          "experience",
          "past participle"
        ],
        "maxSubmissions": 3,
        "feedback": {
          "correctFeedback": "Great reflection! Look at the cloud — which word stands out most to you?",
          "incorrectFeedback": "Think about the grammar, vocabulary, and experiences from today's lesson!",
          "speakingQuestions": [
            {
              "question": "Which word best describes today's lesson for you? Why?",
              "level": "free"
            }
          ]
        }
      },
      "gamification": {
        "points": 10,
        "retryAllowed": false,
        "maxRetries": 0
      }
    },
    {
      "id": "step-013",
      "title": "Speak: Audio Discussion",
      "type": "audio-discussion",
      "phase": "speak",
      "durationSeconds": 420,
      "studentInstructions": "Alex, record your spoken answers to the discussion prompts. Use 'Have you ever...?' and the time expressions from today's lesson. Listen back and improve your pronunciation!",
      "speakingQuestions": [
        {
          "question": "Describe one experience you have never told anyone in class!",
          "level": "free"
        }
      ],
      "h5pActivity": {
        "type": "audio-discussion",
        "instructions": "Listen to each prompt, record a spoken answer (20–40 seconds), and try to use at least one time expression: ever, never, already, yet, just.",
        "prompts": [
          {
            "id": "ap1",
            "text": "What is the most exciting thing you have ever done?",
            "hint": "Use the present perfect: 'The most exciting thing I have ever done is...'",
            "usefulLanguage": ["The most exciting thing I have ever done is…", "I have never…", "It was amazing!"]
          },
          {
            "id": "ap2",
            "text": "Have you already finished something today that you planned to do? What?",
            "hint": "Use 'already' or 'just' in your answer.",
            "usefulLanguage": ["I have already…", "I have just…", "I haven't… yet."]
          },
          {
            "id": "ap3",
            "text": "Tell us about a place you have never visited but really want to go.",
            "hint": "Say why with 'because' and one future plan.",
            "usefulLanguage": ["I have never visited…", "I really want to…", "One day I will…"]
          }
        ],
        "sampleOpinions": [
          { "speaker": "Mina, B1", "text": "The most exciting thing I have ever done is skydiving in Switzerland. I have never been so scared in my life, but I have already booked my next jump!" },
          { "speaker": "Tom, B1", "text": "I have just finished my homework, and I have already planned to watch a film tonight. I haven't visited Japan yet, but one day I will." }
        ],
        "feedback": {
          "correctFeedback": "Excellent speaking! You used the present perfect naturally.",
          "incorrectFeedback": "Try again — remember: have/has + past participle!"
        }
      },
      "gamification": {
        "points": 15,
        "retryAllowed": true,
        "maxRetries": 2
      }
    },
    {
      "id": "step-014",
      "title": "Team Challenge: Timed Quiz",
      "type": "team-quiz",
      "phase": "review",
      "durationSeconds": 480,
      "studentInstructions": "Alex, play as a team (or solo vs the clock)! Answer each question before the timer runs out. Every correct answer scores for your team!",
      "h5pActivity": {
        "type": "team-quiz",
        "instructions": "Answer quickly! Each question is worth 10 points. Discuss with your team before the buzzer!",
        "secondsPerQuestion": 20,
        "questions": [
          {
            "id": "tq1",
            "question": "Which sentence is correct?",
            "points": 10,
            "choices": [
              { "id": "tq1a", "text": "I have seen that film yesterday.", "correct": false },
              { "id": "tq1b", "text": "I saw that film yesterday.", "correct": true },
              { "id": "tq1c", "text": "I have saw that film.", "correct": false }
            ]
          },
          {
            "id": "tq2",
            "question": "Complete: '____ you ever eaten sushi?'",
            "points": 10,
            "choices": [
              { "id": "tq2a", "text": "Did", "correct": false },
              { "id": "tq2b", "text": "Have", "correct": true },
              { "id": "tq2c", "text": "Are", "correct": false }
            ]
          },
          {
            "id": "tq3",
            "question": "Which time expression goes with the present perfect?",
            "points": 10,
            "choices": [
              { "id": "tq3a", "text": "yesterday", "correct": false },
              { "id": "tq3b", "text": "last year", "correct": false },
              { "id": "tq3c", "text": "already", "correct": true }
            ]
          },
          {
            "id": "tq4",
            "question": "What is the past participle of 'go'?",
            "points": 10,
            "choices": [
              { "id": "tq4a", "text": "went", "correct": false },
              { "id": "tq4b", "text": "gone", "correct": true },
              { "id": "tq4c", "text": "goed", "correct": false }
            ]
          },
          {
            "id": "tq5",
            "question": "Choose the correct sentence:",
            "points": 10,
            "choices": [
              { "id": "tq5a", "text": "She has just finished her homework.", "correct": true },
              { "id": "tq5b", "text": "She has just finish her homework.", "correct": false },
              { "id": "tq5c", "text": "She just has finished her homework yesterday.", "correct": false }
            ]
          }
        ],
        "feedback": {
          "correctFeedback": "Correct! Your team scores!",
          "incorrectFeedback": "Not this time — discuss it and come back stronger!",
          "languageNote": "Remember: finished time (yesterday, last year) = simple past. unfinished time (ever, already, yet) = present perfect."
        }
      },
      "gamification": {
        "points": 25,
        "retryAllowed": true,
        "maxRetries": 3
      }
    }
  ]
} as unknown as LiveLessonManual;

export default rawLesson;
