import type { Media } from "./build";

export type DebateTopic = {
  id: string;
  motion: string;
  hook: string;
  cefr: string;
  heat: 1 | 2 | 3;
  tags: string[];
  context: string;
  media: Media[];
  forArguments: { claim: string; evidence: string; language: string }[];
  againstArguments: { claim: string; evidence: string; language: string }[];
  vocabulary: { word: string; meaning: string; example: string }[];
  frames: { function: string; phrases: string[] }[];
  followUps: string[];
  curveball: string;
};

const img = (url: string, caption: string, notice: string): Media => ({ type: "image", url, caption, notice });
const motion = (caption: string, notice: string): Media => ({ type: "motion", caption, notice });

export const DEBATE_TOPICS: DebateTopic[] = [
  { id: "db1", motion: "This house would ban smartphones for everyone under sixteen.", hook: "Childhood, or surveillance with a screen?", cefr: "B1+", heat: 3,
    tags: ["technology", "education", "family"],
    context: "Several countries have restricted phones in schools. Campaigners now want a full ban until sixteen; others say a ban teaches nothing and simply delays the problem.",
    media: [img("https://picsum.photos/seed/phones-teens/960/540", "A classroom of teenagers, every head angled down.", "Notice how the posture itself becomes an argument."),
      motion("Animated split screen: a playground in 1998 vs a playground now.", "Ask the class which side they'd choose and why.")],
    forArguments: [
      { claim: "Attention is being sold, not spent.", evidence: "Apps are designed with variable rewards, the same mechanic as slot machines.", language: "Passive voice: 'young people are being targeted…'" },
      { claim: "Sleep collapses before grades do.", evidence: "Late-night scrolling pushes bedtimes back by over an hour on school nights.", language: "Cause and effect: 'which leads to…'" },
      { claim: "Bullying no longer stops at the school gate.", evidence: "Online abuse follows a child into their bedroom.", language: "No longer / not any more" }],
    againstArguments: [
      { claim: "Bans postpone learning instead of teaching it.", evidence: "A sixteen-year-old with a first phone is a beginner in an adult system.", language: "Instead of + -ing" },
      { claim: "Phones are lifelines for some children.", evidence: "Carers, disabled students and children in unsafe homes rely on them.", language: "Concession: 'While it's true that…'" },
      { claim: "Enforcement punishes the poorest families.", evidence: "Wealthier households can supply alternatives; others cannot.", language: "Comparatives with 'whereas'" }],
    vocabulary: [
      { word: "addictive by design", meaning: "built deliberately to keep you using it", example: "These feeds are addictive by design, not by accident." },
      { word: "blanket ban", meaning: "a rule with no exceptions", example: "A blanket ban ignores the children who need a phone most." },
      { word: "digital literacy", meaning: "the skill of using technology critically", example: "Digital literacy should be taught like swimming." },
      { word: "unenforceable", meaning: "impossible to apply in practice", example: "A law nobody can enforce is theatre." }],
    frames: [
      { function: "Opening a case", phrases: ["Our case rests on one idea:", "We're not arguing that…, we're arguing that…"] },
      { function: "Rebutting", phrases: ["That would be true if…, but", "My opponent has confused X with Y."] },
      { function: "Conceding to win", phrases: ["I'll grant them that point, and it still doesn't help them because…"] }],
    followUps: ["At what age did you get your first phone, and was it too early?", "Should parents be able to read a child's messages?", "What would you ban instead?"],
    curveball: "Halfway through, swap sides. Each speaker must argue the case they just attacked." },

  { id: "db2", motion: "This house believes working from home is bad for young careers.", hook: "Freedom for some, invisibility for others.", cefr: "B1+", heat: 2,
    tags: ["work", "generations"],
    context: "Remote work suits experienced staff with networks. Juniors say they learn nothing from a grid of faces; managers say office attendance is not the same as mentoring.",
    media: [img("/images/office.jpg", "A half-empty open-plan office on a Wednesday.", "Notice who is missing and what they miss."),
      img("https://picsum.photos/seed/home-desk/960/540", "A kitchen table set up as a workstation.", "Comfort and isolation in the same photograph.")],
    forArguments: [
      { claim: "Skills are absorbed, not taught.", evidence: "Overhearing a difficult phone call teaches more than a course.", language: "Passive + 'by osmosis'" },
      { claim: "Promotion follows visibility.", evidence: "People who are seen are remembered when roles open.", language: "Present simple for general truths" },
      { claim: "Feedback shrinks to the scheduled call.", evidence: "Nobody sends a message to say 'that was nearly right'.", language: "Quantifiers: hardly any, barely" }],
    againstArguments: [
      { claim: "Commuting steals the hours juniors need.", evidence: "Two hours a day is a qualification over a year.", language: "Time expressions + present perfect" },
      { claim: "Talent is no longer trapped by geography.", evidence: "A graduate in a small town can join a global team.", language: "No longer + passive" },
      { claim: "Bad offices teach bad habits.", evidence: "Presence culture rewards the loudest, not the best.", language: "Superlatives with 'not the … but the …'" }],
    vocabulary: [
      { word: "presenteeism", meaning: "being at work to be seen, not to work", example: "Presenteeism rewards the person with the longest commute." },
      { word: "learn by osmosis", meaning: "absorb skills from being around others", example: "Juniors learn by osmosis and remote work turns it off." },
      { word: "hybrid model", meaning: "a mix of home and office days", example: "Most firms have settled on a hybrid model." },
      { word: "career capital", meaning: "the value of your experience and contacts", example: "Your first three years build career capital." }],
    frames: [
      { function: "Giving evidence", phrases: ["Take my own case:", "The clearest example is…"] },
      { function: "Handling stats", phrases: ["Even if that number is right, it measures the wrong thing."] },
      { function: "Summing up", phrases: ["So the question isn't where we sit; it's who gets taught."] }],
    followUps: ["Would you take a 15% pay cut to work fully remotely?", "What did you learn at work that nobody taught you?", "Should promotion be blind to attendance?"],
    curveball: "Each team must include one story from their own experience or lose a point." },

  { id: "db3", motion: "This house would make voting compulsory.", hook: "A duty, or a freedom to refuse?", cefr: "B2", heat: 3,
    tags: ["politics", "society"],
    context: "Around two dozen countries require citizens to vote. Turnout rises; so does the number of blank ballots.",
    media: [img("https://picsum.photos/seed/ballot-box/960/540", "A queue outside a polling station at dawn.", "Who is in this queue — and who never joins it?"),
      motion("A turnout graph climbing after a compulsory-voting law.", "Ask: does a higher number mean a better decision?")],
    forArguments: [
      { claim: "Governments stop ignoring non-voters.", evidence: "Policy follows the people who turn up.", language: "Present simple for general truths" },
      { claim: "It removes the cost of getting people out.", evidence: "Campaign money shifts from turnout to argument.", language: "Passive: 'money is spent on…'" },
      { claim: "Voting is a duty like jury service.", evidence: "We already compel citizens where the stakes are high.", language: "Comparison: 'in the same way that…'" }],
    againstArguments: [
      { claim: "Forced speech is not participation.", evidence: "A blank ballot is not an opinion.", language: "Negative definitions: 'X is not Y'" },
      { claim: "Uninformed votes distort results.", evidence: "Compulsion recruits the least engaged voters last.", language: "Superlatives" },
      { claim: "Fining the poor for not voting is regressive.", evidence: "The same fine costs one person a coffee and another a week.", language: "Conditionals for consequence" }],
    vocabulary: [
      { word: "turnout", meaning: "the percentage of people who vote", example: "Turnout jumped from 52% to 91%." },
      { word: "disenfranchised", meaning: "denied a real voice", example: "Poorer areas feel disenfranchised, not lazy." },
      { word: "spoilt ballot", meaning: "a paper deliberately made invalid", example: "Spoilt ballots rose after the law passed." },
      { word: "civic duty", meaning: "an obligation to society", example: "They frame it as a civic duty, not a punishment." }],
    frames: [
      { function: "Defining terms", phrases: ["By 'compulsory' we mean…", "Let's be precise about what we're voting on."] },
      { function: "Attacking a definition", phrases: ["That definition does a lot of work for them."] },
      { function: "Closing", phrases: ["Vote for this motion if you believe…"] }],
    followUps: ["Did you vote last time? What would have changed your mind?", "Should sixteen-year-olds vote?", "Is a blank ballot a message or a shrug?"],
    curveball: "Introduce a fine of one day's pay and re-run the final speeches." },

  { id: "db4", motion: "This house would ban tourists from city centres.", hook: "Living city or open-air museum?", cefr: "B1", heat: 2,
    tags: ["travel", "cities", "economy"],
    context: "Venice charges entry, Barcelona caps cruise arrivals, Amsterdam asks some visitors to stay away. Residents cheer; shopkeepers do not.",
    media: [img("https://picsum.photos/seed/old-town-crowd/960/540", "A narrow street at capacity in high season.", "Count how many doorways are homes."),
      img("/images/market.jpg", "A market that sells to locals in the morning and tourists by noon.", "Who is each stall really for?")],
    forArguments: [
      { claim: "Rent follows tourists, residents follow the rent.", evidence: "Short-term lets outbid families for the same flat.", language: "Cause chains with 'which means'" },
      { claim: "Infrastructure is sized for residents.", evidence: "Water, buses and waste were never planned for triple the load.", language: "Passive + 'never designed to'" },
      { claim: "A city that performs itself stops being one.", evidence: "Bakeries become souvenir shops.", language: "Contrast: 'used to … now'" }],
    againstArguments: [
      { claim: "Tourism pays the wages that keep people there.", evidence: "Entire families depend on the season.", language: "Present simple + quantifiers" },
      { claim: "Bans are blunt where pricing is precise.", evidence: "Time slots and taxes shape behaviour without exclusion.", language: "Comparatives: 'more targeted than'" },
      { claim: "Exclusion is easy to sell and hard to reverse.", evidence: "Cities that closed rarely reopened well.", language: "Present perfect for experience" }],
    vocabulary: [
      { word: "overtourism", meaning: "more visitors than a place can absorb", example: "Overtourism hollows out the centre." },
      { word: "short-term let", meaning: "a flat rented to visitors by the night", example: "Short-term lets removed 8,000 homes." },
      { word: "footfall", meaning: "the number of people passing a shop", example: "Footfall is up, but so are rents." },
      { word: "gentrification", meaning: "change that prices out original residents", example: "Gentrification arrives with a coffee shop." }],
    frames: [
      { function: "Proposing a compromise", phrases: ["Would you accept a cap rather than a ban?"] },
      { function: "Pressing", phrases: ["You haven't answered the point about wages."] },
      { function: "Personalising", phrases: ["Imagine it's your street."] }],
    followUps: ["Are you ever the bad tourist?", "What should visitors pay for?", "Which city has got this right?"],
    curveball: "The tutor plays a shopkeeper who will lose their business — each team must answer them directly." },

  { id: "db5", motion: "This house believes AI should never mark student work.", hook: "Fair, fast and unaccountable.", cefr: "B2", heat: 3,
    tags: ["education", "technology", "ethics"],
    context: "Automated marking is already used for essays and speaking tests. Appeals are difficult when nobody can explain the score.",
    media: [img("https://picsum.photos/seed/exam-hall/960/540", "An exam hall from above.", "Every desk here becomes a data point."),
      motion("A score appearing instantly beside a handwritten paragraph.", "Ask what the number cannot see.")],
    forArguments: [
      { claim: "You cannot appeal to a system that cannot explain itself.", evidence: "Model outputs are not reasons.", language: "Modals of possibility" },
      { claim: "It rewards the writing it was trained on.", evidence: "Unusual voices score lower.", language: "Passive with 'trained on'" },
      { claim: "Teaching is a relationship, not a throughput.", evidence: "Feedback changes behaviour only when it's trusted.", language: "Only + inversion" }],
    againstArguments: [
      { claim: "Human marking is already inconsistent.", evidence: "Two examiners regularly disagree by a grade.", language: "Adverbs of frequency" },
      { claim: "Speed is a fairness issue.", evidence: "Feedback next term is feedback wasted.", language: "Zero conditional" },
      { claim: "Hybrid marking beats both.", evidence: "Machines flag, humans decide.", language: "Comparative structures" }],
    vocabulary: [
      { word: "black box", meaning: "a system whose reasoning is hidden", example: "Students are graded by a black box." },
      { word: "bias", meaning: "systematic unfairness", example: "The model inherits the bias of its training data." },
      { word: "accountability", meaning: "being answerable for a decision", example: "Accountability disappears when nobody signs the grade." },
      { word: "moderation", meaning: "checking marks for consistency", example: "Moderation catches the worst errors." }],
    frames: [
      { function: "Asking for a mechanism", phrases: ["How exactly would that work on Monday morning?"] },
      { function: "Bringing ethics in", phrases: ["The question isn't whether it works; it's who pays when it doesn't."] },
      { function: "Rebuttal chain", phrases: ["Three answers to that:"] }],
    followUps: ["Would you accept an AI grade if it were 5% higher?", "Who should sign your certificate?", "Where would you allow it?"],
    curveball: "One learner plays a student who has been wrongly failed and may interrupt at any time." },

  { id: "db6", motion: "This house would pay people to stay healthy.", hook: "Cash for steps, cash for check-ups.", cefr: "B1+", heat: 2,
    tags: ["health", "money", "society"],
    context: "Some insurers pay for gym visits and vaccinations. Critics say paying for behaviour turns a duty into a transaction.",
    media: [img("https://picsum.photos/seed/running-park/960/540", "A crowded park run at eight on a Saturday.", "What made these people come?"),
      motion("A wearable's step counter ticking past a daily goal.", "Ask who else sees that number.")],
    forArguments: [
      { claim: "Prevention is cheaper than treatment.", evidence: "One avoided illness pays for many incentives.", language: "Comparatives + than" },
      { claim: "Incentives reach people advice never does.", evidence: "Money speaks across languages and education levels.", language: "Present simple, generalising" },
      { claim: "It rewards effort we already expect for free.", evidence: "Time spent exercising is unpaid labour on your own body.", language: "Gerunds as subjects" }],
    againstArguments: [
      { claim: "Health becomes a performance for payment.", evidence: "People game the count, not the habit.", language: "Phrasal verb 'game the system'" },
      { claim: "It punishes people with chronic conditions.", evidence: "Not everyone can hit a step target.", language: "Quantifiers + modals" },
      { claim: "Surveillance is the real price.", evidence: "Payment requires proof, and proof requires data.", language: "Cause chains" }],
    vocabulary: [
      { word: "incentive", meaning: "a reward designed to change behaviour", example: "Cash incentives raised vaccination rates." },
      { word: "nudge", meaning: "a gentle push towards a choice", example: "A nudge is cheaper than a law." },
      { word: "chronic condition", meaning: "a long-term illness", example: "Targets ignore chronic conditions." },
      { word: "opt out", meaning: "choose not to take part", example: "Anyone can opt out — but they lose the money." }],
    frames: [
      { function: "Quantifying", phrases: ["Put a number on it:", "Roughly speaking,"] },
      { function: "Softening a hard line", phrases: ["I'd go further than my partner, carefully."] },
      { function: "Finishing", phrases: ["Two sentences and I'm done:"] }],
    followUps: ["What would €50 a month change about your week?", "Should employers know your step count?", "Is guilt a better motivator than money?"],
    curveball: "The tutor announces the payment will come from raising everyone's insurance by 4%." },

  { id: "db7", motion: "This house believes English will stop being the world's second language.", hook: "Translation in your ear, in real time.", cefr: "B2", heat: 1,
    tags: ["language", "technology", "future"],
    context: "Live translation earpieces are improving quickly. If a machine can speak for you, why spend years learning?",
    media: [img("https://picsum.photos/seed/language-class/960/540", "A language class mid-conversation.", "What is happening here that a device cannot copy?"),
      motion("Subtitles appearing under a live conversation.", "Ask what is lost between the two languages.")],
    forArguments: [
      { claim: "Tools remove the cost of not learning.", evidence: "Nobody memorises phone numbers any more.", language: "Present perfect + any more" },
      { claim: "Economic pull is shifting.", evidence: "Trade blocs now negotiate in several languages.", language: "Present continuous for trends" },
      { claim: "Younger users trust devices over classrooms.", evidence: "They translate first and ask questions later.", language: "Sequencing adverbs" }],
    againstArguments: [
      { claim: "Relationships aren't built through a device.", evidence: "Humour, apology and trust are language, not information.", language: "Abstract nouns as subjects" },
      { claim: "Latency kills conversation.", evidence: "Two seconds of delay ends a joke.", language: "Cause + effect" },
      { claim: "Institutions move slowly.", evidence: "Science, aviation and contracts are locked in English.", language: "Passive voice" }],
    vocabulary: [
      { word: "lingua franca", meaning: "a shared language between speakers of others", example: "English became the lingua franca of aviation." },
      { word: "fluency", meaning: "smooth, natural use of a language", example: "Fluency is not the same as accuracy." },
      { word: "real-time", meaning: "happening without delay", example: "Real-time translation still stumbles on idioms." },
      { word: "idiomatic", meaning: "natural to a native speaker", example: "Machines struggle with idiomatic speech." }],
    frames: [
      { function: "Predicting", phrases: ["Within ten years we'll see…", "I'd be surprised if…"] },
      { function: "Hedging", phrases: ["It's likely, though not certain, that…"] },
      { function: "Personal stake", phrases: ["Everyone in this room has paid for this in hours."] }],
    followUps: ["Why are you in this room if a device can do it?", "What can you say in English that you can't say in your language?", "Would you trust a machine to apologise for you?"],
    curveball: "Each speaker must use one idiom correctly or the point doesn't count." },

  { id: "db8", motion: "This house would abolish tipping.", hook: "Generosity, or a wage gap with a smile.", cefr: "B1", heat: 2,
    tags: ["work", "money", "culture"],
    context: "Some countries tip 20%, others find it insulting. Staff say tips top up low pay; critics say they let employers pay less.",
    media: [img("https://picsum.photos/seed/restaurant-bill/960/540", "A bill and a card machine on a table.", "Who is being judged at this moment?"),
      motion("A tip slider moving between 10%, 15% and 20%.", "Ask what the default does to behaviour.")],
    forArguments: [
      { claim: "Tips hide the real price.", evidence: "A menu price that isn't the price is a trick.", language: "Relative clauses" },
      { claim: "Tipping is discriminatory in practice.", evidence: "Studies show tips track appearance more than service.", language: "Reporting verbs" },
      { claim: "Pay should not depend on the customer's mood.", evidence: "A rainy Tuesday shouldn't cut your income.", language: "Should / shouldn't" }],
    againstArguments: [
      { claim: "Tips reward excellence instantly.", evidence: "A great server earns more than a slow one that night.", language: "Comparatives" },
      { claim: "Abolition usually means lower take-home pay.", evidence: "Restaurants that removed tips raised prices, not wages.", language: "Past simple + contrast" },
      { claim: "It gives customers a voice.", evidence: "It's the only feedback most places receive.", language: "Superlatives" }],
    vocabulary: [
      { word: "service charge", meaning: "a fixed percentage added to the bill", example: "A 12.5% service charge is added automatically." },
      { word: "take-home pay", meaning: "money received after deductions", example: "Their take-home pay fell by a fifth." },
      { word: "gratuity", meaning: "a formal word for a tip", example: "Gratuities are shared among staff." },
      { word: "living wage", meaning: "pay high enough to live on", example: "Pay a living wage and tipping disappears." }],
    frames: [
      { function: "Comparing cultures", phrases: ["Where I'm from,…", "That would be unthinkable in…"] },
      { function: "Challenging", phrases: ["Would you still say that if you worked there?"] },
      { function: "Deal-making", phrases: ["We'd accept that if…"] }],
    followUps: ["What's your rule for tipping?", "Have you ever not tipped? Why?", "Should the tip be on the menu?"],
    curveball: "Every speaker must state how much they tipped last time before they may speak." },

  { id: "db9", motion: "This house believes failure should be on your CV.", hook: "The projects that died taught you the most.", cefr: "B1+", heat: 1,
    tags: ["work", "psychology"],
    context: "Some scientists publish a 'CV of failures'. Recruiters say honesty is refreshing; others say it is career suicide.",
    media: [img("https://picsum.photos/seed/rejection-letters/960/540", "A stack of rejection letters.", "Each one represents an attempt."),
      motion("A CV where the rejected applications outnumber the successes.", "Ask which list is more informative.")],
    forArguments: [
      { claim: "Hiring rewards luck disguised as talent.", evidence: "Only successes are visible, so success looks inevitable.", language: "Passive + only" },
      { claim: "Failure is where judgement is built.", evidence: "You learn risk by paying for it.", language: "Present simple, generalising" },
      { claim: "It makes workplaces safer.", evidence: "Teams that hide errors repeat them.", language: "Defining relative clauses" }],
    againstArguments: [
      { claim: "Recruiters filter, they don't reflect.", evidence: "A six-second scan punishes nuance.", language: "Contrast with 'they don't'" },
      { claim: "Not all failures are yours.", evidence: "A cancelled project may say nothing about you.", language: "Modals of possibility" },
      { claim: "It privileges those who can afford to fail.", evidence: "A safety net makes failure a story rather than a disaster.", language: "Comparatives" }],
    vocabulary: [
      { word: "survivorship bias", meaning: "only seeing the ones that made it", example: "Success stories are survivorship bias in a suit." },
      { word: "setback", meaning: "a problem that delays progress", example: "She described the setback without excuses." },
      { word: "resilience", meaning: "the ability to recover", example: "Resilience is shown, not claimed." },
      { word: "red flag", meaning: "a warning sign", example: "Recruiters read it as a red flag." }],
    frames: [
      { function: "Telling a failure story", phrases: ["It went wrong in three stages.", "What I'd do differently is…"] },
      { function: "Extracting the lesson", phrases: ["The point isn't the failure; it's what it revealed."] },
      { function: "Turning it around", phrases: ["Which is precisely why you should hire me."] }],
    followUps: ["What's your most useful failure?", "Would you hire someone who listed theirs?", "What should stay private?"],
    curveball: "Each speaker must tell one true failure before making an argument." },

  { id: "db10", motion: "This house would give every citizen a basic income.", hook: "Money with no conditions attached.", cefr: "B2", heat: 3,
    tags: ["economy", "politics", "work"],
    context: "Pilot schemes from Finland to Kenya paid people regardless of work. Employment barely changed; stress fell sharply.",
    media: [img("https://picsum.photos/seed/city-commute/960/540", "A morning commute at full volume.", "How much of this is necessary?"),
      motion("A monthly payment landing in an account on the first of the month.", "Ask what you would do with the first three payments.")],
    forArguments: [
      { claim: "It removes the fear that distorts choices.", evidence: "People negotiate better when they can say no.", language: "Present simple + when" },
      { claim: "Unpaid work is still work.", evidence: "Care and study hold economies together.", language: "Gerunds as subjects" },
      { claim: "It is simpler than the system it replaces.", evidence: "Means-testing costs a fortune to administer.", language: "Comparatives" }],
    againstArguments: [
      { claim: "Universality wastes money on the rich.", evidence: "A billionaire receives the same cheque.", language: "Quantifiers" },
      { claim: "Prices absorb it.", evidence: "Landlords price to what tenants can pay.", language: "Cause and effect" },
      { claim: "Work is meaning, not just money.", evidence: "Long-term worklessness damages health.", language: "Present perfect for research" }],
    vocabulary: [
      { word: "means-tested", meaning: "given only to those below an income level", example: "Means-tested benefits create cliff edges." },
      { word: "cliff edge", meaning: "a sudden loss of support when income rises", example: "The cliff edge punishes extra hours." },
      { word: "pilot scheme", meaning: "a small test of a policy", example: "The pilot scheme ran for two years." },
      { word: "safety net", meaning: "support that prevents disaster", example: "A safety net you can't fall through." }],
    frames: [
      { function: "Costing a policy", phrases: ["Let's follow the money.", "Someone has to pay, so who?"] },
      { function: "Answering a hard number", phrases: ["Take the number seriously and it still works, because…"] },
      { function: "Vision close", phrases: ["Picture the first month it lands."] }],
    followUps: ["Would you still work?", "What would you stop doing?", "Who deserves nothing?"],
    curveball: "The funding source is revealed mid-debate: a 5% tax on all salaries." },

  { id: "db11", motion: "This house believes we should stop celebrating birthdays after thirty.", hook: "A light one — and a trap for the over-confident.", cefr: "B1", heat: 1,
    tags: ["culture", "fun", "warm-up"],
    context: "A deliberately absurd motion, used to teach argument structure without anyone feeling attacked.",
    media: [img("https://picsum.photos/seed/birthday-candles/960/540", "Candles on a cake, too many to count.", "A cheap image — and a great warm-up prompt."),
      motion("A calendar flipping through thirty Januaries.", "Ask what changed and what didn't.")],
    forArguments: [
      { claim: "Adults celebrate survival, not achievement.", evidence: "Nothing is earned by the earth going round the sun.", language: "Gerunds" },
      { claim: "The pressure ruins the day.", evidence: "Everyone has had one terrible birthday.", language: "Present perfect + everyone" },
      { claim: "Celebrate the things you chose.", evidence: "A finished course beats a random date.", language: "Comparatives" }],
    againstArguments: [
      { claim: "Rituals hold friendships together.", evidence: "It is the one day people call you.", language: "Cleft sentences" },
      { claim: "Children learn from watching adults celebrate.", evidence: "Joy is taught by example.", language: "Passive" },
      { claim: "Life needs unearned joy.", evidence: "Not everything must be deserved.", language: "Modals: must / need" }],
    vocabulary: [
      { word: "milestone", meaning: "an important point in life", example: "Thirty is treated as a milestone." },
      { word: "ritual", meaning: "a repeated meaningful act", example: "Rituals survive because they bind people." },
      { word: "overrated", meaning: "less good than people claim", example: "Birthdays are wildly overrated." },
      { word: "sentimental", meaning: "driven by soft feelings", example: "I'm sentimental about the cake, not the age." }],
    frames: [
      { function: "Starting light", phrases: ["I'll be honest with the room:"] },
      { function: "Playing serious", phrases: ["Underneath the joke there's a real question:"] },
      { function: "Ending warmly", phrases: ["So: cake, yes. Pressure, no."] }],
    followUps: ["What's your best birthday memory?", "What age would you stop counting at?", "Which celebration should we abolish instead?"],
    curveball: "Everyone must make the room laugh once and make one serious point." },

  { id: "db12", motion: "This house would let robots care for the elderly.", hook: "Company that never gets tired — or never means it.", cefr: "B2", heat: 3,
    tags: ["health", "technology", "ethics", "family"],
    context: "Care robots already lift patients, remind people to take medication, and hold conversations. Shortages of human carers are worsening everywhere.",
    media: [img("https://picsum.photos/seed/elderly-hands/960/540", "Two hands, one holding the other.", "What exactly is being given here?"),
      motion("A care robot repeating a reminder at exactly the right time, every time.", "Reliability versus warmth: which would you choose at 3am?")],
    forArguments: [
      { claim: "Reliability is a form of kindness.", evidence: "A machine never forgets the six o'clock dose.", language: "Adverbs of frequency" },
      { claim: "Human carers are scarce and exhausted.", evidence: "Shortages mean fifteen-minute visits.", language: "Cause and effect" },
      { claim: "Independence is preserved.", evidence: "Help at home delays a move into care.", language: "Passive" }],
    againstArguments: [
      { claim: "Loneliness isn't solved by presence.", evidence: "Being spoken to is not being known.", language: "Passive + contrast" },
      { claim: "It lets society off the hook.", evidence: "We'd stop funding the human alternative.", language: "Second conditional" },
      { claim: "Consent is complicated.", evidence: "Not everyone can agree to be monitored.", language: "Quantifiers + modals" }],
    vocabulary: [
      { word: "care shortage", meaning: "too few carers for the people who need them", example: "The care shortage is the reason this debate exists." },
      { word: "dignity", meaning: "being treated as a full person", example: "Dignity is the word both sides claim." },
      { word: "companionship", meaning: "the comfort of company", example: "Companionship can't be scheduled." },
      { word: "monitoring", meaning: "watching for safety reasons", example: "Monitoring keeps people safe and watched." }],
    frames: [
      { function: "Framing values", phrases: ["This comes down to what we owe each other."] },
      { function: "Using a scenario", phrases: ["Picture your grandmother at three in the morning."] },
      { function: "Last word", phrases: ["If we vote for this, we should at least be honest about why."] }],
    followUps: ["Would you accept one for yourself?", "Who should decide — the family or the person?", "What must stay human?"],
    curveball: "One learner plays the grandparent and must be persuaded directly." },
];

