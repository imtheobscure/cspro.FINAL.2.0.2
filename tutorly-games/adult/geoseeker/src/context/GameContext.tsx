/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { Player, EslRound, EslGameConfig, EslGameState, PlayerGuess } from '../types';
import { DEFAULT_ROUNDS } from '../defaultRounds';

interface GameContextType {
  gameState: EslGameState;
  activeGuess: { lat: number; lng: number } | null;
  setActiveGuess: (loc: { lat: number; lng: number } | null) => void;
  addPlayer: (name: string, customAvatar?: string) => void;
  removePlayer: (id: string) => void;
  updateConfig: (config: Partial<EslGameConfig>) => void;
  startEslGame: (customRounds?: EslRound[]) => void;
  recordActivePlayerGuess: (skipped?: boolean) => void;
  skipActivePlayerGuess: () => void;
  setActivePlayerForGuess: (index: number) => void;
  revealNextClue: () => void;
  revealEslRound: () => void;
  nextEslRound: () => void;
  resetCampaign: () => void;
  loadCustomRounds: (jsonText: string) => { success: boolean; error?: string };
  getCurrentPrompt: () => string;
  getTeachersGuidePrompt: () => string;
  getDistanceKm: (lat1: number, lon1: number, lat2: number, lng2: number) => number;
  getCluesForRound: (round: EslRound) => { category: string; text: string }[];
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Helper: Calculate Distance (Haversine)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const INITIAL_CONFIG: EslGameConfig = {
  cefrLevel: 'B1',
  learnerBackground: 'Spanish speakers, interest in travel',
  placeOfLiving: 'Madrid, Spain',
  customRegionName: 'Global'
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<EslGameState>({
    players: [],
    config: INITIAL_CONFIG,
    status: 'setup',
    rounds: DEFAULT_ROUNDS,
    currentRoundIndex: 0,
    activePlayerIndexForGuess: null,
    roundStartedAt: null,
    currentClueIndex: 0
  });

  const [activeGuess, setActiveGuess] = useState<{ lat: number; lng: number } | null>(null);

  const addPlayer = (name: string, customAvatar?: string) => {
    if (!name.trim()) return;
    setGameState(prev => {
      const newPlayer: Player = {
        id: 'player_' + Date.now() + Math.random().toString(36).substring(2, 5),
        name: name.trim(),
        guesses: [],
        totalDistance: 0,
        score: 0,
        avatar: customAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}&colors=sky,emerald,amber,rose,fuchsia`
      };
      return {
        ...prev,
        players: [...prev.players, newPlayer]
      };
    });
  };

  const removePlayer = (id: string) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== id)
    }));
  };

  const updateConfig = (newConfig: Partial<EslGameConfig>) => {
    setGameState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig }
    }));
  };

  const startEslGame = (customRounds?: EslRound[]) => {
    setGameState(prev => {
      const selectedRounds = customRounds || prev.rounds;
      // Reset players' guess records
      const resetPlayers = prev.players.map(p => ({
        ...p,
        guesses: [],
        totalDistance: 0,
        score: 0
      }));
      return {
        ...prev,
        status: 'playing',
        players: resetPlayers,
        rounds: selectedRounds,
        currentRoundIndex: 0,
        activePlayerIndexForGuess: resetPlayers.length > 0 ? 0 : null,
        roundStartedAt: Date.now(),
        currentClueIndex: 0
      };
    });
    setActiveGuess(null);
  };

  const recordActivePlayerGuess = (skipped = false) => {
    if (gameState.status !== 'playing') return;
    if (gameState.activePlayerIndexForGuess === null) return;
    
    const roundIndex = gameState.currentRoundIndex;
    const currentRound = gameState.rounds[roundIndex];

    let distance = Number.MAX_VALUE;
    let gainedPoints = 0;
    const timeElapsedSeconds = gameState.roundStartedAt ? (Date.now() - gameState.roundStartedAt) / 1000 : 0;

    if (!skipped && activeGuess) {
      distance = getDistanceFromLatLonInKm(
        activeGuess.lat,
        activeGuess.lng,
        currentRound.lat,
        currentRound.lng
      );

      // Points Scoring structure
      gainedPoints = 50;
      if (distance < 50) gainedPoints = 1200;
      else if (distance < 100) gainedPoints = 1000;
      else if (distance < 500) gainedPoints = 750;
      else if (distance < 1500) gainedPoints = 500;
      else if (distance < 4000) gainedPoints = 250;
      else if (distance < 8000) gainedPoints = 100;

      // Time Bonus (Max 500 points, loses points slowly over 180 seconds / 3 minutes)
      const timeBonus = Math.max(0, 500 - Math.floor(timeElapsedSeconds * 2.78));
      gainedPoints += timeBonus;

      // Clue Penalty (Lose 10% per clue revealed)
      const clueMultiplier = Math.max(0.1, 1 - ((gameState.currentClueIndex || 0) * 0.10));
      gainedPoints = Math.floor(gainedPoints * clueMultiplier);
    }

    setGameState(prev => {
      const updatedPlayers = prev.players.map((p, idx) => {
        if (idx === prev.activePlayerIndexForGuess) {
          const newGuess: PlayerGuess = {
            roundIndex,
            lat: skipped ? 0 : activeGuess?.lat || 0,
            lng: skipped ? 0 : activeGuess?.lng || 0,
            distance: skipped ? Number.MAX_VALUE : distance,
            timeElapsedSeconds,
            skipped
          };
          const guesses = [...p.guesses];
          guesses[roundIndex] = newGuess;
          return {
            ...p,
            guesses,
            totalDistance: p.totalDistance + (skipped ? 0 : distance),
            score: p.score + gainedPoints
          };
        }
        return p;
      });

      // Find next player who hasn't guessed for this round
      const nextPlayerIdx = updatedPlayers.findIndex(
        (p) => !p.guesses[roundIndex]
      );

      return {
        ...prev,
        players: updatedPlayers,
        activePlayerIndexForGuess: nextPlayerIdx !== -1 ? nextPlayerIdx : null
      };
    });

    setActiveGuess(null);
  };

  const skipActivePlayerGuess = () => {
    recordActivePlayerGuess(true);
  };

  const setActivePlayerForGuess = (index: number) => {
    setGameState(prev => ({ ...prev, activePlayerIndexForGuess: index }));
    setActiveGuess(null);
  };

  const revealNextClue = () => {
    setGameState(prev => {
      // We always have exactly 10 levels of progressive clues
      const maxClues = 10;
      if ((prev.currentClueIndex || 0) < maxClues - 1) {
        return { ...prev, currentClueIndex: (prev.currentClueIndex || 0) + 1 };
      }
      return prev;
    });
  };

  const revealEslRound = () => {
    setGameState(prev => {
      const roundIndex = prev.currentRoundIndex;
      const currentRound = prev.rounds[roundIndex];

      // Give 200 pts bonus to player closest in this round
      let closestPlayerIdx = -1;
      let minDistance = Infinity;

      prev.players.forEach((p, idx) => {
        const guess = p.guesses[roundIndex];
        if (guess && guess.distance < minDistance) {
          minDistance = guess.distance;
          closestPlayerIdx = idx;
        }
      });

      const updatedPlayers = prev.players.map((p, idx) => {
        if (idx === closestPlayerIdx && closestPlayerIdx !== -1) {
          return { ...p, score: p.score + 200 };
        }
        return p;
      });

      return {
        ...prev,
        players: updatedPlayers,
        status: 'revealed'
      };
    });
  };

  const nextEslRound = () => {
    setGameState(prev => {
      const nextIdx = prev.currentRoundIndex + 1;
      if (nextIdx >= prev.rounds.length) {
        return {
          ...prev,
          status: 'campaign_finished',
          activePlayerIndexForGuess: null,
          roundStartedAt: null
        };
      }
      return {
        ...prev,
        status: 'playing',
        currentRoundIndex: nextIdx,
        activePlayerIndexForGuess: prev.players.length > 0 ? 0 : null,
        roundStartedAt: Date.now(),
        currentClueIndex: 0
      };
    });
    setActiveGuess(null);
  };

  const resetCampaign = () => {
    setGameState(prev => ({
      ...prev,
      status: 'setup',
      currentRoundIndex: 0,
      activePlayerIndexForGuess: null,
      players: prev.players.map(p => ({
        ...p,
        guesses: [],
        totalDistance: 0,
        score: 0
      }))
    }));
    setActiveGuess(null);
  };

  const loadCustomRounds = (jsonText: string): { success: boolean; error?: string } => {
    try {
      // Basic cleaning in case there are markdown markers
      let cleanJson = jsonText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```json/i, '').replace(/```$/, '').trim();
      }

      // 1. Smart Cleanup: Remove trailing commas in arrays and objects which are invalid in JSON
      cleanJson = cleanJson.replace(/,(\s*[\]}])/g, '$1');

      // 2. Smart Cleanup: Convert JS/Python-style single-quoted keys to valid standard double-quoted keys
      // e.g., 'name': or 'id': to "name": or "id":
      cleanJson = cleanJson.replace(/('(\w+)'\s*:)/g, '"$2":');

      // 3. Smart Cleanup: Convert simple single-quoted string values to valid double-quoted string values
      // e.g. : 'Paris', to : "Paris",
      cleanJson = cleanJson.replace(/:\s*'([^'\n\r]*?)'\s*([,}\]])/g, ': "$1"$2');

      // 4. Perform check and try standard parsing
      let parsed;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (err: any) {
        let helpHint = err.message || 'JSON formatting error.';
        if (cleanJson.includes("'")) {
          helpHint += " (💡 Tip: Single quotes are invalid in strict JSON. All JSON keys and string values must use double quotes. Check for unescaped literal single quotes or apostrophes in your text that might have broken the structure.)";
        }
        if (cleanJson.endsWith('...') || cleanJson.endsWith('…') || cleanJson.includes('//') || cleanJson.includes('/*')) {
          helpHint += " (💡 Tip: The AI output appears to be truncated or contains comments. Please make sure to ask the AI to complete the full JSON structure with all records without any ellipsis or shortcuts.)";
        }
        return { success: false, error: `Invalid JSON structure: ${helpHint}` };
      }

      const roundsList = Array.isArray(parsed) ? parsed : (parsed.rounds || parsed.games);

      if (!Array.isArray(roundsList) || roundsList.length === 0) {
        return { success: false, error: 'JSON must contain an array or a "rounds" list.' };
      }

      const validatedRounds: EslRound[] = [];
      for (let i = 0; i < roundsList.length; i++) {
        const r = roundsList[i];
        if (!r.name || typeof r.lat !== 'number' || typeof r.lng !== 'number' || !r.tourGuideText) {
          return { success: false, error: `Round #${i + 1} is missing required fields (name, lat, lng, or tourGuideText).` };
        }
        validatedRounds.push({
          id: r.id || i + 1,
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          tourGuideText: r.tourGuideText,
          thingsToTry: Array.isArray(r.thingsToTry) ? r.thingsToTry : ['Explore the area', 'Practice vocabulary'],
          vocabulary: Array.isArray(r.vocabulary) ? r.vocabulary : [],
          grammarChallenge: r.grammarChallenge || undefined,
          food: r.food || 'Various local dishes',
          culture: r.culture || 'Rich local traditions',
          clothes: r.clothes || 'Standard attire',
          taboos: r.taboos || 'Respect local customs',
          phraseBook: Array.isArray(r.phraseBook) ? r.phraseBook : [],
          
          history: r.history,
          architecture: r.architecture,
          climate: r.climate,
          transport: r.transport,
          wildlife: r.wildlife,
          music: r.music,
          festivals: r.festivals,
          sports: r.sports,
          famousPeople: r.famousPeople,
          souvenirs: r.souvenirs,
          localMyths: r.localMyths,
          gestures: r.gestures,
          slang: r.slang,
          hobbies: r.hobbies,
          economy: r.economy,
          education: r.education,
          literature: r.literature,
          movies: r.movies,
          landmarks: r.landmarks,
          funFacts: r.funFacts,
          hostClues: r.hostClues,
          imageSearchKeywords: r.imageSearchKeywords,

          superstitions: r.superstitions,
          traditionalCrafts: r.traditionalCrafts,
          natureParks: r.natureParks,
          weekendActivities: r.weekendActivities,
          etiquetteRules: r.etiquetteRules,
          regionalAccents: r.regionalAccents,
          historicalEra: r.historicalEra,
          landmarkHeight: r.landmarkHeight,
          costOfLiving: r.costOfLiving,
          mainSights: r.mainSights,
          streetArt: r.streetArt,
          localPets: r.localPets,
          familyStructure: r.familyStructure,
          localCoffeeCulture: r.localCoffeeCulture,
          timeManagement: r.timeManagement,
          shoppingHacks: r.shoppingHacks,
          famousDisasters: r.famousDisasters,
          folkloreOutfits: r.folkloreOutfits,
          architectureSecret: r.architectureSecret,
          nationalSymbols: r.nationalSymbols,
        });
      }

      setGameState(prev => ({
        ...prev,
        rounds: validatedRounds,
        status: 'setup',
        currentRoundIndex: 0
      }));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Invalid JSON format.' };
    }
  };

