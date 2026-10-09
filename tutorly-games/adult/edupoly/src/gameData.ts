import type { Tile, Question, HostLine } from './types';

// ─── DEFAULT BOARD TILES (Business English B1) ────────────────────────────────
export const DEFAULT_TILES: Tile[] = [
  // Bottom row (left → right): positions 0-10
  { id: 0,  name: 'GO',              type: 'go',            color: 'none', description: 'Collect $200 salary as you pass!' },
  { id: 1,  name: 'MedTech Corp',   type: 'property',      color: 'brown',    price: 60,  rent: [2,10,30,90,160,250], mortgageValue: 30,  housePrice: 50  },
  { id: 2,  name: 'Community Chest', type: 'community_chest', color: 'none' },
  { id: 3,  name: 'StartUp Hub',    type: 'property',      color: 'brown',    price: 60,  rent: [4,20,60,180,320,450], mortgageValue: 30,  housePrice: 50  },
  { id: 4,  name: 'Income Tax',     type: 'tax',           color: 'none', description: 'Pay $200 income tax.' },
  { id: 5,  name: 'City Rail',      type: 'railroad',      color: 'railroad', price: 200, rent: [25,50,100,200], mortgageValue: 100 },
  { id: 6,  name: 'BioSynth Ltd',   type: 'property',      color: 'light_blue', price: 100, rent: [6,30,90,270,400,550], mortgageValue: 50, housePrice: 50 },
  { id: 7,  name: 'Chance',         type: 'chance',        color: 'none' },
  { id: 8,  name: 'DataStream Inc', type: 'property',      color: 'light_blue', price: 100, rent: [6,30,90,270,400,550], mortgageValue: 50, housePrice: 50 },
  { id: 9,  name: 'CloudBase AI',   type: 'property',      color: 'light_blue', price: 120, rent: [8,40,100,300,450,600], mortgageValue: 60, housePrice: 50 },
  { id: 10, name: 'Visiting Jail',  type: 'jail',          color: 'none', description: 'Just visiting – nothing happens!' },

  // Left column (bottom → top): positions 11-19
  { id: 11, name: 'PharmaPlus',     type: 'property',      color: 'pink',     price: 140, rent: [10,50,150,450,625,750], mortgageValue: 70, housePrice: 100 },
  { id: 12, name: 'Electric Co.',   type: 'utility',       color: 'utility',  price: 150, mortgageValue: 75 },
  { id: 13, name: 'NovaChem',       type: 'property',      color: 'pink',     price: 140, rent: [10,50,150,450,625,750], mortgageValue: 70, housePrice: 100 },
  { id: 14, name: 'UrbanEdge',      type: 'property',      color: 'pink',     price: 160, rent: [12,60,180,500,700,900], mortgageValue: 80, housePrice: 100 },
  { id: 15, name: 'Metro Rail',     type: 'railroad',      color: 'railroad', price: 200, rent: [25,50,100,200], mortgageValue: 100 },
  { id: 16, name: 'AgriGreen',      type: 'property',      color: 'orange',   price: 180, rent: [14,70,200,550,750,950], mortgageValue: 90, housePrice: 100 },
  { id: 17, name: 'Community Chest', type: 'community_chest', color: 'none' },
  { id: 18, name: 'FinTech Pro',    type: 'property',      color: 'orange',   price: 180, rent: [14,70,200,550,750,950], mortgageValue: 90, housePrice: 100 },
  { id: 19, name: 'MediaHouse',     type: 'property',      color: 'orange',   price: 200, rent: [16,80,220,600,800,1000], mortgageValue: 100, housePrice: 100 },

  // Top row (left → right): positions 20-30
  { id: 20, name: 'Free Parking',   type: 'free_parking',  color: 'none', description: 'Take a break – free space!' },
  { id: 21, name: 'RetailKing',     type: 'property',      color: 'red',      price: 220, rent: [18,90,250,700,875,1050], mortgageValue: 110, housePrice: 150 },
  { id: 22, name: 'Chance',         type: 'chance',        color: 'none' },
  { id: 23, name: 'LogistiQ',       type: 'property',      color: 'red',      price: 220, rent: [18,90,250,700,875,1050], mortgageValue: 110, housePrice: 150 },
  { id: 24, name: 'NexGen Motors',  type: 'property',      color: 'red',      price: 240, rent: [20,100,300,750,925,1100], mortgageValue: 120, housePrice: 150 },
  { id: 25, name: 'Airport Rail',   type: 'railroad',      color: 'railroad', price: 200, rent: [25,50,100,200], mortgageValue: 100 },
  { id: 26, name: 'SunPower',       type: 'property',      color: 'yellow',   price: 260, rent: [22,110,330,800,975,1150], mortgageValue: 130, housePrice: 150 },
  { id: 27, name: 'BlueSky Ads',    type: 'property',      color: 'yellow',   price: 260, rent: [22,110,330,800,975,1150], mortgageValue: 130, housePrice: 150 },
  { id: 28, name: 'Water Works',    type: 'utility',       color: 'utility',  price: 150, mortgageValue: 75 },
  { id: 29, name: 'GoldVault Bank', type: 'property',      color: 'yellow',   price: 280, rent: [24,120,360,850,1025,1200], mortgageValue: 140, housePrice: 150 },
  { id: 30, name: 'Go To Jail',     type: 'go_to_jail',    color: 'none', description: 'Go directly to Jail!' },

  // Right column (top → bottom): positions 31-39
  { id: 31, name: 'EcoHomes',       type: 'property',      color: 'green',    price: 300, rent: [26,130,390,900,1100,1275], mortgageValue: 150, housePrice: 200 },
  { id: 32, name: 'SmartCity',      type: 'property',      color: 'green',    price: 300, rent: [26,130,390,900,1100,1275], mortgageValue: 150, housePrice: 200 },
  { id: 33, name: 'Community Chest', type: 'community_chest', color: 'none' },
  { id: 34, name: 'BioTech Labs',   type: 'property',      color: 'green',    price: 320, rent: [28,150,450,1000,1200,1400], mortgageValue: 160, housePrice: 200 },
  { id: 35, name: 'Central Rail',   type: 'railroad',      color: 'railroad', price: 200, rent: [25,50,100,200], mortgageValue: 100 },
  { id: 36, name: 'Chance',         type: 'chance',        color: 'none' },
  { id: 37, name: 'AlphaVentures',  type: 'property',      color: 'blue',     price: 350, rent: [35,175,500,1100,1300,1500], mortgageValue: 175, housePrice: 200 },
  { id: 38, name: 'Luxury Tax',     type: 'tax',           color: 'none', description: 'Pay $100 luxury tax.' },
  { id: 39, name: 'Pinnacle Tower', type: 'property',      color: 'blue',     price: 400, rent: [50,200,600,1400,1700,2000], mortgageValue: 200, housePrice: 200 },
];