export type DiscussionSet = { id: string; title: string; kind: "ladder" | "ranking" | "would-you-rather" | "images"; prompt: string; items: string[]; language: string[] };

export const DISCUSSION_SETS: DiscussionSet[] = [
  { id: "ds1", title: "Opinion ladder: technology", kind: "ladder", prompt: "Move from 1 (easy) to 6 (hard). Everyone must say more than the person before.",
    items: ["My phone is the first thing I touch in the morning.", "Group chats are more stressful than useful.", "Companies should be banned from emailing after 7pm.", "Social media should require ID.", "Algorithms shape what I believe.", "I would live a year with no internet for a year's salary."],
    language: ["I'd go further than that…", "Up to a point, but…", "That's true for me because…"] },
  { id: "ds2", title: "Rank the workplace sins", kind: "ranking", prompt: "Rank from most to least unforgivable, then defend your top choice against the room.",
    items: ["Replying all", "Booking a meeting with no agenda", "Taking credit for your work", "Never turning the camera on", "Being fifteen minutes late every time", "Stealing lunch from the fridge"],
    language: ["For me, the worst by far is…", "I'd put X above Y because…", "I can forgive…, but not…"] },
  { id: "ds3", title: "Would you rather: travel edition", kind: "would-you-rather", prompt: "Choose and justify in 30 seconds. No fence-sitting.",
    items: ["Lose your luggage or lose your phone?", "Fly for free but never choose the destination, or choose everything and pay double?", "Travel alone forever or always with the same person?", "Speak every language badly or one extra language perfectly?", "Live in a city you love with a job you hate, or the reverse?"],
    language: ["Without a doubt…", "The deciding factor for me is…", "I'd struggle, but in the end…"] },
  { id: "ds4", title: "Read the room: photo reactions", kind: "images", prompt: "Each image is shown for 20 seconds. Say what happened just before and just after.",
    items: ["https://picsum.photos/seed/story-1/800/450", "https://picsum.photos/seed/story-2/800/450", "https://picsum.photos/seed/story-3/800/450", "https://picsum.photos/seed/story-4/800/450", "https://picsum.photos/seed/story-5/800/450", "https://picsum.photos/seed/story-6/800/450"],
    language: ["It looks as if…", "They must have just…", "In a minute, someone is going to…"] },
];

