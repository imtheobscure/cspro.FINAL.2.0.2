import { EslRound } from './types';

export const DEFAULT_ROUNDS: EslRound[] = [
  {
    id: 1,
    name: "Big Ben & The Houses of Parliament",
    lat: 51.500729,
    lng: -0.124625,
    tourGuideText: "Good morning! You're currently exploring a massive, iconic clock tower that has chimed for kings and queens. Below it, the River flows steadily. Look closely at the Gothic architecture decorating the government buildings. Do you know where we are standing?",
    thingsToTry: [
      "Ask a guard for directions to the nearest subway station.",
      "Order a traditional Sunday roast at a nearby historic pub.",
      "Debate a current event as if you were an MP."
    ],
    vocabulary: [
      { word: "Iconic", definition: "Well-known, recognized as a symbol of something.", example: "The clock tower is an iconic symbol of the city." },
      { word: "Gothic", definition: "A style of architecture characterized by pointed arches and intricate details.", example: "The parliament building is famous for its Gothic design." },
      { word: "Parliament", definition: "A group of elected politicians who make laws for their country.", example: "They debated the new law in parliament." }
    ],
    grammarChallenge: "Identify the present continuous tense in the text ('You're currently exploring...'). Why is it used here instead of the simple present?",
    food: "Fish and Chips, Sunday Roast, Afternoon Tea",
    culture: "Politeness, queuing in straight lines, classic pub culture",
    clothes: "Smart casual; locals often carry umbrellas or wear trench coats due to unpredictable rain.",
    taboos: "Jumping the queue (line-cutting), standing on the left side of escalators on the Tube.",
    phraseBook: [
      { phrase: "Cheers!", translation: "Thank you / Goodbye / Bottoms up!" },
      { phrase: "Mind the gap", translation: "Watch your step when boarding the train" }
    ]
  },
  {
    id: 2,
    name: "The Colosseum",
    lat: 41.8902,
    lng: 12.4922,
    tourGuideText: "Welcome! Today we are visiting a spectacular ancient amphitheater. Imagine gladiators battling in the center while thousands of spectators cheered. The stone arches have stood for nearly two thousand years! Can you guess this historic wonder?",
    thingsToTry: [
      "Order a gelato in Italian.",
      "Ask for the nearest water fountain ('nasone').",
      "Describe the gladiatorial games using past tense."
    ],
    vocabulary: [
      { word: "Amphitheater", definition: "An open, circular building with rising rows of seats.", example: "We sat in the amphitheater to watch the show." },
      { word: "Spectators", definition: "People who watch an event, especially a sports event.", example: "The spectators cheered when the team scored." },
      { word: "Ancient", definition: "Belonging to the very distant past.", example: "We explored the ancient ruins in the city center." }
    ],
    grammarChallenge: "Analyze the sentence 'The stone arches have stood for nearly two thousand years'. What tense is 'have stood' and why is it appropriate?",
    food: "Pasta Carbonara, Gelato, Espresso",
    culture: "La dolce vita, family-centric meals, expressive hand gestures",
    clothes: "Stylish, generally modest especially when entering churches.",
    taboos: "Ordering a cappuccino after 11 AM, eating on the steps of monuments.",
    phraseBook: [
      { phrase: "Ciao", translation: "Hello / Goodbye" },
      { phrase: "Per favore", translation: "Please" },
      { phrase: "Grazie mille", translation: "Thank you very much" }
    ]
  },
  {
    id: 3,
    name: "Eiffel Tower",
    lat: 48.8584,
    lng: 2.2945,
    tourGuideText: "Bonjour! Look up at this magnificent iron lattice structure piercing the sky. It was originally built for a World's Fair and many locals hated it at first. Now, it sparkles brilliantly every night and is a symbol of romance. Where are we?",
    thingsToTry: [
      "Order a croissant and coffee from a local bakery.",
      "Politely greet a shop owner before asking a question.",
      "Describe the view from the top using comparative adjectives."
    ],
    vocabulary: [
      { word: "Lattice", definition: "An interlaced structure or pattern.", example: "The iron lattice made the tower strong but light." },
      { word: "Magnificent", definition: "Extremely beautiful, elaborate, or impressive.", example: "The view from the top was truly magnificent." },
      { word: "Romance", definition: "A feeling of excitement and mystery associated with love.", example: "The city is famous for its atmosphere of romance." }
    ],
    grammarChallenge: "Find the passive voice in the text ('It was originally built...'). Why is passive voice used here instead of active?",
    food: "Baguette, Croissant, Macarons, Escargot",
    culture: "Cafe culture, deep appreciation for art and high fashion",
    clothes: "Chic, tailored, often accessorized with scarves.",
    taboos: "Not greeting with 'Bonjour' when entering a shop, rushing through meals.",
    phraseBook: [
      { phrase: "Bonjour", translation: "Hello / Good morning" },
      { phrase: "Merci beaucoup", translation: "Thank you very much" },
      { phrase: "Où sont les toilettes?", translation: "Where are the restrooms?" }
    ]
  },
  {
    id: 4,
    name: "Times Square",
    lat: 40.7580,
    lng: -73.9855,
    tourGuideText: "Wow, it is so bright here! You are standing in a bustling intersection surrounded by massive, glowing digital billboards. Yellow taxis speed by, and Broadway theaters are just down the street. Which vibrant crossroad is this?",
    thingsToTry: [
      "Successfully hail a yellow taxi using English.",
      "Order a slice of pizza and fold it to eat.",
      "Describe the busy atmosphere using vivid adjectives."
    ],
    vocabulary: [
      { word: "Bustling", definition: "Moving about energetically and busily.", example: "The narrow streets were bustling with tourists." },
      { word: "Billboards", definition: "Large outdoor boards for displaying advertisements.", example: "The bright billboards lit up the night sky." },
      { word: "Intersection", definition: "A point where two or more roads meet or cross.", example: "We waited at the intersection for the light to change." }
    ],
    grammarChallenge: "Identify the adverbs in 'Yellow taxis speed by'. How would the sentence change if you used an adjective instead?",
    food: "New York Slice Pizza, Bagels, Halal Cart Chicken & Rice",
    culture: "Fast-paced, highly ambitious, culturally diverse melting pot",
    clothes: "Urban streetwear, business casual, comfortable walking shoes.",
    taboos: "Stopping suddenly in the middle of the sidewalk, blocking subway car doors.",
    phraseBook: [
      { phrase: "Fuggedaboutit", translation: "Forget about it / Don't worry about it" },
      { phrase: "The City", translation: "Refers specifically to Manhattan" }
    ]
  },
  {
    id: 5,
    name: "Shibuya Crossing",
    lat: 35.6595,
    lng: 139.7001,
    tourGuideText: "Welcome to the organized chaos. When the traffic lights turn red for vehicles, thousands of people cross the street gracefully from all directions at the exact same time. It happens right outside a busy railway station. Where are you?",
    thingsToTry: [
      "Navigate the crowds without bumping into anyone.",
      "Politely excuse yourself if you accidentally block someone's path.",
      "Order a bowl of ramen from a vending machine."
    ],
    vocabulary: [
      { word: "Chaos", definition: "Complete disorder and confusion.", example: "During the festival, the streets were pure chaos." },
      { word: "Gracefully", definition: "In an attractively elegant way.", example: "The dancers moved gracefully across the stage." },
      { word: "Organized", definition: "Arranged in a systematic way, especially on a large scale.", example: "The event was very organized and ran smoothly." }
    ],
    grammarChallenge: "What function does 'when' serve in the sentence 'When the traffic lights turn red...'? Is it a preposition or a conjunction?",
    food: "Sushi, Ramen, Tempura, Takoyaki",
    culture: "Respect, social harmony (wa), extreme punctuality",
    clothes: "Neat, conservative, easy-to-remove slip-on shoes for indoors.",
    taboos: "Tipping at restaurants, talking loudly on public trains.",
    phraseBook: [
      { phrase: "Arigatou gozaimasu", translation: "Thank you (polite)" },
      { phrase: "Sumimasen", translation: "Excuse me / I'm sorry" }
    ]
  },
  {
    id: 6,
    name: "Sydney Opera House",
    lat: -33.8568,
    lng: 151.2153,
    tourGuideText: "G'day! Look at the stunning white roof designed to look like the sails of a ship. It sits beautifully by the harbor waters. Ferries frequently pass by this majestic performing arts center down under. Can you guess where this is?",
    thingsToTry: [
      "Greet a local using friendly, informal English.",
      "Buy a ticket for an evening performance.",
      "Describe the architecture using nautical terms."
    ],
    vocabulary: [
      { word: "Stunning", definition: "Extremely impressive or attractive.", example: "The view of the harbor was absolutely stunning." },
      { word: "Nautical", definition: "Concerning navigation, sailors, or the sea.", example: "The restaurant had a nautical theme with anchors on the walls." },
      { word: "Majestic", definition: "Having or showing impressive beauty or dignity.", example: "The majestic mountains rose in the distance." }
    ],
    grammarChallenge: "Explain the use of 'down under' in the text. Is it a geographical term, an idiom, or both?",
    food: "Meat pies, Vegemite on toast, BBQ sausages",
    culture: "Laid-back, outdoorsy, strong beach culture",
    clothes: "Very casual, surf-wear during the day, smart casual for dining.",
    taboos: "Being overly formal in casual settings, not 'shouting' (buying) a round of drinks when it's your turn.",
    phraseBook: [
      { phrase: "G'day mate", translation: "Hello friend" },
      { phrase: "No worries", translation: "It's fine / You're welcome" }
    ]
  },
  {
    id: 7,
    name: "Christ the Redeemer",
    lat: -22.9519,
    lng: -43.2105,
    tourGuideText: "Wow! You are standing on a high mountain peak looking up at a massive Art Deco statue with spreading arms. In the distance below, you see beautiful beaches, dense forests, and a vibrant city ready for Carnival. Where is this view?",
    thingsToTry: [
      "Describe the panoramic view using prepositions of place.",
      "Ask a friendly stranger to take your photo.",
      "Order a cold fresh juice on the beach."
    ],
    vocabulary: [
      { word: "Massive", definition: "Large and heavy or solid.", example: "They built a massive monument on top of the hill." },
      { word: "Panoramic", definition: "With a wide view surrounding the observer.", example: "We enjoyed a panoramic view of the entire valley." },
      { word: "Vibrant", definition: "Full of energy and enthusiasm.", example: "The city has a vibrant nightlife." }
    ],
    grammarChallenge: "Find the present participle verbs used as adjectives in the text (e.g., 'spreading'). How do they change the noun?",
    food: "Feijoada, Pão de Queijo, Açaí bowls",
    culture: "Carnival, samba music, football passion, vibrant joy",
    clothes: "Beachwear, colourful fabrics, light adapting clothes.",
    taboos: "Wearing beachwear far away from the beach, making the \"OK\" hand sign (offensive).",
    phraseBook: [
      { phrase: "Tudo bem?", translation: "How are you? / All good?" },
      { phrase: "Obrigado/a", translation: "Thank you (male/female)" }
    ]
  },
  {
    id: 8,
    name: "Great Pyramid of Giza",
    lat: 29.9792,
    lng: 31.1342,
    tourGuideText: "It is incredibly hot and dusty here! You are looking at one of the Seven Wonders of the Ancient World. These massive stone tombs were built for pharaohs thousands of years ago in the desert sand. Which monumental site is this?",
    thingsToTry: [
      "Bargain respectfully for a souvenir in the market.",
      "Describe the heat and desert environment to a friend.",
      "Ask questions about ancient history using 'Did' and 'Was'."
    ],
    vocabulary: [
      { word: "Tombs", definition: "A large vault, typically underground, for burying the dead.", example: "The pharaohs were buried in massive stone tombs." },
      { word: "Monumental", definition: "Great in importance, extent, or size.", example: "Building the pyramids was a monumental task." },
      { word: "Bargain", definition: "Negotiate the terms and conditions of a transaction.", example: "I had to bargain with the shopkeeper for a lower price." }
    ],
    grammarChallenge: "Identify the superlative adjective in the phrase 'one of the Seven Wonders'. How would you form the comparative version?",
    food: "Koshary, Ful Medames, Shawarma",
    culture: "Hospitality, rich ancient history woven with Islamic traditions",
    clothes: "Modest attire, covering shoulders and knees out of respect.",
    taboos: "Showing the soles of your feet to someone, public displays of affection.",
    phraseBook: [
      { phrase: "Shukran", translation: "Thank you" },
      { phrase: "As-salamu alaykum", translation: "Peace be upon you (Hello)" }
    ]
  },
  {
    id: 9,
    name: "Taj Mahal",
    lat: 27.1751,
    lng: 78.0421,
    tourGuideText: "Namaste! You are standing before a breathtaking white marble mausoleum. It was built by an emperor as an act of eternal love for his favorite wife. Notice the perfectly symmetrical gardens reflecting in the water. Can you guess this romantic masterpiece?",
    thingsToTry: [
      "Describe the feelings of love and sorrow using advanced adjectives.",
      "Politely request the rules for entering a sacred building.",
      "Ask about the ingredients in a local spicy dish."
    ],
    vocabulary: [
      { word: "Mausoleum", definition: "A stately or impressive building housing a tomb or group of tombs.", example: "The king built a grand mausoleum for his queen." },
      { word: "Symmetrical", definition: "Made up of exactly similar parts facing each other.", example: "The gardens were designed to be perfectly symmetrical." },
      { word: "Eternal", definition: "Lasting or existing forever.", example: "The poem was about eternal love." }
    ],
    grammarChallenge: "Identify the word 'perfectly' in the text. Is it an adjective or an adverb? What word does it modify?",
    food: "Petha, Mughlai curry, Samosas, Chai",
    culture: "Deeply spiritual, bustling daily life, extreme hospitality to guests",
    clothes: "Modest clothing, sarees for women, kurtas.",
    taboos: "Eating food with your left hand, entering temples with shoes on.",
    phraseBook: [
      { phrase: "Namaste", translation: "Hello / I bow to you" },
      { phrase: "Dhanyavad", translation: "Thank you" }
    ]
  },
  {
    id: 10,
    name: "Table Mountain",
    lat: -33.9628,
    lng: 18.4098,
    tourGuideText: "Hello! You've just taken a rotating cable car up to a flat-topped peak. From up here, you can see a vibrant coastal city, the meeting place of two oceans, and perhaps some clouds rolling over the edge like a 'tablecloth'. Where are you?",
    thingsToTry: [
      "Describe the weather conditions changing rapidly.",
      "Ask a guide about the local flora and fauna.",
      "Order local grilled meats at a 'braai'."
    ],
    vocabulary: [
      { word: "Rotating", definition: "Moving in a circle around an axis or center.", example: "We took the rotating cable car up the mountain." },
      { word: "Coastal", definition: "Of, relating to, or near a coast.", example: "They lived in a beautiful coastal town." },
      { word: "Flora", definition: "The plants of a particular region, habitat, or geological period.", example: "The guide explained the unique flora of the mountain." }
    ],
    grammarChallenge: "Analyze the metaphor 'clouds rolling over the edge like a tablecloth'. What two things are being compared?",
    food: "Braai (BBQ meats), Biltong, Bobotie, Gatsby sandwich",
    culture: "Rainbow nation, outdoor adventures, diverse heritage",
    clothes: "Relaxed, layered clothing to adapt to sudden wind or temperature changes.",
    taboos: "Rushing into a conversation without saying hello properly first.",
    phraseBook: [
      { phrase: "Howzit", translation: "How are you? / Hello" },
      { phrase: "Lekker", translation: "Great / Nice / Tasty" }
    ]
  }
];