  const getCurrentPrompt = (): string => {
    return `You are a hyper-realistic Game Show Host acting as the ultimate tutor companion for the interactive "Tutorly GeoSeeker" tournament.
The tutor is launching a premium gamified travel-study campaign. Our goals are absolute depth, maximum cultural quantity, and dynamic language practice.

Tutoring session parameters to integrate into clues and learning activities:
- Target CEFR Proficiency Level: ${gameState.config.cefrLevel}
- Learners native facts & background profile: ${gameState.config.learnerBackground}
- Target Region or Country of adventure: ${gameState.config.customRegionName}

⚠️ THIS IS A STRICT 1-STEP or 2-STEP INTERACTION PROCESS. YOU MUST EXECUTE STEP 1 FIRST.
STEP 1: Generate a numbered list of exactly 15 highly distinct, interesting, and culturally rich locations within the chosen region (e.g., rather than "London", pick specific targets like "The British Museum, London" or "Camden Market"). Present this list and explicitly ask the user to select the places they want to play. Do NOT limit the user to 5 places! They can choose as many as they want (e.g. 1, 3, 5, 8, 10, or any number of locations). Do NOT output any JSON in this step.
STEP 2: Wait for the user to respond with their chosen places (any number of locations chosen by the user). ONLY THEN generate the highly detailed, strict JSON array containing ALL of their selected locations.

CRITICAL JSON SCHEMATIC RULES FOR STEP 2 (MUST BE STRONGLY FOLLOWED BY THE AI SYSTEM):
1. NO LAZINESS & COMPLETE GENERATION: You MUST NOT truncate the JSON output! You MUST NOT use placeholder comments like "// ... rest of the locations" or leave fields blank/abbreviated. Generate the FULL, COMPLETE detailed structural block for every single location selected by the user. Deliver maximum pedantic, comprehensive, and exhaustive detail. Produce every single block for all properties.
2. STRICT VALID JSON COMPLIANCE & ACCIDENT PREVENTION: 
   - All keys and string values MUST be enclosed in standard double quotes ("key": "value"). 
   - NEVER use single quotes (') for keys or string boundaries under any circumstances.
   - ⚠️ BE CAREFUL WITH INTERNAL AND SINGLE QUOTES inside string values (e.g., "souvenirs": "Small brass magnets" or similar). Do NOT output invalid JSON structures containing raw unescaped double quotes, nested literal double quotes, or properties using single quotes like 'Small bra'. Any internal quotes in strings MUST be escaped properly with a backslash (\\") or replaced with single curly/simple quotes safely.
   - NO TRAILING COMMAS: Ensure there are absolute no trailing commas at the end of property lists or arrays (e.g., [1, 2] and not [1, 2,]).
3. HYPER-REALISTIC COGNITIVE HIDDEN SECRET (AVOID OBVIOUS CLUES): DO NOT EVER reveal the place name, city name, country name, or obvious sovereign trademarks/landmarks directly in any of the clues, title, or text descriptors! The students must deduce it purely from our sequence of local guidance tags. Avoid anything that might directly give the answer away.
4. GRADED GUIDED FOCUS SYSTEM (10 PROGRESSIVE CUE LEVELS): You MUST include exactly 10 highly distinct, sequential, progressive clues in "hostClues", ordered strictly from most difficult (least revealing / highly subtle) to easiest (most revealing / obvious). Follow these categories precisely:
   - Clue 1: Culture & Social Etiquette (Extremely subtle, least revealing)
   - Clue 2: Daily Life of a Person (Daily routine, habits, borough daylight scenes)
   - Clue 3: Hobbies of People & Local Sports (Weekend leisure, recreational hobbies)
   - Clue 4: News & Modern Stories (Fascinating stories or regional events related to these places)
   - Clue 5: Famous People from there (Renowned historical or contemporary individuals, artists, pioneers)
   - Clue 6: Historical Events, Eras or Figures & Legends (Epoch milestones and historic figureheads)
   - Clue 7: Food & Culinary/Beverage Traditions (Delicacies, specific street eats, cafe rituals)
   - Clue 8: Natural and Man-Made Landmarks (Nearby geography, mountains, parks, or visual peaks)
   - Clue 9: Important Buildings & Architecture (Building styles, heights, secret tunnels, design riddles)
   - Clue 10: Language, Regional Slang & Local Dialects (Dialect expressions, slang, useful colloquial words - most revealing/easiest)
5. DETAILED LEXICAL DECK: "vocabulary" MUST contain exactly 5 words with complex CEFR definitions and realistic context sentences.
6. DETAILED SURVIVAL PHRASE DECK: "phraseBook" MUST contain exactly 10 real localized phrases with accurate english translations.
7. CHRONIC QUANTITY OF CULTURAL SCHEMAS: You MUST populate all 39 structural properties beneath with extensive, descriptive, and highly interesting content (no empty fields or placeholders!). We expect immense depth and richness of data.
8. IMAGE SEARCH OPTIMIZERS (PREVENT BROKEN IMAGES & USE 2026 GROUND SEARCH DATA):
   - You MUST generate highly standard, descriptive, real-world, tourist-facing search keywords under "imageSearchKeywords".
   - Avoid complex, nested, abbreviated, or highly obscure phrasing that breaks image search engines! 
   - Think of real, iconic physical structures, specific food dishes, recognizable regional garments, or distinct cultural festivals.
   - Base all keywords on real, verified 2026 ground-search entries.
   - Examples of HIGH-RELIABILITY visual keywords: "British Museum London Great Court", "Eiffel Tower Paris landmark", "Japanese Kimono Traditional Kyoto festival", "Ramen bowl Tokyo street food".
   - Avoid abstract or non-visual terms like "Level 1 culture vibe" or "mysterious atmosphere".
   - Make sure all keywords represent real, easily indexed physical things.

JSON Structure for Step 2:
\\\`\\\`\\\`json
[
  {
    "id": 1,
    "name": "The actual full name of the location (Teacher's key)",
    "lat": 48.8584,
    "lng": 2.2945,
    "tourGuideText": "Welcome, explorers! I am your game show host! Before you points a pin, observe this mysterious panoramic feed. It is a stunning historical spot...",
    "hostClues": [
      "Culture clue: ...",
      "Food clue: ...",
      "Daily life clue: ...",
      "Hobbies clue: ...",
      "Famous people clue: ...",
      "Economy clue: ...",
      "History era clue: ...",
      "Slang expressions clue: ...",
      "Climate & Wildlife clue: ...",
      "Iconic architecture clue: ..."
    ],
    "thingsToTry": [
      "Exhaustive action 1",
      "Exhaustive action 2",
      "Exhaustive action 3"
    ],
    "vocabulary": [
      { "word": "word1", "definition": "detailed definition", "example": "sentence" },
      { "word": "word2", "definition": "detailed definition", "example": "sentence" },
      { "word": "word3", "definition": "detailed definition", "example": "sentence" },
      { "word": "word4", "definition": "detailed definition", "example": "sentence" },
      { "word": "word5", "definition": "detailed definition", "example": "sentence" }
    ],
    "grammarChallenge": "A CEFR-appropriate grammar focus.",
    "food": "Extensive details about signature delicacies and famous local dishes",
    "culture": "Detailed note on traditions, cultural mindset, and daily life",
    "clothes": "Traditional attire, festive garments, and standard dress code rules",
    "taboos": "Strict table manners, social taboos, and hand gestures to avoid",
    "phraseBook": [
      { "phrase": "Useful survival phrase in native dialect", "translation": "English meaning" }
    ],
    "history": "Deep historical background, founders, and major eras",
    "architecture": "Building style, materials used, and iconic architectural designs",
    "climate": "Typical weather, best season to visit, and temperature range",
    "transport": "Common local transit, subway styles, or historic trains",
    "wildlife": "Unique animals, native birds, or plant life found nearby",
    "music": "Traditional instruments, famous local songs, or typical dance genres",
    "festivals": "Main annual events, carnival parades, and local holidays",
    "sports": "Prominent sports, local match rivalries, or physical games",
    "famousPeople": "Historical champions, Nobel prize winners, or iconic artists from here",
    "souvenirs": "Traditional crafts, unique spices, or small items to purchase",
    "localMyths": "Legends, mysterious folktales, or mythical stories of the area",
    "gestures": "Common body language styles, greetings, and active manners",
    "slang": "3 common slang words used by youth here with English translations",
    "hobbies": "Typical weekend pursuits, indoor games, and popular local hobbies",
    "economy": "Core local industries, primary jobs, and regional commerce facts",
    "education": "Brief typical school life details, unique school subjects, or uniform facts",
    "literature": "Famous regional books, local poetry stars, or legendary authors from here",
    "movies": "Notable cinema, documentaries, or movies filmed at this precise venue",
    "landmarks": "Other nearby buildings, visual peaks, or geographic attractions",
    "funFacts": ["Amazing fact 1", "Amazing fact 2"],
    
    "superstitions": "Intriguing local beliefs, bad luck indicators, or good fortune charms",
    "traditionalCrafts": "Detailed hands-on artisanal craft heritages",
    "natureParks": "Important nearby mountain trails, national forests, or wildlife reserves",
    "weekendActivities": "How an average resident spends their Saturday afternoon in this specific borough",
    "etiquetteRules": "Important behavioral etiquette rules when visiting local homes or sacred sites",
    "regionalAccents": "Special dialects, speech patterns, or unique tone distinctions in the local language",
    "historicalEra": "The exact historical century or era during which this site was most influential",
    "landmarkHeight": "Geometric height, dimensional scale, or impressive engineering metrics of this site",
    "costOfLiving": "General currency name, cost of street food, and budgeting tips in this location",
    "mainSights": "Detailed primary points of curiosity and photo-ops in this direct block",
    "streetArt": "Local graffiti scenes, mural walls, or public art installations here",
    "localPets": "Most beloved animals and typical house pets in local neighborhoods",
    "familyStructure": "Traditional and modern household structures, youth living arrangements",
    "localCoffeeCulture": "Morning routines, tea style preferences, and local cafe culture rituals",
    "timeManagement": "Local attitudes regarding punctuality, work-life hours, and appointment etiquette",
    "shoppingHacks": "Useful secrets for local bargaining, tax refunds, or specific street flea markets",
    "famousDisasters": "Historically significant natural events, rebuildings, or survival accounts",
    "folkloreOutfits": "Festive dresses, colors, embroidery elements worn during historical parades",
    "architectureSecret": "Secret tunnels, structural mysteries, hidden chambers, or design riddles of the site",
    "nationalSymbols": "The official national tree, flora, or native animal that represents this region",

    "imageSearchKeywords": {
      "general": "Exact search query optimized for the landmark itself",
      "food": "Accurate search terms for the classic local food to feed image search",
      "clothes": "Visual keywords for traditional and cultural outfits",
      "culture": "Specific keywords representing the culture"
    }
  }
]
\\\`\\\`\\\`
Return ONLY the raw JSON array in Step 2. NO PREAMBLE, NO POSTSCRIPT, and NO Markdown annotations outside of the code block.`;
  };