export const DEBATE_FORMAT = [
  { phase: "Prep", seconds: 180, instruction: "Teams build three arguments and one rebuttal each. Silent thinking for the first 30 seconds." },
  { phase: "Opening — For", seconds: 90, instruction: "Define the motion, state the case, give one piece of evidence." },
  { phase: "Opening — Against", seconds: 90, instruction: "Challenge the definition first, then give your own case." },
  { phase: "Crossfire", seconds: 120, instruction: "Alternating questions. Answers must be under 20 seconds." },
  { phase: "Rebuttal — Against", seconds: 60, instruction: "Attack the strongest point, not the easiest." },
  { phase: "Rebuttal — For", seconds: 60, instruction: "Rebuild, then extend with something new." },
  { phase: "Floor debate", seconds: 120, instruction: "Anyone may speak once. Thirty seconds each, no repeats." },
  { phase: "Closing", seconds: 120, instruction: "Each side summarises in 60 seconds. No new arguments." },
];

export const DEBATE_RUBRIC = [
  { id: "content", label: "Argument quality", hint: "Claim + evidence + link back to the motion" },
  { id: "rebuttal", label: "Rebuttal", hint: "Engages with what was actually said" },
  { id: "language", label: "Range & accuracy", hint: "Target structures used naturally" },
  { id: "delivery", label: "Delivery", hint: "Pace, stress, eye contact, no reading aloud" },
  { id: "teamwork", label: "Teamwork", hint: "Builds on the partner, shares the floor" },
];
