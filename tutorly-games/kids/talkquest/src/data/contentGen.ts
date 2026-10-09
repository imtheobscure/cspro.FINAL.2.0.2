export type WordKind =
  | 'food' | 'drink' | 'animal' | 'body' | 'clothes' | 'color' | 'shape'
  | 'number' | 'countword' | 'action' | 'ing' | 'feeling' | 'place' | 'person'
  | 'vehicle' | 'nature' | 'object' | 'time' | 'weather' | 'adj' | 'letter';

const SETS: Record<WordKind, string[]> = {
  food: ['apple','banana','orange','grapes','strawberry','watermelon','pear','peach','cherry','lemon','carrot','tomato','potato','onion','cucumber','broccoli','corn','pepper','lettuce','mushroom','bread','cheese','rice','pasta','soup','sandwich','pizza','egg','cake','cookie','ice cream','chocolate','salad','yogurt','cereal','toast','pancake','porridge','pie','cupcake','flour','sugar','salt','butter','dough','cookie','honey'],
  drink: ['milk','water','juice','tea','coffee'],
  animal: ['cat','dog','fish','goat','lion','owl','pig','cow','horse','sheep','chicken','rooster','duck','goose','donkey','puppy','kitten','rabbit','hamster','goldfish','parrot','turtle','tiger','elephant','giraffe','zebra','monkey','bear','panda','kangaroo','hippo','rhino','crocodile','snake','wolf','fox','deer','peacock','camel','sloth','dolphin','whale','shark','octopus','crab','lobster','starfish','jellyfish','seahorse','seal','penguin','bee','butterfly','ladybird','snail','worm','mouse'],
  body: ['head','hair','eye','ear','nose','mouth','tooth','tongue','neck','shoulder','arm','hand','finger','leg','knee','foot','toe','back','tummy','cheek'],
  clothes: ['shirt','t-shirt','trousers','dress','skirt','socks','shoes','boots','hat','cap','coat','jacket','scarf','gloves','pyjamas','belt','button','zip','pocket','uniform','swimsuit','sunhat'],
  color: ['red','blue','yellow','green','orange','purple','pink','brown','black','white','grey','gold','silver','rainbow','light','dark','bright'],
  shape: ['circle','square','triangle','rectangle','star','heart','oval','diamond','crescent','hexagon','pentagon','cube','sphere','cone','cylinder','arrow','line','curve','spiral','ring'],
  number: ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','zero'],
  countword: ['count','add','pair','dozen','half','first','second','third'],
  ing: ['camping','swimming','running','dancing','singing','writing','reading','drawing','painting','cooking','baking','shopping','fishing','hiking','gardening','climbing','skating','cycling','riding','knitting','cleaning','cooking','listening','speaking','playing','travelling','surfing','sailing'],
  action: ['run','walk','jump','swim','eat','drink','sing','dance','read','write','draw','listen','speak','look','climb','throw','catch','open','close','help','wake up','brush teeth','wash face','get dressed','study','play','tidy up','sleep','dream','stir','chop','boil','bake','pour','taste','dig','plant','grow','recycle','click','download'],
  feeling: ['happy','sad','angry','scared','excited','tired','surprised','shy','proud','calm','worried','bored','silly','brave','lonely','grateful','confused','jealous','kind','hopeful'],
  place: ['school','hospital','library','park','shop','bank','museum','cinema','restaurant','bakery','post office','station','airport','bridge','street','church','zoo','market','playground','fire station','house','kitchen','bedroom','bathroom','living room','garden','home','farm','barn','field','forest','mountain','river','lake','beach','island','theme park'],
  person: ['mother','father','sister','brother','baby','grandma','grandpa','aunt','uncle','cousin','family','parents','twin','teacher','student','doctor','nurse','farmer','chef','pilot','police officer','firefighter','artist','singer','dentist','vet','driver','builder','scientist','astronaut','baker','librarian','postman','engineer','friend','guest','captain','pirate','princess','prince','king','queen','witch','wizard','fairy','knight'],
  vehicle: ['car','bus','train','bicycle','motorbike','airplane','helicopter','boat','ship','submarine','rocket','truck','tractor','ambulance','fire engine','taxi','scooter','skateboard','tram','balloon'],
  nature: ['tree','flower','leaf','grass','rose','sunflower','tulip','daisy','seed','root','branch','stone','soil','cactus','sun','moon','star','earth','ocean','wave','shell','coral','seaweed'],
  object: ['backpack','pencil','pen','book','notebook','eraser','ruler','scissors','glue','crayon','desk','chair','board','bell','globe','map','lunchbox','clock','watch','lamp','mirror','sofa','bed','table','pot','pan','oven','fridge','kettle','sink','tent','torch','compass','ticket','balloon','present','camera','computer','phone','robot','drum','piano','guitar','violin'],
  time: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday','week','month','year','january','february','march','april','may','june','july','august','today','tomorrow','morning','noon','afternoon','evening','night','midnight','hour','minute','second','early','late'],
  weather: ['sunny','rainy','cloudy','windy','snowy','stormy','foggy','hot','cold','warm','cool','spring','summer','autumn','winter','umbrella','thunder','ice','puddle'],
  adj: ['big','small','fast','slow','tall','short','long','wide','clean','dirty','full','empty','loud','quiet','old','new','cheap','expensive','yummy','delicious','healthy','sick'],
  letter: ['apple','ball','cat','dog'],
};

