import type { LearnerProfile } from './types';

// ─── Prompt data defined as TypeScript (avoids backtick conflicts inside JS template literal) ───

interface PromptEntry { id: string; icon: string; title: string; desc: string; prompt: string; }

const DOC_PROMPTS: PromptEntry[] = [
  { id:"essay-assessor", icon:"📝", title:"Comprehensive Essay Assessor", desc:"Full grammar, vocabulary, cohesion, and register correction with inline suggestions, error tags, and a detailed score summary.",
    prompt:'You are an expert English language assessor and tutor. Analyse the writing comprehensively and return ONLY a valid JSON object (no markdown, no prose) matching this exact schema:\n{"type":"doc_annotation","title":"Essay Assessment","originalText":"<verbatim>","annotatedSegments":[{"text":"<error>","errorType":"<Vocabulary|Grammar|Spelling|Tense|Word Order|Cohesion|Coherence|Punctuation|Style|Register|Preposition|Article>","correction":"<corrected>","explanation":"<rule>","color":"<hex>"}],"scores":{"overall":0,"grammar":0,"vocabulary":0,"cohesion":0,"taskAchievement":0},"generalFeedback":"<2-3 sentences>","commendations":["<strength>"],"improvements":["<improvement>"]}\n\nError color map: Vocabulary=#8b5cf6, Grammar=#e53e3e, Spelling=#d97706, Tense=#0891b2, Word Order=#059669, Cohesion=#db2777, Coherence=#7c3aed, Punctuation=#0284c7, Style=#be185d, Register=#9d174d, Preposition=#b45309, Article=#065f46.\n\nNow analyse this writing:\n[PASTE LEARNER WRITING HERE]' },
  { id:"outline-gen", icon:"📋", title:"Writing Outline Generator", desc:"Extracts or creates a rich text essay outline (thesis, topic sentences, evidence) from a given topic or text.",
    prompt:'You are an expert academic writing coach. Generate a detailed essay outline and return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Essay Outline","annotatedSegments":[],"scores":{},"generalFeedback":"","outlineHTML":"<full HTML outline with headings, bullets, thesis, topic sentences, evidence slots>","commendations":[],"improvements":[]}\n\nTopic or text:\n[PASTE TOPIC OR TEXT HERE]' },
  { id:"vocab-enhancer", icon:"🔤", title:"Vocabulary Enhancer", desc:"Suggests synonym upgrades, collocations, and example sentences for every flagged word.",
    prompt:'You are an expert English vocabulary coach. Identify every word that could be upgraded. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Vocabulary Enhancement Report","annotatedSegments":[{"text":"<original word>","errorType":"Vocabulary","correction":"<best synonym>","explanation":"Synonyms: [list]. Collocation: [example]. Sentence: [example].","color":"#8b5cf6"}],"scores":{"vocabulary":0},"generalFeedback":"<overall vocabulary feedback>","commendations":[],"improvements":[]}\n\nWriting:\n[PASTE WRITING HERE]' },
  { id:"grammar-deep", icon:"📐", title:"Grammar Deep Dive", desc:"Identifies all grammatical errors with rule explanations and practice rewrites.",
    prompt:'You are a grammar expert and ESL teacher. Analyse for ALL grammatical errors. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Grammar Deep Dive","annotatedSegments":[{"text":"<error text>","errorType":"Grammar","correction":"<corrected form>","explanation":"<rule name>: <brief explanation>. Rewrite: [corrected sentence].","color":"#e53e3e"}],"scores":{"grammar":0},"generalFeedback":"<overall grammar analysis>","commendations":[],"improvements":[]}\n\nWriting:\n[PASTE WRITING HERE]' },
  { id:"exam-rubric", icon:"🏆", title:"Exam Rubric Feedback", desc:"Assesses writing against an IELTS/TOEFL/CEFR rubric, returns band scores and criterion-specific feedback.",
    prompt:'You are an IELTS/TOEFL/CEFR examiner. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Exam Rubric Assessment","annotatedSegments":[],"scores":{"overall":0,"taskAchievement":0,"coherenceCohesion":0,"lexicalResource":0,"grammaticalRange":0},"bandDescriptors":{"taskAchievement":"<descriptor>","coherenceCohesion":"<descriptor>","lexicalResource":"<descriptor>","grammaticalRange":"<descriptor>"},"generalFeedback":"<examiner comment>","commendations":[],"improvements":[]}\n\nWriting:\n[PASTE WRITING HERE]' },
  { id:"exercise-creator", icon:"✏️", title:"Error-Targeted Exercise Creator", desc:"Generates fill-in-the-blanks, rewriting, and consolidation exercises based on errors found.",
    prompt:'You are an ESL teacher creating targeted practice exercises. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Practice Exercises","annotatedSegments":[],"scores":{},"generalFeedback":"","exercisesHTML":"<full HTML of: (1) Fill-in-the-Blanks, (2) Sentence Rewriting, (3) Consolidation — all with answer keys>","commendations":[],"improvements":[]}\n\nWriting:\n[PASTE WRITING HERE]' },
  { id:"speech-analyser", icon:"🗣️", title:"Speech Transcript Analyser", desc:"Analyses a conversation transcript for fluency, pronunciation patterns, fillers, and pragmatic errors.",
    prompt:'You are a speech and language expert. Analyse for fluency markers, filler words, pronunciation patterns, and pragmatic errors. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Speech Transcript Analysis","annotatedSegments":[{"text":"<filler/error>","errorType":"Style","correction":"<suggested alternative>","explanation":"<fluency/pragmatics note>","color":"#be185d"}],"scores":{"fluency":0,"pronunciation":0,"pragmatics":0,"overall":0},"generalFeedback":"<analysis summary>","commendations":[],"improvements":[]}\n\nTranscript:\n[PASTE TRANSCRIPT HERE]' },
  { id:"roleplay-builder", icon:"🎭", title:"Conversation & Role Play Builder", desc:"From a topic or transcript, creates a follow-up dialogue script and speaking practice questions.",
    prompt:'You are a speaking skills coach. Create a follow-up dialogue and practice questions. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Conversation & Role Play","annotatedSegments":[],"scores":{},"generalFeedback":"","dialogueHTML":"<full styled HTML of: (1) Role Play Scenario card, (2) Sample Dialogue with speaker labels, (3) 10 Speaking Practice Questions, (4) Useful Language box>","commendations":[],"improvements":[]}\n\nTopic/Transcript:\n[PASTE HERE]' },
  { id:"lesson-plan", icon:"📚", title:"Lesson Plan Creator", desc:"Generates a full lesson plan with objectives, stages, timing, and materials.",
    prompt:'You are an experienced language teacher. Create a full lesson plan. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Lesson Plan","annotatedSegments":[],"scores":{},"generalFeedback":"","lessonHTML":"<full rich-text HTML lesson plan with: Header (topic, level, duration, aims), Objectives (bulleted), Stages table (Stage|Timing|Activity|Materials|Rationale), Homework, Materials list>","commendations":[],"improvements":[]}\n\nTopic/Level/Duration:\n[PASTE HERE]' },
  { id:"reading-comp", icon:"📖", title:"Reading Comprehension Generator", desc:"Takes any text and produces multiple-choice and short answer questions with an answer key.",
    prompt:'You are a reading comprehension specialist. Generate a full comprehension exercise set. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Reading Comprehension","annotatedSegments":[],"scores":{},"generalFeedback":"","exercisesHTML":"<full HTML with: (1) 6 Multiple-Choice Questions with 4 options each, (2) 5 Short Answer Questions, (3) 2 Extended Response Questions, (4) Full Answer Key — all styled>","commendations":[],"improvements":[]}\n\nText:\n[PASTE TEXT HERE]' },
  { id:"rubric-builder", icon:"⚖️", title:"Custom Rubric Builder", desc:"Builds a weighted assessment rubric with 3-5 criteria and descriptive levels.",
    prompt:'You are an assessment design expert. Build a detailed assessment rubric. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Assessment Rubric","annotatedSegments":[],"scores":{},"generalFeedback":"","rubricHTML":"<full HTML of a professional rubric table: Criteria x Performance Levels (Excellent/Good/Satisfactory/Needs Improvement). Each cell has a descriptor and point value. Include weighting column and total score row.>","commendations":[],"improvements":[]}\n\nTask/Subject/Criteria:\n[DESCRIBE HERE]' },
  { id:"grammar-drill", icon:"🔧", title:"Grammar Explanation & Drill", desc:"Creates a clear grammar explanation followed by controlled practice exercises.",
    prompt:'You are a grammar teacher. Explain the grammar point and create practice exercises. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Grammar Focus & Practice","annotatedSegments":[],"scores":{},"generalFeedback":"","grammarHTML":"<full HTML with: (1) Grammar explanation box with rule, form, and examples table, (2) 8 gap-fill exercises, (3) 6 sentence transformation exercises, (4) 3 free-writing prompts, (5) Answer key>","commendations":[],"improvements":[]}\n\nGrammar point/Level:\n[DESCRIBE HERE]' },
  { id:"socratic-debate", icon:"⚖️", title:"Socratic Debate Prep", desc:"Structured template for preparing debate positions, claims, evidence, and counter-arguments.",
    prompt:'You are a debate coach. Generate a detailed socratic debate prep sheet and return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Socratic Debate Prep Sheet","annotatedSegments":[],"scores":{},"generalFeedback":"","outlineHTML":"<full HTML sheet with sections for: Motion/Topic, Main Stance, Argument 1 (Claim, Evidence, Warrant), Argument 2 (Claim, Evidence, Warrant), Counter-arguments/Rebuttals, and Conclusion>","commendations":[],"improvements":[]}\n\nTopic:\n[PASTE TOPIC HERE]' },
  { id:"feynman-sheet", icon:"🤔", title:"Feynman Technique Sheet", desc:"Breaks down a highly complex topic into simple terms, identifies knowledge gaps, and uses analogies.",
    prompt:'You are a learning science expert. Take a complex topic and generate a Feynman learning sheet. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Feynman Technique Sheet","annotatedSegments":[],"scores":{},"generalFeedback":"","outlineHTML":"<full HTML with: (1) The Concept, (2) Simple Explanation (ELI5), (3) Identified Knowledge Gaps/Friction Points, (4) Analogy Box, (5) Refined/Simplified Summary>","commendations":[],"improvements":[]}\n\nTopic:\n[PASTE TOPIC HERE]' },
  { id:"language-log", icon:"🗣️", title:"Language Practice Log", desc:"Custom practice logs containing vocabulary, grammar exercises, and correction drills tailored to learner level.",
    prompt:'You are an ESL curriculum designer. Create a custom Language Practice Log. Return ONLY a valid JSON object:\n{"type":"doc_annotation","title":"Language Practice Log","annotatedSegments":[],"scores":{},"generalFeedback":"","outlineHTML":"<full HTML with: (1) Vocabulary Focus (3 target words with definitions/sentences), (2) Grammar Rule & Examples Table, (3) 5 Custom Translation Exercises, (4) Free Writing Prompt, (5) Answer Key>","commendations":[],"improvements":[]}\n\nLanguage Level & Topic:\n[DESCRIBE HERE]' }
];

const WEB_PROMPTS: PromptEntry[] = [
  { id:"resume-cv", icon:"👔", title:"Resume / CV Builder", desc:"Modern, responsive CV with sections, icons, and progress bars.",
    prompt:'Build a complete, modern, responsive HTML Resume/CV page. Use only inline styles and Font Awesome CDN for icons. Include: hero header with name/title/contact, experience timeline, education section, skills with progress bars, languages section, and a print button.\n\nReturn ONLY a valid JSON object:\n{"type":"web_page","title":"Resume / CV","html":"<complete standalone HTML page as a single string>"}\n\nPersonalise for:\nName: [NAME]\nTitle: [JOB TITLE]\nExperience: [EXPERIENCE]\nSkills: [SKILLS]\nEducation: [EDUCATION]' },
  { id:"infographic", icon:"📊", title:"Data-Driven Infographic", desc:"SVG/CSS charts and statistics; numbers update dynamically when edited.",
    prompt:'Create a stunning, responsive HTML infographic page with SVG/CSS charts, large statistics numbers, and icons. Include: hero stat cards, SVG bar chart, donut/pie chart, timeline, and key facts section. All numbers in contenteditable spans.\n\nReturn ONLY:\n{"type":"web_page","title":"Data Infographic","html":"<complete standalone HTML page>"}\n\nTopic/Data:\n[DESCRIBE YOUR DATA OR TOPIC HERE]' },
  { id:"newspaper", icon:"📰", title:"Newspaper / Newsletter Page", desc:"Masthead, multi-column layout, placeholder images, fully customisable.",
    prompt:'Create a fully styled, print-quality HTML newspaper/newsletter page. Include: masthead, multi-column article layout, pull quotes, image placeholders, bylines, and sidebar. Use classic newspaper typography with inline styles.\n\nReturn ONLY:\n{"type":"web_page","title":"Newspaper Page","html":"<complete standalone HTML page>"}\n\nPublication name/Topic/Headlines:\n[DESCRIBE HERE]' },
  { id:"worksheet", icon:"📄", title:"Digital Worksheet", desc:"Interactive HTML worksheet with fillable fields and embedded media placeholders.",
    prompt:'Create an interactive HTML worksheet for students. Include: styled header, multiple exercise types (gap-fill, matching, multiple choice, short answer), timer, submit/check button with JS validation, and score display.\n\nReturn ONLY:\n{"type":"web_page","title":"Interactive Worksheet","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nSubject/Topic/Level:\n[DESCRIBE HERE]' },
  { id:"event-landing", icon:"🎉", title:"Event Landing Page", desc:"School event page with countdown timer, RSVP form, and photo gallery.",
    prompt:'Create a vibrant, responsive HTML event landing page. Include: full-width hero with event title and date, live countdown timer (JS), event details, schedule/agenda, RSVP form, photo gallery grid, and footer with contact info.\n\nReturn ONLY:\n{"type":"web_page","title":"Event Landing Page","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nEvent name/Date/Details:\n[DESCRIBE HERE]' },
  { id:"magazine-spread", icon:"🗞️", title:"Magazine 2-Page Spread", desc:"Full-bleed hero image, headline overlays, article teasers, elegant typography.",
    prompt:'Create an elegant HTML magazine double-page spread. Include: full-bleed hero with text overlay, large pull quote, multi-column article body with drop cap, sidebar with related articles, image captions, author bio, and page numbers.\n\nReturn ONLY:\n{"type":"web_page","title":"Magazine Spread","html":"<complete standalone HTML page>"}\n\nTopic/Article title/Content:\n[DESCRIBE HERE]' },
  { id:"brochure", icon:"📑", title:"Brochure", desc:"Professional trifold-style layout with services, pricing tables, and testimonials.",
    prompt:'Create a professional HTML brochure in trifold style (3-column layout). Include: company/school header, services with icons, pricing table with 3 tiers, testimonials with star ratings, contact section, and CTA button.\n\nReturn ONLY:\n{"type":"web_page","title":"Brochure","html":"<complete standalone HTML page>"}\n\nCompany/School name/Services/Pricing:\n[DESCRIBE HERE]' },
  { id:"product-landing", icon:"🛍️", title:"Product / Book Landing Page", desc:"Hero section, features grid, pricing table, review carousel, and call-to-action.",
    prompt:'Create a compelling product or book landing page in HTML. Include: hero with headline and CTA, features/benefits grid with icons, pricing section, star-rated reviews carousel, FAQ accordion (JS), and footer.\n\nReturn ONLY:\n{"type":"web_page","title":"Product Landing Page","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nProduct/Book name/Features/Price:\n[DESCRIBE HERE]' },
  { id:"restaurant-menu", icon:"🍽️", title:"Restaurant / Cafe Menu", desc:"Styled menu with categories, dish descriptions, prices, and allergy icons.",
    prompt:'Create a beautiful restaurant or cafe menu page in HTML. Include: restaurant header with logo placeholder, menu categories (Starters, Mains, Desserts, Drinks), dish cards with name/description/price/allergy icons, specials banner, and footer.\n\nReturn ONLY:\n{"type":"web_page","title":"Restaurant Menu","html":"<complete standalone HTML page>"}\n\nRestaurant name/Cuisine/Menu items:\n[DESCRIBE HERE]' },
  { id:"ecommerce-pricing", icon:"💰", title:"E-commerce / Pricing Table Page", desc:"Three-tier pricing cards with feature lists, popular badge, and CTA buttons.",
    prompt:'Create a polished pricing page. Include: 3-tier pricing cards (Basic/Pro/Enterprise) with feature lists, Most Popular badge, toggle for monthly/annual billing (JS), comparison table, and FAQ section.\n\nReturn ONLY:\n{"type":"web_page","title":"Pricing Table","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nProduct/Service name/Pricing tiers/Features:\n[DESCRIBE HERE]' },
  { id:"faq-accordion", icon:"❓", title:"FAQ Accordion Page", desc:"Expandable question-and-answer sections with smooth animations.",
    prompt:'Create a well-designed FAQ page with smooth accordion animations. Include: page header, search bar (JS filter), categorised FAQ sections, each question as animated accordion, contact CTA, and breadcrumb navigation.\n\nReturn ONLY:\n{"type":"web_page","title":"FAQ Page","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nTopic/Questions:\n[LIST YOUR FAQS OR DESCRIBE THE TOPIC HERE]' },
  { id:"photo-album", icon:"📷", title:"Photo Album / Memory Book", desc:"Flip-through gallery with captions, date stamps, and heart reactions.",
    prompt:'Create a beautiful photo album or memory book page in HTML. Include: decorative cover section, photo grid with placeholder images, captions, date stamps, heart/like reaction buttons (JS toggle), and print button.\n\nReturn ONLY:\n{"type":"web_page","title":"Photo Album","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nAlbum title/Theme/Captions:\n[DESCRIBE HERE]' },
  { id:"travel-blog", icon:"✈️", title:"Travel Blog Post", desc:"Destination title, day-by-day timeline, image gallery, tips section, map embed.",
    prompt:'Create an engaging travel blog post page in HTML. Include: full-width destination hero, author bio, day-by-day itinerary timeline, photo gallery grid, top tips section with icons, Google Maps iframe placeholder, and related posts sidebar.\n\nReturn ONLY:\n{"type":"web_page","title":"Travel Blog","html":"<complete standalone HTML page>"}\n\nDestination/Trip details/Days:\n[DESCRIBE HERE]' },
  { id:"recipe-page", icon:"🍳", title:"Recipe Page", desc:"Ingredients list, step-by-step instructions, cook time, serving size, print button.",
    prompt:'Create a beautifully designed recipe page in HTML. Include: recipe hero with key info (prep time, cook time, servings, difficulty), ingredients checklist (JS toggle), numbered step-by-step instructions, nutrition table, tips section, print button, and star rating widget.\n\nReturn ONLY:\n{"type":"web_page","title":"Recipe Page","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nRecipe name/Ingredients/Steps/Details:\n[DESCRIBE HERE]' },
  { id:"diy-tutorial", icon:"🔨", title:"DIY / Tutorial Guide", desc:"Materials list, numbered steps with images, pro tip banners, embedded video placeholder.",
    prompt:'Create a comprehensive DIY or tutorial guide page in HTML. Include: project header with difficulty and time estimate, materials checklist, numbered steps with image placeholders, pro tip callout boxes, warning banners, YouTube video placeholder, and printable checklist button.\n\nReturn ONLY:\n{"type":"web_page","title":"DIY Tutorial","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nProject title/Materials/Steps:\n[DESCRIBE HERE]' },
  { id:"book-review", icon:"📚", title:"Book Review Page", desc:"Book cover, star rating, summary, detailed review, similar book carousel.",
    prompt:'Create a literary book review page in HTML. Include: book cover placeholder with metadata, interactive star rating (JS), synopsis, detailed review with highlighted quotes, pros/cons section, reviewer bio, and Similar Books horizontal scroll carousel.\n\nReturn ONLY:\n{"type":"web_page","title":"Book Review","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nBook title/Author/Review content:\n[DESCRIBE HERE]' },
  { id:"job-board", icon:"💼", title:"Job Board Page", desc:"Search bar, job listing cards with filters (location, type, salary), apply link.",
    prompt:'Create a professional job board page in HTML. Include: search bar with filters (location, job type, salary range — all JS filtering), job listing cards with role/location/salary/type badge/posted date/save button, pagination, and Post a Job CTA.\n\nReturn ONLY:\n{"type":"web_page","title":"Job Board","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nCompany/Jobs to list:\n[DESCRIBE HERE]' },
  { id:"real-estate", icon:"🏠", title:"Real Estate Listing Page", desc:"Property gallery, details grid (beds, baths, sqft), map, agent contact form.",
    prompt:'Create a premium real estate property listing page in HTML. Include: photo gallery with thumbnail navigation (JS), property headline and price, key details grid (beds/baths/sqft/garage/year built), description, features checklist, neighbourhood info, Google Maps embed placeholder, agent profile card with contact form, and similar properties grid.\n\nReturn ONLY:\n{"type":"web_page","title":"Property Listing","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nProperty details:\n[DESCRIBE HERE]' },
  { id:"directory", icon:"🗂️", title:"Directory / Resource Library", desc:"Searchable grid of cards with category filters and download/preview links.",
    prompt:'Create a searchable resource directory or library page in HTML. Include: header with search bar (JS live filter), category filter buttons, card grid (each card: icon/title/description/category badge/download+preview buttons), empty state message, and results count.\n\nReturn ONLY:\n{"type":"web_page","title":"Resource Library","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nDirectory name/Categories/Resources:\n[DESCRIBE HERE]' },
  { id:"blog-comments", icon:"✍️", title:"Blog Post with Comments", desc:"Article layout with comment section, related posts sidebar, and social sharing.",
    prompt:'Create a full blog post article page in HTML. Include: post hero with category tag, title, author/date/reading time, article body with pull quotes/images/subheadings, social share buttons, author bio card, static comment section (styled, pre-populated with 3 sample comments and reply form), related posts grid sidebar, and tags.\n\nReturn ONLY:\n{"type":"web_page","title":"Blog Post","html":"<complete standalone HTML page>"}\n\nBlog title/Topic/Author/Content:\n[DESCRIBE HERE]' },
  { id:"product-launch", icon:"🚀", title:"Product Launch Page", desc:"Futuristic landing page with header, specs grid, interactive pricing cards, and a newsletter sign-up.",
    prompt:'Build an incredibly slick, futuristic product launch landing page. Use Tailwind CSS via inline/embedded styling and beautiful icons. Include a hero section with animated countdown, key specs grid, responsive three-tier pricing cards with hovering effects, a newsletter sign-up form, and social links.\n\nReturn ONLY a valid JSON object:\n{"type":"web_page","title":"Product Launch Page","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nProduct details:\n[DESCRIBE HERE]' },
  { id:"quiz-deck", icon:"🎮", title:"Interactive Quiz Deck", desc:"Flashcard-style slides with quiz questions, options, explanation reveals, and score keeper.",
    prompt:'Build an interactive HTML/JS Quiz/Flashcard deck. It should display one slide/question at a time, have click-to-reveal answers/explanations, sound indicator indicators (styled visually), a live score counter, and a progress bar. Include 5-10 high-quality educational questions with beautiful layout design.\n\nReturn ONLY a valid JSON object:\n{"type":"web_page","title":"Interactive Quiz Deck","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nTopic/Level:\n[DESCRIBE HERE]' },
  { id:"kanban-tracker", icon:"📋", title:"Kanban Project Board", desc:"Interactive Kanban board with drag-to-sort columns (To Do, Doing, Done) and task creation modal.",
    prompt:'Build a fully interactive, beautifully designed Kanban Project Board page. Include three standard columns (To Do, In Progress, Done) with smooth add-task modals, drag-and-drop or click-to-move card behaviors, priority badges, and simple local storage persistence inside the page.\n\nReturn ONLY a valid JSON object:\n{"type":"web_page","title":"Kanban Board","html":"<complete standalone HTML page with embedded JavaScript>"}\n\nProject details:\n[DESCRIBE HERE]' }
];

const MASTER_PROMPT_STR = 'You are an elite educational content production engine. I will give you a content request and you will return ONLY valid JSON -- no prose, no markdown fences, no explanation -- just the raw JSON object.\n\nCONTENT TYPES AND SCHEMAS:\n\n1. FOR DOCUMENT PAGES (annotated text with corrections and feedback):\n{"type":"doc_annotation","title":"<string>","originalText":"<string>","annotatedSegments":[{"text":"<error text>","errorType":"<Vocabulary|Grammar|Spelling|Tense|Word Order|Cohesion|Coherence|Punctuation|Style|Register|Preposition|Article>","correction":"<corrected form>","explanation":"<rule + example>","color":"<hex>"}],"scores":{"overall":0,"grammar":0,"vocabulary":0,"cohesion":0,"taskAchievement":0},"generalFeedback":"<string>","commendations":[],"improvements":[],"exercisesHTML":"<optional rich HTML>","outlineHTML":"<optional rich HTML>","lessonHTML":"<optional rich HTML>","grammarHTML":"<optional rich HTML>","rubricHTML":"<optional rich HTML>"}\n\n2. FOR WEB PAGES (full standalone HTML):\n{"type":"web_page","title":"<string>","html":"<complete standalone HTML page as a single minified string>"}\n\n3. FOR WHITEBOARD PAGES (text boxes / visual elements):\n{"type":"whiteboard","title":"<string>","elements":[{"kind":"<textbox|banner|image>","x":0,"y":0,"width":300,"content":"<HTML content or image URL>","style":"<inline CSS>"}]}\n\nNow ask me: What would you like to create? (Tell me the type, topic, and any details.)';