// ─── COLOR GROUPS (which tile IDs share a color) ──────────────────────────────
export const COLOR_GROUPS: Record<string, number[]> = {
  brown:      [1, 3],
  light_blue: [6, 8, 9],
  pink:       [11, 13, 14],
  orange:     [16, 18, 19],
  red:        [21, 23, 24],
  yellow:     [26, 27, 29],
  green:      [31, 32, 34],
  blue:       [37, 39],
  railroad:   [5, 15, 25, 35],
  utility:    [12, 28],
};

// ─── PROPERTY COLOR HEX MAP ───────────────────────────────────────────────────
export const COLOR_HEX: Record<string, string> = {
  brown:      '#8B4513',
  light_blue: '#87CEEB',
  pink:       '#FF69B4',
  orange:     '#FFA500',
  red:        '#FF3B3B',
  yellow:     '#FFD700',
  green:      '#2ECC40',
  blue:       '#0044CC',
  railroad:   '#333333',
  utility:    '#888888',
  none:       'transparent',
};

// ─── SAMPLE QUESTIONS (Business English B1) ───────────────────────────────────
export const SAMPLE_QUESTIONS: Question[] = [
  // MCQ
  {
    id: 'q1', type: 'mcq', cefrLevel: 'B1',
    text: 'Which phrase is the most professional way to start a business email?',
    options: ['Hey there!', 'Dear Mr. Johnson,', 'Yo Johnson,', 'Hi dude,'],
    correctAnswer: 'Dear Mr. Johnson,',
    explanation: 'Business emails should start with a formal salutation like "Dear [Name],".',
  },
  {
    id: 'q2', type: 'mcq', cefrLevel: 'B1',
    text: 'What does "quarterly report" mean?',
    options: ['A report made every quarter of an hour', 'A report made every three months', 'A report made once a year', 'A report made every week'],
    correctAnswer: 'A report made every three months',
    explanation: 'A "quarter" in business means a three-month period, so quarterly = every 3 months.',
  },
  {
    id: 'q3', type: 'mcq', cefrLevel: 'B1',
    text: 'Choose the correct form: "The meeting _____ at 9 AM tomorrow."',
    options: ['will starting', 'starts', 'is start', 'starting'],
    correctAnswer: 'starts',
    explanation: 'We use present simple for scheduled future events.',
  },
  {
    id: 'q4', type: 'mcq', cefrLevel: 'B1',
    text: 'What is a "deadline" in a work context?',
    options: ['A phone line that is disconnected', 'The latest time something must be finished', 'A line on a sports field', 'A dangerous electrical cable'],
    correctAnswer: 'The latest time something must be finished',
    explanation: '"Deadline" = the final date/time by which something must be completed.',
  },
  {
    id: 'q5', type: 'mcq', cefrLevel: 'B1',
    text: 'Which word means to officially end a business?',
    options: ['Liquidate', 'Negotiate', 'Collaborate', 'Delegate'],
    correctAnswer: 'Liquidate',
    explanation: 'To "liquidate" a company means to close it down and sell its assets.',
  },
  {
    id: 'q6', type: 'mcq', cefrLevel: 'B1',
    text: 'Choose the correct preposition: "She is responsible ___ managing the team."',
    options: ['to', 'for', 'of', 'at'],
    correctAnswer: 'for',
    explanation: '"Responsible for" is the correct collocation in English.',
  },
  {
    id: 'q7', type: 'mcq', cefrLevel: 'B1',
    text: 'What does "ROI" stand for in business?',
    options: ['Rate of Interest', 'Return on Investment', 'Revenue of Income', 'Risk of Inflation'],
    correctAnswer: 'Return on Investment',
    explanation: 'ROI = Return on Investment – a measure of profitability.',
  },
  {
    id: 'q8', type: 'mcq', cefrLevel: 'B1',
    text: 'Which sentence uses the passive voice correctly?',
    options: ['The report written by Sarah.', 'The report was written by Sarah.', 'Sarah been writing the report.', 'The report have written by Sarah.'],
    correctAnswer: 'The report was written by Sarah.',
    explanation: 'Passive voice: "was + past participle (written)".',
  },
  {
    id: 'q9', type: 'mcq', cefrLevel: 'B1',
    text: '"To negotiate" means…',
    options: ['To argue aggressively', 'To discuss terms to reach an agreement', 'To refuse an offer', 'To sign a contract'],
    correctAnswer: 'To discuss terms to reach an agreement',
    explanation: 'Negotiation involves discussion aimed at reaching a mutually beneficial agreement.',
  },
  {
    id: 'q10', type: 'mcq', cefrLevel: 'B1',
    text: 'Which modal verb expresses a polite request in a business email?',
    options: ['You must send me the file.', 'Could you please send me the file?', 'Send me the file now.', 'I need the file!'],
    correctAnswer: 'Could you please send me the file?',
    explanation: '"Could you please…?" is a polite way to make a request.',
  },

  // TRUE/FALSE
  {
    id: 'q11', type: 'true_false', cefrLevel: 'B1',
    text: '"Brainstorming" means carefully evaluating ideas one by one.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'Brainstorming means generating many ideas quickly without judging them.',
  },
  {
    id: 'q12', type: 'true_false', cefrLevel: 'B1',
    text: 'The phrase "touch base" means to briefly make contact or check in with someone.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: '"Touch base" is a common business idiom meaning to briefly communicate.',
  },
  {
    id: 'q13', type: 'true_false', cefrLevel: 'B1',
    text: 'A "profit" occurs when expenses exceed revenue.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'Profit = Revenue minus Expenses. When expenses exceed revenue, that\'s a "loss".',
  },
  {
    id: 'q14', type: 'true_false', cefrLevel: 'B1',
    text: '"Due diligence" refers to careful research and analysis before a business decision.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'Due diligence means thorough investigation, especially before signing contracts.',
  },
  {
    id: 'q15', type: 'true_false', cefrLevel: 'B1',
    text: 'The word "agenda" in a meeting context means the list of topics to be discussed.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'A meeting agenda is a list of items to be discussed during a meeting.',
  },

  // FILL IN THE GAP
  {
    id: 'q16', type: 'fill_gap', cefrLevel: 'B1',
    text: 'We need to _____ a decision before the end of the meeting. (make / do / take / have)',
    correctAnswer: 'make',
    explanation: '"Make a decision" is the correct collocation.',
  },
  {
    id: 'q17', type: 'fill_gap', cefrLevel: 'B1',
    text: 'The CEO will _____ a speech at the annual conference. (give / tell / say / speak)',
    correctAnswer: 'give',
    explanation: '"Give a speech" – we "give" talks, presentations, and speeches.',
  },
  {
    id: 'q18', type: 'fill_gap', cefrLevel: 'B1',
    text: 'Please _____ me informed about any changes to the project. (keep / let / make / hold)',
    correctAnswer: 'keep',
    explanation: '"Keep someone informed" = regularly update them about developments.',
  },
  {
    id: 'q19', type: 'fill_gap', cefrLevel: 'B1',
    text: 'The company decided to _____ into new markets in Asia. (expand / expend / express / export)',
    correctAnswer: 'expand',
    explanation: '"Expand into" = to grow your business into new areas or markets.',
  },
  {
    id: 'q20', type: 'fill_gap', cefrLevel: 'B1',
    text: 'She submitted her _____ for the marketing manager position. (application / apply / applicable / applicant)',
    correctAnswer: 'application',
    explanation: 'You "submit an application" when applying for a job.',
  },

  // LISTENING
  {
    id: 'q21', type: 'listening', cefrLevel: 'B1',
    text: 'Listen carefully and answer: What is the speaker apologizing for?',
    audioText: 'I sincerely apologize for the delay in delivering your order. We experienced unexpected supply chain disruptions last week, but I can assure you the package will arrive by Friday.',
    options: ['Delivering the wrong product', 'Delaying the delivery', 'Overcharging for the order', 'Sending a damaged package'],
    correctAnswer: 'Delaying the delivery',
    explanation: 'The speaker says "I apologize for the delay in delivering your order."',
  },
  {
    id: 'q22', type: 'listening', cefrLevel: 'B1',
    text: 'Listen and identify the main purpose of the message.',
    audioText: 'Good morning, this is Emma from HR. I\'m calling to remind all staff that the performance review forms must be submitted by close of business on Thursday. Please ensure your line manager has signed the form before submission.',
    options: ['To announce a new staff policy', 'To remind staff about form submission deadline', 'To schedule a performance review meeting', 'To introduce a new HR manager'],
    correctAnswer: 'To remind staff about form submission deadline',
    explanation: 'Emma\'s main purpose is reminding staff to submit forms by Thursday.',
  },
  {
    id: 'q23', type: 'listening', cefrLevel: 'B1',
    text: 'Listen to the dialogue and answer: What does the customer want?',
    audioText: 'Customer: I ordered the premium subscription three weeks ago but I haven\'t received my login details yet. Agent: I\'m so sorry about that. Let me look into your account right away.',
    options: ['A refund for the subscription', 'Their login details for the service', 'To cancel the subscription', 'To upgrade to a better plan'],
    correctAnswer: 'Their login details for the service',
    explanation: 'The customer says they haven\'t received their login details.',
  },

  // WILD CARDS
  {
    id: 'q24', type: 'wild_card', cefrLevel: 'B1',
    text: '🌟 Advance to GO! Collect $200 salary!',
    wildEffect: 'advance_to_go',
  },
  {
    id: 'q25', type: 'wild_card', cefrLevel: 'B1',
    text: '💰 Bank error in your favor! Collect $100!',
    wildEffect: 'collect_100',
  },
  {
    id: 'q26', type: 'wild_card', cefrLevel: 'B1',
    text: '📉 Your project went over budget! Pay $50.',
    wildEffect: 'pay_50',
  },
  {
    id: 'q27', type: 'wild_card', cefrLevel: 'B1',
    text: '⏪ Go back 3 spaces.',
    wildEffect: 'go_back_3',
  },
  {
    id: 'q28', type: 'wild_card', cefrLevel: 'B1',
    text: '🎉 Productivity bonus! Collect $200!',
    wildEffect: 'collect_200',
  },
  {
    id: 'q29', type: 'wild_card', cefrLevel: 'B1',
    text: '🔑 Get Out of Jail Free – keep this card!',
    wildEffect: 'get_out_of_jail',
  },
  {
    id: 'q30', type: 'wild_card', cefrLevel: 'B1',
    text: '⏭️ Extra turn! Roll the dice again!',
    wildEffect: 'extra_turn',
  },
  {
    id: 'q31', type: 'wild_card', cefrLevel: 'B1',
    text: '🚔 Go directly to Jail! Do not pass Go!',
    wildEffect: 'go_to_jail',
  },

  // CHALLENGE
  {
    id: 'q32', type: 'challenge', cefrLevel: 'B1',
    text: 'CHALLENGE!',
    challengeText: 'Act out a job interview! Introduce yourself professionally in 30 seconds. Your teacher will judge!',
    explanation: 'Teacher judges if the student performed the task confidently and professionally.',
  },
  {
    id: 'q33', type: 'challenge', cefrLevel: 'B1',
    text: 'CHALLENGE!',
    challengeText: 'Give a 20-second "elevator pitch" for a product of your choice!',
    explanation: 'An elevator pitch is a brief, persuasive speech about a product or idea.',
  },

  // WOULD YOU RATHER
  {
    id: 'q34', type: 'would_you_rather', cefrLevel: 'B1',
    text: 'Would you rather…',
    optionA: 'Work from home every day',
    optionB: 'Work in a modern office with great colleagues',
    explanation: 'Explain your choice using: "I would prefer… because…"',
  },
  {
    id: 'q35', type: 'would_you_rather', cefrLevel: 'B1',
    text: 'Would you rather…',
    optionA: 'Have a high-salary job you find boring',
    optionB: 'Have a low-salary job you absolutely love',
    explanation: 'Use conditionals: "If I had to choose, I would… because…"',
  },

  // TRUTH OR DARE (classroom appropriate)
  {
    id: 'q36', type: 'truth_or_dare', cefrLevel: 'B1',
    text: 'Truth or Dare! 🎭',
    challengeText: 'TRUTH: Describe your dream job in 3 sentences using professional vocabulary. OR DARE: Roleplay a phone call to reschedule a meeting.',
    explanation: 'Student chooses truth or dare. Both options involve business English.',
  },

  // MATCHING
  {
    id: 'q37', type: 'matching', cefrLevel: 'B1',
    text: 'Match each business term with its correct definition!',
    pairs: [
      { left: 'Revenue',    right: 'Total income earned' },
      { left: 'Overhead',   right: 'Regular business costs' },
      { left: 'Equity',     right: 'Owner\'s share in the business' },
      { left: 'Liability',  right: 'What the company owes' },
    ],
    correctAnswer: 'Revenue:Total income earned,Overhead:Regular business costs,Equity:Owner\'s share in the business,Liability:What the company owes',
  },

  // SENTENCE SCRAMBLE
  {
    id: 'q38', type: 'sentence_scramble', cefrLevel: 'B1',
    text: 'Unscramble to form a correct business sentence:',
    words: ['the', 'proposal', 'submit', 'please', 'by', 'Friday'],
    correctAnswer: 'please submit the proposal by Friday',
    explanation: 'The correct sentence is: "Please submit the proposal by Friday."',
  },
  {
    id: 'q39', type: 'sentence_scramble', cefrLevel: 'B1',
    text: 'Unscramble to form a correct sentence:',
    words: ['meeting', 'the', 'will', 'postponed', 'be'],
    correctAnswer: 'the meeting will be postponed',
    explanation: 'Passive future: "The meeting will be postponed."',
  },

  // ORDERING
  {
    id: 'q40', type: 'ordering', cefrLevel: 'B1',
    text: 'Put these steps of a job application in the correct order:',
    words: ['Write a cover letter', 'Attend the interview', 'Research the company', 'Submit the application', 'Receive a job offer'],
    correctAnswer: 'Research the company,Write a cover letter,Submit the application,Attend the interview,Receive a job offer',
    explanation: 'The logical order: Research → Write cover letter → Submit → Interview → Offer.',
  },
];