const SLUG_KIND: Record<string, WordKind> = {
  'alphabet': 'letter', 'numbers-counting': 'number', 'colors': 'color', 'shapes': 'shape',
  'classroom-school': 'object', 'my-family': 'person', 'body-face': 'body', 'clothes': 'clothes',
  'toys-games': 'object', 'fruits-vegetables': 'food', 'food-drinks': 'food', 'meals': 'food',
  'my-house': 'place', 'kitchen-cooking': 'object', 'daily-routines': 'action', 'actions-verbs': 'action',
  'feelings-emotions': 'feeling', 'weather-seasons': 'weather', 'days-months': 'time', 'telling-time': 'time',
  'pets-farm-animals': 'animal', 'wild-animals-zoo': 'animal', 'sea-creatures': 'animal',
  'musical-instruments': 'object', 'nature-plants': 'nature', 'places-in-town': 'place',
  'jobs-occupations': 'person', 'vehicles-transport': 'vehicle', 'sports-exercise': 'object',
  'hobbies-free-time': 'action', 'park-playground': 'place', 'beach-seaside': 'place',
  'camping-outdoors': 'object', 'pirate-ship': 'object', 'fairy-tales': 'person',
  'birthday-party': 'object', 'in-the-garden': 'nature', 'farm-life': 'place',
  'shopping-stores': 'object', 'opposites-adjectives': 'adj', 'doctor-health': 'object',
  'space-planets': 'nature', 'earth-environment': 'nature', 'computers-tech': 'object',
  'art-painting': 'object', 'music-dance': 'action', 'cooking-baking': 'food',
  'pet-shop': 'animal', 'toyshop': 'object', 'theme-park': 'place',
  'dinosaurs': 'animal', 'five-senses': 'body', 'superheroes': 'person',
  'insects-bugs': 'animal', 'circus': 'place', 'road-safety': 'object',
};

function low(s: string) { return s.toLowerCase().trim(); }

/**
 * Words whose meaning changes with the theme, so the THEME decides the kind:
 * the "orange" in Colors is a colour, the one in Fruits is a fruit; the "star"
 * in Shapes is a shape, the one in Space is a night-sky thing. Without this the
 * word would get the wrong talk lines — "Make the mouse sound!" for a computer
 * mouse, "Say: See you at second" for the ordinal.
 */
const SLUG_WINS = new Set([
  'orange', 'star', 'light', 'dark', 'bright', 'top',
  'line', 'curve', 'wave', 'shell', 'grass', 'bell', 'board',
  'mouse', 'scale', 'bat', 'club', 'court', 'match', 'shower', 'iron',
]);

/**
 * Words whose meaning never changes and that no SET below lists, so they would
 * otherwise inherit the theme's kind: tableware would become "food" and a child
 * would be told to say "I like a fork".
 */
const WORD_KIND: Record<string, WordKind> = {
  glass: 'object', plate: 'object', bowl: 'object', fork: 'object',
  spoon: 'object', knife: 'object', cup: 'object', napkin: 'object',
  hungry: 'feeling', thirsty: 'feeling', delicious: 'adj',

  // Words nobody means two ways, that no SET lists either.
  helmet: 'object', 'seat belt': 'object', 'traffic light': 'object',
  pavement: 'object', road: 'object', 'car seat': 'object',
  'zebra crossing': 'object', 'candy floss': 'food', wing: 'object',
  nest: 'nature', web: 'object', buzz: 'action', crawl: 'action',
  cross: 'action', 'slow down': 'action', 'hold hands': 'action',
  stop: 'action', go: 'action', wait: 'action', safe: 'adj',
  careful: 'adj', sharp: 'adj', tiny: 'adj', funny: 'adj',
  clown: 'person', juggler: 'person', acrobat: 'person', crowd: 'person',

  // ── Things inside a home. "My house" is a PLACE theme, so without these every
  // piece of furniture would inherit it and the child would hear "Let us go to
  // the carpet" / "Is a shelf in the morning or at night?".
  door: 'object', window: 'object', roof: 'object', stairs: 'object',
  wardrobe: 'object', carpet: 'object', shelf: 'object', curtain: 'object',
  mirror: 'object', lamp: 'object', table: 'object', chair: 'object',
  sofa: 'object', bed: 'object', fridge: 'object', oven: 'object',
  cooker: 'object', sink: 'object', kettle: 'object', pot: 'object',
  pan: 'object', clock: 'object', torch: 'object', blanket: 'object',
  pillow: 'object', towel: 'object', basket: 'object',

  // ── "My family" is a PERSON theme and the five senses are a BODY theme, so
  // these three groups need saying out loud: "Say: This is the hug" is not a
  // sentence anybody can say.
  hug: 'action', smile: 'action', love: 'feeling', photo: 'object',
  together: 'adj', pet: 'animal',
  see: 'action', hear: 'action', smell: 'action', taste: 'action',
  touch: 'action',

  // ── Weather-theme nouns and adjectives that are not weather themselves:
  // "Today it is umbrella" was the old output.
  ice: 'object', umbrella: 'object', puddle: 'object', thunder: 'nature',

  // ── Colours theme names the paint, the shade and the word "colour" itself.
  paint: 'object', shade: 'object', colour: 'object', color: 'object',

  // ── Time-theme words that are not times.
  watch: 'object', early: 'adj', late: 'adj',

  // ── Counting words that are not numerals: "Can you show me count fingers?"
  // was the old output. They get the gentle `countword` lines instead.
  count: 'countword', add: 'countword', pair: 'countword',
  dozen: 'countword', half: 'countword', first: 'countword',
  second: 'countword', third: 'countword',

  // ── Garden tools are things, not plants.
  'watering can': 'object', bucket: 'object', spade: 'object', rake: 'object',

  // ── The circus is a PLACE theme; these are what you find there.
  popcorn: 'food', ring: 'object', tent: 'object', tickets: 'object',
  balloon: 'object', trapeze: 'object', caravan: 'object',

  // ── Music & dance is an ACTION theme, so its nouns would be told "I can beat,
  // I can costume". Each one goes back to what it is.
  song: 'object', rhythm: 'object', beat: 'object', melody: 'object',
  choir: 'object', band: 'object', concert: 'object', stage: 'object',
  microphone: 'object', speaker: 'object', ballet: 'object', 'hip hop': 'object',
  costume: 'clothes', applause: 'object', photography: 'ing',

  // ── Hobbies is an ACTION theme too: a puzzle, chess and a film are things.
  puzzles: 'object', chess: 'object', origami: 'object', movies: 'object',
  music: 'object', travel: 'action',

  // ── Cooking & baking is a FOOD theme, so its verbs read as food.
  mix: 'action', knead: 'action', measure: 'action', recipe: 'object',
  timer: 'object',

  // ── Fairy tales is a PERSON theme, so a castle and a wand were "a person".
  dragon: 'animal', unicorn: 'animal', castle: 'place', city: 'place',
  crown: 'object', wand: 'object', cape: 'clothes', mask: 'clothes',
  shield: 'object', badge: 'object', magic: 'object', spell: 'object',
  team: 'object', secret: 'object', power: 'object',
  'happy ending': 'object', fly: 'action', save: 'action', strong: 'adj',
  sky: 'nature',

  // ── Words that are also -ing but are not actions.
  swing: 'object', king: 'person', string: 'object', sibling: 'person',

  // ── Space is a NATURE theme, so a spaceship, an alien and gravity all read
  // as living things ("Does gravity need water to grow?").
  spaceship: 'vehicle', alien: 'person', satellite: 'object', orbit: 'object',
  gravity: 'object', universe: 'object',

  // ── Our Earth is a NATURE theme; these are the things on it, not the nature.
  rubbish: 'object', plastic: 'object', paper: 'object', air: 'object',
  'sun power': 'object', 'wind power': 'object', pollution: 'object',
  'clean up': 'action', protect: 'action', animal: 'animal',

  // ── Garden and superhero words that landed in the theme's kind.
  fence: 'object', hose: 'object', harvest: 'object', rescue: 'action',
};