  const getTeachersGuidePrompt = (): string => {
    return `You are an expert Senior ESL Curriculum Designer.
Based on the JSON game data generated in the previous step, generate a comprehensive "Tutor's Master Guide" for the session.
Ensure maximum verbal weight, rich vocabulary, and extensive structural instructions!

For EACH of the selected locations in the game, you MUST generate:
1. Deep Dive Facts: Expanded timeline history, architecture nuances, and hidden facts.
2. Concept Checking Questions (CCQs): 5 precise questions to verify student understanding of the vocabulary and clues.
3. Speaking & Discussion Prompts: 5 engaging discussion questions customized to the target CEFR level.
4. "Survival English" dialogues: A highly detailed situational script (10+ turns of conversation) modeling local interactions (e.g., bartering at a local bazaar, discussing historical site entries).
5. "A Day in the Life" descriptive narrative: A narrative of a typical resident's day, loaded with local jargon and context.
6. "Would You Rather" provocative cultural, weather, food, and historical choice questions.

Please prioritize immense quality, formatting beauty, and pedagogical depth. Include corresponding answers and model responses for everything!`;
  };

  const getCluesForRound = (round: EslRound): { category: string; text: string }[] => {
    const categories = [
      "Culture & Social Etiquette (Level 1)",
      "Daily Life of a Person (Level 2)",
      "Hobbies of People & Local Sports (Level 3)",
      "News & Media Stories (Level 4)",
      "Famous People from There (Level 5)",
      "Historical Events or Figures (Level 6)",
      "Food & Culinary Traditions (Level 7)",
      "Natural and Man-Made Landmarks (Level 8)",
      "Important Buildings & Architecture (Level 9)",
      "Language, Slang & Phrasebook (Level 10)"
    ];

    if (round.hostClues && round.hostClues.length >= 10) {
      return round.hostClues.map((text, idx) => ({
        category: categories[idx] || `Clue Level ${idx + 1}`,
        text
      }));
    }

    return [
      {
        category: categories[0],
        text: round.culture 
          ? `Local customs and social etiquette of this place: ${round.culture}.` 
          : `The local social culture and traditional etiquette here focus on respect and unique communal greetings.`
      },
      {
        category: categories[1],
        text: round.clothes 
          ? `In their daily life, the residents' personal attire and routines look like this: ${round.clothes}` 
          : `An average resident conducts their daily life under predictable weather, typical clothing, and busy transit routines.`
      },
      {
        category: categories[2],
        text: round.hobbies 
          ? `Common hobbies of people and weekend recreations in this specific neighborhood: ${round.hobbies}` 
          : `People here enjoy unique weekend activities, standard indoor board games, and outdoor local hobbies.`
      },
      {
        category: categories[3],
        text: round.movies 
          ? `News and cinema filmed here or related stories include: ${round.movies}.` 
          : `This dynamic spot has appeared in international news publications and travel documentaries due to its unique character.`
      },
      {
        category: categories[4],
        text: round.famousPeople 
          ? `This area is home to or associated with famous people such as: ${round.famousPeople}` 
          : `This famous area has shaped several iconic minds, renowned artists, Nobel laureates, or historical champions.`
      },
      {
        category: categories[5],
        text: round.history 
          ? `Fascinating historical events or figures from here: ${round.history}` 
          : `Fitted in rich historical eras, this mysterious spot was once highly influential during critical historical centuries.`
      },
      {
        category: categories[6],
        text: round.food 
          ? `Local food and dietary pleasures features signature treats like: ${round.food}` 
          : `Locals are incredibly proud of their culinary heritage, signature dishes, street food stands, and morning cafe rituals.`
      },
      {
        category: categories[7],
        text: round.landmarks 
          ? `Nearby natural and man-made landmarks include: ${round.landmarks}.` 
          : `Scenic geographical landmarks, lush wild biospheres, or botanical flora can be seen across this regional terrain.`
      },
      {
        category: categories[8],
        text: round.architecture 
          ? `Important buildings and architectural styles of the site: ${round.architecture}.` 
          : `Its impressive engineering, distinctive geometric heights, or architectural secrets draw global spectators.`
      },
      {
        category: categories[9],
        text: (round.phraseBook && round.phraseBook.length > 0) 
          ? `Succeed in local conversations by saying "${round.phraseBook[0].phrase}", which translates to English as: "${round.phraseBook[0].translation}".` 
          : `Locals converse utilizing unique slang, lively regional accents, and friendly gestures.`
      }
    ];
  };

  return (
    <GameContext.Provider value={{
      gameState,
      activeGuess,
      setActiveGuess,
      addPlayer,
      removePlayer,
      updateConfig,
      startEslGame,
      recordActivePlayerGuess,
      skipActivePlayerGuess,
      setActivePlayerForGuess,
      revealNextClue,
      revealEslRound,
      nextEslRound,
      resetCampaign,
      loadCustomRounds,
      getCurrentPrompt,
      getTeachersGuidePrompt,
      getDistanceKm: getDistanceFromLatLonInKm,
      getCluesForRound
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

