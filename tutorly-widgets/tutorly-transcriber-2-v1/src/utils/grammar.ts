import type { GrammarSuggestion } from '../types';

// Common English spelling mistakes and corrections
const SPELLING_DICT: Record<string, string> = {
  'teh': 'the', 'taht': 'that', 'thier': 'their', 'recieve': 'receive',
  'wierd': 'weird', 'seperate': 'separate', 'occured': 'occurred',
  'untill': 'until', 'definately': 'definitely', 'occassion': 'occasion',
  'accomodate': 'accommodate', 'adress': 'address', 'agressive': 'aggressive',
  'apparant': 'apparent', 'arguement': 'argument', 'assasinate': 'assassinate',
  'begining': 'beginning', 'beleive': 'believe', 'calender': 'calendar',
  'cemetary': 'cemetery', 'changable': 'changeable', 'collegue': 'colleague',
  'comming': 'coming', 'commitee': 'committee', 'completly': 'completely',
  'concious': 'conscious', 'curiousity': 'curiosity', 'dependant': 'dependent',
  'desparate': 'desperate', 'dissapear': 'disappear', 'dissapoint': 'disappoint',
  'embarass': 'embarrass', 'enviroment': 'environment', 'existance': 'existence',
  'experiance': 'experience', 'familliar': 'familiar', 'finaly': 'finally',
  'florescent': 'fluorescent', 'foriegn': 'foreign', 'fourty': 'forty',
  'freind': 'friend', 'futher': 'further', 'goverment': 'government',
  'gaurd': 'guard', 'happend': 'happened', 'harrass': 'harass',
  'hieght': 'height', 'humerous': 'humorous', 'ignorence': 'ignorance',
  'imaginery': 'imaginary', 'immediatly': 'immediately', 'independant': 'independent',
  'indispensible': 'indispensable', 'innoculate': 'inoculate', 'intelligance': 'intelligence',
  'intresting': 'interesting', 'irresistable': 'irresistible', 'knowlege': 'knowledge',
  'liesure': 'leisure', 'liason': 'liaison', 'lonelyness': 'loneliness',
  'maintainance': 'maintenance', 'millenium': 'millennium', 'mischevious': 'mischievous',
  'misspell': 'misspell', 'neccessary': 'necessary', 'neice': 'niece',
  'noticable': 'noticeable', 'occurance': 'occurrence', 'paralell': 'parallel',
  'pastime': 'pastime', 'perseverence': 'perseverance', 'phenomemon': 'phenomenon',
  'posession': 'possession', 'potatos': 'potatoes', 'prefered': 'preferred',
  'priviledge': 'privilege', 'probaly': 'probably', 'pronounciation': 'pronunciation',
  'publically': 'publicly', 'questionaire': 'questionnaire', 'recomend': 'recommend',
  'refered': 'referred', 'relevent': 'relevant', 'religous': 'religious',
  'remeber': 'remember', 'repitition': 'repetition', 'resistence': 'resistance',
  'restaraunt': 'restaurant', 'rythm': 'rhythm', 'sacrilegous': 'sacrilegious',
  'sargent': 'sergeant', 'sieze': 'seize', 'sence': 'sense',
  'similer': 'similar', 'sincerly': 'sincerely', 'speach': 'speech',
  'strenght': 'strength', 'succede': 'succeed', 'successfull': 'successful',
  'supercede': 'supersede', 'suprise': 'surprise', 'temperment': 'temperament',
  'tendancy': 'tendency', 'threshhold': 'threshold', 'tommorow': 'tomorrow',
  'tounge': 'tongue', 'truely': 'truly', 'twelth': 'twelfth',
  'tyrany': 'tyranny', 'unforseen': 'unforeseen', 'unfortunatly': 'unfortunately',
  'upto': 'up to', 'useable': 'usable', 'usefull': 'useful',
  'vaccum': 'vacuum', 'visable': 'visible', 'wether': 'whether',
  'wich': 'which', 'yoour': 'your', 'youre': "you're",
  'cant': "can't", 'dont': "don't", 'wont': "won't", 'isnt': "isn't",
  'wasnt': "wasn't", 'arent': "aren't", 'havent': "haven't", 'hasnt': "hasn't",
  'didnt': "didn't", 'wouldnt': "wouldn't", 'shouldnt': "shouldn't",
  'couldnt': "couldn't", 'im': "I'm", 'ive': "I've", 'id': "I'd",
  'ill': "I'll", 'itd': "it'd", 'wed': "we'd", 'theyd': "they'd",
  'theyve': "they've", 'hes': "he's", 'shes': "she's", 'thats': "that's",
  'whats': "what's", 'whos': "who's", 'hows': "how's",
};