const AI_MASTER_PROMPT_STR = 'You are an elite English language assessor, grammar expert, vocabulary coach, and ESL teacher all in one.\n\nI am going to paste a piece of learner writing below.\n\nPlease:\n1. Read the writing carefully.\n2. Identify EVERY error (Grammar, Vocabulary, Spelling, Tense, Word Order, Cohesion, Coherence, Punctuation, Style, Register, Preposition, Article).\n3. Suggest improvements, synonyms, collocations, and register upgrades.\n4. Score the writing on: Overall (0-100), Grammar (0-100), Vocabulary (0-100), Cohesion (0-100), Task Achievement (0-100).\n5. Write 2-3 commendations (genuine strengths).\n6. Write 3-5 specific improvements.\n7. Give detailed general feedback as a professional tutor would.\n\nReturn ONLY a valid JSON object (no markdown, no explanation, no preamble) using this exact schema:\n{"type":"doc_annotation","title":"Writing Assessment","originalText":"<the original text verbatim>","annotatedSegments":[{"text":"<exact error text from original>","errorType":"<Vocabulary|Grammar|Spelling|Tense|Word Order|Cohesion|Coherence|Punctuation|Style|Register|Preposition|Article>","correction":"<corrected version>","explanation":"<brief rule + why it is wrong>","color":"<hex: Vocabulary=#8b5cf6, Grammar=#e53e3e, Spelling=#d97706, Tense=#0891b2, Word Order=#059669, Cohesion=#db2777, Coherence=#7c3aed, Punctuation=#0284c7, Style=#be185d, Register=#9d174d, Preposition=#b45309, Article=#065f46>"}],"scores":{"overall":0,"grammar":0,"vocabulary":0,"cohesion":0,"taskAchievement":0},"generalFeedback":"<2-4 sentences of professional tutor feedback>","commendations":["<strength 1>","<strength 2>"],"improvements":["<improvement 1>","<improvement 2>","<improvement 3>"]}\n\nLearner writing to assess:\n';