// ─── HOST SPEECH TEMPLATES ─────────────────────────────────────────────────────
export const HOST_LINES: HostLine[] = [
  {
    id: 'correct_varied',
    category: 'correct',
    templates: [
      'Excellent work! You nailed it!',
      'Brilliant! That\'s absolutely correct!',
      'Outstanding! Fast thinking pays off!',
      'Perfect answer! You\'re on fire!',
      'Wonderful! Knowledge is your superpower!',
      'Impressive! You really know your business English!',
      'Spot on! Keep that momentum going!',
      'Fantastic! The crowd goes wild!',
    ],
  },
  {
    id: 'wrong_varied',
    category: 'wrong',
    templates: [
      'Not quite this time. Keep going!',
      'Ooh, unlucky! The correct answer was interesting.',
      'Almost there! Learning from mistakes makes us stronger.',
      'Not this time, but you\'re getting there!',
      'So close! Review that one and you\'ll get it next time.',
      'Give it another shot next time!',
      'Every mistake is a learning opportunity!',
    ],
  },
  {
    id: 'timer_warning',
    category: 'timer',
    templates: [
      'Ten seconds remaining! Think fast!',
      'Hurry up! The clock is ticking!',
      'Five seconds! Make your choice!',
      'Time is running out! Quick decision!',
    ],
  },
  {
    id: 'buy_property',
    category: 'buy',
    templates: [
      'Excellent investment! The property is yours!',
      'Smart move! Build your empire!',
      'Property acquired! Business is booming!',
    ],
  },
  {
    id: 'roll_dice',
    category: 'dice',
    templates: [
      'The dice are rolling!',
      'Here we go! Luck of the board!',
      'Rolling for destiny!',
      'Let\'s see where fate takes you!',
    ],
  },
  {
    id: 'jail',
    category: 'jail',
    templates: [
      'Oh no! Straight to jail! Do not pass Go!',
      'The language police have caught you! Off to jail!',
      'To jail you go! Better study harder next time!',
    ],
  },
  {
    id: 'welcome',
    category: 'welcome',
    templates: [
      'Welcome to EduOpoly! The educational game where knowledge is currency!',
      'Get ready for the ultimate business English challenge!',
      'The game is about to begin! May the best learner win!',
    ],
  },
];

// ─── PLAYER COLOR PALETTES ────────────────────────────────────────────────────
export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

export const DEFAULT_EMOJIS = ['🚗','🎩','🐕','🚢','👟','🎭','🦁','🚀','💎','⚡'];

// ─── TILE POSITION LAYOUT (for board rendering) ───────────────────────────────
// Maps tile ID → { col, row } in 11×11 grid
export function getTileGridPos(id: number): { col: number; row: number } {
  // Bottom row: 0–10 (row 11, col 11 down to 1)
  if (id >= 0 && id <= 10) return { col: 11 - id, row: 11 };
  // Left column: 11–19 (col 1, row 10 down to 2)
  if (id >= 11 && id <= 19) return { col: 1, row: 11 - (id - 10) };
  // Top row: 20–30 (row 1, col 1 up to 11)
  if (id >= 20 && id <= 30) return { col: id - 19, row: 1 };
  // Right column: 31–39 (col 11, row 2 up to 10)
  if (id >= 31 && id <= 39) return { col: 11, row: (id - 30) + 1 };
  return { col: 1, row: 1 };
}