/**
 * "-ing" words are ACTIONS but they are not verbs: a child cannot "can camping".
 * They get their own lines ("Say: I like camping."). The exceptions are the
 * -ing words that are nouns, which would otherwise lose their real lines.
 */
const ING_NOUNS = new Set([
  'morning', 'evening', 'spring', 'thing', 'anything', 'something', 'nothing',
  'everything', 'building', 'ceiling', 'pudding', 'icing', 'wedding', 'ring',
  'wing', 'evenings', 'feelings', 'string', 'darling', 'clothing',
]);

export function kindOf(slug: string, word: string): WordKind {
  const w = low(word);
  // `WORD_KIND` first: those are the words that mean the same thing in every
  // theme, and a couple of them (a watch, a ring, the ordinal "second") are ALSO
  // in `SLUG_WINS`, where the theme's reading of them is the wrong one.
  if (WORD_KIND[w]) return WORD_KIND[w];
  if (SLUG_WINS.has(w)) return SLUG_KIND[slug] ?? 'object';
  if (w.endsWith('ing') && !ING_NOUNS.has(w) && !w.includes(' ')) return 'ing';
  for (const [k, list] of Object.entries(SETS) as [WordKind, string[]][]) {
    if (list.includes(w)) return k;
  }
  return SLUG_KIND[slug] ?? 'object';
}

const VOWEL = /^[aeiou]/i;

/**
 * Words that take NO article, because they are uncountable, plural or a name.
 *
 * The old rule was "anything ending in s is plural", which turned a compass, a
 * cactus, a princess, an octopus and a canvas into "This is compass" — and a
 * list of 41 real words ending in s is small enough to keep by hand, which is
 * the only way to get every one of them right.
 */
const NO_ART = new Set([
  // Uncountable food and drink.
  'water','milk','rice','pasta','soup','juice','tea','coffee','honey','butter','sugar','salt','flour',
  'bread','cheese','toast','porridge','cereal','jam','meat','fruit','yogurt','chocolate','corn',
  'candy floss','popcorn','noodles','sweets','mustard','pepper','oil','ice cream','salad',
  // Meals, days and times.
  'breakfast','lunch','dinner','today','tomorrow',
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  // Uncountable things and subjects.
  'music','rain','snow','thunder','love','help','grass','tennis','chess','gymnastics',
  'homework','work','life','fun','food','news',
  // Plurals the banks actually use (a pair of, or a set of).
  'grapes','socks','shoes','boots','gloves','trousers','pyjamas','jeans','shorts','trainers',
  'scissors','glasses','sunglasses','headphones','binoculars','maracas','blocks','bones',
  'bubbles','puzzles','movies','parents','stairs','clothes','mittens','earrings',
  'building blocks','hold hands','wash hands','peas','beans','chips','olives','sweets',
  // More uncountables and collective nouns the banks use.
  'applause','magic','power','origami','music','popcorn','candy floss','ballet','hip hop',
  'rubbish','plastic','paper','air','sun power','wind power','pollution','gravity',
  // Names of places in the sky.
  'mars','venus','earth',
]);

export function art(word: string): string {
  const w = low(word);
  if (NO_ART.has(w)) return '';
  return VOWEL.test(w) ? 'an ' : 'a ';
}
export function A(word: string) { const a = art(word); return a ? a + low(word) : low(word); }
export function The(word: string) { return 'the ' + low(word); }

/**
 * A theme name, made ready for the middle of a sentence.
 *
 * Theme names are labels — “Vehicles & Transportation” is fine on a card, but
 * dropped into a story line it reads like a spreadsheet (“It is about vehicles
 * & transportation.”). This spells the ampersand out and lowercases, so the
 * generated stories and warm-ups stay the sort of English a small child hears.
 */