// Grammar pattern rules
interface GrammarRule {
  pattern: RegExp;
  suggestion: string;
  type: 'grammar';
  description: string;
}

const GRAMMAR_RULES: GrammarRule[] = [
  { pattern: /\b(a)\s+([aeiouAEIOU]\w*)/g, suggestion: 'an $2', type: 'grammar', description: 'Use "an" before vowel sounds' },
  { pattern: /\bi\b/g, suggestion: 'I', type: 'grammar', description: 'Capitalize the pronoun "I"' },
  { pattern: /\b(he|she|it)\s+(don't)\b/gi, suggestion: '$1 doesn\'t', type: 'grammar', description: 'Use "doesn\'t" with he/she/it' },
  { pattern: /\b(we|they|you)\s+(doesn't)\b/gi, suggestion: '$1 don\'t', type: 'grammar', description: 'Use "don\'t" with we/they/you' },
  { pattern: /\b(I)\s+(has)\b/gi, suggestion: 'I have', type: 'grammar', description: 'Use "have" with I' },
  { pattern: /\b(he|she|it)\s+(have)\b/gi, suggestion: '$1 has', type: 'grammar', description: 'Use "has" with he/she/it' },
  { pattern: /\b(they|we|you|I)\s+(is)\b/gi, suggestion: '$1 are', type: 'grammar', description: 'Use "are" with plural subjects' },
  { pattern: /\b(he|she|it)\s+(are)\b/gi, suggestion: '$1 is', type: 'grammar', description: 'Use "is" with he/she/it' },
  { pattern: /\b(more)\s+(\w+er)\b/gi, suggestion: '$2', type: 'grammar', description: 'Avoid double comparative' },
  { pattern: /\b(most)\s+(\w+est)\b/gi, suggestion: '$2', type: 'grammar', description: 'Avoid double superlative' },
  { pattern: /\b(very)\s+(unique|perfect|dead|infinite|complete|empty)\b/gi, suggestion: '$2', type: 'grammar', description: 'Absolute adjectives don\'t need "very"' },
  { pattern: /\b(less)\s+(\w+)\b(?=\s+(person|people|man|men|woman|women|child|children))/gi, suggestion: 'fewer $2', type: 'grammar', description: 'Use "fewer" with countable nouns' },
];

export function analyzeText(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = [];
  
  // Check spelling word by word
  const wordRegex = /\b[a-zA-Z']+\b/g;
  let match: RegExpExecArray | null;
  
  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0].toLowerCase().replace(/['']/g, "'");
    const correction = SPELLING_DICT[word];
    if (correction && correction.toLowerCase() !== word) {
      suggestions.push({
        original: match[0],
        suggestion: correction,
        type: 'spelling',
        offset: match.index,
        length: match[0].length,
      });
    }
  }

  // Check grammar patterns
  for (const rule of GRAMMAR_RULES) {
    rule.pattern.lastIndex = 0;
    let grammarMatch: RegExpExecArray | null;
    while ((grammarMatch = rule.pattern.exec(text)) !== null) {
      const suggested = grammarMatch[0].replace(rule.pattern, rule.suggestion);
      if (suggested.toLowerCase() !== grammarMatch[0].toLowerCase()) {
        suggestions.push({
          original: grammarMatch[0],
          suggestion: suggested,
          type: rule.type,
          offset: grammarMatch.index,
          length: grammarMatch[0].length,
        });
      }
    }
  }

  // Sort by offset, deduplicate overlapping
  suggestions.sort((a, b) => a.offset - b.offset);
  const deduped: GrammarSuggestion[] = [];
  let lastEnd = -1;
  for (const s of suggestions) {
    if (s.offset >= lastEnd) {
      deduped.push(s);
      lastEnd = s.offset + s.length;
    }
  }
  
  return deduped;
}

export function renderAnnotatedText(
  text: string,
  suggestions: GrammarSuggestion[]
): Array<{ text: string; suggestion?: GrammarSuggestion; isError: boolean }> {
  if (suggestions.length === 0) return [{ text, isError: false }];
  
  const parts: Array<{ text: string; suggestion?: GrammarSuggestion; isError: boolean }> = [];
  let cursor = 0;
  
  for (const sug of suggestions) {
    if (sug.offset > cursor) {
      parts.push({ text: text.slice(cursor, sug.offset), isError: false });
    }
    parts.push({
      text: text.slice(sug.offset, sug.offset + sug.length),
      suggestion: sug,
      isError: true,
    });
    cursor = sug.offset + sug.length;
  }
  
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), isError: false });
  }
  
  return parts;
}