export const getWhiteboardFeatures = (learner: LearnerProfile): { html: string; css: string; js: string } => {
    const learnerName = learner.name || 'Student';
    const courseName = learner.coursePlan?.courseName || 'General English';

    // Serialize prompt data for injection into JS template literal
    const docPromptsJson = JSON.stringify(DOC_PROMPTS);
    const webPromptsJson = JSON.stringify(WEB_PROMPTS);
    const masterPromptJson = JSON.stringify(MASTER_PROMPT_STR);
    const aiMasterPromptJson = JSON.stringify(AI_MASTER_PROMPT_STR);

    // ─────────────────────────────────────────────────────────────────────────
    //  HTML
    // ─────────────────────────────────────────────────────────────────────────
    const html = `<div id="whiteboard-overlay" style="display:none;">
<div class="wb-toolbar">
<div class="tb-grp">
<button class="tb-btn" onclick="wbUndo()" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i></button>
<button class="tb-btn" onclick="wbRedo()" title="Redo (Ctrl+Y)"><i class="fas fa-redo"></i></button>
<span class="tb-sep"></span>
<button class="tb-btn" onclick="wbCut()" title="Cut (Ctrl+X)"><i class="fas fa-cut"></i></button>
<button class="tb-btn" onclick="wbCopy()" title="Copy (Ctrl+C)"><i class="fas fa-copy"></i></button>
<button class="tb-btn" onclick="wbPaste()" title="Paste (Ctrl+V)"><i class="fas fa-paste"></i></button>
</div>
<div class="tb-grp">
<select id="wbFont" onchange="setFont(this.value)" class="tb-sel" title="Font">
<option value="Times New Roman">Times New Roman</option>
<option value="Arial">Arial</option>
<option value="Georgia">Georgia</option>
<option value="Verdana">Verdana</option>
<option value="Courier New">Courier New</option>
</select>
<div class="sz-wrap">
<button class="tb-btn tb-sm" onclick="chgSize(-2)" title="Decrease Size"><i class="fas fa-minus"></i></button>
<input type="number" id="wbSize" value="14" min="8" max="72" class="sz-inp">
<button class="tb-btn tb-sm" onclick="chgSize(2)" title="Increase Size"><i class="fas fa-plus"></i></button>
</div>
</div>
<div class="tb-grp">
<button class="tb-btn" id="btnB" onclick="fmt('bold')" title="Bold (Ctrl+B)"><i class="fas fa-bold"></i></button>
<button class="tb-btn" id="btnI" onclick="fmt('italic')" title="Italic (Ctrl+I)"><i class="fas fa-italic"></i></button>
<button class="tb-btn" id="btnU" onclick="fmt('underline')" title="Underline (Ctrl+U)"><i class="fas fa-underline"></i></button>
<button class="tb-btn" onclick="fmt('strikeThrough')" title="Strikethrough"><i class="fas fa-strikethrough"></i></button>
<button class="tb-btn" onclick="superscript()" title="Superscript"><i class="fas fa-superscript"></i></button>
<button class="tb-btn" onclick="subscript()" title="Subscript"><i class="fas fa-subscript"></i></button>
<div class="clr-wrap"><button class="tb-btn" onclick="document.getElementById('txtClr').click()" title="Text Color"><i class="fas fa-font"></i><span class="clr-bar" id="txtBar"></span></button><input type="color" id="txtClr" value="#000000" onchange="setTxtClr(this.value)"></div>
<div class="clr-wrap"><button class="tb-btn" onclick="document.getElementById('hlClr').click()" title="Highlight"><i class="fas fa-highlighter"></i><span class="clr-bar hl" id="hlBar"></span></button><input type="color" id="hlClr" value="#FFFF00" onchange="setHlClr(this.value)"></div>
</div>
<div class="tb-grp">
<button class="tb-btn" onclick="fmt('justifyLeft')" title="Align Left"><i class="fas fa-align-left"></i></button>
<button class="tb-btn" onclick="fmt('justifyCenter')" title="Align Center"><i class="fas fa-align-center"></i></button>
<button class="tb-btn" onclick="fmt('justifyRight')" title="Align Right"><i class="fas fa-align-right"></i></button>
<button class="tb-btn" onclick="fmt('insertUnorderedList')" title="Bullet List"><i class="fas fa-list-ul"></i></button>
<button class="tb-btn" onclick="fmt('insertOrderedList')" title="Numbered List"><i class="fas fa-list-ol"></i></button>
</div>
<div class="tb-grp">
<div class="mark-err-wrap">
<button class="tb-btn mark-err-main-btn" onmousedown="event.preventDefault();toggleMarkErrMenu()" title="Mark Error"><i class="fas fa-exclamation-triangle" style="color:#e53e3e"></i> <span style="font-size:11px">Mark Error</span> <i class="fas fa-caret-down" style="font-size:10px"></i></button>
<div class="mark-err-menu" id="markErrMenu">
<div class="mec-item" onmousedown="event.preventDefault();markError('Vocabulary','#8b5cf6')"><span class="mec-dot" style="background:#8b5cf6"></span>Vocabulary</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Grammar','#e53e3e')"><span class="mec-dot" style="background:#e53e3e"></span>Grammar</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Spelling','#d97706')"><span class="mec-dot" style="background:#d97706"></span>Spelling</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Tense','#0891b2')"><span class="mec-dot" style="background:#0891b2"></span>Tense</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Word Order','#059669')"><span class="mec-dot" style="background:#059669"></span>Word Order</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Cohesion','#db2777')"><span class="mec-dot" style="background:#db2777"></span>Cohesion</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Coherence','#7c3aed')"><span class="mec-dot" style="background:#7c3aed"></span>Coherence</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Punctuation','#0284c7')"><span class="mec-dot" style="background:#0284c7"></span>Punctuation</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Style','#be185d')"><span class="mec-dot" style="background:#be185d"></span>Style</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Register','#9d174d')"><span class="mec-dot" style="background:#9d174d"></span>Register</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Preposition','#b45309')"><span class="mec-dot" style="background:#b45309"></span>Preposition</div>
<div class="mec-item" onmousedown="event.preventDefault();markError('Article','#065f46')"><span class="mec-dot" style="background:#065f46"></span>Article</div>
</div>
</div>
</div>
<div class="tb-grp">
<button class="tb-btn" onclick="openMdl('mFind')" title="Find &amp; Replace"><i class="fas fa-search"></i></button>
<button class="tb-btn" onclick="clearFormatting()" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
<button class="tb-btn" onclick="insertTextBox()" title="Text Box"><i class="fas fa-text-width"></i></button>
<button class="tb-btn" onclick="openMdl('mLink')" title="Link"><i class="fas fa-link"></i></button>
<button class="tb-btn" onclick="openMdl('mImg')" title="Image"><i class="fas fa-image"></i></button>
<button class="tb-btn" onclick="openMdl('mFile')" title="Open File"><i class="fas fa-folder-open"></i></button>
<button class="tb-btn" onclick="openMdl('mTbl')" title="Table"><i class="fas fa-table"></i></button>
<button class="tb-btn" onclick="openMdl('mTpl')" title="Templates"><i class="fas fa-file-alt"></i></button>
<button class="tb-btn" onclick="openMdl('mBanners')" title="Banners"><i class="fas fa-flag" style="color:#e53e3e"></i></button>
</div>
<div class="tb-grp">
<button class="tb-btn" id="btnHand" onclick="togHand()" title="Hand / Move Canvas (Grab &amp; Drag)"><i class="fas fa-hand-paper"></i></button>
<button class="tb-btn" id="btnDraw" onclick="togDraw()" title="Draw"><i class="fas fa-pencil-alt"></i></button>
<button class="tb-btn" id="btnTrack" onclick="togTrack()" title="Track Changes"><i class="fas fa-user-edit"></i></button>
<button class="tb-btn" onclick="openMdl('mSetup')" title="Page Setup"><i class="fas fa-cog"></i></button>
</div>
<div class="tb-grp">
<select id="themeSelect" onchange="setTheme(this.value)" class="tb-sel">
<option value="light">Light</option>
<option value="dark">Dark</option>
<option value="sepia">Sepia</option>
</select>
</div>
<div class="tb-grp">
<button class="tb-btn" onclick="toggleLibraryPanel()" title="AI Prompt Library" style="background:#ebf8ff;border-color:#4299e1;color:#2b6cb0;padding:0 10px;width:auto;font-size:11px;font-weight:700"><i class="fas fa-robot" style="margin-right:4px"></i>Library</button>
<button class="tb-btn" onclick="openMdl('mAIReview')" title="Writing Assessor" style="background:#faf5ff;border-color:#805ad5;color:#553c9a;padding:0 8px;width:auto;font-size:11px;font-weight:700"><i class="fas fa-brain" style="margin-right:4px"></i>Review</button>
<button class="tb-btn tb-ok" onclick="openMdl('mSave')" title="Save"><i class="fas fa-save"></i></button>
<button class="tb-btn" onclick="togFs()" title="Fullscreen"><i class="fas fa-expand"></i></button>
<button class="tb-btn tb-no" onclick="closeWb()" title="Close"><i class="fas fa-times"></i></button>
</div>
</div>
<div id="drawPnl" class="draw-pnl">
<div class="dp-sec"><span class="dp-lbl">Tool:</span>
<button class="dp-btn active" data-tool="pen" onclick="setTool('pen')"><i class="fas fa-pen"></i></button>
<button class="dp-btn" data-tool="pencil" onclick="setTool('pencil')"><i class="fas fa-pencil-alt"></i></button>
<button class="dp-btn" data-tool="brush" onclick="setTool('brush')"><i class="fas fa-paint-brush"></i></button>
<button class="dp-btn" data-tool="marker" onclick="setTool('marker')"><i class="fas fa-marker"></i></button>
<button class="dp-btn" data-tool="highlighter" onclick="setTool('highlighter')"><i class="fas fa-highlighter"></i></button>
<button class="dp-btn" data-tool="eraser" onclick="setTool('eraser')"><i class="fas fa-eraser"></i></button>
</div>
<div class="dp-sec"><span class="dp-lbl">Shape:</span>
<button class="dp-btn" data-tool="line" onclick="setTool('line')"><i class="fas fa-minus"></i></button>
<button class="dp-btn" data-tool="arrow" onclick="setTool('arrow')"><i class="fas fa-long-arrow-alt-right"></i></button>
<button class="dp-btn" data-tool="rect" onclick="setTool('rect')"><i class="far fa-square"></i></button>
<button class="dp-btn" data-tool="fillRect" onclick="setTool('fillRect')"><i class="fas fa-square"></i></button>
<button class="dp-btn" data-tool="circle" onclick="setTool('circle')"><i class="far fa-circle"></i></button>
<button class="dp-btn" data-tool="fillCircle" onclick="setTool('fillCircle')"><i class="fas fa-circle"></i></button>
</div>
<div class="dp-sec"><span class="dp-lbl">Color:</span>
<input type="color" id="drawClr" value="#000000" class="dp-clr">
<span class="dp-pre" style="background:#000" onclick="setDClr('#000')"></span>
<span class="dp-pre" style="background:#dc2626" onclick="setDClr('#dc2626')"></span>
<span class="dp-pre" style="background:#2563eb" onclick="setDClr('#2563eb')"></span>
<span class="dp-pre" style="background:#16a34a" onclick="setDClr('#16a34a')"></span>
</div>
<div class="dp-sec"><span class="dp-lbl">Size:</span>
<input type="range" id="drawSz" min="1" max="30" value="3" class="dp-rng">
<span id="szVal">3px</span>
</div>
<div class="dp-sec">
<button class="dp-act" onclick="undoDraw()"><i class="fas fa-undo"></i></button>
<button class="dp-act" onclick="redoDraw()"><i class="fas fa-redo"></i></button>
<button class="dp-act dp-del" onclick="clearDraw()"><i class="fas fa-trash"></i></button>
</div>
</div>
<div class="wb-main">
<div class="pg-side" id="pgSide">
<div class="ps-header">
<span class="ps-title">Pages</span>
<div class="ps-nav">
<input type="number" id="pgJump" min="1" value="1" class="ps-jump">
<button onclick="goToPageInput()" class="ps-go"><i class="fas fa-arrow-right"></i></button>
</div>
</div>
<div id="pgList" class="ps-list"></div>
<div class="ps-footer">
<button class="ps-btn" onclick="addPg()"><i class="fas fa-plus"></i></button>
<button class="ps-btn ps-btn-del" onclick="delPg()"><i class="fas fa-trash"></i></button>
<span class="ps-info" id="pgInfo">1/1</span>
</div>
</div>
<div class="wb-area" id="wbArea">
<div class="zoom-container" id="zoomContainer">
<div class="zoom-inner" id="zoomInner">
<div class="pg-wrap" data-pg="1">
<div class="wb-hdr" id="hdr1"></div>
<div class="wb-pg-container">
<div class="wb-pg" id="pg1" contenteditable="true" data-pg="1" spellcheck="true"></div>
<canvas class="wb-cv" id="cv1" data-pg="1"></canvas>
<div class="wb-wm" id="wm1"></div>
</div>
<div class="wb-ftr" id="ftr1"></div>
</div>
</div>
</div>
</div>
<div class="lib-panel" id="libPanel">
<div class="lib-header"><span><i class="fas fa-robot"></i> AI Prompt Library</span><button onclick="toggleLibraryPanel()" class="lib-close">&times;</button></div>
<div class="lib-search-row"><input type="text" id="libSearch" class="lib-search" placeholder="Search prompts..." oninput="filterLibrary()"></div>
<div class="lib-tabs">
<button class="lib-tab active" onclick="setLibTab('doc',this)">Document</button>
<button class="lib-tab" onclick="setLibTab('web',this)">Web Pages</button>
<button class="lib-tab" onclick="setLibTab('custom',this)">My Prompts</button>
</div>
<div id="libCards" class="lib-cards"></div>
<div class="lib-paste-area">
<div style="font-size:11px;color:#718096;margin-bottom:6px;font-weight:600">PASTE AI RESPONSE</div>
<textarea id="libPasteInput" class="lib-paste-inp" placeholder="Paste the AI JSON or HTML response here..."></textarea>
<button class="lib-paste-btn" onclick="applyAIResponse()"><i class="fas fa-magic"></i> Apply AI Response</button>
</div>
<div class="lib-custom-area"><button class="lib-custom-add" onclick="openMdl('mCustomPrompt')"><i class="fas fa-plus"></i> Add Custom Prompt</button></div>
</div>
<div class="thesaurus-pane" id="thesaurusPane">
<div class="thes-header"><span><i class="fas fa-book-open"></i> Thesaurus</span><button onclick="closeThesaurus()" class="thes-close">&times;</button></div>
<div class="thes-search-row">
<input id="thesInput" class="thes-search" placeholder="Search word..." onkeydown="if(event.key==='Enter')lookupThesaurus(document.getElementById('thesInput').value)">
<button onclick="lookupThesaurus(document.getElementById('thesInput').value)" class="thes-go"><i class="fas fa-search"></i></button>
</div>
<div id="thesResults" class="thes-results"><p style="color:#a0aec0;font-size:12px;text-align:center;margin-top:20px">Right-click a word or search above</p></div>
</div>
</div>
<div class="wb-stat">
<span id="stWords">Words: 0</span>
<span id="stChars">Chars: 0</span>
<span id="stPg">Page 1/1</span>
<span id="stTrack" class="st-off">Track: Off</span>
<span id="stSave">Ready</span>
<div class="zm-wrap">
<button onclick="zmOut()">-</button>
<span id="zmVal">100%</span>
<button onclick="zmIn()">+</button>
</div>
</div>
<div id="micContainer" class="mic-container">
<button id="micCircleBtn" class="mic-circle-btn" onclick="toggleMicSettingsPopover(event)" title="Microphone & Transcription Settings">
  <i class="fas fa-microphone" id="micCircleIcon"></i>
  <span id="micCircleBadge" class="mic-circle-badge">OFF</span>
</button>
<div id="micSettingsPanel" class="mic-settings-panel">
  <div class="mic-panel-header">
    <div class="mic-panel-title">
      <i class="fas fa-microphone-alt" style="color:#60a5fa"></i>
      <span>Speech Transcribe</span>
    </div>
    <button class="mic-panel-close" onclick="closeMicSettingsPopover()">&times;</button>
  </div>
  <div class="mic-panel-body">
    <div class="mic-status-card">
      <div class="mic-status-text" id="micStatusText">READY</div>
      <div class="mic-indicator" id="micIndicator">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </div>
    <button id="micToggleBtn" class="mic-toggle-btn" onclick="toggleMicActive()">
      <i class="fas fa-power-off"></i>
      <span id="micToggleTxt">Activate Live Transcribe</span>
    </button>
    <div class="mic-field-group">
      <label class="mic-label"><i class="fas fa-sliders-h"></i> Microphone Device</label>
      <select id="micDevSel" class="mic-select" onchange="onMicDeviceChange(this.value)">
        <option value="">Default Microphone</option>
      </select>
    </div>
    <div class="mic-field-group">
      <label class="mic-label"><i class="fas fa-globe"></i> Language</label>
      <select id="micLangSel" class="mic-select" onchange="onMicLanguageChange(this.value)">
        <option value="en-US">English (United States)</option>
        <option value="en-GB">English (United Kingdom)</option>
        <option value="en-AU">English (Australia)</option>
        <option value="es-ES">Spanish (Spain / LatAm)</option>
        <option value="fr-FR">French (France)</option>
        <option value="de-DE">German (Germany)</option>
        <option value="it-IT">Italian (Italy)</option>
        <option value="pt-BR">Portuguese (Brazil)</option>
        <option value="ru-RU">Russian</option>
        <option value="zh-CN">Chinese (Mandarin)</option>
        <option value="ja-JP">Japanese</option>
        <option value="ar-SA">Arabic</option>
      </select>
    </div>
    <div class="mic-opts-row">
      <label class="mic-opt-check">
        <input type="checkbox" id="micAutoPunct" checked onchange="toggleAutoPunct(this.checked)">
        <span>Auto-Punctuation & Capitalization</span>
      </label>
      <label class="mic-opt-check">
        <input type="checkbox" id="micVoiceCmds" checked onchange="toggleVoiceCmds(this.checked)">
        <span>Voice Commands ("new line", "period")</span>
      </label>
    </div>
    <div id="micPreview" class="mic-preview-box">
      <span class="mic-preview-placeholder">Live spoken words will appear here...</span>
    </div>
  </div>
</div>
</div>
<div id="wbContextMenu" class="wb-ctx-menu">
<div class="ctx-item" onclick="wbCut();closeCtx()"><i class="fas fa-cut"></i> Cut</div>
<div class="ctx-item" onclick="wbCopy();closeCtx()"><i class="fas fa-copy"></i> Copy</div>
<div class="ctx-item" onclick="wbPaste();closeCtx()"><i class="fas fa-paste"></i> Paste</div>
<div class="ctx-sep"></div>
<div class="ctx-item" onclick="openThesaurusFromCtx();closeCtx()"><i class="fas fa-book-open"></i> Thesaurus / Synonyms</div>
<div class="ctx-item" id="ctxSynSub" style="position:relative"><i class="fas fa-exchange-alt"></i> Synonyms <i class="fas fa-caret-right" style="margin-left:auto"></i><div class="ctx-syn-list" id="ctxSynList">Loading...</div></div>
</div>
<div id="mTpl" class="mdl"><div class="mdl-box mdl-lg"><div class="mdl-hd"><span>Templates</span><button onclick="closeMdl('mTpl')">&times;</button></div><div class="mdl-bd"><div class="tpl-cats"><button class="tpl-cat active" onclick="filterTpl('all',this)">All</button><button class="tpl-cat" onclick="filterTpl('edu',this)">School</button><button class="tpl-cat" onclick="filterTpl('lang',this)">Language</button><button class="tpl-cat" onclick="filterTpl('work',this)">Work</button><button class="tpl-cat" onclick="filterTpl('plan',this)">Planning</button><button class="tpl-cat" onclick="filterTpl('write',this)">Writing</button><button class="tpl-cat" onclick="filterTpl('life',this)">Life & Reflection</button></div><div id="tplGrid" class="tpl-grid"></div></div></div></div>
<div id="mSave" class="mdl"><div class="mdl-box"><div class="mdl-hd"><span>Save Document</span><button onclick="closeMdl('mSave')">&times;</button></div><div class="mdl-bd"><input type="text" id="saveName" class="mdl-inp" placeholder="File name"><div class="save-grid"><button class="sv-btn sv-pdf" onclick="savePDF()"><i class="fas fa-file-pdf"></i><span>PDF</span></button><button class="sv-btn sv-doc" onclick="saveDoc()"><i class="fas fa-file-word"></i><span>Word</span></button><button class="sv-btn sv-html" onclick="saveHTML()"><i class="fas fa-file-code"></i><span>HTML</span></button><button class="sv-btn sv-txt" onclick="saveTXT()"><i class="fas fa-file-alt"></i><span>Text</span></button></div></div></div></div>
<div id="mTbl" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span>Insert Table</span><button onclick="closeMdl('mTbl')">&times;</button></div><div class="mdl-bd"><div class="inp-row"><label>Rows</label><input type="number" id="tblR" value="3" min="1" max="20" class="mdl-inp mdl-inp-sm"></div><div class="inp-row"><label>Columns</label><input type="number" id="tblC" value="3" min="1" max="10" class="mdl-inp mdl-inp-sm"></div><button class="mdl-btn" onclick="doTbl()">Insert</button></div></div></div>
<div id="mLink" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span>Insert Link</span><button onclick="closeMdl('mLink')">&times;</button></div><div class="mdl-bd"><input type="url" id="linkUrl" class="mdl-inp" placeholder="https://example.com"><input type="text" id="linkTxt" class="mdl-inp" placeholder="Display text"><button class="mdl-btn" onclick="doLink()">Insert</button></div></div></div>
<div id="mImg" class="mdl"><div class="mdl-box"><div class="mdl-hd"><span>Insert Image</span><button onclick="closeMdl('mImg')">&times;</button></div><div class="mdl-bd"><div class="upl-box" onclick="document.getElementById('imgFile').click()"><i class="fas fa-cloud-upload-alt"></i><span>Click to upload</span><input type="file" id="imgFile" accept="image/*" onchange="handleUpl(this)" hidden></div><div class="or-div"><span>OR</span></div><input type="url" id="imgUrl" class="mdl-inp" placeholder="Image URL"><input type="text" id="imgCaption" class="mdl-inp" placeholder="Image caption (optional)"><button class="mdl-btn" onclick="doImg()">Insert</button></div></div></div>
<div id="mFile" class="mdl"><div class="mdl-box"><div class="mdl-hd"><span>Open File</span><button onclick="closeMdl('mFile')">&times;</button></div><div class="mdl-bd"><div class="upl-box" onclick="document.getElementById('uplFile').click()"><i class="fas fa-folder-open"></i><span>Click to upload PDF, DOCX, or PPTX</span><input type="file" id="uplFile" accept=".pdf,.docx,.pptx" onchange="handleFileUpload(this)" hidden></div><div id="fileStatus" style="margin-top:10px;text-align:center;color:#718096"></div></div></div></div>
<div id="mSetup" class="mdl"><div class="mdl-box mdl-lg"><div class="mdl-hd"><span>Page Setup</span><button onclick="closeMdl('mSetup')">&times;</button></div><div class="mdl-bd"><div class="setup-grid"><div class="setup-col"><div class="setup-sec"><h4><i class="fas fa-file"></i> Orientation</h4><div class="orient-btns"><button class="orient-btn active" id="orientP" onclick="setOrient('portrait')"><i class="fas fa-file-alt"></i><span>Portrait</span></button><button class="orient-btn" id="orientL" onclick="setOrient('landscape')"><i class="fas fa-file-alt fa-rotate-90"></i><span>Landscape</span></button></div></div><div class="setup-sec"><h4><i class="fas fa-arrows-alt"></i> Margins (mm)</h4><div class="marg-grid"><div class="marg-item"><label>Top</label><input type="number" id="margT" value="20" min="5" max="50" class="mdl-inp mdl-inp-sm"></div><div class="marg-item"><label>Bottom</label><input type="number" id="margB" value="20" min="5" max="50" class="mdl-inp mdl-inp-sm"></div><div class="marg-item"><label>Left</label><input type="number" id="margL" value="25" min="5" max="50" class="mdl-inp mdl-inp-sm"></div><div class="marg-item"><label>Right</label><input type="number" id="margR" value="25" min="5" max="50" class="mdl-inp mdl-inp-sm"></div></div></div><div class="setup-sec"><h4><i class="fas fa-border-style"></i> Page Border</h4><select id="borderStyle" class="mdl-inp"><option value="none">No Border</option><option value="simple">Simple Line</option><option value="double">Double Line</option><option value="elegant">Elegant</option><option value="professional">Professional</option></select><div class="clr-row"><label>Color</label><input type="color" id="borderColor" value="#1e3a5f" class="clr-inp"></div></div></div><div class="setup-col"><div class="setup-sec"><h4><i class="fas fa-heading"></i> Header</h4><div class="hf-checks"><label class="hf-check"><input type="checkbox" id="hfName" checked><span>Student: ${learnerName}</span></label><label class="hf-check"><input type="checkbox" id="hfCourse" checked><span>Course: ${courseName}</span></label><label class="hf-check"><input type="checkbox" id="hfDate" checked><span>Date</span></label></div><input type="text" id="hfCustom" class="mdl-inp" placeholder="Custom header"><select id="hdrStyle" class="mdl-inp"><option value="professional">Professional</option><option value="modern">Modern</option><option value="classic">Classic</option><option value="minimal">Minimal</option></select></div><div class="setup-sec"><h4><i class="fas fa-shoe-prints"></i> Footer</h4><label class="hf-check"><input type="checkbox" id="ftrPage" checked><span>Page Number</span></label><input type="text" id="ftrCustom" class="mdl-inp" placeholder="Custom footer"></div><div class="setup-sec"><h4><i class="fas fa-tint"></i> Watermark</h4><input type="text" id="wmText" class="mdl-inp" placeholder="Watermark text"><div class="wm-row"><label>Opacity</label><input type="range" id="wmOp" min="0.02" max="0.2" step="0.01" value="0.08"><span id="wmOpVal">8%</span></div><div class="wm-row"><label>Size</label><input type="number" id="wmSz" value="80" min="30" max="150" class="mdl-inp mdl-inp-sm">px</div></div></div></div><button class="mdl-btn mdl-btn-lg" onclick="applySetup()"><i class="fas fa-check"></i> Apply</button></div></div></div>
<div id="mFind" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span>Find &amp; Replace</span><button onclick="closeMdl('mFind')">&times;</button></div><div class="mdl-bd"><input type="text" id="findText" class="mdl-inp" placeholder="Find text"><input type="text" id="replaceText" class="mdl-inp" placeholder="Replace with"><div style="display:flex;gap:10px;margin-top:10px"><button class="mdl-btn" onclick="findText()" style="flex:1">Find</button><button class="mdl-btn" onclick="replaceText()" style="flex:1">Replace</button><button class="mdl-btn" onclick="replaceAllText()" style="flex:1">Replace All</button></div></div></div></div>
<div id="mBanners" class="mdl"><div class="mdl-box mdl-lg"><div class="mdl-hd"><span><i class="fas fa-flag"></i> Insert Banner</span><button onclick="closeMdl('mBanners')">&times;</button></div><div class="mdl-bd"><div class="banner-grid" id="bannerPickerGrid"></div></div></div></div>
<div id="mCustomPrompt" class="mdl"><div class="mdl-box mdl-sm"><div class="mdl-hd"><span>Add Custom Prompt</span><button onclick="closeMdl('mCustomPrompt')">&times;</button></div><div class="mdl-bd"><input type="text" id="cpTitle" class="mdl-inp" placeholder="Prompt title"><input type="text" id="cpIcon" class="mdl-inp" placeholder="Emoji icon e.g. 🎯"><select id="cpType" class="mdl-inp"><option value="doc">Document Page</option><option value="web">Web Page</option></select><textarea id="cpPrompt" class="mdl-inp" style="height:120px;resize:vertical" placeholder="Full prompt text..."></textarea><button class="mdl-btn" onclick="saveCustomPrompt()"><i class="fas fa-save"></i> Save Prompt</button></div></div></div>
<div id="mAIReview" class="mdl"><div class="mdl-box mdl-lg" style="width:780px"><div class="mdl-hd"><span><i class="fas fa-brain"></i> Writing Assessor</span><button onclick="closeMdl('mAIReview')">&times;</button></div><div class="mdl-bd"><div style="font-size:13px;color:#4a5568;margin-bottom:12px">Paste learner writing below, copy the master prompt, paste it + the writing into an AI chatbot, then paste the JSON result back here.</div><textarea id="aiReviewInput" class="mdl-inp" style="height:130px;resize:vertical;font-family:inherit" placeholder="Paste learner writing here..."></textarea><div style="display:flex;gap:10px;margin-bottom:10px"><button class="mdl-btn" style="flex:1;background:#805ad5" onclick="copyAIMasterPrompt()"><i class="fas fa-copy"></i> Copy Master Prompt</button></div><div style="font-size:11px;color:#718096;margin-bottom:6px;font-weight:600">PASTE JSON RESPONSE</div><textarea id="aiReviewJSON" class="mdl-inp" style="height:110px;resize:vertical;font-family:monospace;font-size:11px" placeholder="Paste the JSON response here..."></textarea><button class="mdl-btn" onclick="applyAIReview()"><i class="fas fa-magic"></i> Apply Review to Document</button></div></div></div>
</div>`;

    // ─────────────────────────────────────────────────────────────────────────
    //  CSS
    // ─────────────────────────────────────────────────────────────────────────
    const css = `#whiteboard-overlay{position:fixed;inset:0;background:#4a5568;z-index:9999;display:none;flex-direction:column;font-family:'Segoe UI',system-ui,sans-serif}
#whiteboard-overlay.theme-dark{--wb-bg:#1a202c;--wb-page:#2d3748;--wb-text:#e2e8f0}
#whiteboard-overlay.theme-sepia{--wb-bg:#5d4e37;--wb-page:#faf8f5;--wb-text:#3d3229}
#whiteboard-overlay.theme-light{--wb-bg:#4a5568;--wb-page:#fff;--wb-text:#1a202c}
.wb-toolbar{background:linear-gradient(180deg,#fff,#f7fafc);border-bottom:1px solid #e2e8f0;padding:6px 12px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tb-grp{display:flex;gap:3px;align-items:center;padding:0 8px;border-right:1px solid #e2e8f0}.tb-grp:last-child{border:none}
.tb-sep{width:1px;height:20px;background:#e2e8f0}
.tb-btn{background:#fff;border:1px solid #e2e8f0;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#4a5568;font-size:13px}
.tb-btn:hover{background:#edf2f7}
.tb-btn.active{background:#ebf8ff;border-color:#4299e1;color:#2b6cb0}
.tb-sm{width:26px;height:26px;font-size:11px}
.tb-ok{background:#f0fff4;border-color:#68d391;color:#276749}
.tb-no{background:#fff5f5;border-color:#fc8181;color:#c53030}
.tb-sel{padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;background:#fff}
.sz-wrap{display:flex;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.sz-wrap .tb-btn{border:none;border-radius:0;height:28px}
.sz-inp{width:40px;border:none;text-align:center;font-size:12px}.sz-inp::-webkit-inner-spin-button{-webkit-appearance:none}
.clr-wrap{position:relative}.clr-wrap input[type="color"]{position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:20px;height:6px;opacity:0;cursor:pointer}
.clr-bar{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:14px;height:3px;border-radius:2px;background:#1a202c}.clr-bar.hl{background:#faf089}
.draw-pnl{background:#f7fafc;border-bottom:1px solid #e2e8f0;padding:8px 12px;display:none;gap:12px;flex-wrap:wrap;align-items:center}
.draw-pnl.show{display:flex}
.dp-sec{display:flex;align-items:center;gap:4px}
.dp-lbl{font-size:11px;color:#718096;font-weight:600}
.dp-btn{background:#fff;border:1px solid #e2e8f0;border-radius:6px;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#4a5568;font-size:12px}
.dp-btn:hover{background:#edf2f7}
.dp-btn.active{background:#ebf8ff;border-color:#4299e1;color:#2b6cb0}
.dp-clr{width:30px;height:30px;border:2px solid #e2e8f0;border-radius:6px;padding:2px;cursor:pointer}
.dp-pre{width:20px;height:20px;border-radius:4px;cursor:pointer;border:2px solid transparent}
.dp-pre:hover{transform:scale(1.15)}
.dp-rng{width:80px}
.dp-act{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px}
.dp-del{color:#e53e3e;border-color:#feb2b2}
.wb-main{display:flex;flex:1;overflow:hidden}
.pg-side{width:140px;background:linear-gradient(180deg,#1a202c,#2d3748);display:flex;flex-direction:column;flex-shrink:0;z-index:100}
.ps-header{padding:12px;border-bottom:1px solid #4a5568}
.ps-title{color:#e2e8f0;font-size:12px;font-weight:600;display:block;margin-bottom:8px}
.ps-nav{display:flex;gap:4px}
.ps-jump{width:50px;padding:6px;border:1px solid #4a5568;border-radius:4px;background:#2d3748;color:#e2e8f0;font-size:12px;text-align:center}
.ps-jump::-webkit-inner-spin-button{-webkit-appearance:none}
.ps-go{background:#4299e1;border:none;border-radius:4px;color:#fff;padding:6px 10px;cursor:pointer}
.ps-list{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
.ps-th{background:#fff;border-radius:6px;aspect-ratio:210/297;cursor:pointer;border:3px solid transparent;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.3);overflow:hidden;outline:none;}
.ps-th:hover{transform:scale(1.02)}
.ps-th.active, .ps-th.selected, .ps-th:focus{border-color:#4299e1;box-shadow:0 0 0 2px rgba(66,153,225,0.4)}
.ps-th.landscape{aspect-ratio:297/210}
.ps-th-preview{position:absolute;top:0;left:0;right:0;bottom:0;padding:6px;font-size:7px;line-height:1.25;color:#2d3748;overflow:hidden;word-break:break-word;white-space:pre-wrap;opacity:0.85;pointer-events:none;background:#fff;}
.ps-th-n{position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.8);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;z-index:2;}
.ps-footer{padding:10px;border-top:1px solid #4a5568;display:flex;align-items:center;gap:6px}
.ps-btn{background:#4299e1;border:none;border-radius:6px;color:#fff;padding:8px 12px;cursor:pointer;font-size:12px;flex:1}
.ps-btn-del{background:#e53e3e}
.ps-info{color:#a0aec0;font-size:11px}
.wb-area{flex:1;overflow:auto;background:var(--wb-bg,#4a5568);position:relative;box-sizing:border-box}
.wb-area.panning, .wb-area.panning * { cursor: grab !important; user-select: none !important; -webkit-user-select: none !important; }
.wb-area.panning.dragging, .wb-area.panning.dragging * { cursor: grabbing !important; }
.zoom-container{position:relative;margin:20px auto;box-sizing:border-box;min-width:fit-content}
.zoom-inner{position:absolute;top:0;left:0;display:flex;flex-direction:column;align-items:center;width:fit-content;padding:20px;box-sizing:border-box;transform-origin:top left}
.pg-wrap{position:relative;margin-bottom:30px;background:var(--wb-page,#fff);box-shadow:0 10px 40px rgba(0,0,0,.2);width:210mm;height:297mm;min-height:297mm;max-height:297mm;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}
.pg-wrap.landscape{width:297mm;height:210mm;min-height:210mm;max-height:210mm}
.pg-wrap.border-simple .wb-pg-container{border:2px solid var(--border-clr,#1e3a5f)}
.pg-wrap.border-double .wb-pg-container{border:4px double var(--border-clr,#1e3a5f)}
.pg-wrap.border-elegant .wb-pg-container{border:3px solid var(--border-clr,#1e3a5f);box-shadow:inset 0 0 0 6px var(--wb-page,#fff),inset 0 0 0 8px var(--border-clr,#1e3a5f)}
.pg-wrap.border-professional .wb-pg-container{border:1px solid var(--border-clr,#1e3a5f);box-shadow:inset 0 0 0 3px var(--wb-page,#fff),inset 0 0 0 4px var(--border-clr,#1e3a5f)}
.wb-hdr{display:none;font-family:'Times New Roman',serif}
.wb-hdr.show{display:block}
.wb-hdr.style-professional{background:linear-gradient(180deg,#f8fafc,#edf2f7);padding:16px 25mm;border-bottom:3px solid #1e3a5f}
.wb-hdr.style-professional .hdr-inner{display:flex;justify-content:space-between;align-items:center}
.wb-hdr.style-professional .hdr-title{font-size:14pt;font-weight:700;color:#1e3a5f}
.wb-hdr.style-professional .hdr-meta{font-size:10pt;color:#4a5568}
.wb-hdr.style-modern{background:linear-gradient(90deg,#1e3a5f,#2c5282);padding:16px 25mm}
.wb-hdr.style-modern .hdr-inner{display:flex;justify-content:space-between;align-items:center}
.wb-hdr.style-modern .hdr-title{font-size:14pt;font-weight:700;color:#fff}
.wb-hdr.style-modern .hdr-meta{color:rgba(255,255,255,.9);font-size:10pt}
.wb-hdr.style-classic{padding:16px 25mm;text-align:center;border-bottom:2px solid #1e3a5f}
.wb-hdr.style-classic .hdr-inner::before{content:'';display:block;height:2px;background:linear-gradient(90deg,transparent,#1e3a5f,transparent);margin-bottom:8px}
.wb-hdr.style-classic .hdr-title{font-size:16pt;font-weight:700;color:#1e3a5f}
.wb-hdr.style-classic .hdr-meta{font-size:10pt;color:#4a5568;margin-top:4px}
.wb-hdr.style-minimal{padding:12px 25mm;border-bottom:1px solid #e2e8f0}
.wb-hdr.style-minimal .hdr-inner{display:flex;justify-content:space-between}
.wb-hdr.style-minimal .hdr-title{font-size:11pt;color:#4a5568}
.wb-hdr.style-minimal .hdr-meta{font-size:10pt;color:#718096}
.wb-pg-container{position:relative;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0}
.wb-pg{width:100%;height:100%;min-height:0;flex:1;padding:20mm 25mm;background:var(--wb-page,#fff);outline:none;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;color:var(--wb-text,#1a202c);box-sizing:border-box;cursor:text;overflow-y:hidden;word-wrap:break-word;overflow-wrap:break-word}
.pg-wrap.landscape .wb-pg{height:100%;min-height:0}
.wb-pg:focus{box-shadow:inset 0 0 0 2px rgba(66,153,225,.2)}
.wb-pg img{max-width:100%;cursor:nwse-resize;display:inline-block}
.wb-pg img.resizing{outline:2px dashed #4299e1}
.wb-pg table{width:100%;border-collapse:collapse;margin:1em 0}
.wb-pg td,.wb-pg th{border:1px solid #4a5568;padding:10px}
.wb-pg th{background:#f7fafc;font-weight:700}
.wb-pg .tc-del{color:#c53030;text-decoration:line-through;background:#fff5f5;font-weight:700;display:inline}
.wb-pg .tc-ins{color:#276749;background:#f0fff4;font-weight:700;display:inline}
.wb-cv{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10}
.wb-cv.active{pointer-events:auto;cursor:crosshair}
.wb-wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);pointer-events:none;white-space:nowrap;font-family:Arial,sans-serif;font-weight:700;text-transform:uppercase;z-index:5;display:none}
.wb-wm.show{display:block}
.wb-ftr{display:none;padding:12px 25mm;border-top:2px solid #cbd5e0;font-family:'Times New Roman',serif;font-size:10pt;color:#4a5568}
.wb-ftr.show{display:flex;justify-content:space-between}
.wb-stat{background:#1a202c;color:#e2e8f0;padding:8px 16px;display:flex;gap:20px;align-items:center;font-size:11px}
.st-off{color:#a0aec0}.st-on{color:#68d391}
#stSave{color:#68d391}
.zm-wrap{margin-left:auto;display:flex;align-items:center;gap:6px;background:#2d3748;padding:4px 8px;border-radius:6px}
.zm-wrap button{background:#4a5568;border:none;color:#fff;width:24px;height:24px;border-radius:4px;cursor:pointer;font-size:14px}
#zmVal{min-width:45px;text-align:center;font-weight:600}
.mdl{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:10001}
.mdl.show{display:flex}
.mdl-box{background:#fff;border-radius:12px;width:420px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3)}
.mdl-lg{width:700px}.mdl-sm{width:340px}
.mdl-hd{padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#f7fafc}
.mdl-hd span{font-weight:700;font-size:15px}
.mdl-hd button{background:#edf2f7;border:none;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer;color:#718096}
.mdl-bd{padding:20px;overflow-y:auto;max-height:75vh}
.mdl-inp{width:100%;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-size:13px;margin-bottom:10px;box-sizing:border-box}
.mdl-inp:focus{outline:none;border-color:#4299e1}
.mdl-inp-sm{width:70px;padding:8px;text-align:center}
.mdl-btn{width:100%;padding:14px;background:#4299e1;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
.mdl-btn:hover{background:#3182ce}
.mdl-btn-lg{margin-top:16px}
.inp-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.inp-row label{font-size:13px;color:#4a5568}
.or-div{display:flex;align-items:center;margin:16px 0;color:#a0aec0}
.or-div::before,.or-div::after{content:'';flex:1;height:1px;background:#e2e8f0}
.or-div span{padding:0 12px;font-size:12px}
.setup-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:700px){.setup-grid{grid-template-columns:1fr}}
.setup-col{display:flex;flex-direction:column;gap:16px}
.setup-sec{background:#f7fafc;border-radius:10px;padding:14px;border:1px solid #e2e8f0}
.setup-sec h4{margin:0 0 10px;font-size:13px;color:#2d3748;display:flex;align-items:center;gap:8px}
.setup-sec h4 i{color:#4299e1}
.orient-btns{display:flex;gap:10px}
.orient-btn{flex:1;padding:12px;border:2px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px;color:#4a5568}
.orient-btn.active{border-color:#4299e1;background:#ebf8ff;color:#2b6cb0}
.marg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.marg-item{display:flex;flex-direction:column;gap:2px}
.marg-item label{font-size:11px;color:#718096}
.clr-row{display:flex;align-items:center;gap:10px;margin-top:8px}
.clr-row label{font-size:12px;color:#4a5568}
.clr-inp{width:50px;height:36px;padding:2px;border:2px solid #e2e8f0;border-radius:6px;cursor:pointer}
.hf-checks{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.hf-check{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:#4a5568}
.hf-check input{width:16px;height:16px}
.wm-row{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px}
.wm-row label{min-width:50px;color:#718096}
.wm-row input[type="range"]{flex:1}
.tpl-cats{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
.tpl-cat{padding:8px 16px;border:2px solid #e2e8f0;border-radius:20px;background:#fff;cursor:pointer;font-size:12px}
.tpl-cat.active{background:#4299e1;color:#fff;border-color:#4299e1}
.tpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;max-height:400px;overflow-y:auto}
.tpl-card{background:#fff;border:2px solid #e2e8f0;border-radius:8px;padding:14px 8px;text-align:center;cursor:pointer}
.tpl-card:hover{border-color:#4299e1;transform:translateY(-2px)}
.tpl-card i{font-size:22px;margin-bottom:6px;display:block;color:#4299e1}
.tpl-card span{font-size:10px;color:#4a5568}
.save-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sv-btn{padding:20px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px}
.sv-btn:hover{border-color:#4299e1;background:#f7fafc}
.sv-btn i{font-size:28px}.sv-btn span{font-size:12px;color:#4a5568}
.sv-pdf i{color:#e53e3e}.sv-doc i{color:#3182ce}.sv-html i{color:#dd6b20}.sv-txt i{color:#718096}
.upl-box{border:3px dashed #e2e8f0;border-radius:12px;padding:40px;text-align:center;cursor:pointer}
.upl-box:hover{border-color:#4299e1;background:#f7fafc}
.upl-box i{font-size:40px;color:#a0aec0;display:block;margin-bottom:12px}
.upl-box span{color:#718096;font-size:14px}
.text-box{background:#f7fafc;border:2px dashed #cbd5e0;border-radius:8px;padding:20px;margin:10px 0;min-height:60px}
.text-box:focus{border-color:#4299e1;background:#ebf8ff}
@media print{@page{size:A4;margin:0}body.wb-printing > *{display:none!important}body.wb-printing #whiteboard-overlay{display:block!important;position:static!important;background:#fff!important}body.wb-printing .wb-toolbar,body.wb-printing .draw-pnl,body.wb-printing .pg-side,body.wb-printing .wb-stat,body.wb-printing .mdl,body.wb-printing .mic-widget,body.wb-printing .thesaurus-pane,body.wb-printing .lib-panel{display:none!important}body.wb-printing .wb-area{padding:0!important;background:#fff!important;overflow:visible!important}body.wb-printing .zoom-container{transform:none!important;padding:0!important}body.wb-printing .pg-wrap{box-shadow:none!important;margin:0!important;page-break-after:always;page-break-inside:avoid;width:210mm!important}body.wb-printing .pg-wrap:last-child{page-break-after:auto!important}body.wb-printing .pg-wrap.landscape{width:297mm!important}body.wb-printing .wb-hdr.show{display:block!important}body.wb-printing .wb-ftr.show{display:flex!important}body.wb-printing .wb-wm.show{display:block!important}}
body.wb-printing .mic-container{display:none!important}
.mic-container{position:fixed;bottom:96px;right:24px;z-index:10100;display:flex;flex-direction:column;align-items:flex-end;user-select:none}
.mic-circle-btn{width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:0 8px 24px rgba(0,0,0,0.35),0 2px 8px rgba(59,130,246,0.4);transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);outline:none}
.mic-circle-btn:hover{transform:scale(1.08) translateY(-2px);box-shadow:0 12px 28px rgba(0,0,0,0.45),0 4px 12px rgba(59,130,246,0.5)}
.mic-circle-btn.listening{background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 8px 24px rgba(239,68,68,0.5);animation:micCirclePulse 1.5s infinite}
@keyframes micCirclePulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.6),0 8px 24px rgba(239,68,68,0.5)}50%{box-shadow:0 0 0 12px rgba(239,68,68,0),0 12px 32px rgba(239,68,68,0.8)}}
.mic-circle-badge{position:absolute;top:-2px;right:-2px;background:#475569;color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:8px;border:2px solid #1e293b;letter-spacing:0.5px}
.mic-circle-btn.listening .mic-circle-badge{background:#22c55e}

.mic-settings-panel{position:absolute;bottom:70px;right:0;width:320px;background:#1e293b;border:1.5px solid #334155;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.5);display:none;flex-direction:column;overflow:hidden;transform-origin:bottom right;animation:micPanelIn .2s cubic-bezier(0,0,0.2,1);color:#f1f5f9;z-index:10101}
.mic-settings-panel.show{display:flex}
@keyframes micPanelIn{from{opacity:0;transform:scale(0.9) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}

.mic-panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0f172a;border-bottom:1px solid #334155}
.mic-panel-title{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;color:#f8fafc}
.mic-panel-close{background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center}
.mic-panel-close:hover{background:#334155;color:#fff}

.mic-panel-body{padding:14px;display:flex;flex-direction:column;gap:12px}
.mic-status-card{background:#0f172a;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border:1px solid #334155}
.mic-status-text{font-size:12px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.5px}

.mic-toggle-btn{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .2s;box-shadow:0 4px 12px rgba(37,99,235,0.3)}
.mic-toggle-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}
.mic-toggle-btn.active{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 4px 12px rgba(220,38,38,0.4)}

.mic-field-group{display:flex;flex-direction:column;gap:4px}
.mic-label{font-size:11px;font-weight:600;color:#94a3b8;display:flex;align-items:center;gap:6px}
.mic-select{background:#0f172a;border:1.5px solid #334155;color:#f1f5f9;font-size:12px;border-radius:8px;padding:8px 10px;outline:none;width:100%}
.mic-select:focus{border-color:#38bdf8}

.mic-opts-row{display:flex;flex-direction:column;gap:6px;background:#0f172a;padding:8px 10px;border-radius:8px;border:1px solid #334155}
.mic-opt-check{display:flex;align-items:center;gap:8px;font-size:11px;color:#cbd5e1;cursor:pointer}
.mic-opt-check input{accent-color:#38bdf8;width:14px;height:14px}

.mic-indicator{display:none;align-items:flex-end;justify-content:center;gap:3px;height:20px}
.mic-indicator.show{display:flex}
.mic-indicator span{width:4px;background:#38bdf8;border-radius:4px;animation:micBar .8s ease-in-out infinite alternate}
.mic-indicator span:nth-child(1){height:8px;animation-delay:0s}
.mic-indicator span:nth-child(2){height:16px;animation-delay:.1s}
.mic-indicator span:nth-child(3){height:20px;animation-delay:.2s}
.mic-indicator span:nth-child(4){height:14px;animation-delay:.3s}
.mic-indicator span:nth-child(5){height:8px;animation-delay:.4s}
@keyframes micBar{from{transform:scaleY(.3)}to{transform:scaleY(1)}}

.mic-preview-box{background:#0f172a;border:1.5px solid #334155;border-radius:10px;padding:10px;min-height:54px;max-height:90px;overflow-y:auto;font-size:12px;color:#e2e8f0;font-style:italic;line-height:1.5;word-break:break-word}
.mic-preview-placeholder{color:#64748b;font-style:normal;font-size:11px}
.lib-panel{width:0;min-width:0;overflow:hidden;background:#fff;border-left:1px solid #e2e8f0;display:flex;flex-direction:column;transition:width .3s ease,min-width .3s ease;flex-shrink:0;z-index:200}
.lib-panel.open{width:360px;min-width:360px}
.lib-header{padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(90deg,#4299e1,#3182ce);color:#fff;flex-shrink:0}
.lib-header span{font-weight:700;font-size:14px;white-space:nowrap}
.lib-close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
.lib-search-row{padding:10px 12px;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.lib-search{width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box}
.lib-search:focus{outline:none;border-color:#4299e1}
.lib-tabs{display:flex;border-bottom:2px solid #e2e8f0;flex-shrink:0}
.lib-tab{flex:1;padding:8px 4px;border:none;background:transparent;font-size:11px;font-weight:600;cursor:pointer;color:#718096;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap}
.lib-tab.active{color:#4299e1;border-bottom-color:#4299e1}
.lib-cards{flex:1;overflow-y:auto;padding:10px}
.lib-card{background:#f7fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px}
.lib-card:hover{border-color:#4299e1;background:#ebf8ff}
.lib-card-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px}
.lib-card-icon{font-size:24px;line-height:1;flex-shrink:0}
.lib-card-title{font-weight:700;font-size:13px;color:#2d3748}
.lib-card-desc{font-size:11px;color:#718096;line-height:1.5}
.lib-card-btns{display:flex;gap:6px;margin-top:8px}
.lib-copy-btn{padding:5px 12px;background:#4299e1;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;flex:1}
.lib-copy-btn:hover{background:#3182ce}
.lib-paste-area{padding:10px 12px;border-top:1px solid #e2e8f0;flex-shrink:0}
.lib-paste-inp{width:100%;height:80px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;resize:vertical;box-sizing:border-box;font-family:monospace}
.lib-paste-inp:focus{outline:none;border-color:#4299e1}
.lib-paste-btn{width:100%;padding:10px;background:#38a169;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;margin-top:6px}
.lib-paste-btn:hover{background:#276749}
.lib-custom-area{padding:8px 12px;border-top:1px solid #e2e8f0;flex-shrink:0}
.lib-custom-add{width:100%;padding:9px;background:#805ad5;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer}
.mark-err-wrap{position:relative}
.mark-err-main-btn{width:auto;padding:0 10px;font-size:11px;font-weight:700;gap:4px;height:32px;white-space:nowrap}
.mark-err-menu{position:absolute;top:36px;left:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:9999;display:none;min-width:170px;padding:4px}
.mark-err-menu.show{display:block}
.mec-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:#2d3748}
.mec-item:hover{background:#ebf8ff}
.mec-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.err-mark{border-radius:3px;padding:1px 4px;font-weight:700;cursor:help;position:relative;display:inline}
.err-tooltip{position:fixed;background:#1a202c;color:#fff;font-size:11px;padding:5px 10px;border-radius:6px;z-index:99999;pointer-events:none;white-space:nowrap;display:none}
.thesaurus-pane{position:fixed;right:-340px;top:60px;width:320px;height:calc(100vh - 120px);background:#fff;border-left:2px solid #e2e8f0;border-radius:12px 0 0 12px;box-shadow:-4px 0 24px rgba(0,0,0,.15);z-index:10050;display:flex;flex-direction:column;transition:right .3s ease;overflow:hidden}
.thesaurus-pane.open{right:0}
.thes-header{padding:14px 16px;background:linear-gradient(90deg,#805ad5,#6b46c1);color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.thes-header span{font-weight:700;font-size:14px}
.thes-close{background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
.thes-search-row{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.thes-search{flex:1;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px}
.thes-search:focus{outline:none;border-color:#805ad5}
.thes-go{background:#805ad5;border:none;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}
.thes-results{flex:1;overflow-y:auto;padding:12px}
.thes-word{font-size:18px;font-weight:800;color:#2d3748;margin-bottom:4px}
.thes-phonetic{font-size:12px;color:#718096;margin-bottom:10px}
.thes-pos{font-size:11px;font-weight:700;color:#805ad5;text-transform:uppercase;margin:8px 0 4px}
.thes-def{font-size:12px;color:#4a5568;margin-bottom:6px;padding-left:8px;border-left:3px solid #e2e8f0}
.thes-syn-title{font-size:11px;font-weight:700;color:#2d3748;margin:8px 0 4px}
.thes-syn-list{display:flex;flex-wrap:wrap;gap:4px}
.thes-syn-chip{background:#f0e6ff;color:#6b46c1;border:1px solid #d6bcfa;border-radius:20px;padding:3px 10px;font-size:11px;cursor:pointer;font-weight:600}
.thes-syn-chip:hover{background:#805ad5;color:#fff}
.wb-ctx-menu{position:fixed;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:99999;display:none;min-width:200px;padding:4px}
.wb-ctx-menu.show{display:block}
.ctx-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;cursor:pointer;font-size:13px;color:#2d3748}
.ctx-item:hover{background:#ebf8ff}
.ctx-item i{width:16px;color:#4299e1}
.ctx-sep{height:1px;background:#e2e8f0;margin:4px 0}
.ctx-syn-list{position:absolute;left:100%;top:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);min-width:160px;max-height:200px;overflow-y:auto;padding:4px;display:none}
#ctxSynSub:hover .ctx-syn-list{display:block}
.ctx-syn-item{padding:6px 12px;cursor:pointer;font-size:12px;color:#2d3748;border-radius:4px}
.ctx-syn-item:hover{background:#ebf8ff}
.banner-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;max-height:70vh;overflow-y:auto}
.banner-picker-card{border:2px solid #e2e8f0;border-radius:10px;padding:14px;cursor:pointer;transition:all .2s}
.banner-picker-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.1)}
.banner-picker-head{font-weight:700;font-size:13px;margin-bottom:4px}
.banner-picker-desc{font-size:11px;color:#718096}
.wb-banner{position:relative;border-radius:10px;padding:14px 18px 14px 54px;margin:12px 0;cursor:move;box-shadow:4px 6px 16px rgba(0,0,0,.18),inset -6px -6px 0 rgba(0,0,0,.07);min-height:70px;user-select:none;resize:both;overflow:auto;max-width:100%}
.wb-banner::after{content:'';position:absolute;bottom:-8px;right:12px;width:0;height:0;border-left:12px solid transparent;border-top:10px solid rgba(0,0,0,.25)}
.wb-banner .ban-icon{position:absolute;left:14px;top:14px;font-size:24px;line-height:1}
.wb-banner .ban-title{font-weight:800;font-size:13px;margin-bottom:4px}
.wb-banner .ban-body{font-size:12px;line-height:1.6;outline:none;user-select:text}
.wb-banner .ban-close{position:absolute;top:6px;right:8px;background:rgba(0,0,0,.15);border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,.6)}
.wb-banner .ban-close:hover{background:rgba(0,0,0,.3)}
.wb-banner .ban-palette{display:none;position:absolute;top:6px;right:34px;background:#1a202c;border-radius:8px;padding:6px;gap:6px;flex-wrap:wrap;z-index:9}
.wb-banner:hover .ban-palette{display:flex}
.ban-clr-dot{width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid transparent}
.ban-clr-dot:hover{transform:scale(1.2);border-color:#fff}
.ai-score-card{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px;padding:20px;margin:12px 0}
.ai-score-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-top:10px}
.ai-score-item{background:rgba(255,255,255,.15);border-radius:8px;padding:8px;text-align:center}
.ai-score-item .sc-val{font-size:22px;font-weight:800}
.ai-score-item .sc-lbl{font-size:10px;opacity:.8;text-transform:capitalize}
.ai-err-inline{border-radius:3px;padding:1px 3px;font-weight:600;cursor:help;position:relative;text-decoration:underline wavy}
.ai-correction{background:#f0fff4;border:1px solid #68d391;border-radius:4px;padding:2px 6px;font-size:11px;color:#276749;margin-left:4px;font-style:italic}
.ai-comment{background:#fffbeb;border-left:3px solid #f6ad55;padding:6px 10px;margin:4px 0;font-size:12px;color:#744210;border-radius:0 6px 6px 0}`;

    // applyDocAnnotation uses split/join to avoid regex escaping issues in template literal
    const applyDocAnnotationFn = 'function applyDocAnnotation(json){' +
      'var pg=gPg(curPg);if(!pg)return;' +
      'var html="";' +
      'if(json.title)html+=\'<h2 style="color:#2d3748;border-bottom:3px solid #4299e1;padding-bottom:8px;margin-bottom:16px">\'+json.title+\'</h2>\';' +
      'if(json.scores&&Object.keys(json.scores).length){html+=\'<div class="ai-score-card"><h3 style="margin:0 0 8px;font-size:15px">Assessment Scores</h3><div class="ai-score-grid">\';for(var k in json.scores){html+=\'<div class="ai-score-item"><div class="sc-val">\'+json.scores[k]+\'</div><div class="sc-lbl">\'+k+\'</div></div>\';}html+=\'</div></div>\';}' +
      'if(json.generalFeedback)html+=\'<div class="ai-comment" style="background:#ebf8ff;border-color:#4299e1;color:#2b6cb0;margin-bottom:12px"><strong>Overall Feedback:</strong> \'+json.generalFeedback+\'</div>\';' +
      'if(json.commendations&&json.commendations.length){html+=\'<div style="background:#f0fff4;border:1px solid #68d391;border-radius:8px;padding:12px;margin-bottom:10px"><strong>Strengths:</strong><ul style="margin:6px 0 0 16px">\';json.commendations.forEach(function(c){html+=\'<li>\'+c+\'</li>\'});html+=\'</ul></div>\';}' +
      'if(json.improvements&&json.improvements.length){html+=\'<div style="background:#fff5f5;border:1px solid #fc8181;border-radius:8px;padding:12px;margin-bottom:10px"><strong>Areas for Improvement:</strong><ul style="margin:6px 0 0 16px">\';json.improvements.forEach(function(c){html+=\'<li>\'+c+\'</li>\'});html+=\'</ul></div>\';}' +
      'if(json.originalText&&json.annotatedSegments&&json.annotatedSegments.length){' +
        'html+=\'<h3 style="color:#2d3748;margin-top:16px">Annotated Writing</h3>\';' +
        'var text=json.originalText;' +
        'var segs=json.annotatedSegments.slice().sort(function(a,b){return b.text.length-a.text.length});' +
        'segs.forEach(function(seg){' +
          'if(!seg.text||!seg.text.trim())return;' +
          'var clr=seg.color||"#e53e3e";' +
          'var tip="["+seg.errorType+"]: "+seg.correction+" -- "+seg.explanation;' +
          'var replacement=\'<span class="ai-err-inline" style="background:\'+lighten(clr,0.85)+\';border-bottom:2px solid \'+clr+\';color:#1a202c" title="\'+tip+\'">\'+seg.text+\'<sup style="font-size:8px;color:\'+clr+\';margin-left:1px">x</sup></span><span class="ai-correction">\'+seg.correction+\'</span>\';' +
          'text=text.split(seg.text).join(replacement);' +
        '});' +
        'html+=\'<div style="border:1.5px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:8px;line-height:2;font-family:Times New Roman,serif;font-size:12pt">\'+text+\'</div>\';' +
        'html+=\'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">\';' +
        'var seen={};segs.forEach(function(seg){if(seg.errorType&&!seen[seg.errorType]){seen[seg.errorType]=1;html+=\'<span style="background:\'+lighten(seg.color||"#e53e3e",0.85)+\';color:\'+( seg.color||"#e53e3e")+\';border:1px solid \'+( seg.color||"#e53e3e")+\';border-radius:12px;padding:2px 10px;font-size:10px;font-weight:700">\'+seg.errorType+\'</span>\';}});' +
        'html+=\'</div>\';' +
      '}' +
      '["outlineHTML","exercisesHTML","lessonHTML","grammarHTML","rubricHTML","dialogueHTML"].forEach(function(k){if(json[k])html+=\'<div style="margin-top:16px">\'+json[k]+\'</div>\';});' +
      'if(pg.innerText.trim()===""||pg.innerHTML==="<p><br></p>"){pg.innerHTML=html;}' +
      'else{window.addPg();var np=gPg(totPg);if(np)np.innerHTML=html;goToPg(totPg);}' +
      'saveTxt();alert("AI review applied to document!");}';

    // ─────────────────────────────────────────────────────────────────────────
    //  JS  (template literal — no backtick strings inside; all prompt data
    //       injected via ${variable} from the TypeScript constants above)
    // ─────────────────────────────────────────────────────────────────────────
    const js = `(function(){
"use strict";
var LN="${learnerName}",CN="${courseName}";
var curPg=1,totPg=1,zoom=100,drawOn=false,trackOn=false;
var isHandActive=false,isPanning=false,panStartX=0,panStartY=0,scrollStartX=0,scrollStartY=0;
window.togHand=function(){
  isHandActive=!isHandActive;
  var btn=document.getElementById("btnHand");
  var wa=document.getElementById("wbArea");
  if(!btn||!wa)return;
  if(isHandActive&&drawOn){
    drawOn=false;
    var btnD=document.getElementById("btnDraw");
    if(btnD)btnD.classList.remove("active");
    var dp=document.getElementById("drawPnl");
    if(dp)dp.classList.remove("show");
    document.querySelectorAll(".wb-cv").forEach(function(c){c.classList.remove("active")});
    document.querySelectorAll(".wb-pg").forEach(function(p){p.contentEditable="true"});
  }
  if(isHandActive){
    btn.classList.add("active");
    btn.style.background="#fef08a";
    btn.style.color="#854d0e";
    wa.classList.add("panning");
  }else{
    btn.classList.remove("active");
    btn.style.background="";
    btn.style.color="";
    wa.classList.remove("panning","dragging");
  }
};
var tool="pen",dClr="#000000",dSz=3,drawing=false,lx=0,ly=0,sx=0,sy=0;
var resizingImg=null,resizeStart={x:0,y:0,w:0,h:0};
var txtHist=[],txtRedo=[],cvHist={},cvRedo={};
var orient="portrait",theme="light";
var margins={t:20,b:20,l:25,r:25};
var hdrCfg={name:true,course:true,date:true,custom:"",style:"professional"};
var ftrCfg={page:true,custom:""};
var wmCfg={text:"",opacity:0.08,size:80};
var borderCfg={style:"none",color:"#1e3a5f"};
var ov=document.getElementById("whiteboard-overlay");
var area=document.getElementById("wbArea");
var zoomC=document.getElementById("zoomContainer");
var pgListEl=document.getElementById("pgList");
function gPg(n){return document.getElementById("pg"+n)}
function gCv(n){return document.getElementById("cv"+n)}
function gHdr(n){return document.getElementById("hdr"+n)}
function gFtr(n){return document.getElementById("ftr"+n)}
function gWm(n){return document.getElementById("wm"+n)}
function gWrap(n){return document.querySelector('.pg-wrap[data-pg="'+n+'"]')}
function saveTxt(){var d=[];document.querySelectorAll(".wb-pg").forEach(function(p){d.push(p.innerHTML)});txtHist.push(JSON.stringify(d));if(txtHist.length>50)txtHist.shift();txtRedo=[]}
function saveCv(n){var cv=gCv(n);if(!cv)return;if(!cvHist[n])cvHist[n]=[];cvHist[n].push(cv.toDataURL());if(cvHist[n].length>30)cvHist[n].shift();cvRedo[n]=[]}
function syncCv(cv){var container=cv.closest(".wb-pg-container");if(!container)return;var w=container.offsetWidth,h=container.offsetHeight;if(w===0||h===0)return;if(cv.width!==w||cv.height!==h){var tmp=cv.toDataURL();cv.width=w;cv.height=h;if(tmp&&tmp!=="data:,"){var img=new Image();img.onload=function(){cv.getContext("2d").drawImage(img,0,0,w,h)};img.src=tmp}}}
function lighten(hex,amount){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);r=Math.round(r+(255-r)*amount);g=Math.round(g+(255-g)*amount);b=Math.round(b+(255-b)*amount);return "#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0")}
window.wbUndo=function(){if(txtHist.length<2)return;txtRedo.push(txtHist.pop());var d=JSON.parse(txtHist[txtHist.length-1]||"[]");document.querySelectorAll(".wb-pg").forEach(function(p,i){if(d[i]!==undefined)p.innerHTML=d[i]});updStats()};
window.wbRedo=function(){if(!txtRedo.length)return;var d=JSON.parse(txtRedo.pop());txtHist.push(JSON.stringify(d));document.querySelectorAll(".wb-pg").forEach(function(p,i){if(d[i]!==undefined)p.innerHTML=d[i]});updStats()};
window.undoDraw=function(){var n=curPg;if(!cvHist[n]||cvHist[n].length<1)return;var cv=gCv(n);if(!cv)return;if(!cvRedo[n])cvRedo[n]=[];cvRedo[n].push(cv.toDataURL());cvHist[n].pop();var ctx=cv.getContext("2d");ctx.clearRect(0,0,cv.width,cv.height);if(cvHist[n].length>0){var img=new Image();img.onload=function(){ctx.drawImage(img,0,0,cv.width,cv.height)};img.src=cvHist[n][cvHist[n].length-1]}};
window.redoDraw=function(){var n=curPg;if(!cvRedo[n]||!cvRedo[n].length)return;var cv=gCv(n);if(!cv)return;var d=cvRedo[n].pop();if(!cvHist[n])cvHist[n]=[];cvHist[n].push(d);var img=new Image();img.onload=function(){cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height)};img.src=d};
/*
 * Is this page holding more than it can show?
 *
 * Two guard clauses, both of which were missing and both of which matter when the answer drives
 * page creation:
 *
 *  - **A page with no measurable box is never overflowing.** When the board is closed, or a
 *    page has not been laid out yet, clientHeight is 0, and the scrollHeight check below
 *    is then true for *any* content - including a brand-new empty page. That turns the
 *    paginator into a page factory: every page it creates reports itself as overflowing,
 *    so it creates another. Checking the box first makes that state a no-op instead.
 *  - **A page with no visible content is never overflowing.** An empty page cannot need
 *    spilling onto another page, whatever its geometry says.
 */
function isPageOverflowing(pg){if(!pg)return false;if(pg.clientHeight<1)return false;if(!(pg.textContent||"").trim()&&!pg.querySelector("img,svg,canvas,table,iframe"))return false;return pg.scrollHeight>pg.clientHeight+1}
/*
 * Move only what has to move, and never mint a page that ends up holding nothing.
 *
 * The previous version called addPg() *before* checking whether anything could be moved, and
 * never cleaned up after itself. Pasting an image made that visible: the page's whole content
 * is one <p> wrapping one <img>, the while loop below can never relocate it (it needs more than
 * one child to take a last child from), and the result was an empty extra page every single
 * time with the image still clipped where it was.
 *
 * Three things keep it honest now. The depth argument bounds the recursion, because content
 * that genuinely cannot be split - a tall image, a wide table, a long unbreakable string - used to
 * add one page per level with nothing to stop it. A page is only created *after* something has been moved
 * into it, and is removed again if the move turned out to be impossible. And a pass that moves
 * nothing returns immediately rather than recursing, so there is no path that adds pages
 * without progress.
 */
function repaginatePage(pageNum,depth){depth=depth||0;if(depth>25)return;var pg=gPg(pageNum);if(!pg||!isPageOverflowing(pg))return;if(pg.childNodes.length<2)return;var nextPgNum=pageNum+1;var created=false;if(nextPgNum>totPg){window.addPg();created=true}var nextPg=gPg(nextPgNum);if(!nextPg){if(created)window.delPg();return}if(nextPg.innerHTML==="<p><br></p>")nextPg.innerHTML="";var moved=0;while(isPageOverflowing(pg)&&pg.childNodes.length>1){var lastChild=pg.lastChild;if(!lastChild)break;pg.removeChild(lastChild);nextPg.insertBefore(lastChild,nextPg.firstChild);moved++}if(moved===0){if(created)window.delPg();return}if(isPageOverflowing(nextPg))repaginatePage(nextPgNum,depth+1);updTh();updStats()}
function handlePastedContent(plainText,htmlText,startPgNum){var targetPgNum=startPgNum||curPg||1;var targetPg=gPg(targetPgNum);if(!targetPg)return;var temp=document.createElement("div");if(htmlText&&htmlText.trim()){temp.innerHTML=htmlText;temp.querySelectorAll("script, style, meta, link").forEach(function(s){s.remove()})}else if(plainText){var paras=plainText.split(/[\\r\\n]{2,}/);paras.forEach(function(para){var lines=para.split(/[\\r\\n]+/);var p=document.createElement("p");lines.forEach(function(line,idx){if(idx>0)p.appendChild(document.createElement("br"));p.appendChild(document.createTextNode(line))});temp.appendChild(p)})}var rawNodes=Array.from(temp.childNodes);if(rawNodes.length===0)return;if(targetPg.innerHTML==="<p><br></p>"||targetPg.innerHTML.trim()==="")targetPg.innerHTML="";function appendBlockToFlow(blockNode){var pg=gPg(targetPgNum);if(!pg){window.addPg();targetPgNum=totPg;pg=gPg(targetPgNum);if(pg.innerHTML==="<p><br></p>")pg.innerHTML=""}var clone=blockNode.cloneNode(true);pg.appendChild(clone);if(!isPageOverflowing(pg))return;var txt=clone.textContent||"";if(clone.nodeType===Node.ELEMENT_NODE&&txt.length>30){pg.removeChild(clone);var words=(clone.innerHTML||"").split(/\\s+/);var partial=document.createElement(clone.tagName||"p");for(var a=0;a<clone.attributes.length;a++)partial.setAttribute(clone.attributes[a].name,clone.attributes[a].value);pg.appendChild(partial);var currWords=[];var wIdx=0;while(wIdx<words.length){currWords.push(words[wIdx]);partial.innerHTML=currWords.join(" ");if(isPageOverflowing(pg)&&currWords.length>1){currWords.pop();partial.innerHTML=currWords.join(" ");targetPgNum++;if(targetPgNum>totPg)window.addPg();pg=gPg(targetPgNum);if(pg.innerHTML==="<p><br></p>")pg.innerHTML="";partial=document.createElement(clone.tagName||"p");for(var a=0;a<clone.attributes.length;a++)partial.setAttribute(clone.attributes[a].name,clone.attributes[a].value);pg.appendChild(partial);currWords=[]}else{wIdx++}}}else{pg.removeChild(clone);targetPgNum++;if(targetPgNum>totPg)window.addPg();var nextPg=gPg(targetPgNum);if(nextPg.innerHTML==="<p><br></p>")nextPg.innerHTML="";nextPg.appendChild(clone)}}for(var i=0;i<rawNodes.length;i++)appendBlockToFlow(rawNodes[i]);goToPg(targetPgNum);updTh();updStats();saveTxt()}
window.wbCut=function(){document.execCommand("cut");saveTxt()};
window.wbCopy=function(){document.execCommand("copy")};
window.wbPaste=function(){if(navigator.clipboard&&navigator.clipboard.readText){navigator.clipboard.readText().then(function(t){handlePastedContent(t,null,curPg)}).catch(function(){document.execCommand("paste")})}else{document.execCommand("paste")}};
window.fmt=function(c,v){document.execCommand(c,false,v||null);var pg=gPg(curPg);if(pg)pg.focus();updTb();saveTxt()};
window.setFont=function(f){document.execCommand("fontName",false,f)};
window.chgSize=function(d){var inp=document.getElementById("wbSize");var v=(parseInt(inp.value)||14)+d;v=Math.max(8,Math.min(72,v));inp.value=String(v);document.execCommand("fontSize",false,"7");document.querySelectorAll("font[size='7']").forEach(function(f){f.removeAttribute("size");f.style.fontSize=v+"px"})};
window.setTxtClr=function(c){document.execCommand("foreColor",false,c);document.getElementById("txtBar").style.background=c};
window.setHlClr=function(c){document.execCommand("hiliteColor",false,c);document.getElementById("hlBar").style.background=c};
function updTb(){var b=document.getElementById("btnB"),i=document.getElementById("btnI"),u=document.getElementById("btnU");if(b)b.classList.toggle("active",document.queryCommandState("bold"));if(i)i.classList.toggle("active",document.queryCommandState("italic"));if(u)u.classList.toggle("active",document.queryCommandState("underline"))}
window.togTrack=function(){trackOn=!trackOn;document.getElementById("btnTrack").classList.toggle("active",trackOn);var st=document.getElementById("stTrack");st.textContent=trackOn?"Track: On":"Track: Off";st.className=trackOn?"st-on":"st-off"};
window.setTheme=function(t){theme=t;ov.className="theme-"+t};
window.setOrient=function(o){orient=o;document.getElementById("orientP").classList.toggle("active",o==="portrait");document.getElementById("orientL").classList.toggle("active",o==="landscape")};
window.applySetup=function(){hdrCfg.name=document.getElementById("hfName").checked;hdrCfg.course=document.getElementById("hfCourse").checked;hdrCfg.date=document.getElementById("hfDate").checked;hdrCfg.custom=document.getElementById("hfCustom").value;hdrCfg.style=document.getElementById("hdrStyle").value;ftrCfg.page=document.getElementById("ftrPage").checked;ftrCfg.custom=document.getElementById("ftrCustom").value;margins.t=parseInt(document.getElementById("margT").value)||20;margins.b=parseInt(document.getElementById("margB").value)||20;margins.l=parseInt(document.getElementById("margL").value)||25;margins.r=parseInt(document.getElementById("margR").value)||25;wmCfg.text=document.getElementById("wmText").value;wmCfg.opacity=parseFloat(document.getElementById("wmOp").value)||0.08;wmCfg.size=parseInt(document.getElementById("wmSz").value)||80;borderCfg.style=document.getElementById("borderStyle").value;borderCfg.color=document.getElementById("borderColor").value;for(var i=1;i<=totPg;i++)applyPgSetup(i);updTh();closeMdl("mSetup");applyZm();setTimeout(function(){document.querySelectorAll(".wb-cv").forEach(syncCv)},100)};
function applyPgSetup(n){var wrap=gWrap(n);if(!wrap)return;wrap.className="pg-wrap";if(orient==="landscape")wrap.classList.add("landscape");if(borderCfg.style!=="none")wrap.classList.add("border-"+borderCfg.style);wrap.style.setProperty("--border-clr",borderCfg.color);var pg=gPg(n);if(pg)pg.style.padding=margins.t+"mm "+margins.r+"mm "+margins.b+"mm "+margins.l+"mm";var hdr=gHdr(n);if(hdr){hdr.className="wb-hdr";var show=hdrCfg.name||hdrCfg.course||hdrCfg.date||hdrCfg.custom;if(show){hdr.classList.add("show","style-"+hdrCfg.style);var title=[],meta=[];if(hdrCfg.name)title.push(LN);if(hdrCfg.course)title.push(CN);if(hdrCfg.date)meta.push(new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}));if(hdrCfg.custom)meta.push(hdrCfg.custom);hdr.innerHTML='<div class="hdr-inner"><div class="hdr-title">'+title.join(" \u2014 ")+'</div><div class="hdr-meta">'+meta.join(" | ")+'</div></div>'}else{hdr.innerHTML=""}}var ftr=gFtr(n);if(ftr){ftr.className="wb-ftr";if(ftrCfg.page||ftrCfg.custom){ftr.classList.add("show");ftr.innerHTML='<span>'+(ftrCfg.page?"Page "+n+" of "+totPg:"")+'</span><span>'+(ftrCfg.custom||"")+'</span>'}else{ftr.innerHTML=""}}var wm=gWm(n);if(wm){if(wmCfg.text&&wmCfg.text.trim()!==""){wm.classList.add("show");wm.textContent=wmCfg.text;wm.style.fontSize=wmCfg.size+"px";wm.style.color="rgba(0,0,0,"+wmCfg.opacity+")";wm.style.letterSpacing="4px"}else{wm.classList.remove("show");wm.textContent=""}}}
window.openMdl=function(id){document.getElementById(id).classList.add("show");if(id==="mTpl")renderTpl("all");if(id==="mSetup"){var op=document.getElementById("wmOp");op.oninput=function(){document.getElementById("wmOpVal").textContent=Math.round(op.value*100)+"%"}}if(id==="mBanners")renderBannerPicker()};
window.closeMdl=function(id){document.getElementById(id).classList.remove("show")};
window.doLink=function(){var u=document.getElementById("linkUrl").value,t=document.getElementById("linkTxt").value;if(u)document.execCommand("insertHTML",false,'<a href="'+u+'" target="_blank" style="color:#3182ce">'+(t||u)+'</a>');closeMdl("mLink");saveTxt()};
window.doTbl=function(){var r=parseInt(document.getElementById("tblR").value)||3,c=parseInt(document.getElementById("tblC").value)||3;var h='<table><tbody>';for(var i=0;i<r;i++){h+="<tr>";for(var j=0;j<c;j++)h+=i===0?"<th>Header</th>":"<td>&nbsp;</td>";h+="</tr>"}h+="</tbody></table><p><br></p>";document.execCommand("insertHTML",false,h);closeMdl("mTbl");saveTxt()};
window.handleUpl=function(inp){if(inp.files&&inp.files[0]){var rd=new FileReader();rd.onload=function(e){insImg(e.target.result)};rd.readAsDataURL(inp.files[0])}};
window.doImg=function(){var u=document.getElementById("imgUrl").value,c=document.getElementById("imgCaption").value;if(u)insImg(u,c);closeMdl("mImg")};
window.handleFileUpload=function(inp){if(inp.files&&inp.files[0]){var f=inp.files[0];var ext=f.name.split('.').pop().toLowerCase();if(ext==='pdf'){var rd=new FileReader();rd.onload=function(e){loadPDF(new Uint8Array(e.target.result))};rd.readAsArrayBuffer(f);}else if(ext==='docx'){var rd=new FileReader();rd.onload=function(e){loadDocx(e.target.result)};rd.readAsArrayBuffer(f);}else if(ext==='pptx'){var rd=new FileReader();rd.onload=function(e){loadPptx(e.target.result)};rd.readAsArrayBuffer(f);}else{alert("Unsupported file type.");}}};
async function loadPptx(data){var st=document.getElementById("fileStatus");st.textContent="Processing PPTX...";try{if(!window.JSZip){st.textContent="Loading JSZip...";await new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)});}var zip=await JSZip.loadAsync(data);var slideFiles=Object.keys(zip.files).filter(function(f){return f.match(/^ppt\\/slides\\/slide\\d+\\.xml$/)});slideFiles.sort(function(a,b){return parseInt(a.match(/slide(\\d+)\\.xml/)[1])-parseInt(b.match(/slide(\\d+)\\.xml/)[1])});for(var i=0;i<slideFiles.length;i++){var xml=await zip.file(slideFiles[i]).async("text");var parser=new DOMParser();var doc=parser.parseFromString(xml,"text/xml");var texts=doc.getElementsByTagName("a:t");var slideText="";for(var j=0;j<texts.length;j++)slideText+="<p>"+texts[j].textContent+"</p>";if(slideText){window.addPg();var p=gPg(totPg);if(p)p.innerHTML='<div style="border:1px solid #e2e8f0;padding:20px;margin:10px;background:#fff"><h3 style="color:#2b6cb0;border-bottom:1px solid #e2e8f0;padding-bottom:5px">Slide '+(i+1)+'</h3>'+slideText+'</div>';}}st.textContent="";closeMdl("mFile");goToPg(totPg-slideFiles.length+1);saveTxt();}catch(e){st.textContent="Error: "+e.message;}}
async function loadDocx(data){var st=document.getElementById("fileStatus");st.textContent="Converting DOCX...";try{if(!window.mammoth){st.textContent="Loading Mammoth...";await new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)});}var result=await mammoth.convertToHtml({arrayBuffer:data});var html=result.value;handlePastedContent(null,html,curPg);st.textContent="";closeMdl("mFile");saveTxt();}catch(e){st.textContent="Error: "+e.message;}}
async function loadPDF(data){var st=document.getElementById("fileStatus");st.textContent="Loading PDF...";try{if(!window.pdfjsLib){st.textContent="Loading PDF.js...";await new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=function(){window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";res()};s.onerror=rej;document.head.appendChild(s)});}var pdf=await pdfjsLib.getDocument(data).promise;st.textContent="Rendering "+pdf.numPages+" pages...";for(var i=1;i<=pdf.numPages;i++){var pg=await pdf.getPage(i);var vp=pg.getViewport({scale:2});var cv=document.createElement("canvas");var ctx=cv.getContext("2d");cv.height=vp.height;cv.width=vp.width;await pg.render({canvasContext:ctx,viewport:vp}).promise;window.addPg();var p=gPg(totPg);if(p)p.innerHTML='<img src="'+cv.toDataURL()+'" style="width:100%;height:auto;pointer-events:none">';}st.textContent="";closeMdl("mFile");goToPg(totPg-pdf.numPages+1);}catch(e){st.textContent="Error: "+e.message;}}
/*
 * Fit a picture to the page it is being placed on.
 *
 * Images used to be inserted with max-width:100% and height:auto and nothing else, which sizes a
 * picture by the page's *width* and lets the height fall where it may. A 1000x3000 phone
 * screenshot - the single most common thing anyone pastes into a whiteboard - became 794x2382px
 * on a page 1123px tall, so the bottom two thirds were silently cut off by the page's own
 * overflow:hidden with no way to scroll to them. Constraining both axes keeps the aspect ratio
 * and guarantees the picture fits the content box.
 */
function fitImageToPage(img,pg){if(!img)return;var frame=pg||(img.closest?img.closest(".wb-pg"):null);if(!frame)return;var cs=getComputedStyle(frame);var availW=frame.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);var availH=frame.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0);if(availW<=0||availH<=0)return;img.style.width="auto";img.style.height="auto";img.style.maxWidth=Math.max(80,Math.floor(availW))+"px";img.style.maxHeight=Math.max(90,Math.floor(availH*0.94))+"px"}
/*
 * Place a picture on the board.
 *
 * Deliberately *not* through document.execCommand insertHTML. Two reasons, and the second is the
 * bug this replaces:
 *
 *  1. execCommand writes into whatever happens to be focused, so a paste could land somewhere
 *     other than the page the learner was looking at.
 *  2. execCommand fires an input event, and the input handler runs the overflow paginator. An
 *     image is a single unbreakable node, so the paginator could never actually move it - but it
 *     created an empty page anyway, on every paste.
 *
 * Building the node and appending it fires no input event, so nothing paginates. If the page
 * held content and the picture will not fit alongside it, the picture moves to **one** follow-up
 * page - created because it is needed, and for something that is genuinely on it.
 */
window.insertImageFromDataUrl=function(src,pg,caption,onDone){var host=pg||gPg(curPg);if(!host){if(onDone)onDone();return}var num=parseInt(host.dataset.pg)||curPg||1;var block=document.createElement("figure");block.style.cssText="margin:10px 0;display:block;max-width:100%";var img=document.createElement("img");block.appendChild(img);if(caption){var cap=document.createElement("figcaption");cap.style.cssText="font-size:10pt;color:#718096;margin-top:4px;text-align:center";cap.textContent=caption;block.appendChild(cap)}img.src=src;if(host.innerHTML==="<p><br></p>"||!host.innerHTML.trim())host.innerHTML="";host.appendChild(block);fitImageToPage(img,host);if(!isPageOverflowing(host)||host.childNodes.length<2){if(onDone)onDone();return}host.removeChild(block);if(num+1>totPg)window.addPg();var target=gPg(num+1);if(!target){host.appendChild(block);if(onDone)onDone();return}if(target.innerHTML==="<p><br></p>")target.innerHTML="";target.appendChild(block);fitImageToPage(img,target);goToPg(num+1);if(onDone)onDone()};
function insImg(src,caption){window.insertImageFromDataUrl(src,gPg(curPg),caption,function(){saveTxt();closeMdl("mImg")})}
window.togDraw=function(){if(!drawOn&&isHandActive){togHand();}drawOn=!drawOn;document.getElementById("btnDraw").classList.toggle("active",drawOn);document.getElementById("drawPnl").classList.toggle("show",drawOn);document.querySelectorAll(".wb-cv").forEach(function(c){c.classList.toggle("active",drawOn);syncCv(c)});document.querySelectorAll(".wb-pg").forEach(function(p){p.contentEditable=drawOn?"false":"true"})};
window.setTool=function(t){tool=t;document.querySelectorAll(".dp-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tool===t)})};
window.setDClr=function(c){dClr=c;document.getElementById("drawClr").value=c};
document.getElementById("drawClr").addEventListener("input",function(e){dClr=e.target.value});
document.getElementById("drawSz").addEventListener("input",function(e){dSz=parseInt(e.target.value);document.getElementById("szVal").textContent=dSz+"px"});
window.clearDraw=function(){var cv=gCv(curPg);if(cv){cv.getContext("2d").clearRect(0,0,cv.width,cv.height);saveCv(curPg)}};
function initCv(cv){syncCv(cv);var ctx=cv.getContext("2d");var n=parseInt(cv.dataset.pg);if(!cvHist[n])cvHist[n]=[];
cv.addEventListener("mousedown",function(e){if(!drawOn)return;drawing=true;var r=cv.getBoundingClientRect();var scX=cv.width/r.width,scY=cv.height/r.height;sx=lx=(e.clientX-r.left)*scX;sy=ly=(e.clientY-r.top)*scY;if(["line","arrow","rect","fillRect","circle","fillCircle"].indexOf(tool)>=0)cv._snap=ctx.getImageData(0,0,cv.width,cv.height)});
cv.addEventListener("mousemove",function(e){if(!drawing||!drawOn)return;var r=cv.getBoundingClientRect();var scX=cv.width/r.width,scY=cv.height/r.height;var x=(e.clientX-r.left)*scX,y=(e.clientY-r.top)*scY;ctx.lineCap="round";ctx.lineJoin="round";if(["line","arrow","rect","fillRect","circle","fillCircle"].indexOf(tool)>=0){if(cv._snap)ctx.putImageData(cv._snap,0,0);drawShape(ctx,sx,sy,x,y)}else{ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x,y);var w=dSz,c=dClr,a=1;if(tool==="eraser"){c="#ffffff";w=dSz*4}else if(tool==="brush")w=dSz*2;else if(tool==="marker"){w=dSz*3;a=0.7}else if(tool==="highlighter"){w=dSz*5;a=0.3}else if(tool==="pencil")w=Math.max(1,dSz*0.5);ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();ctx.globalAlpha=1;lx=x;ly=y}});
cv.addEventListener("mouseup",function(){if(drawing){drawing=false;delete cv._snap;saveCv(n)}});
cv.addEventListener("mouseleave",function(){if(drawing){drawing=false;delete cv._snap;saveCv(n)}});}
function drawShape(ctx,x1,y1,x2,y2){ctx.strokeStyle=dClr;ctx.fillStyle=dClr;ctx.lineWidth=dSz;ctx.beginPath();if(tool==="line"){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}else if(tool==="arrow"){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();var ang=Math.atan2(y2-y1,x2-x1);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-15*Math.cos(ang-Math.PI/6),y2-15*Math.sin(ang-Math.PI/6));ctx.moveTo(x2,y2);ctx.lineTo(x2-15*Math.cos(ang+Math.PI/6),y2-15*Math.sin(ang+Math.PI/6));ctx.stroke()}else if(tool==="rect"){ctx.strokeRect(x1,y1,x2-x1,y2-y1)}else if(tool==="fillRect"){ctx.fillRect(x1,y1,x2-x1,y2-y1)}else if(tool==="circle"||tool==="fillCircle"){var rx=Math.abs(x2-x1)/2,ry=Math.abs(y2-y1)/2;ctx.ellipse(Math.min(x1,x2)+rx,Math.min(y1,y2)+ry,rx,ry,0,0,Math.PI*2);tool==="fillCircle"?ctx.fill():ctx.stroke()}}
function createPg(n){var wrap=document.createElement("div");wrap.className="pg-wrap"+(orient==="landscape"?" landscape":"");if(borderCfg.style!=="none")wrap.classList.add("border-"+borderCfg.style);wrap.style.setProperty("--border-clr",borderCfg.color);wrap.dataset.pg=String(n);var hdr=document.createElement("div");hdr.className="wb-hdr";hdr.id="hdr"+n;var container=document.createElement("div");container.className="wb-pg-container";var pg=document.createElement("div");pg.className="wb-pg";pg.id="pg"+n;pg.contentEditable="true";pg.dataset.pg=String(n);pg.innerHTML="<p><br></p>";pg.style.padding=margins.t+"mm "+margins.r+"mm "+margins.b+"mm "+margins.l+"mm";pg.setAttribute("spellcheck","true");var cv=document.createElement("canvas");cv.className="wb-cv";cv.id="cv"+n;cv.dataset.pg=String(n);if(drawOn)cv.classList.add("active");var wm=document.createElement("div");wm.className="wb-wm";wm.id="wm"+n;container.appendChild(pg);container.appendChild(cv);container.appendChild(wm);var ftr=document.createElement("div");ftr.className="wb-ftr";ftr.id="ftr"+n;wrap.appendChild(hdr);wrap.appendChild(container);wrap.appendChild(ftr);return{wrap:wrap,pg:pg,cv:cv}}
window.addPg=function(){totPg++;var n=totPg;var els=createPg(n);var zi=document.getElementById("zoomInner")||zoomC;zi.appendChild(els.wrap);initCv(els.cv);setupPgEv(els.pg);applyPgSetup(n);for(var i=1;i<=totPg;i++){var f=gFtr(i);if(f&&ftrCfg.page)f.innerHTML='<span>Page '+i+' of '+totPg+'</span><span>'+(ftrCfg.custom||'')+'</span>'}updTh();goToPg(n);applyZm();saveTxt()};
window.delPg=function(){if(totPg<2)return;var sel=gWrap(curPg);if(sel)sel.remove();document.querySelectorAll(".pg-wrap").forEach(function(w,i){var n=i+1;w.dataset.pg=String(n);var p=w.querySelector(".wb-pg");if(p){p.id="pg"+n;p.dataset.pg=String(n)}var c=w.querySelector(".wb-cv");if(c){c.id="cv"+n;c.dataset.pg=String(n)}var h=w.querySelector(".wb-hdr");if(h)h.id="hdr"+n;var f=w.querySelector(".wb-ftr");if(f)f.id="ftr"+n;var wm=w.querySelector(".wb-wm");if(wm)wm.id="wm"+n});totPg--;curPg=Math.min(curPg,totPg);for(var i=1;i<=totPg;i++)applyPgSetup(i);updTh();updStats();applyZm();saveTxt()};
window.goToPg=function(n){if(n<1||n>totPg)return;curPg=n;var el=gWrap(n);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});updTh();updStats();document.getElementById("pgJump").value=String(n)};
window.goToPageInput=function(){goToPg(parseInt(document.getElementById("pgJump").value)||1)};
function updTh(){pgListEl.innerHTML="";for(var i=1;i<=totPg;i++){var d=document.createElement("div");d.className="ps-th"+(i===curPg?" active":"")+(orient==="landscape"?" landscape":"");d.tabIndex=0;d.dataset.pg=String(i);var pageEl=gPg(i);var snippet="";if(pageEl){snippet=(pageEl.innerText||pageEl.textContent||"").trim();}var previewHtml='<div class="ps-th-preview">';if(snippet){previewHtml+=snippet.slice(0,140);}else{previewHtml+='<div style="opacity:0.4;font-style:italic;">Page '+i+' (Empty)</div>';}previewHtml+='</div>';(function(pg,el){el.onclick=function(){goToPg(pg);document.querySelectorAll(".ps-th").forEach(function(t){t.classList.remove("selected")});el.classList.add("selected");};el.onkeydown=function(e){if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();e.stopPropagation();goToPg(pg);window.delPg();}};})(i,d);d.innerHTML=previewHtml+'<div class="ps-th-n">'+i+'</div>';pgListEl.appendChild(d)}document.getElementById("pgInfo").textContent=curPg+"/"+totPg;document.getElementById("pgJump").max=String(totPg)}
// Pages Panel Hotkeys: Delete key deletes page, + key adds page when Pages panel or thumbnail is focused
document.addEventListener("keydown",function(e){var active=document.activeElement;if(!active)return;var inPagesPanel=active.closest("#pgList")||active.closest(".ps-panel")||active.classList.contains("ps-th");if(inPagesPanel){if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();window.delPg();}else if(e.key==="+"||e.key==="="){e.preventDefault();window.addPg();}}});
function updStats(){var txt="";document.querySelectorAll(".wb-pg").forEach(function(p){txt+=p.innerText+" "});var w=txt.trim().split(/\\s+/).filter(function(x){return x}).length;var c=txt.replace(/\\s/g,"").length;document.getElementById("stWords").textContent="Words: "+w;document.getElementById("stChars").textContent="Chars: "+c;document.getElementById("stPg").textContent="Page "+curPg+"/"+totPg}
window.zmIn=function(step){zoom=Math.min(10000,zoom+(step||25));applyZm()};
window.zmOut=function(step){zoom=Math.max(10,zoom-(step||25));applyZm()};
function applyZm(){var zv=document.getElementById("zmVal");if(zv)zv.textContent=zoom+"%";var zc=document.getElementById("zoomContainer");var zi=document.getElementById("zoomInner");if(!zc||!zi)return;var s=zoom/100;var maxPgW=0,totalPgH=0;var pgWraps=zi.querySelectorAll(".pg-wrap");pgWraps.forEach(function(w){var wWidth=w.offsetWidth||(orient==="landscape"?1122:794);var wHeight=w.offsetHeight||(orient==="landscape"?794:1122);if(wWidth>maxPgW)maxPgW=wWidth;totalPgH+=wHeight+30;});var unscaledW=(maxPgW||800)+40;var unscaledH=(totalPgH||1100)+10;var scaledW=Math.ceil(unscaledW*s);var scaledH=Math.ceil(unscaledH*s);zc.style.width=scaledW+"px";zc.style.height=scaledH+"px";zi.style.transform="scale("+s+")";zi.style.transformOrigin="top left";}
/* MOD 5: Ctrl+Scroll zooms infinitely up to 10,000% */
(function(){var wa=document.getElementById("wbArea");if(!wa)return;wa.addEventListener("wheel",function(e){if(e.ctrlKey||e.metaKey){e.preventDefault();e.stopPropagation();var step = e.deltaY < 0 ? (zoom >= 500 ? 100 : (zoom >= 200 ? 50 : 25)) : (zoom >= 500 ? -100 : (zoom >= 200 ? -50 : -25));zoom=Math.max(10,Math.min(10000,zoom+step));applyZm();}},{passive:false});})();
window.togFs=function(){if(document.fullscreenElement)document.exitFullscreen();else ov.requestFullscreen()};
/* MOD 1: SPEECH TO TEXT & MICROPHONE SETTINGS */
var micRecognition=null,micListening=false,micFinalText="",micInterimText="",micAutoPunct=true,micVoiceCmds=true,micSelectedLang="en-US",micSelectedDevId="";

window.toggleMicSettingsPopover=function(e){
  if(e)e.stopPropagation();
  var panel=document.getElementById("micSettingsPanel");
  if(!panel)return;
  var isShowing=panel.classList.contains("show");
  if(isShowing){
    panel.classList.remove("show");
  }else{
    panel.classList.add("show");
    loadMicDevices();
  }
};

window.closeMicSettingsPopover=function(){
  var panel=document.getElementById("micSettingsPanel");
  if(panel)panel.classList.remove("show");
};

document.addEventListener("click",function(e){
  var panel=document.getElementById("micSettingsPanel");
  var circleBtn=document.getElementById("micCircleBtn");
  if(panel&&panel.classList.contains("show")){
    if(!panel.contains(e.target)&&!circleBtn.contains(e.target)){
      panel.classList.remove("show");
    }
  }
});

function updateMicUIState(statusMsg,isError){
  var circleBtn=document.getElementById("micCircleBtn");
  var circleBadge=document.getElementById("micCircleBadge");
  var statusText=document.getElementById("micStatusText");
  var toggleBtn=document.getElementById("micToggleBtn");
  var toggleTxt=document.getElementById("micToggleTxt");
  var indicator=document.getElementById("micIndicator");

  if(micListening){
    if(circleBtn)circleBtn.classList.add("listening");
    if(circleBadge){circleBadge.textContent="REC";circleBadge.style.background="#22c55e";}
    if(toggleBtn)toggleBtn.classList.add("active");
    if(toggleTxt)toggleTxt.textContent="Stop Live Transcribe";
    if(indicator)indicator.classList.add("show");
    if(statusText){
      statusText.textContent=statusMsg||"LISTENING...";
      statusText.style.color=isError?"#f87171":"#38bdf8";
    }
  }else{
    if(circleBtn)circleBtn.classList.remove("listening");
    if(circleBadge){circleBadge.textContent="OFF";circleBadge.style.background="#475569";}
    if(toggleBtn)toggleBtn.classList.remove("active");
    if(toggleTxt)toggleTxt.textContent="Activate Live Transcribe";
    if(indicator)indicator.classList.remove("show");
    if(statusText){
      statusText.textContent=statusMsg||"READY";
      statusText.style.color=isError?"#f87171":"#94a3b8";
    }
  }
}

function loadMicDevices(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return;
  navigator.mediaDevices.enumerateDevices().then(function(devices){
    var sel=document.getElementById("micDevSel");
    if(!sel)return;
    var currentVal=sel.value||micSelectedDevId;
    sel.innerHTML='<option value="">Default Microphone</option>';
    var audioDevs=devices.filter(function(d){return d.kind==="audioinput";});
    audioDevs.forEach(function(d,idx){
      var opt=document.createElement("option");
      opt.value=d.deviceId;
      opt.textContent=d.label||("Microphone "+(idx+1));
      if(d.deviceId===currentVal)opt.selected=true;
      sel.appendChild(opt);
    });
  }).catch(function(err){
    console.warn("Error enumerating mic devices:",err);
  });
}

window.onMicDeviceChange=function(devId){
  micSelectedDevId=devId;
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&devId){
    navigator.mediaDevices.getUserMedia({audio:{deviceId:{exact:devId}}}).then(function(stream){
    }).catch(function(err){
      console.warn("Could not switch audio stream device:",err);
    });
  }
  if(micListening&&micRecognition){
    try{micRecognition.stop();}catch(e){}
    setTimeout(function(){if(micListening)startMicRecognition();},300);
  }
};

window.onMicLanguageChange=function(lang){
  micSelectedLang=lang;
  if(micRecognition){
    micRecognition.lang=lang;
  }
  if(micListening){
    try{micRecognition.stop();}catch(e){}
    setTimeout(function(){if(micListening)startMicRecognition();},300);
  }
};

window.toggleAutoPunct=function(checked){
  micAutoPunct=checked;
};

window.toggleVoiceCmds=function(checked){
  micVoiceCmds=checked;
};

function initMic(){
  var SpeechRec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRec){
    updateMicUIState("NOT SUPPORTED",true);
    var prev=document.getElementById("micPreview");
    if(prev)prev.innerHTML='<span style="color:#f87171">Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.</span>';
    return false;
  }

  micRecognition=new SpeechRec();
  micRecognition.continuous=true;
  micRecognition.interimResults=true;
  micRecognition.lang=micSelectedLang||"en-US";

  micRecognition.onstart=function(){
    micListening=true;
    updateMicUIState("LISTENING LIVE...");
    var prev=document.getElementById("micPreview");
    if(prev)prev.innerHTML='<span style="color:#38bdf8">🎙️ Listening... speak clearly into your microphone</span>';
  };

  micRecognition.onend=function(){
    if(micListening){
      if(micFinalText.trim()||micInterimText.trim()){
        insertTranscribedText();
      }
      setTimeout(function(){
        if(micListening){
          try{micRecognition.start();}catch(err){console.warn("Restart mic error:",err);}
        }
      },300);
      return;
    }
    updateMicUIState("PAUSED");
  };

  micRecognition.onerror=function(e){
    console.warn("Speech recognition error:",e.error);
    if(e.error==="not-allowed"||e.error==="service-not-allowed"){
      micListening=false;
      updateMicUIState("ACCESS DENIED",true);
      var prev=document.getElementById("micPreview");
      if(prev)prev.innerHTML='<span style="color:#f87171">⚠️ Microphone access denied. Please allow microphone permissions in browser.</span>';
      return;
    }
    if(micListening&&(e.error==="no-speech"||e.error==="network"||e.error==="aborted")){
      setTimeout(function(){
        if(micListening){
          try{micRecognition.start();}catch(err){}
        }
      },400);
    }
  };

  micRecognition.onresult=function(e){
    var interim="",finalChunk="";
    for(var i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal){
        finalChunk+=e.results[i][0].transcript+" ";
      }else{
        interim+=e.results[i][0].transcript;
      }
    }

    if(finalChunk.trim()){
      var processed=processTranscribedChunk(finalChunk.trim());
      if(processed){
        insertTextDirectly(processed+" ");
      }
      micFinalText="";
    }

    micInterimText=interim;
    var prev=document.getElementById("micPreview");
    if(prev){
      if(interim.trim()){
        prev.innerHTML='<span style="color:#38bdf8">🗣️ </span>'+interim;
      }else{
        prev.innerHTML='<span style="color:#4ade80">✓ Transcribed! Keep speaking...</span>';
      }
    }
    updateMicUIState("TRANSCRIBING...");
  };

  return true;
}

function processTranscribedChunk(raw){
  if(!raw)return "";
  var text=raw;

  if(micVoiceCmds){
    text=text.replace(/\\b(new line|next line)\\b/gi,"\\n");
    text=text.replace(/\\b(period|full stop)\\b/gi,".");
    text=text.replace(/\\bcomma\\b/gi,",");
    text=text.replace(/\\bquestion mark\\b/gi,"?");
    text=text.replace(/\\b(exclamation mark|exclamation point)\\b/gi,"!");
  }

  if(micAutoPunct){
    text=autoPunctuate(text);
  }

  return text;
}

function autoPunctuate(t){
  if(!t)return "";
  t=t.trim();
  t=t.charAt(0).toUpperCase()+t.slice(1);
  if(!/[.!?\\n]$/.test(t)){
    if(/^(who|what|where|when|why|how|is|are|can|could|would|do|does|did|will|should)\\b/i.test(t)){
      t+="?";
    }else{
      t+=".";
    }
  }
  t=t.replace(/([.!?])\\s+([a-z])/g,function(m,p,l){return p+" "+l.toUpperCase();});
  return t;
}

function startMicRecognition(){
  if(!micRecognition){
    var ok=initMic();
    if(!ok)return;
  }
  if(micRecognition){
    micRecognition.lang=micSelectedLang||"en-US";
    try{
      micRecognition.start();
    }catch(err){
      console.warn("SpeechRec start error:",err);
    }
  }
}

window.toggleMicActive=function(){
  if(micListening){
    micListening=false;
    if(micRecognition){
      try{micRecognition.stop();}catch(e){}
    }
    updateMicUIState("PAUSED");
  }else{
    micFinalText="";
    micInterimText="";
    micListening=true;
    startMicRecognition();
    loadMicDevices();
  }
};

window.toggleMic=window.toggleMicActive;

function insertTextDirectly(text){
  if(!text)return;
  var pg=gPg(curPg);
  if(pg&&pg.contentEditable==="true"){
    pg.focus();
    var sel=window.getSelection();
    if(sel&&sel.rangeCount){
      var range=sel.getRangeAt(0);
      if(pg.contains(range.commonAncestorContainer)){
        range.deleteContents();
        if(text.indexOf("\\n")!==-1){
          var parts=text.split("\\n");
          for(var p=0;p<parts.length;p++){
            if(p>0)range.insertNode(document.createElement("br"));
            if(parts[p])range.insertNode(document.createTextNode(parts[p]));
          }
        }else{
          var node=document.createTextNode(text);
          range.insertNode(node);
          range.setStartAfter(node);
          range.setEndAfter(node);
        }
        sel.removeAllRanges();
        sel.addRange(range);
      }else{
        document.execCommand("insertText",false,text);
      }
    }else{
      document.execCommand("insertText",false,text);
    }
  }else{
    insertTextBox();
    var pg2=gPg(curPg);
    if(pg2){
      var tb=pg2.querySelector(".text-box:last-child");
      if(tb)tb.textContent=(tb.textContent||"")+" "+text;
    }
  }
  updTh();
  updStats();
  saveTxt();
}

function insertTranscribedText(){
  if(micFinalText.trim()||micInterimText.trim()){
    var raw=(micFinalText+" "+micInterimText).trim();
    var text=processTranscribedChunk(raw);
    insertTextDirectly(text+" ");
    micFinalText="";
    micInterimText="";
  }
}
/* MOD 2: LIBRARY PANEL */
var libTabCurrent="doc";
var LIB_CUSTOM_KEY="wb_lib_custom_"+LN.replace(/\\s/g,"_");
var LIB_DOC_PROMPTS=${docPromptsJson};
var LIB_WEB_PROMPTS=${webPromptsJson};
var LIB_MASTER_PROMPT=${masterPromptJson};
function getCustomPrompts(){try{return JSON.parse(localStorage.getItem(LIB_CUSTOM_KEY)||"[]")}catch(e){return []}}
function saveCustomPrompts(arr){try{localStorage.setItem(LIB_CUSTOM_KEY,JSON.stringify(arr))}catch(e){}}
window.toggleLibraryPanel=function(){var panel=document.getElementById("libPanel");if(!panel)return;panel.classList.toggle("open");if(panel.classList.contains("open"))renderLibCards();};
window.setLibTab=function(tab,btn){libTabCurrent=tab;document.querySelectorAll(".lib-tab").forEach(function(b){b.classList.remove("active")});btn.classList.add("active");renderLibCards();};
function renderLibCards(){var query=(document.getElementById("libSearch")||{}).value||"";query=query.toLowerCase();var cards=document.getElementById("libCards");if(!cards)return;cards.innerHTML="";var masterCard=buildLibCard({id:"master",icon:"🤖",title:"Master AI Prompt (All Types)",desc:"One prompt that tells the AI all three schemas. The AI will ask what you want and follow the structure for any template.",prompt:LIB_MASTER_PROMPT});cards.appendChild(masterCard);var prompts=libTabCurrent==="doc"?LIB_DOC_PROMPTS:libTabCurrent==="web"?LIB_WEB_PROMPTS:getCustomPrompts();prompts.filter(function(p){if(!query)return true;return (p.title+p.desc).toLowerCase().indexOf(query)>=0;}).forEach(function(p){cards.appendChild(buildLibCard(p));});if(libTabCurrent==="custom"&&getCustomPrompts().length===0){cards.innerHTML='<p style="color:#a0aec0;font-size:12px;text-align:center;margin-top:20px">No custom prompts yet.</p>';}}
function buildLibCard(p){var d=document.createElement("div");d.className="lib-card";d.innerHTML='<div class="lib-card-head"><div class="lib-card-icon">'+p.icon+'</div><div><div class="lib-card-title">'+p.title+'</div></div></div><div class="lib-card-desc">'+p.desc+'</div><div class="lib-card-btns"><button class="lib-copy-btn" data-id="'+p.id+'" onclick="copyLibPrompt(this.dataset.id)"><i class="fas fa-copy"></i> Copy Prompt</button>'+(libTabCurrent==="custom"?'<button class="lib-copy-btn" style="background:#e53e3e" data-id="'+p.id+'" onclick="deleteCustomPrompt(this.dataset.id)"><i class="fas fa-trash"></i></button>':'')+'</div>';return d;}
window.wbCopyText=function(text, successMsg){
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      alert(successMsg || "Copied to clipboard!");
    }).catch(function(err) {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
};
function fallbackCopyText(text, successMsg) {
  var ta=document.createElement("textarea");
  ta.value=text;
  ta.style.position="fixed";
  ta.style.top="0";
  ta.style.left="0";
  ta.style.width="2em";
  ta.style.height="2em";
  ta.style.padding="0";
  ta.style.border="none";
  ta.style.outline="none";
  ta.style.boxShadow="none";
  ta.style.background="transparent";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try{
    var successful = document.execCommand("copy");
    if (successful) alert(successMsg || "Copied to clipboard!");
    else alert("Failed to copy to clipboard.");
  }catch(e){
    alert("Failed to copy: " + e);
  }
  document.body.removeChild(ta);
}
window.copyLibPrompt=function(id){var all=LIB_DOC_PROMPTS.concat(LIB_WEB_PROMPTS).concat(getCustomPrompts());all.push({id:"master",prompt:LIB_MASTER_PROMPT,icon:"",title:"",desc:""});var found=all.find(function(p){return p.id===id});if(!found)return;window.wbCopyText(found.prompt,"Prompt copied!");};
window.filterLibrary=function(){renderLibCards()};
window.saveCustomPrompt=function(){var title=document.getElementById("cpTitle").value.trim();var icon=document.getElementById("cpIcon").value.trim()||"⭐";var prompt=document.getElementById("cpPrompt").value.trim();var type=document.getElementById("cpType").value;if(!title||!prompt){alert("Please fill in title and prompt.");return;}var arr=getCustomPrompts();var id="custom_"+Date.now();arr.push({id:id,icon:icon,title:title,desc:"Custom prompt",prompt:prompt,type:type});saveCustomPrompts(arr);closeMdl("mCustomPrompt");document.getElementById("cpTitle").value="";document.getElementById("cpPrompt").value="";if(libTabCurrent==="custom")renderLibCards();alert("Custom prompt saved!");};
window.deleteCustomPrompt=function(id){if(!confirm("Delete this prompt?"))return;var arr=getCustomPrompts().filter(function(p){return p.id!==id});saveCustomPrompts(arr);renderLibCards();};
window.applyAIResponse=function(){var raw=document.getElementById("libPasteInput").value.trim();if(!raw){alert("Please paste an AI response first.");return;}try{var json=JSON.parse(raw);if(json.type==="doc_annotation")applyDocAnnotation(json);else if(json.type==="web_page")applyWebPage(json);else if(json.type==="whiteboard")applyWhiteboardElements(json);else alert("Unknown response type: "+json.type);document.getElementById("libPasteInput").value="";}catch(e){alert("Invalid JSON. Make sure you copied the full AI response.\\n\\nError: "+e.message);}};
${applyDocAnnotationFn}
/* applyDocAnnotation defined above via injection */
function applyWebPage(json){if(!json.html){alert("No HTML found in response.");return;}window.addPg();var np=gPg(totPg);if(np){np.innerHTML='';var iframe=document.createElement("iframe");iframe.style.cssText="width:100%;height:250mm;border:none;border-radius:4px";iframe.srcdoc=json.html;np.appendChild(iframe);if(json.title){var h=document.createElement("p");h.style.cssText="font-weight:700;color:#2b6cb0;margin-bottom:8px";h.textContent="Web Page: "+json.title;np.insertBefore(h,np.firstChild);}}goToPg(totPg);saveTxt();alert("Web page applied on page "+totPg);}
function applyWhiteboardElements(json){if(!json.elements||!json.elements.length){alert("No elements found.");return;}var pg=gPg(curPg);if(!pg)return;json.elements.forEach(function(el){if(el.kind==="textbox"){var div=document.createElement("div");div.className="text-box";div.contentEditable="true";div.innerHTML=el.content||"";if(el.style)div.style.cssText+=";"+el.style;pg.appendChild(div);}});saveTxt();}
/* MOD 3: MARK ERROR */
window.toggleMarkErrMenu=function(){var m=document.getElementById("markErrMenu");if(!m)return;m.classList.toggle("show");};
document.addEventListener("click",function(e){var m=document.getElementById("markErrMenu");if(m&&m.classList.contains("show")&&!e.target.closest(".mark-err-wrap"))m.classList.remove("show");});
window.markError=function(cat,color){var sel=window.getSelection();if(!sel||sel.isCollapsed){alert("Please select some text first, then choose an error category.");document.getElementById("markErrMenu").classList.remove("show");return;}if(!sel.rangeCount){document.getElementById("markErrMenu").classList.remove("show");return;}var range=sel.getRangeAt(0);var span=document.createElement("span");span.className="err-mark";span.style.background=lighten(color,0.85);span.style.borderBottom="2px solid "+color;span.style.color="#1a202c";span.dataset.errType=cat;span.title=cat+" error";try{range.surroundContents(span);}catch(ex){var frag=range.extractContents();span.appendChild(frag);range.insertNode(span);}sel.removeAllRanges();document.getElementById("markErrMenu").classList.remove("show");saveTxt();};
var errTooltip=document.createElement("div");errTooltip.className="err-tooltip";errTooltip.id="errTooltip";document.getElementById("whiteboard-overlay").appendChild(errTooltip);
document.addEventListener("mouseover",function(e){var t=e.target.closest(".err-mark");if(t){errTooltip.textContent=t.dataset.errType+" Error";errTooltip.style.display="block";errTooltip.style.left=(e.clientX+10)+"px";errTooltip.style.top=(e.clientY-30)+"px";}});
document.addEventListener("mousemove",function(e){if(errTooltip.style.display==="block"&&e.target.closest(".err-mark")){errTooltip.style.left=(e.clientX+10)+"px";errTooltip.style.top=(e.clientY-30)+"px";}});
document.addEventListener("mouseout",function(e){if(!e.target.closest(".err-mark"))errTooltip.style.display="none";});
/* THESAURUS */
window.closeThesaurus=function(){document.getElementById("thesaurusPane").classList.remove("open")};
window.openThesaurusFromCtx=function(){var sel=window.getSelection();var word=sel?sel.toString().trim().split(/\\s+/)[0]:"";var pane=document.getElementById("thesaurusPane");pane.classList.add("open");if(word){document.getElementById("thesInput").value=word;lookupThesaurus(word);}closeCtx();};
window.lookupThesaurus=function(word){if(!word||!word.trim())return;word=word.trim().toLowerCase().split(/\\s+/)[0];var res=document.getElementById("thesResults");res.innerHTML='<p style="text-align:center;color:#a0aec0;font-size:12px;margin-top:30px">Looking up "'+word+'"...</p>';fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(word)).then(function(r){return r.json()}).then(function(data){if(!Array.isArray(data)||!data.length){res.innerHTML='<p style="text-align:center;color:#e53e3e;font-size:12px;margin-top:20px">No results found for "'+word+'"</p>';return;}var entry=data[0];var html='<div class="thes-word">'+entry.word+'</div>';if(entry.phonetics&&entry.phonetics[0]&&entry.phonetics[0].text)html+='<div class="thes-phonetic">'+entry.phonetics[0].text+'</div>';(entry.meanings||[]).forEach(function(m){html+='<div class="thes-pos">'+m.partOfSpeech+'</div>';(m.definitions||[]).slice(0,2).forEach(function(def){html+='<div class="thes-def">'+def.definition+'</div>';if(def.example)html+='<div style="font-size:11px;color:#718096;font-style:italic;margin-bottom:4px;padding-left:8px">"'+def.example+'"</div>';});if(m.synonyms&&m.synonyms.length){html+='<div class="thes-syn-title">Synonyms</div><div class="thes-syn-list">';m.synonyms.slice(0,12).forEach(function(s){html+='<span class="thes-syn-chip" onclick="replaceWithSynonym(this.textContent)">'+s+'</span>';});html+='</div>';}});res.innerHTML=html;}).catch(function(){res.innerHTML='<p style="text-align:center;color:#e53e3e;font-size:12px;margin-top:20px">Error fetching data. Check internet connection.</p>';});};
window.replaceWithSynonym=function(syn){var sel=window.getSelection();if(sel&&!sel.isCollapsed&&sel.rangeCount){var range=sel.getRangeAt(0);range.deleteContents();range.insertNode(document.createTextNode(syn));range.collapse(false);sel.removeAllRanges();sel.addRange(range);saveTxt();}else{document.execCommand("insertText",false,syn);saveTxt();}};
/* CONTEXT MENU */
window.closeCtx=function(){var m=document.getElementById("wbContextMenu");if(m)m.classList.remove("show")};
document.getElementById("whiteboard-overlay").addEventListener("contextmenu",function(e){if(drawOn){e.preventDefault();togDraw();closeCtx();return;}var t=e.target.closest(".wb-pg")||e.target.closest(".wb-pg-container");if(!t)return;e.preventDefault();var menu=document.getElementById("wbContextMenu");if(!menu)return;menu.style.left=Math.min(e.clientX,window.innerWidth-220)+"px";menu.style.top=Math.min(e.clientY,window.innerHeight-200)+"px";menu.classList.add("show");var sel=window.getSelection();var word=sel?sel.toString().trim().split(/\\s+/)[0]:"";var synList=document.getElementById("ctxSynList");if(word&&synList){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0;font-style:italic">Loading...</div>';fetch("https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(word)).then(function(r){return r.json()}).then(function(data){if(!Array.isArray(data)||!data.length){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0">No synonyms found</div>';return;}var syns=[];(data[0].meanings||[]).forEach(function(m){if(m.synonyms)syns=syns.concat(m.synonyms)});syns=syns.slice(0,8);if(!syns.length){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0">No synonyms found</div>';return;}synList.innerHTML=syns.map(function(s){return'<div class="ctx-syn-item" onclick="replaceWithSynonym(this.textContent);closeCtx()">'+s+'</div>'}).join("");}).catch(function(){synList.innerHTML='<div class="ctx-syn-item" style="color:#a0aec0">Error</div>';});}});
document.addEventListener("click",function(e){if(!e.target.closest("#wbContextMenu"))closeCtx();});
document.addEventListener("mousedown",function(e){if(e.button===0&&!e.target.closest("#wbContextMenu"))closeCtx();});
/* MOD 4: BANNERS */
var BANNER_DEFS=[
{id:"warning",icon:"⚠️",title:"Warning",color:"#fbbf24",textColor:"#78350f",bg:"#fffbeb",desc:"Yellow/black warning sign with caution background"},
{id:"qa",icon:"💬",title:"Q&A Prompt",color:"#60a5fa",textColor:"#1e3a5f",bg:"#eff6ff",desc:"Speech bubble style Question & Answer"},
{id:"askyourself",icon:"🤔",title:"Ask Yourself...",color:"#a78bfa",textColor:"#4c1d95",bg:"#f5f3ff",desc:"Thought bubble for self-reflection"},
{id:"attention",icon:"👀",title:"Pay Attention!",color:"#f97316",textColor:"#7c2d12",bg:"#fff7ed",desc:"Eye-catching burst shape for urgent notes"},
{id:"important",icon:"📌",title:"Important Note",color:"#94a3b8",textColor:"#1e293b",bg:"#f8fafc",desc:"Folded corner paper style for important notes"},
{id:"keyidea",icon:"💡",title:"Key Idea",color:"#facc15",textColor:"#713f12",bg:"#fefce8",desc:"Lightbulb icon with bright yellow background"},
{id:"didyouknow",icon:"🤷",title:"Did You Know?",color:"#34d399",textColor:"#065f46",bg:"#ecfdf5",desc:"Fun fact style rounded rectangle"},
{id:"example",icon:"📝",title:"Example",color:"#93c5fd",textColor:"#1e3a5f",bg:"#eff6ff",desc:"Tag shape with light blue background"},
{id:"challenge",icon:"⚡",title:"Challenge!",color:"#fb923c",textColor:"#7c2d12",bg:"#fff7ed",desc:"Motivational exclamation design"},
{id:"brainteaser",icon:"🧩",title:"Brain Teaser",color:"#f0abfc",textColor:"#581c87",bg:"#fdf4ff",desc:"Puzzle piece icon with playful colours"},
{id:"steps",icon:"📋",title:"Step by Step",color:"#6ee7b7",textColor:"#065f46",bg:"#ecfdf5",desc:"Numbered list style instructional layout"},
{id:"checklist",icon:"✅",title:"Checklist",color:"#4ade80",textColor:"#14532d",bg:"#f0fdf4",desc:"Check mark icon with pre-formatted checkable items"},
{id:"reflect",icon:"🪞",title:"Reflect...",color:"#c4b5fd",textColor:"#4c1d95",bg:"#f5f3ff",desc:"Mirror icon with soft purple background"},
{id:"thinkpair",icon:"👥",title:"Think-Pair-Share",color:"#7dd3fc",textColor:"#0c4a6e",bg:"#f0f9ff",desc:"Two people icon collaborative activity"},
{id:"success",icon:"🏆",title:"Success Criteria",color:"#fde68a",textColor:"#78350f",bg:"#fffbeb",desc:"Star trophy with green/gold theme"},
{id:"objective",icon:"🎯",title:"Learning Objective",color:"#fca5a5",textColor:"#7f1d1d",bg:"#fef2f2",desc:"Target/bullseye for learning objectives"},
{id:"vocab",icon:"🔍",title:"Vocabulary Spotlight",color:"#a5f3fc",textColor:"#0e7490",bg:"#ecfeff",desc:"Magnifying glass for word definitions"},
{id:"grammar",icon:"📐",title:"Grammar Focus",color:"#fcd34d",textColor:"#92400e",bg:"#fffbeb",desc:"Ruler/pencil with structured rule + example"},
{id:"pronunciation",icon:"🗣️",title:"Pronunciation Tip",color:"#fdba74",textColor:"#7c2d12",bg:"#fff7ed",desc:"Mouth/lips icon with phonetic cue space"},
{id:"commonmistake",icon:"⚠️",title:"Common Mistake",color:"#fca5a5",textColor:"#7f1d1d",bg:"#fef2f2",desc:"Warning circle with correction area"},
{id:"teachernote",icon:"📝",title:"Teacher Note",color:"#d1d5db",textColor:"#1f2937",bg:"#f9fafb",desc:"Traditional memo style personal note"},
{id:"exitticket",icon:"🎟️",title:"Exit Ticket",color:"#86efac",textColor:"#14532d",bg:"#f0fdf4",desc:"Ticket stub shape for end of class reflection"},
{id:"quote",icon:"💬",title:"Quote / Inspiration",color:"#c4b5fd",textColor:"#4c1d95",bg:"#f5f3ff",desc:"Large quotation mark with elegant styling"},
{id:"protip",icon:"⭐",title:"Pro Tip",color:"#fde68a",textColor:"#78350f",bg:"#fffbeb",desc:"Star badge with expert advice format"},
{id:"reminder",icon:"⏰",title:"Reminder",color:"#fed7aa",textColor:"#7c2d12",bg:"#fff7ed",desc:"Alarm clock icon with soft orange background"}
];
function renderBannerPicker(){var grid=document.getElementById("bannerPickerGrid");if(!grid)return;grid.innerHTML="";BANNER_DEFS.forEach(function(b){var card=document.createElement("div");card.className="banner-picker-card";card.style.background=b.bg;card.style.borderColor=b.color;card.innerHTML='<div class="banner-picker-head" style="color:'+b.textColor+'">'+b.icon+' '+b.title+'</div><div class="banner-picker-desc">'+b.desc+'</div>';card.onclick=function(){insertBanner(b);closeMdl("mBanners")};grid.appendChild(card);});}
var BAN_COLORS=["#fbbf24","#f97316","#ef4444","#8b5cf6","#3b82f6","#10b981","#ec4899","#f59e0b","#6366f1","#14b8a6"];
function insertBanner(bDef){var pg=gPg(curPg);if(!pg)return;var ban=document.createElement("div");ban.className="wb-banner";ban.contentEditable="false";ban.style.background=bDef.bg;ban.style.borderLeft="6px solid "+bDef.color;ban.style.borderTop="2px solid "+bDef.color;ban.draggable=true;ban.dataset.banColor=bDef.color;var palette='<div class="ban-palette">';BAN_COLORS.forEach(function(c){palette+='<span class="ban-clr-dot" style="background:'+c+'" onclick="changeBanColor(this,\\''+c+'\\')" title="'+c+'"></span>';});palette+='</div>';var defaultBody="Type your "+bDef.title.toLowerCase()+" here...";ban.innerHTML=palette+'<span class="ban-icon">'+bDef.icon+'</span><div class="ban-title" style="color:'+bDef.textColor+'">'+bDef.title+'</div><div class="ban-body" contenteditable="true" style="color:'+bDef.textColor+'">'+defaultBody+'</div><button class="ban-close" onclick="this.closest(\\'.wb-banner\\').remove();saveTxt()">&times;</button>';ban.addEventListener("dragstart",function(e){e.dataTransfer.effectAllowed="move";});pg.appendChild(ban);var space=document.createElement("p");space.innerHTML="<br>";pg.appendChild(space);saveTxt();}
window.changeBanColor=function(dot,color){var ban=dot.closest(".wb-banner");if(!ban)return;ban.style.borderLeftColor=color;ban.style.borderTopColor=color;var lighter=lighten(color,0.85);ban.style.background=lighter;};
/* MOD 6: AI WRITING ASSESSOR */
var AI_MASTER_PROMPT=${aiMasterPromptJson};
window.copyAIMasterPrompt=function(){var learnerText=document.getElementById("aiReviewInput").value.trim();var fullPrompt=AI_MASTER_PROMPT+(learnerText||"[PASTE LEARNER WRITING HERE]");window.wbCopyText(fullPrompt,"Master prompt copied!");};
window.applyAIReview=function(){var raw=document.getElementById("aiReviewJSON").value.trim();if(!raw){alert("Please paste the AI JSON response first.");return;}try{var json=JSON.parse(raw);applyDocAnnotation(json);closeMdl("mAIReview");}catch(e){alert("Invalid JSON. Make sure you copied the complete AI response.\\n\\nError: "+e.message);}};
/* ORIGINAL TEMPLATE DATA */
var TPLS=[
/* EDU & SCHOOL */
{id:"cornell",name:"Cornell Notes",cat:"edu",icon:"fa-sticky-note",html:'<div style="border:2px solid #805ad5;border-radius:8px;overflow:hidden"><table style="width:100%;border-collapse:collapse"><tr><td style="width:30%;border-right:2px solid #805ad5;border-bottom:2px solid #805ad5;padding:12px;background:#faf5ff;vertical-align:top"><b style="color:#805ad5">Cues & Questions</b><br><br></td><td style="border-bottom:2px solid #805ad5;padding:12px;vertical-align:top"><b style="color:#805ad5">Main Lecture Notes</b><br><br></td></tr><tr><td colspan="2" style="padding:12px;background:#faf5ff"><b style="color:#805ad5">Summary (30-second takeaway)</b><br><br></td></tr></table></div><p></p>'},
{id:"studyGuide",name:"Study Guide",cat:"edu",icon:"fa-graduation-cap",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 12px">📚 Exam Study Guide</h3><p><b>Subject:</b> _____ | <b>Test Date:</b> _____</p><h4>Key Concepts</h4><ol><li></li><li></li></ol><h4>Important Terms</h4><ul><li></li></ul><h4>Review Questions</h4><ol><li></li></ol></div><p></p>'},
{id:"socratic",name:"Socratic Debate",cat:"edu",icon:"fa-balance-scale",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 12px">⚖️ Socratic Debate Prep</h3><p><b>Motion/Topic:</b> _____</p><table style="width:100%"><tr><td style="width:50%;padding:12px;border:1px solid #805ad5;background:#fefcbf;vertical-align:top"><b>PRO (Affirmative)</b><ol><li></li><li></li></ol></td><td style="padding:12px;border:1px solid #805ad5;background:#ebf8ff;vertical-align:top"><b>CON (Negative)</b><ol><li></li><li></li></ol></td></tr></table><h4>Key Evidence / Quotes</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:50px"></div><h4>Rebuttals & Responses</h4><ul><li><b>If they say...</b> then I will respond...</li></ul></div><p></p>'},
{id:"feynman",name:"Feynman Technique",cat:"edu",icon:"fa-chalkboard-teacher",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 12px">💡 Feynman Learning Sheet</h3><p><b>Target Concept:</b> _____</p><div style="background:#faf5ff;border-left:4px solid #805ad5;padding:12px;margin-bottom:12px"><b>1. Explain like I\\\'m 5 (ELI5):</b><br><i>(Explain the concept simply in plain language, avoiding jargon)</i></div><div style="background:#fffbeb;border-left:4px solid #d69e2e;padding:12px;margin-bottom:12px"><b>2. Gaps & Friction Points:</b><br><i>(Identify what parts are hard to explain or where you got stuck)</i></div><div style="background:#ebf8ff;border-left:4px solid #3182ce;padding:12px"><b>3. Use an Analogy:</b><br><i>(Connect this concept to a familiar real-world object or scenario)</i></div></div><p></p>'},
{id:"lessonSummary",name:"Lesson Summary",cat:"edu",icon:"fa-bookmark",html:'<div style="border:2px solid #805ad5;border-radius:8px;padding:16px"><h3 style="color:#805ad5;margin:0 0 8px">📖 Lesson Summary & Highlights</h3><p><b>Topic:</b> _____ | <b>Date:</b> _____ | <b>Teacher/Tutor:</b> _____</p><div style="background:#faf5ff;border-left:4px solid #805ad5;padding:10px;margin:8px 0"><b>🎯 Core Learning Objectives:</b><br>1. <br>2. </div><h4>Key Takeaways & Formulae</h4><ul><li><b>Point 1:</b> </li><li><b>Point 2:</b> </li></ul><h4>Homework & Next Steps</h4><p>&#9744; </p></div><p></p>'},

/* LANGUAGE & VOCABULARY */
{id:"vocab",name:"Vocabulary List",cat:"lang",icon:"fa-book",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 12px">📖 Vocabulary Builder</h3><table style="width:100%;border-collapse:collapse"><tr style="background:#3b82f6;color:#fff"><th style="padding:8px;border:1px solid #cbd5e0">Word / Term</th><th style="padding:8px;border:1px solid #cbd5e0">Part of Speech & Meaning</th><th style="padding:8px;border:1px solid #cbd5e0">Example Sentence</th><th style="padding:8px;border:1px solid #cbd5e0">Collocations</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"grammarRule",name:"Grammar Formula",cat:"lang",icon:"fa-spell-check",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 10px">🔤 Grammar Focus & Pitfalls</h3><p><b>Grammar Structure:</b> _____</p><div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px;margin-bottom:10px"><b>Formula:</b> <code>Subject + Auxiliary + Verb-ing...</code></div><table style="width:100%;border-collapse:collapse"><tr><th style="background:#fee2e2;color:#991b1b;padding:8px;border:1px solid #cbd5e0">❌ Common Error</th><th style="background:#dcfce7;color:#166534;padding:8px;border:1px solid #cbd5e0">✅ Corrected Version</th><th style="background:#f3f4f6;padding:8px;border:1px solid #cbd5e0">Rule / Explanation</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"idiomsLog",name:"Phrasal Verbs & Idioms",cat:"lang",icon:"fa-comments",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 10px">💬 Idioms & Phrasal Verbs</h3><table style="width:100%;border-collapse:collapse"><tr style="background:#3b82f6;color:#fff"><th style="padding:8px;border:1px solid #cbd5e0">Idiom / Phrasal Verb</th><th style="padding:8px;border:1px solid #cbd5e0">Natural Meaning</th><th style="padding:8px;border:1px solid #cbd5e0">Dialogue Example</th><th style="padding:8px;border:1px solid #cbd5e0">Register (Formal/Slang)</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"pronounceLog",name:"Pronunciation & Phonetics",cat:"lang",icon:"fa-volume-up",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 10px">🗣️ Pronunciation & Minimal Pairs</h3><p><b>Target Phoneme / Sound:</b> /____/ vs /____/</p><table style="width:100%;border-collapse:collapse"><tr style="background:#3b82f6;color:#fff"><th style="padding:8px;border:1px solid #cbd5e0">Sound A (/ /)</th><th style="padding:8px;border:1px solid #cbd5e0">Sound B (/ /)</th><th style="padding:8px;border:1px solid #cbd5e0">Tongue / Mouth Position</th></tr><tr><td style="padding:8px;border:1px solid #cbd5e0">Ship</td><td style="border:1px solid #cbd5e0">Sheep</td><td style="border:1px solid #cbd5e0">Short vowel vs long tense vowel</td></tr><tr><td style="padding:8px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"langPractice",name:"Language Practice Log",cat:"lang",icon:"fa-language",html:'<div style="border:2px solid #3b82f6;border-radius:8px;padding:16px"><h3 style="color:#3b82f6;margin:0 0 12px">🌐 Daily Language Practice Log</h3><p><b>Language Focus:</b> _____ | <b>Target Level:</b> _____</p><h4>1. Vocab Focus (Word / Part of Speech / Definition)</h4><table style="width:100%"><tr style="background:#3b82f6;color:#fff"><th style="padding:6px">Word</th><th>Definition</th><th>My Sentence</th></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td><td style="border:1px solid #cbd5e0"></td></tr></table><h4>2. Grammar Spotting & Corrections</h4><ol><li><b>Incorrect:</b> <span style="text-decoration:line-through;color:#e53e3e"></span><br><b>Corrected:</b> <span style="color:#22c55e;font-weight:bold"></span></li></ol><h4>3. Free Practice / Speaking Draft</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:50px"></div></div><p></p>'},

/* WORK & CAREER */
{id:"meeting",name:"Meeting Notes",cat:"work",icon:"fa-users",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">📋 Meeting Minutes & Action Tracker</h3><p><b>Date:</b> _____ | <b>Attendees:</b> _____ | <b>Facilitator:</b> _____</p><h4>1. Agenda & Key Topics</h4><ol><li></li><li></li></ol><h4>2. Discussion Summary & Decisions</h4><div style="border:1px solid #e2e8f0;padding:10px;min-height:60px"></div><h4>3. Action Items</h4><table style="width:100%"><tr style="background:#dd6b20;color:#fff"><th style="padding:8px">Task / Deliverable</th><th>Owner</th><th>Due Date</th><th>Status</th></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0">To Do</td></tr></table></div><p></p>'},
{id:"swot",name:"SWOT Analysis",cat:"work",icon:"fa-th-large",html:'<div><h3 style="text-align:center;margin:0 0 12px;color:#2d3748">📊 SWOT Strategic Analysis</h3><table style="width:100%"><tr><td style="width:50%;padding:16px;border:3px solid #38a169;background:#f0fff4;vertical-align:top"><b style="color:#276749">STRENGTHS (Internal)</b><ul><li></li></ul></td><td style="padding:16px;border:3px solid #e53e3e;background:#fff5f5;vertical-align:top"><b style="color:#c53030">WEAKNESSES (Internal)</b><ul><li></li></ul></td></tr><tr><td style="padding:16px;border:3px solid #3182ce;background:#ebf8ff;vertical-align:top"><b style="color:#2b6cb0">OPPORTUNITIES (External)</b><ul><li></li></ul></td><td style="padding:16px;border:3px solid #d69e2e;background:#fffff0;vertical-align:top"><b style="color:#b7791f">THREATS (External)</b><ul><li></li></ul></td></tr></table></div><p></p>'},
{id:"project",name:"Project Charter",cat:"work",icon:"fa-rocket",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">🚀 Project Charter</h3><p><b>Project Name:</b> _____ | <b>Sponsor:</b> _____</p><h4>1. Project Goal & Objectives</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:40px"></div><h4>2. Scope & Boundaries</h4><table style="width:100%"><tr><td style="width:50%;background:#f0fff4;border:1px solid #cbd5e0;padding:10px"><b>In Scope (What we do)</b><ul><li></li></ul></td><td style="background:#fff5f5;border:1px solid #cbd5e0;padding:10px"><b>Out of Scope (What we don\\\'t)</b><ul><li></li></ul></td></tr></table><h4>3. Stakeholders & Roles</h4><ul><li><b>Project Lead:</b> </li><li><b>Core Team:</b> </li></ul></div><p></p>'},
{id:"marketing",name:"Marketing Campaign",cat:"work",icon:"fa-bullhorn",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">📣 Marketing Campaign Planner</h3><p><b>Campaign Name:</b> _____ | <b>Target Audience:</b> _____</p><h4>1. Core Message & Value Proposition</h4><div style="border:1px solid #cbd5e0;padding:10px;min-height:40px"></div><h4>2. Channels & Strategy</h4><table style="width:100%"><tr style="background:#dd6b20;color:#fff"><th style="padding:6px;width:30%">Channel</th><th>Content Strategy / Action</th></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"><b>Social Media</b></td><td style="border:1px solid #cbd5e0"></td></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"><b>Email Newsletter</b></td><td style="border:1px solid #cbd5e0"></td></tr><tr><td style="padding:6px;border:1px solid #cbd5e0"><b>Paid Ads</b></td><td style="border:1px solid #cbd5e0"></td></tr></table></div><p></p>'},
{id:"starInterview",name:"STAR Interview Prep",cat:"work",icon:"fa-user-tie",html:'<div style="border:2px solid #dd6b20;border-radius:8px;padding:16px"><h3 style="color:#dd6b20;margin:0 0 12px">💼 STAR Interview Method</h3><p><b>Target Role:</b> _____ | <b>Target Competency:</b> _____</p><div style="border-left:4px solid #38a169;padding-left:12px;margin-bottom:12px"><b>Situation (S)</b><br><small style="color:#718096">What was the context or challenge?</small><div style="min-height:30px"></div></div><div style="border-left:4px solid #3182ce;padding-left:12px;margin-bottom:12px"><b>Task (T)</b><br><small style="color:#718096">What was your specific responsibility or goal?</small><div style="min-height:30px"></div></div><div style="border-left:4px solid #d69e2e;padding-left:12px;margin-bottom:12px"><b>Action (A)</b><br><small style="color:#718096">What steps did you take?</small><div style="min-height:30px"></div></div><div style="border-left:4px solid #d53f8c;padding-left:12px"><b>Result (R)</b><br><small style="color:#718096">What was the quantifiable outcome?</small><div style="min-height:30px"></div></div></div><p></p>'},

/* PLANNING & TASKS */
{id:"todo",name:"Prioritized To-Do",cat:"plan",icon:"fa-tasks",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">✅ Action-Item Checklist</h3><h4 style="color:#c53030">🚨 High Priority (Must Do Today)</h4><p>&#9744; </p><p>&#9744; </p><h4 style="color:#d69e2e">⚡ Medium Priority (This Week)</h4><p>&#9744; </p><h4 style="color:#38a169">🌱 Low Priority / Someday</h4><p>&#9744; </p></div><p></p>'},
{id:"weekly",name:"Weekly Planner",cat:"plan",icon:"fa-calendar-week",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">📅 Weekly Time-Block Planner</h3><table style="width:100%"><tr style="background:#d53f8c;color:#fff"><th style="padding:10px">Day</th><th>Morning Focus</th><th>Afternoon Tasks</th><th>Evening Wrap-up</th></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Mon</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Tue</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Wed</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Thu</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Fri</b></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0"></td></tr></table></div><p></p>'},
{id:"kanban",name:"Kanban Board",cat:"plan",icon:"fa-columns",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">📋 Kanban Task Board</h3><table style="width:100%;border-collapse:separate;border-spacing:8px"><tr><th style="background:#cbd5e0;color:#4a5568;padding:8px;border-radius:4px">Backlog 📥</th><th style="background:#feebc8;color:#c05621;padding:8px;border-radius:4px">In Progress ⚙️</th><th style="background:#c6f6d5;color:#22543d;padding:8px;border-radius:4px">Done ✅</th></tr><tr><td style="border:2px dashed #cbd5e0;border-radius:6px;padding:8px;vertical-align:top;min-height:120px"><div style="background:#fff;border:1px solid #e2e8f0;padding:6px;border-radius:4px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">Task 1</div></td><td style="border:2px dashed #cbd5e0;border-radius:6px;padding:8px;vertical-align:top"><div style="background:#fff;border:1px solid #e2e8f0;padding:6px;border-radius:4px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">Task 2</div></td><td style="border:2px dashed #cbd5e0;border-radius:6px;padding:8px;vertical-align:top"><div style="background:#fff;border:1px solid #e2e8f0;padding:6px;border-radius:4px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">Task 3</div></td></tr></table></div><p></p>'},
{id:"smartGoal",name:"S.M.A.R.T Goal Planner",cat:"plan",icon:"fa-bullseye",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">🎯 S.M.A.R.T. Goal Planner</h3><table style="width:100%"><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>S - Specific</b><br><small style="color:#718096">What exactly do you want to accomplish?</small></td><td></td></tr><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>M - Measurable</b><br><small style="color:#718096">How will you measure progress?</small></td><td></td></tr><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>A - Achievable</b><br><small style="color:#718096">Is this goal realistic?</small></td><td></td></tr><tr><td style="padding:10px;border-bottom:1px solid #cbd5e0"><b>R - Relevant</b><br><small style="color:#718096">Why is this important?</small></td><td></td></tr><tr><td style="padding:10px"><b>T - Time-Bound</b><br><small style="color:#718096">What is the exact deadline?</small></td><td></td></tr></table></div><p></p>'},
{id:"eisenhower",name:"Eisenhower Matrix",cat:"plan",icon:"fa-th",html:'<div style="border:2px solid #d53f8c;border-radius:8px;padding:16px"><h3 style="color:#d53f8c;margin:0 0 12px">⚖️ Eisenhower 2x2 Priority Matrix</h3><table style="width:100%;border-collapse:separate;border-spacing:8px"><tr><td style="width:50%;padding:12px;background:#fee2e2;border:2px solid #ef4444;border-radius:6px;vertical-align:top"><b style="color:#991b1b">🔥 DO FIRST (Urgent & Important)</b><ul><li></li></ul></td><td style="padding:12px;background:#dbeafe;border:2px solid #3b82f6;border-radius:6px;vertical-align:top"><b style="color:#1e40af">📅 SCHEDULE (Not Urgent, Important)</b><ul><li></li></ul></td></tr><tr><td style="padding:12px;background:#fef3c7;border:2px solid #f59e0b;border-radius:6px;vertical-align:top"><b style="color:#92400e">👥 DELEGATE (Urgent, Not Important)</b><ul><li></li></ul></td><td style="padding:12px;background:#f3f4f6;border:2px solid #9ca3af;border-radius:6px;vertical-align:top"><b style="color:#4b5563">🗑️ ELIMINATE (Not Urgent, Not Important)</b><ul><li></li></ul></td></tr></table></div><p></p>'},

/* WRITING & ESSAYS */
{id:"essay",name:"5-Paragraph Essay",cat:"write",icon:"fa-edit",html:'<div style="border-left:4px solid #8b5cf6;padding:16px;background:#faf5ff"><h3 style="color:#8b5cf6;margin:0 0 12px">✍️ 5-Paragraph Essay Outline</h3><h4>I. Introduction</h4><ul><li><b>Hook:</b> </li><li><b>Background Context:</b> </li><li><b>Thesis Statement:</b> </li></ul><h4>II. Body Paragraph 1 (Strongest Argument)</h4><ul><li><b>Topic Sentence:</b> </li><li><b>Evidence & Citation:</b> </li><li><b>Explanation / Analysis:</b> </li></ul><h4>III. Body Paragraph 2 (Second Argument)</h4><ul><li><b>Topic Sentence:</b> </li><li><b>Evidence & Explanation:</b> </li></ul><h4>IV. Body Paragraph 3 (Counterargument & Refutation)</h4><ul><li><b>Counterargument:</b> </li><li><b>Refutation:</b> </li></ul><h4>V. Conclusion</h4><ul><li><b>Restated Thesis:</b> </li><li><b>Synthesis & Final Impact:</b> </li></ul></div><p></p>'},
{id:"storyArc",name:"Story Arc Planner",cat:"write",icon:"fa-feather-alt",html:'<div style="border:2px solid #8b5cf6;border-radius:8px;padding:16px"><h3 style="color:#8b5cf6;margin:0 0 12px">📖 Creative Narrative Story Arc</h3><p><b>Story Title:</b> _____ | <b>Protagonist:</b> _____ | <b>Genre:</b> _____</p><ol><li><b>Exposition (Status Quo & Setting):</b> </li><li><b>Inciting Incident:</b> </li><li><b>Rising Action (Obstacles & Tension):</b> </li><li><b>Climax (Pivotal turning point):</b> </li><li><b>Falling Action:</b> </li><li><b>Resolution / Epilogue:</b> </li></ol></div><p></p>'},
{id:"emailDraft",name:"Formal Email / Letter",cat:"write",icon:"fa-envelope-open-text",html:'<div style="border:2px solid #8b5cf6;border-radius:8px;padding:16px"><h3 style="color:#8b5cf6;margin:0 0 12px">✉️ Professional Email Draft</h3><p><b>To:</b> _____ | <b>Subject:</b> _____</p><div style="border:1px solid #e2e8f0;padding:12px;border-radius:6px;background:#fff"><b>Dear [Name / Title],</b><br><br><b>Opening / Context:</b> I am writing to...<br><br><b>Key Details / Request:</b><br><br><b>Call to Action:</b> Please let me know your availability for...<br><br><b>Sign-off:</b><br>Sincerely,<br><b>[Your Name]</b></div></div><p></p>'},

/* LIFE & REFLECTION */
{id:"journal",name:"Daily Journal",cat:"life",icon:"fa-book-reader",html:'<div style="border:2px solid #10b981;border-radius:8px;padding:16px"><h3 style="color:#10b981;margin:0 0 12px">📔 Daily Reflection Journal</h3><p><b>Date:</b> _____ | <b>Mood / Energy (1-10):</b> _____</p><h4>🌟 3 Things I Am Grateful For</h4><ol><li></li><li></li><li></li></ol><h4>💡 Today\\\'s Highlights & Breakthroughs</h4><div style="border:1px solid #e2e8f0;padding:10px;min-height:50px"></div><h4>🌱 Lessons Learned & Tomorrow\\\'s Focus</h4><div style="border:1px solid #e2e8f0;padding:10px;min-height:50px"></div></div><p></p>'},
{id:"habit",name:"Habit Tracker",cat:"life",icon:"fa-check-double",html:'<div style="border:2px solid #10b981;border-radius:8px;padding:16px"><h3 style="color:#10b981;margin:0 0 12px">📊 Weekly Habit Tracker</h3><table style="width:100%;font-size:12px"><tr style="background:#10b981;color:#fff"><th style="padding:8px">Target Habit</th><th>M</th><th>T</th><th>W</th><th>T</th><th>F</th><th>S</th><th>S</th><th>Goal</th></tr><tr><td style="padding:8px;border:1px solid #e2e8f0"></td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">&#9744;</td><td style="border:1px solid #e2e8f0;text-align:center">7/7</td></tr></table></div><p></p>'},
{id:"exitTicket",name:"Exit Ticket / 3-2-1",cat:"life",icon:"fa-clipboard-check",html:'<div style="border:2px solid #10b981;border-radius:8px;padding:16px"><h3 style="color:#10b981;margin:0 0 10px">🎫 3-2-1 Exit Ticket</h3><div style="background:#ecfdf5;border-left:4px solid #10b981;padding:10px;margin-bottom:8px"><b>3 Things I Learned Today:</b><ol><li></li><li></li><li></li></ol></div><div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px;margin-bottom:8px"><b>2 Questions I Still Have:</b><ol><li></li><li></li></ol></div><div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:10px"><b>1 Idea I Will Apply Immediately:</b><p></p></div></div><p></p>'}
];
function renderTpl(filter){var grid=document.getElementById("tplGrid");grid.innerHTML="";TPLS.filter(function(t){return filter==="all"||t.cat===filter}).forEach(function(t){var d=document.createElement("div");d.className="tpl-card";d.innerHTML='<i class="fas '+t.icon+'"></i><span>'+t.name+'</span>';d.onclick=function(){var pg=gPg(curPg);if(pg){pg.focus();document.execCommand("insertHTML",false,t.html);saveTxt()}closeMdl("mTpl")};grid.appendChild(d)})}
window.filterTpl=function(cat,btn){document.querySelectorAll(".tpl-cat").forEach(function(b){b.classList.remove("active")});btn.classList.add("active");renderTpl(cat)};
function getFileName(){return document.getElementById("saveName").value||LN+"_Document"}
window.savePDF=function(){
  closeMdl("mSave");
  var fn = getFileName();
  document.querySelectorAll(".wb-cv").forEach(function(cv){if(typeof syncCv==="function")syncCv(cv);});
  var printWin = window.open("","_blank");
  if(!printWin){
    alert("Popup blocked! Please allow popups for this site to open the PDF print view in a new tab.");
    return;
  }
  var pagesHtml = "";
  var wraps = document.querySelectorAll(".pg-wrap");
  wraps.forEach(function(wrap, idx){
    var isLandscape = wrap.classList.contains("landscape") || (typeof orient !== "undefined" && orient === "landscape");
    var hdrEl = wrap.querySelector(".wb-hdr");
    var hdrContent = hdrEl ? hdrEl.innerHTML : "";
    var pgEl = wrap.querySelector(".wb-pg");
    var pgContent = pgEl ? pgEl.innerHTML : "";
    var ftrEl = wrap.querySelector(".wb-ftr");
    var ftrContent = ftrEl ? ftrEl.innerHTML : "";
    var wmEl = wrap.querySelector(".wb-wm");
    var wmContent = wmEl ? wmEl.innerHTML : "";
    var cvEl = wrap.querySelector(".wb-cv");
    var cvDataUrl = (cvEl && cvEl.toDataURL) ? cvEl.toDataURL() : "";
    var cvImgTag = (cvDataUrl && cvDataUrl !== "data:,") 
      ? '<img src="' + cvDataUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;" />' 
      : '';
    var bStyle = (typeof borderCfg !== "undefined" && borderCfg.style) ? borderCfg.style : "none";
    var bColor = (typeof borderCfg !== "undefined" && borderCfg.color) ? borderCfg.color : "#3182ce";
    var mTop = (typeof margins !== "undefined" && margins.t) ? margins.t : 20;
    var mRight = (typeof margins !== "undefined" && margins.r) ? margins.r : 20;
    var mBottom = (typeof margins !== "undefined" && margins.b) ? margins.b : 20;
    var mLeft = (typeof margins !== "undefined" && margins.l) ? margins.l : 20;

    pagesHtml += '<div class="print-page-wrapper ' + (isLandscape ? 'landscape' : 'portrait') + ' ' + (bStyle !== 'none' ? 'border-' + bStyle : '') + '" style="--border-clr: ' + bColor + '">' +
      (hdrContent ? '<div class="wb-hdr-print">' + hdrContent + '</div>' : '') +
      '<div class="wb-pg-container-print">' +
        '<div class="wb-pg-print" style="padding: ' + mTop + 'mm ' + mRight + 'mm ' + mBottom + 'mm ' + mLeft + 'mm;">' +
          pgContent +
        '</div>' +
        cvImgTag +
        (wmContent ? '<div class="wb-wm-print">' + wmContent + '</div>' : '') +
      '</div>' +
      (ftrContent ? '<div class="wb-ftr-print">' + ftrContent + '</div>' : '') +
    '</div>';
  });

  var docOrient = (typeof orient !== "undefined") ? orient : "portrait";
  var printDocHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + fn + '</title>' +
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,400&family=JetBrains+Mono&display=swap">' +
    '<style>' +
      '* { box-sizing: border-box; }' +
      '@page { size: ' + (docOrient === 'landscape' ? '297mm 210mm' : '210mm 297mm') + '; margin: 0; }' +
      'html, body { margin: 0; padding: 0; background: #4a5568; font-family: "Times New Roman", Times, serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '.no-print-bar { position: sticky; top: 0; z-index: 99999; background: #1a202c; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
      '.no-print-bar button { background: #3182ce; color: #fff; border: none; padding: 8px 18px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: background 0.2s; }' +
      '.no-print-bar button:hover { background: #2b6cb0; }' +
      '.print-container { display: flex; flex-direction: column; align-items: center; padding: 24px 0; gap: 24px; }' +
      '.print-page-wrapper { position: relative; background: #ffffff; box-shadow: 0 8px 24px rgba(0,0,0,0.25); box-sizing: border-box; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; overflow: hidden; display: flex; flex-direction: column; }' +
      '.print-page-wrapper.portrait { width: 210mm; min-height: 297mm; height: 297mm; }' +
      '.print-page-wrapper.landscape { width: 297mm; min-height: 210mm; height: 210mm; }' +
      '.print-page-wrapper.border-single { border: 2px solid var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-double { border: 6px double var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-dashed { border: 2px dashed var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-dotted { border: 3px dotted var(--border-clr, #3182ce); }' +
      '.print-page-wrapper.border-fancy { border: 8px ridge var(--border-clr, #3182ce); }' +
      '.wb-hdr-print { padding: 8mm 12mm 4mm 12mm; font-size: 10pt; color: #718096; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; }' +
      '.wb-ftr-print { padding: 4mm 12mm 8mm 12mm; font-size: 10pt; color: #718096; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; margin-top: auto; }' +
      '.wb-pg-container-print { position: relative; flex: 1; display: flex; flex-direction: column; overflow: hidden; }' +
      '.wb-pg-print { width: 100%; height: 100%; box-sizing: border-box; outline: none; word-wrap: break-word; font-size: 12pt; line-height: 1.6; color: #1a202c; }' +
      '.wb-wm-print { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48pt; font-weight: 800; color: rgba(0,0,0,0.06); pointer-events: none; white-space: nowrap; text-transform: uppercase; z-index: 2; }' +
      '.wb-pg-print table { border-collapse: collapse; width: 100%; margin: 8px 0; }' +
      '.wb-pg-print td, .wb-pg-print th { border: 1px solid #cbd5e0; padding: 6px 10px; }' +
      '.wb-pg-print img { max-width: 100%; height: auto; }' +
      '.wb-pg-print .wb-banner { margin: 12px 0; padding: 12px 16px; border-radius: 6px; position: relative; }' +
      '.wb-pg-print .wb-banner .ban-close, .wb-pg-print .wb-banner .ban-palette { display: none !important; }' +
      '@media print {' +
        '.no-print-bar { display: none !important; }' +
        'html, body { background: #fff !important; }' +
        '.print-container { padding: 0 !important; gap: 0 !important; }' +
        '.print-page-wrapper { box-shadow: none !important; margin: 0 !important; border: none !important; page-break-after: always !important; break-after: page !important; page-break-inside: avoid !important; break-inside: avoid !important; }' +
      '}' +
    '</style>' +
    '</head><body>' +
    '<div class="no-print-bar">' +
      '<div><strong style="font-size:16px;">' + fn + '</strong><span style="margin-left:12px; font-size:13px; opacity:0.8;">Print View (' + wraps.length + ' page' + (wraps.length > 1 ? 's' : '') + ')</span></div>' +
      '<button onclick="window.print();"><i class="fas fa-print"></i> Save / Print PDF</button>' +
    '</div>' +
    '<div class="print-container">' + pagesHtml + '</div>' +
    '<' + 'script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 400); });</' + 'script>' +
    '</body></html>';

  printWin.document.open();
  printWin.document.write(printDocHtml);
  printWin.document.close();
  var stSave = document.getElementById("stSave");
  if(stSave) stSave.textContent = "PDF View Opened";
};
window.saveDoc=function(){var fn=getFileName(),body="";document.querySelectorAll(".pg-wrap").forEach(function(wrap,i){var n=i+1,pg=wrap.querySelector(".wb-pg");body+='<div style="padding:'+margins.t+'mm '+margins.r+'mm '+margins.b+'mm '+margins.l+'mm;min-height:'+(orient==="portrait"?"257mm":"170mm")+';page-break-after:always">';if(pg)body+=pg.innerHTML;body+='</div>'});var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+fn+'</title><style>@page{size:'+(orient==="portrait"?"210mm 297mm":"297mm 210mm")+';margin:0}body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;margin:0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #4a5568;padding:8px}img{max-width:100%}</style></head><body>'+body+'</body></html>';var blob=new Blob(["\\ufeff"+html],{type:"application/msword"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn+".doc";a.click();closeMdl("mSave")};
window.saveHTML=function(){var fn=getFileName(),body="";document.querySelectorAll(".pg-wrap").forEach(function(wrap,i){var pg=wrap.querySelector(".wb-pg");body+='<article style="background:#fff;margin-bottom:20px;padding:'+margins.t+'mm '+margins.r+'mm '+margins.b+'mm '+margins.l+'mm;min-height:'+(orient==="portrait"?"257mm":"170mm")+'">';if(pg)body+=pg.innerHTML;body+='</article>'});var html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+fn+'</title><style>body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;background:#e2e8f0;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #4a5568;padding:8px}img{max-width:100%}</style></head><body>'+body+'</body></html>';var blob=new Blob([html],{type:"text/html"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn+".html";a.click();closeMdl("mSave")};
window.saveTXT=function(){var fn=getFileName(),txt="";document.querySelectorAll(".wb-pg").forEach(function(p,i){txt+="=== PAGE "+(i+1)+" ===\\n\\n"+p.innerText+"\\n\\n"});var blob=new Blob([txt],{type:"text/plain"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fn+".txt";a.click();closeMdl("mSave")};
var SAVE_KEY="wb_"+LN.replace(/\\s/g,"_");
function autoSave(){var data={pages:[],canvas:[],orient:orient,margins:margins,hdrCfg:hdrCfg,ftrCfg:ftrCfg,wmCfg:wmCfg,borderCfg:borderCfg,theme:theme};document.querySelectorAll(".wb-pg").forEach(function(p){data.pages.push(p.innerHTML)});document.querySelectorAll(".wb-cv").forEach(function(cv){syncCv(cv);data.canvas.push(cv.toDataURL())});try{localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch(e){}document.getElementById("stSave").textContent="Saved"}
function tryRestore(){var raw;try{raw=localStorage.getItem(SAVE_KEY)}catch(e){return}if(!raw)return;try{var data=JSON.parse(raw);if(data.pages&&data.pages.length&&data.pages[0].length>0){if(data.orient)orient=data.orient;if(data.margins)margins=data.margins;if(data.hdrCfg)hdrCfg=data.hdrCfg;if(data.ftrCfg)ftrCfg=data.ftrCfg;if(data.wmCfg)wmCfg=data.wmCfg;if(data.borderCfg)borderCfg=data.borderCfg;if(data.theme){theme=data.theme;setTheme(theme);document.getElementById("themeSelect").value=theme}var zi=document.getElementById("zoomInner")||zoomC;zi.innerHTML="";data.pages.forEach(function(html,i){var n=i+1;var els=createPg(n);els.pg.innerHTML=html;zi.appendChild(els.wrap);initCv(els.cv);setupPgEv(els.pg);if(data.canvas&&data.canvas[i]&&data.canvas[i]!=="data:,"){(function(canvas,src){setTimeout(function(){syncCv(canvas);var img=new Image();img.onload=function(){canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height)};img.src=src},100)})(els.cv,data.canvas[i])}});totPg=data.pages.length;for(var i=1;i<=totPg;i++)applyPgSetup(i);updTh();updStats();applyZm()}}catch(e){}}
function setupPgEv(pg){
pg.addEventListener("mousedown",function(e){if(e.target.tagName==="IMG"&&!drawOn){resizingImg=e.target;resizingImg.classList.add("resizing");var rect=resizingImg.getBoundingClientRect();resizeStart={x:e.clientX,y:e.clientY,w:rect.width,h:rect.height};e.preventDefault()}});
pg.addEventListener("dblclick",function(e){if(!drawOn){var sel=window.getSelection();if(sel){sel.modify("move","backward","word");sel.modify("extend","forward","word")}}});
pg.addEventListener("keydown",function(e){if(e.key==="Delete"||e.key==="Backspace"){if(trackOn){e.preventDefault();var sel=window.getSelection();if(!sel)return;if(sel.isCollapsed){if(e.key==="Backspace")sel.modify("extend","backward","character");else sel.modify("extend","forward","character")}if(!sel.isCollapsed&&sel.rangeCount){var rng=sel.getRangeAt(0);var sp=document.createElement("span");sp.className="tc-del";sp.appendChild(rng.extractContents());rng.insertNode(sp);rng.setStartAfter(sp);rng.collapse(true);sel.removeAllRanges();sel.addRange(rng);saveTxt()}}else{setTimeout(saveTxt,10)}}});
pg.addEventListener("keypress",function(e){if(trackOn&&e.key!=="Enter"){e.preventDefault();var sel=window.getSelection();if(!sel||!sel.rangeCount)return;var rng=sel.getRangeAt(0);if(!sel.isCollapsed){var del=document.createElement("span");del.className="tc-del";del.appendChild(rng.extractContents());rng.insertNode(del);rng.setStartAfter(del);rng.collapse(true)}var ins=document.createElement("span");ins.className="tc-ins";ins.textContent=e.key;rng.insertNode(ins);rng.setStartAfter(ins);rng.collapse(true);sel.removeAllRanges();sel.addRange(rng);saveTxt()}});
pg.addEventListener("input",function(){updStats();var pNum=parseInt(pg.dataset.pg)||curPg;if(isPageOverflowing(pg)){repaginatePage(pNum)}clearTimeout(window._svt);window._svt=setTimeout(autoSave,2000)});
pg.addEventListener("paste",function(e){var items=e.clipboardData&&e.clipboardData.items;if(items){for(var i=0;i<items.length;i++){if(items[i].type.indexOf("image")!==-1){e.preventDefault();var blob=items[i].getAsFile();var reader=new FileReader();reader.onload=function(ev){window.insertImageFromDataUrl(ev.target.result,pg,"",function(){saveTxt()})};reader.readAsDataURL(blob);return}}}e.preventDefault();var html=e.clipboardData?e.clipboardData.getData("text/html"):"";var text=e.clipboardData?e.clipboardData.getData("text/plain"):"";var pNum=parseInt(pg.dataset.pg)||curPg;handlePastedContent(text,html,pNum);});
}
document.addEventListener("mousemove",function(e){if(resizingImg){var dx=e.clientX-resizeStart.x;var newW=Math.max(50,resizeStart.w+dx);resizingImg.style.width=newW+"px";resizingImg.style.height="auto"}});
document.addEventListener("mouseup",function(){if(resizingImg){resizingImg.classList.remove("resizing");resizingImg=null;saveTxt()}});
function initApp(){var pg=gPg(1);if(pg){pg.innerHTML="<p><br></p>";pg.style.padding=margins.t+"mm "+margins.r+"mm "+margins.b+"mm "+margins.l+"mm";setupPgEv(pg);pg.focus()}var cv=gCv(1);if(cv)initCv(cv);applyPgSetup(1);applyZm();updTh();updStats();saveTxt();}
area.addEventListener("scroll",function(){var closest=1,minD=Infinity;document.querySelectorAll(".pg-wrap").forEach(function(w){var d=Math.abs(w.getBoundingClientRect().top-area.getBoundingClientRect().top);if(d<minD){minD=d;closest=parseInt(w.dataset.pg)}});if(closest!==curPg){curPg=closest;updTh();updStats();document.getElementById("pgJump").value=String(curPg)}});
document.addEventListener("keydown",function(e){if(!ov||ov.style.display==="none")return;var ctrl=e.ctrlKey||e.metaKey;var key=e.key.toLowerCase();
if(ctrl){if(key==="b"){e.preventDefault();fmt("bold")}else if(key==="i"){e.preventDefault();fmt("italic")}else if(key==="u"){e.preventDefault();fmt("underline")}else if(key==="z"){e.preventDefault();drawOn?undoDraw():wbUndo()}else if(key==="y"){e.preventDefault();drawOn?redoDraw():wbRedo()}else if(key==="s"){e.preventDefault();autoSave()}else if(key==="k"){e.preventDefault();openMdl("mLink")}else if(key==="t"){e.preventDefault();openMdl("mTpl")}else if(key==="d"){e.preventDefault();togDraw()}else if(key==="="||key==="+"){e.preventDefault();zmIn()}else if(key==="-"){e.preventDefault();zmOut()}else if(key==="f"){e.preventDefault();openMdl("mFind")}else if(key==="l"){if(e.shiftKey){e.preventDefault();fmt("insertUnorderedList")}else{e.preventDefault();fmt("justifyLeft")}}else if(key==="n"&&e.shiftKey){e.preventDefault();fmt("insertOrderedList")}else if(key==="e"){e.preventDefault();fmt("justifyCenter")}else if(key==="r"){e.preventDefault();fmt("justifyRight")}else if(key==="j"){e.preventDefault();fmt("justifyFull")}else if(key==="x"&&e.shiftKey){e.preventDefault();fmt("strikeThrough")}else if(key==="["){e.preventDefault();chgSize(-2)}else if(key==="]"){e.preventDefault();chgSize(2)}}
if(e.key==="Escape"){closeMdl("mTpl");closeMdl("mSave");closeMdl("mSetup");closeMdl("mImg");closeMdl("mLink");closeMdl("mTbl");closeMdl("mFind");closeMdl("mBanners");closeMdl("mAIReview");closeMdl("mCustomPrompt");document.getElementById("markErrMenu").classList.remove("show");if(drawOn)togDraw();}
if(e.key==="F11"){e.preventDefault();togFs()}
if(e.key==="Enter"&&e.target.id==="pgJump"){e.preventDefault();goToPageInput()}
if(drawOn&&!ctrl){if(key==="p")setTool("pen");else if(key==="e")setTool("eraser");else if(key==="b")setTool("brush");else if(key==="l")setTool("line");else if(key==="r")setTool("rect");else if(key==="c")setTool("circle")}});
document.addEventListener("selectionchange",updTb);setInterval(autoSave,30000);window.addEventListener("resize",function(){document.querySelectorAll(".wb-cv").forEach(syncCv)});
(function(){
  var wa=document.getElementById("wbArea");
  if(!wa)return;
  wa.addEventListener("mousedown",function(e){
    if(!isHandActive)return;
    e.preventDefault();
    e.stopPropagation();
    isPanning=true;
    wa.classList.add("dragging");
    panStartX=e.clientX;
    panStartY=e.clientY;
    scrollStartX=wa.scrollLeft;
    scrollStartY=wa.scrollTop;
  },true);
  window.addEventListener("mousemove",function(e){
    if(!isHandActive||!isPanning)return;
    e.preventDefault();
    e.stopPropagation();
    var dx=e.clientX-panStartX;
    var dy=e.clientY-panStartY;
    wa.scrollLeft=scrollStartX-dx;
    wa.scrollTop=scrollStartY-dy;
  },true);
  window.addEventListener("mouseup",function(){
    if(isPanning){
      isPanning=false;
      var waEl=document.getElementById("wbArea");
      if(waEl)waEl.classList.remove("dragging");
    }
  },true);
  wa.addEventListener("touchstart",function(e){
    if(!isHandActive||e.touches.length!==1)return;
    isPanning=true;
    wa.classList.add("dragging");
    panStartX=e.touches[0].clientX;
    panStartY=e.touches[0].clientY;
    scrollStartX=wa.scrollLeft;
    scrollStartY=wa.scrollTop;
  },{passive:true});
  window.addEventListener("touchmove",function(e){
    if(!isHandActive||!isPanning||e.touches.length!==1)return;
    var dx=e.touches[0].clientX-panStartX;
    var dy=e.touches[0].clientY-panStartY;
    wa.scrollLeft=scrollStartX-dx;
    wa.scrollTop=scrollStartY-dy;
  },{passive:true});
  window.addEventListener("touchend",function(){
    if(isPanning){
      isPanning=false;
      var waEl=document.getElementById("wbArea");
      if(waEl)waEl.classList.remove("dragging");
    }
  });
})();

var wbBtn=document.getElementById("whiteboard-btn");
var _wbInitialized=false;
window.openWhiteboard=function(){if(ov.style.display==="none"){ov.style.display="flex";ov.classList.add("theme-"+theme);document.body.style.overflow="hidden";if(!_wbInitialized){initApp();tryRestore();_wbInitialized=true;}}};
if(wbBtn&&ov){wbBtn.addEventListener("click",function(){if(ov.style.display==="none")window.openWhiteboard();else closeWb()})}
window.closeWb=function(){autoSave();ov.style.display="none";document.body.style.overflow=""};
window.superscript=function(){document.execCommand("superscript",false,null);saveTxt()};
window.subscript=function(){document.execCommand("subscript",false,null);saveTxt()};
window.clearFormatting=function(){document.execCommand("removeFormat",false,null);saveTxt()};
window.insertTextBox=function(){document.execCommand("insertHTML",false,'<div class="text-box" contenteditable="true" style="min-height:60px"></div>');saveTxt()};
window.findText=function(){var txt=document.getElementById("findText").value;var pg=gPg(curPg);if(!txt||!pg)return;var content=pg.innerHTML;var regex=new RegExp(txt,"gi");var matches=content.match(regex);if(matches&&matches.length>0){alert("Found "+matches.length+" occurrence(s) of '"+txt+"'")}else{alert("Text not found")}};
window.replaceText=function(){var find=document.getElementById("findText").value;var replace=document.getElementById("replaceText").value;var pg=gPg(curPg);if(!find||!pg)return;var sel=window.getSelection();if(!sel||!sel.rangeCount){alert("Please select text to replace");return}var range=sel.getRangeAt(0);var selectedText=range.toString();if(selectedText.toLowerCase()===find.toLowerCase()){range.deleteContents();var textNode=document.createTextNode(replace);range.insertNode(textNode);saveTxt();closeMdl("mFind")}else{alert("Selected text does not match search term")}};
window.replaceAllText=function(){var find=document.getElementById("findText").value;var replace=document.getElementById("replaceText").value;var pg=gPg(curPg);if(!find||!pg)return;var content=pg.innerHTML;var regex=new RegExp(find,"gi");var newContent=content.replace(regex,replace);pg.innerHTML=newContent;saveTxt();closeMdl("mFind")};
})();`;

    return { html, css, js };
};