export function topicName(name: string) {
  return name
    .split(/[:—–]/)[0]
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function pick<T>(arr: T[], seed: string, salt = 0): T {
  let h = salt * 97;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

export function makeCcq(kind: WordKind, word: string, i: number, others: string[]): {
  q: string; options: string[]; correct: number; why: string; sayIt: string;
} {
  const w = low(word);
  const W = word;
  const an = A(word) || w;
  const the = The(word);

  /**
   * The question AND its two answers are written together, because a question
   * with mismatched options is unanswerable — the old bank had "Can we eat X?"
   * above the choices "I can see something X" and "Nothing in the world is X".
   * The second option is always a cheerful wrong answer a child can spot in a
   * second, never a confusing one.
   */
  const bank: { q: string; options: string[]; correct: number; why: string; sayIt: string }[] = [];

  if (kind === 'food' || kind === 'drink') {
    bank.push(
      { q: `Can we eat ${w}?`, options: [`Yes, we eat it.`, `No, we wear it.`], correct: 0, why: `Yes! ${W} is food. We eat it.`, sayIt: `Say: I like ${an}.` },
      { q: `Where does ${w} go?`, options: [`In my tummy`, `On my foot`], correct: 0, why: `Food goes in our mouth, not on our foot!`, sayIt: `Say: Yum! ${W}!` },
    );
  } else if (kind === 'animal') {
    bank.push(
      { q: `Is ${w} an animal or a person?`, options: [`An animal`, `A person`], correct: 0, why: `A ${w} is an animal. It is not a person.`, sayIt: `Say: Look at the ${w}!` },
      { q: `Can a ${w} talk like you and me?`, options: [`No, it makes animal sounds`, `Yes, it can read a book`], correct: 0, why: `Animals make sounds. What sound does a ${w} make?`, sayIt: `Make the ${w} sound, then say ${W}.` },
    );
  } else if (kind === 'body') {
    bank.push(
      { q: `Where is your ${w}?`, options: [`On my body`, `In my bag`], correct: 0, why: `Your ${w} is part of you.`, sayIt: `Say: This is my ${w}.` },
      { q: `Is your ${w} a body part or a toy?`, options: [`A body part`, `A toy`], correct: 0, why: `It is part of you — you cannot buy it in a shop.`, sayIt: `Say: I use my ${w} every day.` },
    );
  } else if (kind === 'clothes') {
    bank.push(
      { q: `Do we wear ${w} or eat ${w}?`, options: [`We wear it`, `We eat it`], correct: 0, why: `We wear ${w}. It is not food.`, sayIt: `Say: I am wearing ${an}.` },
      { q: `When do we put on ${w}?`, options: [`When we get dressed`, `When we are asleep`], correct: 0, why: `We get dressed in the morning, or when it is cold.`, sayIt: `Say: Please help me put on ${an}.` },
    );
  } else if (kind === 'color') {
    bank.push(
      { q: `Is ${w} a colour or a food?`, options: [`A colour`, `A food`], correct: 0, why: `Yes! ${W} is a colour.`, sayIt: `Say: My favourite colour is ${w}.` },
      { q: `Can you point to something ${w}?`, options: [`Yes, here it is!`, `No, nothing is ${w}`], correct: 0, why: `Colours are all around us. Look!`, sayIt: `Say: This is ${w}.` },
    );
  } else if (kind === 'shape') {
    bank.push(
      { q: `Is a ball round like ${an}?`, options: [`Yes, a ball is round`, `No, a ball is square`], correct: 0, why: `A ball is round, like a circle.`, sayIt: `Say: It looks like ${an}.` },
      { q: `Can you draw ${an} in the air with your finger?`, options: [`Yes, watch me!`, `No, I cannot`], correct: 0, why: `Your finger can draw it. Try!`, sayIt: `Say: This is ${an}.` },
    );
  } else if (kind === 'number') {
    bank.push(
      { q: `Can you count to ${w}?`, options: [`Yes, listen!`, `No, I cannot`], correct: 0, why: `Count out loud, one number at a time.`, sayIt: `Count out loud: one, two… up to ${w}.` },
      { q: `Is ${w} a number or an animal?`, options: [`A number`, `An animal`], correct: 0, why: `${W} is a number. Numbers tell us how many.`, sayIt: `Say: I have ${w} toys.` },
    );
  } else if (kind === 'countword') {
    bank.push(
      { q: `Is ${w} a number word or an animal?`, options: [`A number word`, `An animal`], correct: 0, why: `We use number words when we count.`, sayIt: `Say the word: ${W}.` },
      { q: `Do we use ${w} when we count?`, options: [`Yes, we do`, `No, never`], correct: 0, why: `Counting words help us say how many.`, sayIt: `Say: ${W}. Count with me.` },
    );
  } else if (kind === 'action') {
    bank.push(
      { q: `Can you ${w} right now?`, options: [`Yes, watch me!`, `No, not right now`], correct: 0, why: `${W} is something we do. Show me!`, sayIt: `Say: I can ${w}.` },
      { q: `Do you like to ${w}?`, options: [`Yes, I do`, `No, I do not`], correct: 0, why: `Both answers are good. Now say more!`, sayIt: `Say: I like to ${w} because…` },
    );
  } else if (kind === 'ing') {
    // "camping", "painting", "swimming" — a child cannot "can" these, so the
    // questions ask about liking and going, which work for every -ing word.
    bank.push(
      { q: `Do you like ${w}?`, options: [`Yes, I love it!`, `No, not really`], correct: 0, why: `Both answers are fine. Now tell me why.`, sayIt: `Say: I like ${w}.` },
      { q: `Is ${w} something you DO or something you EAT?`, options: [`Something you do`, `Something you eat`], correct: 0, why: `${W} is something we do.`, sayIt: `Say: I go ${w}.` },
    );
  } else if (kind === 'feeling') {
    bank.push(
      { q: `Do you feel ${w} today?`, options: [`Yes, I do`, `No, not today`], correct: 0, why: `Both answers are okay. Now tell me why.`, sayIt: `Say: I feel ${w} today.` },
      { q: `Is it okay to feel ${w}?`, options: [`Yes, it is okay`, `No, never`], correct: 0, why: `All feelings are okay. They come and go.`, sayIt: `Say: Sometimes I feel ${w}.` },
    );
  } else if (kind === 'place') {
    bank.push(
      { q: `Do we go to ${the} to walk and play?`, options: [`Yes, we go there`, `No, we never go`], correct: 0, why: `${W} is a real place near our town.`, sayIt: `Say: Let us go to the ${w}.` },
      { q: `What do we do at the ${w}?`, options: [`Tell me one thing`, `Nothing at all`], correct: 0, why: `Every place has a job. What is this one for?`, sayIt: `Say: I go to the ${w}.` },
    );
  } else if (kind === 'person') {
    bank.push(
      { q: `Is ${w} a person?`, options: [`Yes`, `No`], correct: 0, why: `Yes! ${W} is a person with a job.`, sayIt: `Say: This is the ${w}.` },
      { q: `What does a ${w} do?`, options: [`Tell me one thing`, `Nothing at all`], correct: 0, why: `Every person helps in some way.`, sayIt: `Say: The ${w} helps us.` },
    );
  } else if (kind === 'vehicle') {
    bank.push(
      { q: `Does ${w} move or stay still?`, options: [`It moves!`, `It never moves`], correct: 0, why: `${W} takes people from place to place.`, sayIt: `Say: The ${w} is fast!` },
      { q: `Where do we see ${w}?`, options: [`On the road or in the sky`, `In my pocket`], correct: 0, why: `Think about where you have seen one.`, sayIt: `Say: I can see ${an}.` },
    );
  } else if (kind === 'nature') {
    bank.push(
      { q: `Can you find ${w} outside?`, options: [`Yes, outside`, `No, only in a shop`], correct: 0, why: `Nature is outside. Look out of the window.`, sayIt: `Say: I like the ${w}.` },
      { q: `Does ${w} need water to grow?`, options: [`Yes, it does`, `No, it does not`], correct: 0, why: `Living things need water.`, sayIt: `Say: I can see ${an}.` },
    );
  } else if (kind === 'object') {
    bank.push(
      { q: `Is ${w} a thing or an animal?`, options: [`A thing`, `An animal`], correct: 0, why: `${W} is a thing, not an animal.`, sayIt: `Say: This is ${an}.` },
      { q: `What do we use ${w} for?`, options: [`Tell me one thing`, `Nothing at all`], correct: 0, why: `Every thing has a job. What is this one for?`, sayIt: `Say: I use ${an}.` },
      { q: `Is ${w} something we use?`, options: [`Yes, we use it`, `No, never`], correct: 0, why: `We use it to help us do something.`, sayIt: `Say: I use ${an}.` },
    );
  } else if (kind === 'time') {
    bank.push(
      { q: `Is ${w} in the morning or at night?`, options: [`I know! Let me say`, `Always at night`], correct: 0, why: `Think about your own day.`, sayIt: `Say: See you at ${w}.` },
      { q: `Is ${w} a time word or an animal?`, options: [`A time word`, `An animal`], correct: 0, why: `Time words help us plan our day.`, sayIt: `Say: ${W} is my favourite time.` },
    );
  } else if (kind === 'weather') {
    bank.push(
      { q: `If it is ${w}, what do we wear?`, options: [`Let us decide together`, `A swimming hat`], correct: 0, why: `Weather tells us what to wear.`, sayIt: `Say: Today it is ${w}.` },
      { q: `Is ${w} about the sky or about food?`, options: [`About the sky`, `About food`], correct: 0, why: `Weather happens in the sky.`, sayIt: `Say: It is ${w} outside.` },
    );
  } else if (kind === 'adj') {
    bank.push(
      { q: `Does ${w} tell us what something is like?`, options: [`Yes, it does`, `No, it is a name`], correct: 0, why: `${W} describes a thing.`, sayIt: `Say: This is ${w}.` },
      { q: `Can you find something ${w}?`, options: [`Yes, here it is!`, `No, I cannot`], correct: 0, why: `Look around the room.`, sayIt: `Say: This one is ${w}.` },
    );
  } else {
    bank.push(
      { q: `Is this ${an}?`, options: [`Yes, it is`, `No, it is not`], correct: 0, why: `Look at the picture and name it.`, sayIt: `Say: This is ${an}.` },
      { q: `Where do we use ${an}?`, options: [`At school or at home`, `On the moon`], correct: 0, why: `Words live in real life.`, sayIt: `Say: I use ${an}.` },
    );
  }

  const chosen = pick(bank, word, i);
  return chosen;
}


export type StoryPack = {
  title: string;
  hero: string;
  pal: string;
  pages: { text: string; ask: string; art: string }[];
  comp: { q: string; options: string[]; correct: number; discuss: string }[];
  warmUp: string;
  speaking: string[];
};

export function storyFor(slug: string, name: string, icon: string, words: { english: string; emoji: string }[]): StoryPack {
  const w = (i: number) => words[i % words.length];
  const a0 = w(0), a1 = w(1), a2 = w(2), a3 = w(3), a4 = w(4), a5 = w(5);
  const n = (i: number) => low(w(i).english);
  /** Bare words, for a speaking task where an article would read strangely. */
  const w0 = n(0), w1 = n(1);
  /**
   * Some vocabulary is an ACTION, not a thing: “run”, “wake up”, “get dressed”.
   * A child must learn those words, but “a run” and “an eat breakfast” are not
   * English — a story that says “It was behind an eat breakfast” teaches the
   * wrong thing. For those, the story talks about the word itself; for real
   * nouns it uses the ordinary article, so nothing else changes.
   */
  const isPhrase = (i: number) =>
    (['action', 'ing', 'countword'] as WordKind[]).includes(kindOf(slug, w(i).english) as WordKind);
  /** “a kite” / “an egg”, or “the wake up card” when the word is an action. */
  const aOf = (i: number) => (isPhrase(i) ? `the ${n(i)} card` : A(w(i).english));
  /** The same, ready to sit after “behind” / “near”: “the kite”. */
  const theOf = (i: number) => (isPhrase(i) ? `the ${n(i)} card` : `the ${n(i)}`);

  const plots: Record<string, StoryPack> = {
    'alphabet': {
      title: 'Pip’s Letter Hunt', hero: 'Pip', pal: 'Nia',
      warmUp: 'Trace a letter in the air. Now shout that letter!',
      speaking: ['Spell your name out loud.', 'Find something that starts with B.', 'Teach your tutor one letter sound.'],
      pages: [
        { text: `Pip the fox lost the letters of his name! “P… I… P. Where did they go?”`, ask: 'What is Pip looking for?', art: '🔤' },
        { text: `Nia found ${A(a0.english)} on the path. “This starts with A!” she laughed.`, ask: `What did Nia find?`, art: a0.emoji },
        { text: `Behind a tree sat a ${n(1)} and a ${n(2)}. Two more sounds!`, ask: 'How many things are behind the tree?', art: a1.emoji },
        { text: `The last letter was stuck on a ${n(3)}. Pip jumped to get it.`, ask: 'Was Pip careful or wild? Why?', art: a3.emoji },
        { text: `P-I-P! Pip stuck the letters on his bag. “Thank you, Nia. We did it.”`, ask: 'How do you spell YOUR name?', art: '🎒' },
      ],
      comp: [
        { q: 'What did Pip lose?', options: ['The letters of his name', 'His shoes', 'A rocket'], correct: 0, discuss: 'Say: “Pip lost his letters.”' },
        { q: 'Who helped Pip?', options: ['Nia', 'A dragon', 'Nobody'], correct: 0, discuss: 'Who helps you at home?' },
      ],
    },
    'numbers-counting': {
      title: 'Five Lost Balloons', hero: 'Omar', pal: 'Lila',
      warmUp: 'Count your fingers. Start at one. Go!',
      speaking: ['Count ten things in the room.', 'Give me three claps.', 'What number comes after seven?'],
      pages: [
        { text: `Omar bought balloons for Lila. He counted: one, two, three, four, five.`, ask: 'How many balloons?', art: '🎈' },
        { text: `The wind took two balloons. “Oh no! How many are left?”`, ask: 'Five take away two is…?', art: '💨' },
        { text: `Two more balloons hid in the long grass. Now they had four? Or three? Count again!`, ask: 'Why do we count again?', art: a0.emoji },
        { text: `A kind girl gave them two more. Add them up.`, ask: 'What is three plus two?', art: '🤝' },
        { text: `At last Lila held five balloons. “Thank you! Five is a happy number.”`, ask: 'What is YOUR lucky number?', art: '5️⃣' },
      ],
      comp: [
        { q: 'How many balloons did Omar buy at the start?', options: ['Five', 'One', 'Twenty'], correct: 0, discuss: 'Hold up five fingers.' },
        { q: 'What took the balloons away?', options: ['The wind', 'A shark', 'Homework'], correct: 0, discuss: 'Say: “The wind took two balloons.”' },
      ],
    },
    'colors': {
      title: 'The Day the Paint Ran Away', hero: 'Mei', pal: 'Ben',
      warmUp: 'Point to three colours you are wearing. Name them!',
      speaking: ['What colour is your bag?', 'Mix two colours. What do you get?', 'Say: “My favourite colour is…”'],
      pages: [
        { text: `Mei opened her paint box. Red was missing! “Who took red?”`, ask: 'Which colour is missing?', art: '🔴' },
        { text: `Ben looked under ${A(a0.english)} chair. No red. Only dust.`, ask: 'Where did Ben look?', art: a0.emoji },
        { text: `They mixed yellow and a little blue by mistake. “Hey! That is green!”`, ask: 'What two colours make green?', art: '🟢' },
        { text: `Red was on Mei’s nose the whole time. She had touched the lid.`, ask: 'Where was red?', art: '👃' },
        { text: `They painted a rainbow together: red, orange, yellow, green, blue, purple.`, ask: 'Can you say the rainbow colours?', art: '🌈' },
      ],
      comp: [
        { q: 'Which colour went missing?', options: ['Red', 'Black', 'Gold'], correct: 0, discuss: 'Point to something red.' },
        { q: 'Where was the red paint?', options: ['On Mei’s nose', 'On the moon', 'In the fridge'], correct: 0, discuss: 'Say: “It was on her nose!”' },
      ],
    },
    'fruits-vegetables': {
      title: 'The Picky Picnic', hero: 'Yara', pal: 'Theo',
      warmUp: 'Rub your tummy and say “I’m hungry!”',
      speaking: ['Name a fruit you love.', 'Name a vegetable you do not love — yet.', 'Ask: “Would you like a bite?”'],
      pages: [
        { text: `Yara packed a picnic. Theo said, “I only eat chips.” Yara smiled. “Try one new thing.”`, ask: 'What does Theo like to eat?', art: '🧺' },
        { text: `First she gave him ${A(a0.english)}. Crunch! “Okay… it is sweet.”`, ask: `Did Theo like the ${n(0)}?`, art: a0.emoji },
        { text: `Then came ${A(a1.english)}. Theo made a funny face, then a happy face.`, ask: 'Why did his face change?', art: a1.emoji },
        { text: `A bug sat on the ${n(2)}. They blew it away gently. “Go home, little bug.”`, ask: 'Were they kind to the bug?', art: a2.emoji },
        { text: `At the end Theo said, “Fruit and veg are colours you can eat.” He asked for more.`, ask: 'What will YOU try next?', art: '🥗' },
      ],
      comp: [
        { q: 'What did Yara want Theo to do?', options: ['Try one new food', 'Throw the picnic', 'Sleep'], correct: 0, discuss: 'Say a food you will try.' },
        { q: 'What sat on the food?', options: ['A bug', 'A bus', 'A king'], correct: 0, discuss: 'What do we do if a bug is on food?' },
      ],
    },
    'food-drinks': {
      title: 'Café Pip Is Open!', hero: 'Pip', pal: 'Omar',
      warmUp: 'Put on an apron (pretend). Say: “Welcome to my café!”',
      speaking: ['Take your tutor’s order.', 'Say “Here you are.”', 'Ask “Would you like water or juice?”'],
      pages: [
        { text: `Pip opened a tiny café. The first guest wanted ${A(a0.english)} and a cup of ${n(8)}.`, ask: 'What two things did the guest want?', art: '☕' },
        { text: `Omar dropped the ${n(1)}. “Sorry!” He wiped it up. It is okay to drop things.`, ask: 'What do we say when we drop something?', art: a1.emoji },
        { text: `A child asked, “Is the ${n(2)} hot?” Pip tested it. “It is warm. Safe to eat.”`, ask: 'Why do we check if food is hot?', art: a2.emoji },
        { text: `They made a menu with pictures so little kids could point.`, ask: 'Why are pictures on a menu helpful?', art: '📋' },
        { text: `At closing time they shared the last ${n(3)}. “Good food tastes better with friends.”`, ask: 'Who do you like to eat with?', art: a3.emoji },
      ],
      comp: [
        { q: 'What did Pip open?', options: ['A café', 'A zoo', 'A spaceship'], correct: 0, discuss: 'What is a café?' },
        { q: 'How did they help little kids order?', options: ['Pictures on the menu', 'Shouting', 'Hiding the food'], correct: 0, discuss: 'Point to what you would order.' },
      ],
    },
    'pets-farm-animals': {
      title: 'Who Left the Gate Open?', hero: 'Ben', pal: 'Nia',
      warmUp: 'Make three animal sounds. Can your tutor guess them?',
      speaking: ['What pet would you like?', 'How do we take care of a pet?', 'Say: “Please close the gate.”'],
      pages: [
        { text: `The farm gate was open. The ${n(0)} was in the garden eating flowers!`, ask: 'Which animal went out first?', art: a0.emoji },
        { text: `Nia called, “Here, ${n(1)}!” The ${n(1)} came… then ran the other way.`, ask: 'Did the animal listen?', art: a1.emoji },
        { text: `Ben put a bucket of food by the barn. The ${n(2)} followed the smell home.`, ask: 'Why did food help?', art: a2.emoji },
        { text: `They counted every animal. One ${n(3)} was still missing.`, ask: 'Why do farmers count animals?', art: a3.emoji },
        { text: `The missing one was asleep under the tractor. They closed the gate and laughed.`, ask: 'What should we always do with a gate?', art: '🚜' },
      ],
      comp: [
        { q: 'Why did the animals get out?', options: ['The gate was open', 'They had keys', 'It was snowing soup'], correct: 0, discuss: 'Say: “Please close the gate.”' },
        { q: 'Where was the last animal?', options: ['Under the tractor', 'On the moon', 'In the fridge'], correct: 0, discuss: 'Where do you like to nap?' },
      ],
    },
    'wild-animals-zoo': {
      title: 'A Quiet Day at the Zoo', hero: 'Lila', pal: 'Mei',
      warmUp: 'Walk like a giraffe. Now tiptoe like a mouse.',
      speaking: ['Which zoo animal is your favourite?', 'Is a lion a pet? Why not?', 'Say: “Please do not shout.”'],
      pages: [
        { text: `Lila said very quietly, “The ${n(0)} is sleeping. We must be quiet.”`, ask: 'Why do we talk quietly at the zoo?', art: a0.emoji },
        { text: `Mei wanted to roar at the ${n(1)}. A keeper said, “Let them rest. Watch with your eyes.”`, ask: 'What did the keeper ask them to do?', art: a1.emoji },
        { text: `They compared necks. The ${n(2)} had the longest!`, ask: 'Which animal has a long neck?', art: a2.emoji },
        { text: `A toddler cried. The ${n(3)} looked over. Lila said, “It’s okay. The animal is safe in its home.”`, ask: 'Are zoo animals toys?', art: a3.emoji },
        { text: `They drew their favourite animal on the bus home and used the new words.`, ask: 'Which animal would you draw?', art: '🖍️' },
      ],
      comp: [
        { q: 'What must we be at the zoo?', options: ['Quiet and kind', 'Loud and running', 'Asleep on the lion'], correct: 0, discuss: 'Why do animals need rest?' },
        { q: 'Who told them not to roar?', options: ['The keeper', 'The ice-cream man', 'A robot'], correct: 0, discuss: 'Who helps animals at the zoo?' },
      ],
    },
    'feelings-emotions': {
      title: 'The Feeling Weather Inside', hero: 'Theo', pal: 'Yara',
      warmUp: 'Show a happy face, a sad face, then a brave face.',
      speaking: ['How do you feel right now? Why?', 'What helps you when you are angry?', 'Ask your tutor: “How do you feel?”'],
      pages: [
        { text: `Theo’s tower fell down. He felt ${n(2)} and hot in his cheeks.`, ask: 'What feeling is that?', art: a2.emoji },
        { text: `Yara sat next to him. She did not say “Don’t cry.” She said, “I am here.”`, ask: 'Was that kind?', art: '🤝' },
        { text: `They named the feeling. “I am ${n(2)} because my tower broke.” Naming it made it smaller.`, ask: 'Why does naming a feeling help?', art: '🗣️' },
        { text: `They built the tower again, slower. Theo felt ${n(0)} when the last block stayed.`, ask: 'How did the feeling change?', art: a0.emoji },
        { text: `At bedtime Theo said, “Feelings move like weather. Storms end.”`, ask: 'What weather is inside you now?', art: '🌦️' },
      ],
      comp: [
        { q: 'Why was Theo upset?', options: ['His tower fell', 'He lost a dinosaur', 'He ate a cloud'], correct: 0, discuss: 'Tell about a time something broke.' },
        { q: 'What kind thing did Yara say?', options: ['I am here', 'Go away', 'I win'], correct: 0, discuss: 'Practise saying “I am here.”' },
      ],
    },
    'space-planets': {
      title: 'A Postcard from the Moon', hero: 'Nia', pal: 'Pip',
      warmUp: 'Count down from 5 to 1, then jump: blast off!',
      speaking: ['Would you like to visit the moon? Why?', 'Name two things in the night sky.', 'Say: “The rocket is ready.”'],
      pages: [
        { text: `Nia packed a snack and a helmet. “We are visiting the ${n(1)} tonight.”`, ask: 'Where are they going?', art: a1.emoji },
        { text: `Pip bounced. “There is less pull here! I am as light as a feather.”`, ask: 'Why do we bounce on the moon?', art: '🪶' },
        { text: `They looked back and saw the ${n(3)} — a blue marble in the black sky.`, ask: 'What is the blue marble?', art: a3.emoji },
        { text: `${A(a4.english)} zoomed past. Nia waved. “Hello, traveller!”`, ask: 'What zoomed past?', art: a4.emoji },
        { text: `They wrote a postcard: Wish you were here! Jumping is fun. Come and see.`, ask: 'What would YOU write from space?', art: '💌' },
      ],
      comp: [
        { q: 'Where did they go?', options: ['The moon', 'The swimming pool', 'The supermarket'], correct: 0, discuss: 'Say: “They went to the moon.”' },
        { q: 'What did the Earth look like?', options: ['A blue marble', 'A sandwich', 'A bus'], correct: 0, discuss: 'Why must we look after Earth?' },
      ],
    },
    'birthday-party': {
      title: 'The Cake That Almost Hid', hero: 'Omar', pal: 'Lila',
      warmUp: 'Sing the first line of Happy Birthday — slowly.',
      speaking: ['How old are you?', 'What present would you like?', 'Invite your tutor: “Please come to my party.”'],
      pages: [
        { text: `It was Lila’s birthday. Omar hid the ${n(1)} in the kitchen.`, ask: 'What did Omar hide?', art: a1.emoji },
        { text: `The ${n(3)} popped too early. Everyone laughed. “Surprise… almost!”`, ask: 'What popped?', art: a3.emoji },
      { text: `Lila closed her eyes and made a ${n(9)}. She did not tell anyone. Wishes are secret.`, ask: 'Do we have to say our wish?', art: '⭐' },
        { text: `They played a game with the ${n(2)}. The smallest child won a sticker.`, ask: 'Who won?', art: a2.emoji },
        { text: `At the door Lila said, “Thank you for coming.” Those four words were the best present.`, ask: 'What polite words did she use?', art: '🎁' },
      ],
      comp: [
        { q: 'Whose birthday was it?', options: ['Lila’s', 'The balloon’s', 'The moon’s'], correct: 0, discuss: 'When is YOUR birthday?' },
        { q: 'What were the best four words?', options: ['Thank you for coming', 'Give me more cake', 'Go home now'], correct: 0, discuss: 'Practise “Thank you for coming.”' },
      ],
    },
  };

  const heroes = ['Pip the fox', 'Nia', 'Omar', 'Lila', 'Mei', 'Ben', 'Yara', 'Theo'] as const;
  const hero = pick([...heroes], slug, 1);
  const pal = pick([...heroes].filter(h => h !== hero), slug, 2);
  const twists = [
    {
      title: isPhrase(0) ? `${hero} and the Missing Card` : `${hero} and the Missing ${a0.english}`,
      pages: [
        {
          text: isPhrase(0)
            ? `${hero} ran into class. “Who took my card? The one with ${n(0)} on it?” Nobody had.`
            : `${hero} ran into class. “Has anyone seen my ${n(0)}?” Nobody had.`,
          ask: `What is missing?`, art: a0.emoji,
        },
        { text: `${pal} looked in a box. Only ${aOf(1)} was inside. “Not this.”`, ask: `What was in the box?`, art: a1.emoji },
        { text: `They asked a helper, “Excuse me, have you seen ${aOf(0)}?”`, ask: 'What polite words did they use?', art: a2.emoji },
        { text: `They found a small mark on the floor. It led to ${aOf(3)}. Getting closer!`, ask: 'How do we look for something that is lost?', art: a3.emoji },
        { text: `It was behind ${theOf(4)} the whole time. ${hero} smiled. “I will put a name sticker on it.”`, ask: 'How can we not lose things?', art: a4.emoji },
      ],
      askEnd: 'a name sticker',
    },
    {
      title: 'The Rainy Day',
      pages: [
        { text: `Rain hit the window. “We cannot go out,” said ${hero}. “Then we have our lesson inside,” said ${pal}.`, ask: 'Why are they staying in?', art: '🌧️' },
        { text: `They drew ${aOf(0)} as big as the paper. “Tell me three things about it,” said ${pal}.`, ask: `Tell me three things about ${n(0)}.`, art: a0.emoji },
        { text: `${hero} acted out ${theOf(1)}. ${pal} guessed wrong, then right.`, ask: 'Can you act this word for your tutor?', art: a1.emoji },
        { text: `They built a tiny world with ${aOf(2)} and ${aOf(3)} from craft boxes.`, ask: 'What did they build with?', art: a2.emoji },
        { text: `The rain stopped. They put on coats and went outside to play.`, ask: 'What do they do when the rain stops?', art: a4.emoji },
      ],
      askEnd: 'go outside',
    },
    {
      title: `${pal}’s Surprise Lesson`,
      pages: [
        { text: `${pal} put a cloth over a tray. “Guess what is under here. I think you will like it.”`, ask: 'What is under the cloth?', art: '🪄' },
        { text: `Lift the cloth! It is ${aOf(0)}! ${hero} shouted the word before thinking — perfect.`, ask: 'Why is shouting the word okay here?', art: a0.emoji },
        { text: `Next one: a sound. ${pal} made the sound for ${theOf(1)}. ${hero} covered both ears, then guessed.`, ask: 'What sound would YOU make?', art: a1.emoji },
        { text: `Last one: a smell or a colour for ${theOf(2)}. This one is hard!`, ask: `What colour or smell fits ${n(2)}?`, art: a2.emoji },
        { text: `They swapped. Now ${hero} was the teacher. “Your turn to guess, ${pal}.”`, ask: 'Do you like being the teacher?', art: '⭐' },
      ],
      askEnd: 'be the teacher',
    },
  ];
  const twist = pick(twists, slug, 4);

  const fallback: StoryPack = {
    title: twist.title,
    hero,
    pal,
    warmUp: pick([
      `Clap twice and say: “${name}! I am ready.”`,
      'Show me with your face: are you excited?',
      `Tell me one word you know about ${topicName(name)}.`,
    ], slug, 5),
    speaking: [
      `Which do you like more: ${w0} or ${w1}? Tell me why.`,
      `Teach your tutor the word “${a2.english}” like YOU are the teacher.`,
      `Ask your tutor something using the word “${a3.english}”.`,
      `Tell me about ${aOf(4)}: colour, size, how it feels.`,
      `Tell a short story that uses two new words.`,
    ],
    pages: twist.pages,
    comp: [
      { q: `What is the story about?`, options: [name, 'A quiet classroom', 'Sleepy chairs'], correct: 0, discuss: `Say: “The story is about ${topicName(name)}.”` },
      { q: `Which word do you hear first?`, options: [a0.english, 'A tall tower', a5.english], correct: 0, discuss: `Say: “It was ${aOf(0)}.”` },
      { q: `Who helped in the story?`, options: [pal, 'A silly robot', 'Nobody at all'], correct: 0, discuss: 'Who helps you learn?' },
      { q: `How does the story end?`, options: ['They find it and talk a lot', 'They give up', 'They fly to the moon'], correct: 0, discuss: 'How did YOU feel at the end?' },
    ],
  };

  const chosen = plots[slug] ?? fallback;
  // Pad the comprehension up to four questions WITHOUT touching the shared
  // plot objects: `buildLesson` runs again on every render, and mutating the
  // module-level array added the same question twice on the second render.
  const comp = chosen.comp.length >= 4
    ? chosen.comp.slice(0, 4)
    : [...chosen.comp, ...fallback.comp.slice(chosen.comp.length, 4)];
  const speaking = chosen.speaking.length >= 5
    ? chosen.speaking.slice(0, 5)
    : [...chosen.speaking, ...fallback.speaking].slice(0, 5);

  return { ...chosen, comp, speaking };
}
