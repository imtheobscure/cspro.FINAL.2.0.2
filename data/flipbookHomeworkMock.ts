/**
 * Flipbook Homework mock — "Load Mock Data" for the 📖 Flipbook Homework type in
 * Lessons > Lesson Creator, and the source for the pre-generated Gallery sample
 * (built via `npx tsx tools/build_flipbook_homework.ts`).
 *
 * Schema matches pages/flipbook/flipbookTypes.ts (FlipbookLessonJSON). Sections
 * exercise the magazine content types (reading-factual, grammar, thematic-vocabulary,
 * business-english, survival-english, news-story, reflection) and the activity types
 * (multiple-choice, true-false, fill-blanks, matching, short-answer, discussion,
 * speaking, roleplay, rating).
 */
import type { FlipbookLessonJSON } from '../pages/flipbook/flipbookTypes';

export const buildFlipbookHomeworkMock = (learnerName?: string): FlipbookLessonJSON => ({
  id: 'lesson-innovation',
  title: 'The World of Innovation',
  level: 'B2 – Upper Intermediate',
  topic: 'Technology, Society & Human Connection',
  tutor: 'Tutorly',
  learnerName: learnerName || 'Learner',
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  description: 'An immersive journey through language, culture, and critical thinking.',
  coverTagline: 'Your personalised English adventure starts here.',
  sections: [
    {
      id: 'sec-reading-factual',
      type: 'reading-factual',
      title: 'The Digital Revolution: How Technology Reshaped Humanity',
      imageQuery: 'digital technology innovation future city',
      content: `The term "digital revolution" is thrown around so often these days that it has almost lost its punch. Yet when you step back and examine the sheer scale of the transformation over the last four decades, the word "revolution" seems not just appropriate but perhaps even an understatement.

      In 1980, there were fewer than one million personal computers in the entire world. Today, more than five billion people carry a supercomputer in their pocket. The smartphone — a device that would have seemed like pure science fiction in 1990 — has become as mundane and indispensable as a wristwatch, except far more powerful than any wristwatch ever dreamed of being.

      But the digital revolution is not simply a story about gadgets and convenience. At its core, it is a story about the fundamental restructuring of human society — how we work, how we learn, how we shop, how we vote, and even how we define ourselves.

      THE WORKPLACE TRANSFORMED

      Automation and artificial intelligence are rewriting the rules of employment. Tasks that once required years of training can now be performed by algorithms in milliseconds. The World Economic Forum estimates that by 2030, 85 million jobs may be displaced by a shift in the division of labour between humans and machines, while 97 million new roles may emerge.

      THE SHADOW SIDE

      Yet for all its promise, the digital revolution casts a long shadow. Privacy has become an increasingly precious and endangered commodity. The Cambridge Analytica scandal of 2018 revealed the alarming ease with which personal data could be weaponised to manipulate democratic elections.

      The task ahead of us — as individuals, as societies, and as a global community — is not to resist the digital revolution, but to shape it. To put in place the ethical frameworks, the regulatory structures, and the cultural norms that will allow us to harness its extraordinary potential while guarding against its very real dangers. That is the defining challenge of our age.`,
      vocabulary: [
        { word: 'mundane', definition: 'Lacking interest or excitement; dull and ordinary', partOfSpeech: 'adjective', example: 'Checking emails had become a mundane part of the morning routine.', synonyms: ['ordinary', 'commonplace', 'banal'], difficulty: 'intermediate' },
        { word: 'indispensable', definition: 'Absolutely necessary; essential', partOfSpeech: 'adjective', example: 'The smartphone has become indispensable to modern life.', synonyms: ['essential', 'vital', 'crucial'], difficulty: 'intermediate' },
        { word: 'ripple effect', definition: 'One event produces effects which spread and produce further effects', partOfSpeech: 'noun phrase', example: 'The factory closure had a ripple effect throughout the local economy.', synonyms: ['knock-on effect', 'chain reaction'], difficulty: 'intermediate' },
        { word: 'upended', definition: 'Completely changed or turned upside down', partOfSpeech: 'verb (past participle)', example: 'The pandemic upended traditional working patterns overnight.', synonyms: ['disrupted', 'overturned'], difficulty: 'advanced' },
        { word: 'benign', definition: 'Gentle and kindly; not harmful', partOfSpeech: 'adjective', example: 'Not all companies collecting data have benign intentions.', synonyms: ['harmless', 'gentle'], difficulty: 'advanced' },
        { word: 'futile', definition: 'Incapable of producing any useful result; pointless', partOfSpeech: 'adjective', example: 'Resisting all digital change would be as futile as fighting the tide.', synonyms: ['pointless', 'useless'], difficulty: 'intermediate' },
      ],
      activities: [
        { id: 'act-rf-1', type: 'multiple-choice', question: 'According to the article, approximately how many personal computers existed in 1980?', options: ['Fewer than one million', 'About five billion', 'More than ten million', 'Around fifty thousand'], correctAnswer: 'Fewer than one million', xpReward: 10 },
        { id: 'act-rf-2', type: 'true-false', question: 'The article states that the digital revolution is only a story about gadgets and convenience.', options: ['True', 'False'], correctAnswer: 'False', xpReward: 10 },
        { id: 'act-rf-3', type: 'multiple-choice', question: 'What does the World Economic Forum estimate about jobs by 2030?', options: ['85 million jobs displaced, 97 million new roles may emerge', '97 million jobs displaced, 85 million new roles may emerge', 'All jobs will be automated by machines', 'No significant job changes will occur'], correctAnswer: '85 million jobs displaced, 97 million new roles may emerge', xpReward: 10 },
        { id: 'act-rf-4', type: 'fill-blanks', question: 'Complete the sentences from the article.', blanks: [
          { id: 'b1', sentence: 'The Cambridge Analytica scandal revealed how personal data could be _____ to manipulate democratic elections.', answer: 'weaponised', hint: 'It was used as a weapon.' },
          { id: 'b2', sentence: 'Resisting digital change would be as _____ as trying to hold back the tide.', answer: 'futile', hint: 'Pointless; incapable of producing results.' },
        ], xpReward: 15 },
        { id: 'act-rf-5', type: 'discussion', question: 'Critical Thinking Discussion', discussionPoints: [
          'Do you think the benefits of the digital revolution outweigh its risks? Give specific examples.',
          'How has technology changed your personal daily routine over the past five years?',
          'Should governments have the power to regulate what people post on social media? Why or why not?',
          'What skills do you think will be most valuable in the job market of 2030?',
        ], xpReward: 20 },
      ],
    },
    {
      id: 'sec-grammar',
      type: 'grammar',
      title: 'Perfect Tenses: Connecting Past to Present',
      imageQuery: 'grammar learning education chalkboard classroom',
      content: `The perfect tenses are among the most important and nuanced structures in English grammar. They create a bridge between two time points — most commonly linking something in the past to its relevance in the present, or establishing the sequence of events in a narrative.

      THE PRESENT PERFECT

      Form: have/has + past participle
      Key uses:
      1. Life experience: "I have visited Japan three times."
      2. Recent events with present relevance: "She has just finished the report."
      3. Duration from past to present: "We have lived here for ten years."
      4. Change over time: "The world has changed dramatically since 1990."

      Signal words: already, yet, just, ever, never, recently, lately, for, since, so far.

      Common mistake:
      ✗ "I have seen him yesterday." — use simple past with specific time references.
      ✓ "I saw him yesterday." / "I have seen him recently."

      THE PAST PERFECT

      Form: had + past participle
      Used for an action completed BEFORE another action or time in the past — the "past of the past."

      Examples:
      "By the time she arrived, they had already left."
      "He hadn't eaten since morning, so he was famished."

      THE FUTURE PERFECT

      Form: will have + past participle
      Used for an action that will be completed before a specific time in the future.

      Examples:
      "By next June, I will have completed my degree."
      "The construction will have finished before the tourists arrive."`,
      activities: [
        { id: 'act-gram-1', type: 'fill-blanks', question: 'Complete the sentences using the correct perfect tense.', blanks: [
          { id: 'bg1', sentence: 'She _____ (work) for this company since 2019.', answer: 'has been working', hint: 'Duration from past to present — continuous.' },
          { id: 'bg2', sentence: 'By the time he retired, he _____ (teach) for over thirty years.', answer: 'had taught', hint: 'An action completed before another past point.' },
          { id: 'bg3', sentence: 'By this time next year, we _____ (finish) the whole project.', answer: 'will have finished', hint: 'Completed before a future point.' },
        ], xpReward: 20 },
        { id: 'act-gram-2', type: 'multiple-choice', question: 'Which sentence uses the present perfect correctly?', options: ['I have seen her last Tuesday.', 'She has been to Paris twice.', 'They have went to the shops.', 'He have finished his homework.'], correctAnswer: 'She has been to Paris twice.', xpReward: 10 },
        { id: 'act-gram-3', type: 'true-false', question: 'The past perfect (had + past participle) describes an action completed BEFORE another action in the past.', options: ['True', 'False'], correctAnswer: 'True', xpReward: 10 },
        { id: 'act-gram-4', type: 'matching', question: 'Match each sentence to the correct tense name.', pairs: [
          { left: 'She has just called.', right: 'Present Perfect' },
          { left: 'They had left before noon.', right: 'Past Perfect' },
          { left: 'He has been reading for hours.', right: 'Present Perfect Continuous' },
          { left: 'We will have landed by midnight.', right: 'Future Perfect' },
        ], xpReward: 15 },
      ],
    },
    {
      id: 'sec-vocabulary',
      type: 'thematic-vocabulary',
      title: 'The Language of Innovation: Tech & Change',
      imageQuery: 'vocabulary dictionary words language learning',
      content: `In today's rapidly changing world, the language of technology and innovation permeates every area of life — from business meetings to casual conversations, from news headlines to everyday small talk. Whether you are in a job interview, negotiating a deal, or simply chatting with colleagues, using these words confidently will mark you out as a sophisticated, contemporary communicator.

      In this section, we explore high-value vocabulary items drawn from the fields of technology, business, and social change. For each word, we provide a clear definition, its grammatical function, example sentences showing it in authentic contexts, and guidance on when and how to use it appropriately.`,
      vocabulary: [
        { word: 'disruptive', definition: 'Causing radical change by introducing a new product or idea that displaces established competitors', partOfSpeech: 'adjective', example: '"Uber was a disruptive force in the taxi industry." | "Disruptive innovation doesn\'t just improve things — it transforms entire markets."', synonyms: ['revolutionary', 'transformative'], difficulty: 'intermediate' },
        { word: 'scalable', definition: 'Able to be easily expanded or upgraded to handle increased demand or growth', partOfSpeech: 'adjective', example: '"We need a scalable solution that will work whether we have 100 or 100,000 customers."', synonyms: ['expandable', 'flexible'], difficulty: 'advanced' },
        { word: 'pivot', definition: 'To change direction or strategy significantly, especially in business', partOfSpeech: 'verb / noun', example: '"After losing market share, they decided to pivot from hardware to software services."', synonyms: ['shift', 'change course'], difficulty: 'intermediate' },
        { word: 'ecosystem', definition: 'A complex network or interconnected system, especially in business or technology', partOfSpeech: 'noun', example: '"Apple has built an ecosystem of devices, software, and services that keep customers loyal."', synonyms: ['network', 'system'], difficulty: 'intermediate' },
        { word: 'bandwidth', definition: 'Technically: data transmission capacity; informally: the mental capacity to handle tasks', partOfSpeech: 'noun', example: '"I don\'t have the bandwidth to take on another project right now."', synonyms: ['capacity', 'headroom'], difficulty: 'intermediate' },
        { word: 'granular', definition: 'Dealing with or relating to the individual details of something; fine-grained', partOfSpeech: 'adjective', example: '"We need granular data on customer behaviour, not just broad trends."', synonyms: ['detailed', 'specific'], difficulty: 'advanced' },
        { word: 'iterate', definition: 'To repeat a process, making improvements each time', partOfSpeech: 'verb', example: '"The design team iterated rapidly, releasing a new version every two weeks."', synonyms: ['refine', 'improve'], difficulty: 'advanced' },
        { word: 'frictionless', definition: 'Requiring minimal effort; smooth and without obstacles', partOfSpeech: 'adjective', example: '"Digital payments have made transactions more frictionless."', synonyms: ['smooth', 'seamless'], difficulty: 'advanced' },
      ],
      activities: [
        { id: 'act-vocab-1', type: 'matching', question: 'Match the vocabulary word to its correct definition.', pairs: [
          { left: 'disruptive', right: 'Causing radical change by displacing established competitors' },
          { left: 'scalable', right: 'Able to be expanded to handle increased demand' },
          { left: 'pivot', right: 'To change direction or strategy significantly' },
          { left: 'iterate', right: 'To repeat a process, making improvements each time' },
        ], xpReward: 15 },
        { id: 'act-vocab-2', type: 'fill-blanks', question: 'Complete the sentences with the correct vocabulary word.', blanks: [
          { id: 'bv1', sentence: 'The app was designed to provide a _____ shopping experience with one-click payment.', answer: 'frictionless', hint: 'Smooth and effortless.' },
          { id: 'bv2', sentence: 'After the initial product failed, the founders decided to _____ and focus on consulting instead.', answer: 'pivot', hint: 'Change direction.' },
          { id: 'bv3', sentence: 'We need more _____ analytics — not just total sales but sales by region, age group, and device.', answer: 'granular', hint: 'Detailed and specific.' },
        ], xpReward: 15 },
        { id: 'act-vocab-3', type: 'speaking', question: 'Vocabulary in Use – Speaking Practice', speakingPrompts: [
          'Use "disruptive" to describe a company or product that changed your industry or daily life.',
          'Explain the concept of an "ecosystem" using Apple, Google, or another brand you know well.',
          'Tell your tutor about a time when you had to "pivot" — change direction in work, study, or life.',
          'Use "bandwidth" in its informal sense to describe a busy week you have had.',
        ], xpReward: 20 },
      ],
    },
    {
      id: 'sec-business',
      type: 'business-english',
      title: 'The Art of the Negotiation',
      imageQuery: 'business meeting negotiation professional conference',
      content: `Negotiation is not a battle. The most sophisticated business professionals understand that the best negotiations end with both parties feeling they have achieved something of value — what specialists call a "win-win outcome."

      OPENING A NEGOTIATION PROFESSIONALLY

      First impressions matter enormously. Opening with clear, measured, professional language immediately establishes your credibility.

      Useful phrases:
      • "Thank you for making the time to meet today. I'm looking forward to exploring some mutually beneficial arrangements."
      • "We've put together a proposal that we believe works for both parties — shall I walk you through the key points?"

      MAKING AND RESPONDING TO PROPOSALS

      Making a proposal clearly and confidently:
      • "We would like to propose a three-month trial period at the rates outlined in our document."
      • "One option we could explore is a phased payment structure — what are your thoughts?"

      Responding to a proposal professionally:
      • "That's an interesting proposal. We'd need some time to consider the financial implications."
      • "We're not quite there yet on the timeline, but I think there's room to find a middle ground."

      REACHING AND CLOSING AN AGREEMENT

      The art of the close:
      • "I think we're very close to something we can both be satisfied with."
      • "I'm pleased to say we have an agreement in principle — let's get the legal team to formalise the details."`,
      dialogue: [
        { speaker: 'Sofia (Buyer)', text: 'Good morning, Marcus. I\'ve reviewed your proposal and I have to say, the quality of the work is impressive.', emotion: 'professional' },
        { speaker: 'Marcus (Seller)', text: 'Thank you, Sofia. We really believe this partnership can deliver significant value for your organisation.', emotion: 'confident' },
        { speaker: 'Sofia (Buyer)', text: 'My concern, however, is around the pricing. The figure you\'ve quoted is somewhat above what we had budgeted for this phase.', emotion: 'concerned' },
        { speaker: 'Marcus (Seller)', text: 'I understand your concern, and I appreciate your directness. Could you help me understand what the budget ceiling looks like? That would help me see whether there\'s a structure that could work for both of us.', emotion: 'measured' },
        { speaker: 'Sofia (Buyer)', text: 'We were hoping to come in at around 15% below your quoted figure for the first phase, with the understanding that we\'d revisit the rates if the results justify it.', emotion: 'negotiating' },
        { speaker: 'Marcus (Seller)', text: 'That\'s a significant difference from where we are now. However, if we could structure a performance-based element into the second phase, I think there\'s a conversation to be had.', emotion: 'strategic' },
        { speaker: 'Sofia (Buyer)', text: 'That sounds reasonable. Friday morning works on our end. I think there\'s a deal here — we just need to land on the right structure.', emotion: 'positive' },
        { speaker: 'Marcus (Seller)', text: 'I agree entirely. I\'ll come back to you with some revised scenarios. Thank you for your openness today, Sofia.', emotion: 'warm' },
      ],
      activities: [
        { id: 'act-biz-1', type: 'roleplay', question: 'Roleplay Scenario: You are the seller. Your client wants a 20% discount on a software package. Practise negotiating using the phrases from this lesson.', xpReward: 25 },
        { id: 'act-biz-2', type: 'multiple-choice', question: 'Which phrase is most appropriate when you need time to consider a proposal?', options: ['"No, we can\'t agree to that."', '"That\'s a significant point. I\'d like to take that back to my team."', '"Whatever you think is best."', '"You\'re asking for too much."'], correctAnswer: '"That\'s a significant point. I\'d like to take that back to my team."', xpReward: 10 },
        { id: 'act-biz-3', type: 'matching', question: 'Match the negotiation situation to the most appropriate response.', pairs: [
          { left: 'You strongly disagree with a proposal', right: '"I hear what you\'re saying, however from our side the situation looks different."' },
          { left: 'You want to close the deal', right: '"I think we\'re very close to something we can both be satisfied with."' },
          { left: 'You need time to think', right: '"Could we schedule a follow-up call to give both sides time to review?"' },
          { left: 'Opening the negotiation', right: '"I\'m looking forward to exploring some mutually beneficial arrangements."' },
        ], xpReward: 15 },
      ],
    },
    {
      id: 'sec-survival',
      type: 'survival-english',
      title: "Survival English: At the Doctor's Surgery",
      imageQuery: 'doctor patient consultation medical office healthcare',
      content: `Going to the doctor in an English-speaking country can be stressful enough without the added challenge of a language barrier. This section gives you the essential vocabulary, phrases, and conversational strategies you need to communicate clearly and confidently in a medical setting.

      BOOKING AN APPOINTMENT

      On the phone:
      • "Hello, I'd like to make an appointment to see a doctor, please."
      • "It's fairly urgent — I've been feeling unwell for a few days."

      DESCRIBING SYMPTOMS

      Being precise about your symptoms helps doctors help you. Learn to describe:
      Location: "I have a sharp pain in my lower right abdomen."
      Duration: "It's been going on for about three days."
      Intensity: "On a scale of one to ten, I'd say it's about a seven."
      Triggers: "It gets worse when I eat."

      UNDERSTANDING YOUR DOCTOR

      Don't be afraid to ask for clarification:
      • "I'm sorry, could you explain what that means in simpler terms?"
      • "What are my options here, and what would you recommend?"
      • "Are there any side effects I should be aware of?"`,
      dialogue: [
        { speaker: 'Patient (Maria)', text: 'Good morning. I have a 9:15 appointment with Dr. Patel. My name is Maria Santos.', emotion: 'polite' },
        { speaker: 'Receptionist', text: 'Good morning, Ms. Santos. Yes, I can see you on the system. Please take a seat — Dr. Patel will be with you in about ten minutes.', emotion: 'professional' },
        { speaker: 'Dr. Patel', text: 'Ms. Santos, good morning. What brings you in today?', emotion: 'warm' },
        { speaker: 'Patient (Maria)', text: 'I\'ve been having quite a bad headache for about four days now. It\'s a throbbing pain, mainly on the left side. I\'ve tried paracetamol but it\'s not really touching it.', emotion: 'concerned' },
        { speaker: 'Dr. Patel', text: 'I\'m sorry to hear that. On a scale of one to ten, how would you rate the pain at its worst?', emotion: 'professional' },
        { speaker: 'Patient (Maria)', text: 'About a seven or eight when it peaks. It\'s really affecting my concentration at work.', emotion: 'uncomfortable' },
        { speaker: 'Dr. Patel', text: 'Have you experienced any nausea, sensitivity to light, or visual disturbances?', emotion: 'professional' },
        { speaker: 'Patient (Maria)', text: 'Yes, actually — the light does bother me a lot. What does that suggest?', emotion: 'curious' },
        { speaker: 'Dr. Patel', text: 'The symptoms you\'re describing are consistent with migraine. I\'d like to prescribe a specific migraine medication for you to try. If there\'s no improvement in 48 hours, please call us immediately.', emotion: 'reassuring' },
      ],
      activities: [
        { id: 'act-surv-1', type: 'roleplay', question: 'Roleplay: You have a sore throat and mild fever that has lasted 5 days. Practise describing your symptoms to the doctor using at least four different descriptive phrases from this lesson.', xpReward: 25 },
        { id: 'act-surv-2', type: 'fill-blanks', question: "Complete the patient's sentences.", blanks: [
          { id: 'bs1', sentence: 'I\'ve been feeling unwell for about _____ days now.', answer: 'three', hint: 'A specific time duration.' },
          { id: 'bs2', sentence: 'On a _____ of one to ten, I\'d say the pain is about a six.', answer: 'scale', hint: 'A measurement range.' },
          { id: 'bs3', sentence: 'Could you explain what that _____ in simpler terms, please?', answer: 'means', hint: 'Asking for clarification.' },
        ], xpReward: 15 },
      ],
    },
    {
      id: 'sec-news',
      type: 'news-story',
      title: 'BREAKING: Scientists Achieve Breakthrough in Quantum Computing',
      imageQuery: 'quantum computer laboratory technology breakthrough science',
      content: `SAN FRANCISCO, CA — Researchers at a leading technology institute announced yesterday that they have achieved what many in the scientific community are calling a landmark breakthrough in quantum computing: the first demonstration of "quantum advantage" on a problem with real-world commercial applications.

      The team, led by Dr. Yuki Tanaka of the Meridian Institute for Advanced Computing, demonstrated that their 127-qubit quantum processor could solve a class of molecular simulation problems relevant to drug discovery in under four minutes — a task that would take the world's most powerful classical supercomputer approximately 47,000 years to complete.

      "What we have shown today is not just a proof of concept," Dr. Tanaka told reporters. "We are demonstrating that quantum computing can already deliver practical advantages in domains that matter enormously for human wellbeing — in this case, the discovery of new medicines."

      The announcement has been met with cautious enthusiasm from independent experts. Professor Sarah Goldstein of Imperial College London described the results as "genuinely exciting" but urged caution. "We need to see the full methodology, and independent replication is essential before we can draw firm conclusions."

      Not everyone is cheering, however. Critics point out that the specific problem class chosen by Dr. Tanaka's team, while genuinely relevant, was also one that quantum machines are particularly well-suited to handle. "Real quantum advantage across a wide range of problems remains a work in progress," said Professor Alexei Volkov of MIT.

      Dr. Tanaka's team plans to publish a peer-reviewed paper within the next sixty days and has invited independent research groups to attempt replication.`,
      activities: [
        { id: 'act-news-1', type: 'true-false', question: 'The quantum processor solved the molecular simulation problem in under four minutes.', options: ['True', 'False'], correctAnswer: 'True', xpReward: 10 },
        { id: 'act-news-2', type: 'multiple-choice', question: 'What concern did Professor Goldstein raise about the research?', options: ['The research was entirely fraudulent.', 'Independent replication is needed before drawing firm conclusions.', 'Quantum computing can never have practical applications.', 'The team used an outdated methodology.'], correctAnswer: 'Independent replication is needed before drawing firm conclusions.', xpReward: 10 },
        { id: 'act-news-3', type: 'discussion', question: 'News Analysis Discussion', discussionPoints: [
          'What is "peer review" and why is it important in science?',
          'Should we be concerned that this research was partly funded by corporations? Why or why not?',
          'How do you evaluate news about scientific breakthroughs? What questions do you ask?',
          'What other fields do you think quantum computing might transform?',
        ], xpReward: 20 },
      ],
    },
    {
      id: 'sec-reflection',
      type: 'reflection',
      title: 'My Innovation Journey: Reflect & Review',
      imageQuery: 'reflection journal writing thinking notebook',
      content: `You have travelled through the whole magazine: you read about the digital revolution, mastered the perfect tenses, built a toolkit of innovation vocabulary, negotiated like a professional, survived a doctor's visit, and analysed a breaking news story.

      NOW IT'S YOUR TURN

      Take a moment to reflect on what you learned. Which new words will you actually use this week? Which grammar point still feels tricky? What is the most surprising idea you met in these pages?

      • Write a short paragraph: "The most important thing I learned in this magazine is..."
      • Rate each skill below honestly — your tutor uses this to plan our next lesson.
      • Choose one discussion point and talk about it in your next session.`,
      activities: [
        { id: 'act-refl-1', type: 'rating', question: 'Rate your confidence in each skill after this magazine.', ratingCriteria: [
          'Reading a long factual article in English',
          'Using perfect tenses in writing',
          'Using innovation vocabulary in conversation',
          'Negotiating and describing symptoms in English',
        ], xpReward: 20 },
        { id: 'act-refl-2', type: 'short-answer', question: 'Write a short paragraph: "The most important thing I learned in this magazine is..."', xpReward: 15 },
        { id: 'act-refl-3', type: 'discussion', question: 'Final Discussion — bring one of these to your next class:', discussionPoints: [
          'What technology do you think will change our lives the most in the next ten years?',
          'Which negotiation or doctor-visit phrase would you teach a friend?',
          'What will you do differently after reading this magazine?',
        ], xpReward: 20 },
        { id: 'act-refl-4', type: 'dictation', question: 'Final Challenge — Listen & Write', text: 'Innovation distinguishes between a leader and a follower.', xpReward: 15 },
      ],
    },
  ],
});

export const buildFlipbookHomeworkMockJson = (learner?: { name?: string }): string =>
    JSON.stringify(buildFlipbookHomeworkMock(learner?.name), null, 2);