export const getSmpActivitiesJs = (): string => {
    return `
    // ==================== 45+ COMPREHENSIVE ACTIVITY DEFINITIONS ==================== //
    const activityDefinitions = [
        // --- Category 1: Vocabulary, Flashcards & Lexis (8 Activities) ---
        {
            id: 'flashcard',
            name: 'Interactive 3D Flashcard',
            category: 'vocab',
            icon: 'fa-clone',
            color: '#f59e0b',
            level: 'A1-C2',
            description: '3D flipping card with phonetic IPA, native audio pronunciation, usage examples, and concept checking questions (CCQs).',
            defaultCount: 5
        },
        {
            id: 'flexcard',
            name: 'Flexcard Multi-Dimensional Lexis',
            category: 'vocab',
            icon: 'fa-layer-group',
            color: '#3b82f6',
            level: 'B1-C2',
            description: 'In-depth vocabulary explorer showing collocations, synonyms, antonyms, register, and morphological word families.',
            defaultCount: 5
        },
        {
            id: 'picture_vocab',
            name: 'Visual Illustrated Picture Dictionary',
            category: 'vocab',
            icon: 'fa-image',
            color: '#10b981',
            level: 'A1-B2',
            description: 'Match target vocabulary terms with vivid visual illustrations, contextual photo clues, and audio cues.',
            defaultCount: 5
        },
        {
            id: 'collocation_wheel',
            name: 'Collocation & Preposition Connector',
            category: 'vocab',
            icon: 'fa-circle-notch',
            color: '#8b5cf6',
            level: 'B1-C2',
            description: 'Connect natural verb-noun combinations and tricky preposition pairings (e.g., pay attention to, make an effort).',
            defaultCount: 5
        },
        {
            id: 'idiom_spotlight',
            name: 'Idiom & Slang Spotlight',
            category: 'vocab',
            icon: 'fa-lightbulb',
            color: '#ec4899',
            level: 'B2-C2',
            description: 'Unpack cultural idioms, figurative metaphors, historical origins, and natural conversational dialogue context.',
            defaultCount: 3
        },
        {
            id: 'etymology_roots',
            name: 'Root Words & Morphology Lab',
            category: 'vocab',
            icon: 'fa-dna',
            color: '#06b6d4',
            level: 'B2-C2',
            description: 'Deconstruct Latin/Greek roots, prefixes (un-, dis-, re-), and suffixes (-tion, -ize, -able) to unlock hundreds of words.',
            defaultCount: 4
        },
        {
            id: 'synonym_ladder',
            name: 'Synonym Intensity Ladder',
            category: 'vocab',
            icon: 'fa-sort-amount-up-alt',
            color: '#f97316',
            level: 'B1-C2',
            description: 'Arrange vocabulary along an intensity spectrum from mild to extreme (e.g., warm → hot → scorching → boiling).',
            defaultCount: 4
        },
        {
            id: 'phrasal_verbs',
            name: 'Phrasal Verb Particle Master',
            category: 'vocab',
            icon: 'fa-puzzle-piece',
            color: '#6366f1',
            level: 'B1-C1',
            description: 'Master multi-word verbs by snapping root verbs with correct particles (e.g., look up, look after, look down upon).',
            defaultCount: 5
        },

        // --- Category 2: Grammar, Syntax & Structure (8 Activities) ---
        {
            id: 'fill_blanks',
            name: 'Cloze Fill in the Blanks',
            category: 'grammar',
            icon: 'fa-pencil-alt',
            color: '#10b981',
            level: 'A1-C1',
            description: 'Interactive sentence cloze with instant typing feedback, grammar hints, and context explanations.',
            defaultCount: 5
        },
        {
            id: 'unscramble',
            name: 'Sentence Builder / Unscrambler',
            category: 'grammar',
            icon: 'fa-random',
            color: '#6366f1',
            level: 'A1-B2',
            description: 'Reconstruct scrambled word tokens into grammatically pristine sentences with interactive clickable word tiles.',
            defaultCount: 5
        },
        {
            id: 'tense_transformer',
            name: 'Tense & Aspect Transformer',
            category: 'grammar',
            icon: 'fa-history',
            color: '#f97316',
            level: 'A2-B2',
            description: 'Conjugate and transform sentences between Simple Past, Present Perfect, Past Continuous, and Conditionals.',
            defaultCount: 4
        },
        {
            id: 'error_detective',
            name: 'Error Correction Detective',
            category: 'grammar',
            icon: 'fa-search-plus',
            color: '#ef4444',
            level: 'B1-C2',
            description: 'Spot subtle grammar, subject-verb agreement, punctuation, and false friend errors in authentic sentences.',
            defaultCount: 4
        },
        {
            id: 'madlibs',
            name: 'Grammar MadLibs Story',
            category: 'grammar',
            icon: 'fa-feather-alt',
            color: '#14b8a6',
            level: 'A2-B2',
            description: 'Supply target parts of speech (nouns, modal verbs, adjectives, adverbs) to produce entertaining stories.',
            defaultCount: 3
        },
        {
            id: 'clause_combiner',
            name: 'Clause & Conjunction Combiner',
            category: 'grammar',
            icon: 'fa-link',
            color: '#3b82f6',
            level: 'B1-C2',
            description: 'Connect short choppy sentences into complex sentences using relative pronouns and transition connectives.',
            defaultCount: 4
        },
        {
            id: 'passive_active',
            name: 'Active to Passive Voice Morph',
            category: 'grammar',
            icon: 'fa-exchange-alt',
            color: '#8b5cf6',
            level: 'B1-C1',
            description: 'Transform active voice expressions into formal academic passive voice structures and vice-versa.',
            defaultCount: 4
        },
        {
            id: 'conditionallab',
            name: 'Conditionals & Hypotheticals Studio',
            category: 'grammar',
            icon: 'fa-code-branch',
            color: '#ec4899',
            level: 'B1-C2',
            description: 'Construct Zero, 1st, 2nd, 3rd, and Mixed Conditionals to express causes, unreal situations, and past regrets.',
            defaultCount: 4
        },

        // --- Category 3: Speaking, Pronunciation & Phonology (8 Activities) ---
        {
            id: 'speaking',
            name: 'Pronunciation & Shadowing Coach',
            category: 'speaking',
            icon: 'fa-microphone',
            color: '#ef4444',
            level: 'A1-C2',
            description: 'Shadow native speaker audio with real-time speech recognition, waveform visualizer, and acoustic accuracy score.',
            defaultCount: 5
        },
        {
            id: 'minimal_pairs',
            name: 'Minimal Pairs Ear Trainer',
            category: 'speaking',
            icon: 'fa-headphones',
            color: '#06b6d4',
            level: 'A2-B2',
            description: 'Discriminate between near-identical phonemes (/p/ vs /b/, /i:/ vs /ɪ/, /θ/ vs /s/) with audio listening trials.',
            defaultCount: 5
        },
        {
            id: 'dialogue_roleplay',
            name: 'Conversational Dialogue Roleplay',
            category: 'speaking',
            icon: 'fa-comments',
            color: '#8b5cf6',
            level: 'A1-C1',
            description: 'Turn-taking interactive dialogue simulator with automated multi-character voices and speaking prompts.',
            defaultCount: 3
        },
        {
            id: 'intonation_curve',
            name: 'Intonation & Pitch Contour Practice',
            category: 'speaking',
            icon: 'fa-wave-square',
            color: '#f59e0b',
            level: 'B1-C2',
            description: 'Master rising, falling, and circumflex pitch contours for polite requests, tag questions, and enthusiasm.',
            defaultCount: 4
        },
        {
            id: 'connected_speech',
            name: 'Connected Speech & Linking Drills',
            category: 'speaking',
            icon: 'fa-stream',
            color: '#10b981',
            level: 'B1-C2',
            description: 'Identify elision, consonant-to-vowel linking, intrusion (/j/, /w/, /r/), and weak forms in rapid speech.',
            defaultCount: 4
        },
        {
            id: 'tongue_twisters',
            name: 'Speed Tongue Twister Challenge',
            category: 'speaking',
            icon: 'fa-bolt',
            color: '#eab308',
            level: 'A2-C2',
            description: 'High-speed articulation drills targeting tricky consonant clusters and muscle memory for native-like fluency.',
            defaultCount: 3
        },
        {
            id: 'stress_accent',
            name: 'Syllable & Sentence Stress Spotter',
            category: 'speaking',
            icon: 'fa-compress-arrows-alt',
            color: '#d97706',
            level: 'B1-C1',
            description: 'Tap the primary stressed syllable in multi-syllabic words and identify focal tonic stress in sentences.',
            defaultCount: 5
        },
        {
            id: 'speed_shadowing',
            name: 'Speed Escalator Shadowing',
            category: 'speaking',
            icon: 'fa-tachometer-alt',
            color: '#f43f5e',
            level: 'B1-C2',
            description: 'Shadow sentences progressing through 0.75x slow clarity, 1.0x normal flow, and 1.25x natural fast speed.',
            defaultCount: 3
        },

        // --- Category 4: Games, Word Puzzles & Arcade (8 Activities) ---
        {
            id: 'wordmaster',
            name: 'WordMaster (Wordle Game)',
            category: 'games',
            icon: 'fa-puzzle-piece',
            color: '#10b981',
            level: 'A2-C1',
            description: 'Guess the mystery target word in 6 attempts with color-coded phonetic feedback tiles (Green, Yellow, Gray).',
            defaultCount: 3
        },
        {
            id: 'snowman',
            name: 'Snowman / Hangman Word Guesser',
            category: 'games',
            icon: 'fa-snowman',
            color: '#0284c7',
            level: 'A1-B2',
            description: 'Save the snowman from melting by guessing letters with virtual keyboard and definition clues.',
            defaultCount: 3
        },
        {
            id: 'speed_match',
            name: 'Beat-the-Clock Speed Match',
            category: 'games',
            icon: 'fa-stopwatch',
            color: '#f59e0b',
            level: 'A1-C1',
            description: 'Rapid-fire matching game with 30-second countdown timer to build instantaneous vocabulary recall.',
            defaultCount: 4
        },
        {
            id: 'word_search',
            name: 'Interactive Word Search Grid',
            category: 'games',
            icon: 'fa-th',
            color: '#8b5cf6',
            level: 'A1-B2',
            description: 'Find target vocabulary hidden horizontally, vertically, and diagonally in an interactive letter grid.',
            defaultCount: 3
        },
        {
            id: 'anagram_rush',
            name: 'Anagram Scramble Rush',
            category: 'games',
            icon: 'fa-font',
            color: '#ec4899',
            level: 'A2-B2',
            description: 'Rearrange jumbled letter tiles against the clock to discover the secret vocabulary keyword.',
            defaultCount: 4
        },
        {
            id: 'quiz_show',
            name: 'Jeopardy-Style Quiz Show',
            category: 'games',
            icon: 'fa-trophy',
            color: '#eab308',
            level: 'B1-C2',
            description: 'Multi-category interactive board with 100, 200, and 300 point questions for gamified competition.',
            defaultCount: 3
        },
        {
            id: 'crossword_mini',
            name: 'Mini Crossword Clue Solver',
            category: 'games',
            icon: 'fa-border-all',
            color: '#10b981',
            level: 'B1-C1',
            description: 'Solve across and down vocabulary clues on an interactive mini crossword puzzle grid.',
            defaultCount: 2
        },
        {
            id: 'emoji_rebus',
            name: 'Emoji & Icon Rebus Riddle',
            category: 'games',
            icon: 'fa-icons',
            color: '#f97316',
            level: 'A2-B2',
            description: 'Decode idioms, compound nouns, and phrases represented visually through clever emoji sequences.',
            defaultCount: 4
        },

        // --- Category 5: Listening, Comprehension & Assessment (8 Activities) ---
        {
            id: 'multiple_choice',
            name: 'Multiple Choice Comprehension Quiz',
            category: 'comprehension',
            icon: 'fa-check-circle',
            color: '#3b82f6',
            level: 'A1-C2',
            description: 'Standard comprehension checks with rich pedagogical explanations, options A-D, and score tracking.',
            defaultCount: 5
        },
        {
            id: 'true_false',
            name: 'True / False Fact Verifier',
            category: 'comprehension',
            icon: 'fa-balance-scale',
            color: '#8b5cf6',
            level: 'A1-B2',
            description: 'Evaluate factual claims about the video with evidence justifications and timestamp citations.',
            defaultCount: 5
        },
        {
            id: 'dictation',
            name: 'Audio Dictation & Spelling Test',
            category: 'comprehension',
            icon: 'fa-spell-check',
            color: '#6366f1',
            level: 'A2-C1',
            description: 'Listen at normal (1.0x) or slow (0.75x) speed and transcribe sentences with letter-by-letter diff comparison.',
            defaultCount: 4
        },
        {
            id: 'summary_ordering',
            name: 'Chronological Story Sequencer',
            category: 'comprehension',
            icon: 'fa-sort-numeric-down',
            color: '#0ea5e9',
            level: 'A2-B2',
            description: 'Sequence video story events or procedural steps in their exact chronological timeline order.',
            defaultCount: 4
        },
        {
            id: 'wh_questions',
            name: 'Deep WH-Question Analyzer',
            category: 'comprehension',
            icon: 'fa-question',
            color: '#10b981',
            level: 'B1-C2',
            description: 'Targeted Who, What, Where, When, Why, and How questions with instant model answer comparisons.',
            defaultCount: 4
        },
        {
            id: 'inference_lab',
            name: 'Subtext & Inference Analyzer',
            category: 'comprehension',
            icon: 'fa-brain',
            color: '#ec4899',
            level: 'B2-C2',
            description: 'Read between the lines to deduce speaker intent, implied tone, sarcasm, and underlying motivation.',
            defaultCount: 3
        },
        {
            id: 'gist_summarizer',
            name: 'Main Idea & Gist Headline Extractor',
            category: 'comprehension',
            icon: 'fa-newspaper',
            color: '#f59e0b',
            level: 'B1-C1',
            description: 'Select or craft the most concise, accurate 1-sentence executive summary representing the video segment.',
            defaultCount: 3
        },
        {
            id: 'accent_detective',
            name: 'Global Accent & Dialect Identifier',
            category: 'comprehension',
            icon: 'fa-globe-americas',
            color: '#06b6d4',
            level: 'B2-C2',
            description: 'Ear-training to identify British (RP), American (General), Australian, Canadian, and regional accents.',
            defaultCount: 3
        },

        // --- Category 6: Writing, Fluency & Advanced Expression (6 Activities) ---
        {
            id: 'paraphrase_pro',
            name: 'Formal Paraphrasing & Rephrasing',
            category: 'writing',
            icon: 'fa-sync-alt',
            color: '#3b82f6',
            level: 'B2-C2',
            description: 'Rewrite informal or clumsy sentences using sophisticated vocabulary and academic sentence structures.',
            defaultCount: 3
        },
        {
            id: 'debate_procon',
            name: 'Point-Counterpoint Argument Builder',
            category: 'writing',
            icon: 'fa-comments-dollar',
            color: '#8b5cf6',
            level: 'B2-C2',
            description: 'Structure persuasive arguments using cohesive signposting devices (On the contrary, Notwithstanding).',
            defaultCount: 3
        },
        {
            id: 'email_polite',
            name: 'Business Email Tone Transformer',
            category: 'writing',
            icon: 'fa-envelope-open-text',
            color: '#10b981',
            level: 'B1-C1',
            description: 'Transform blunt direct statements into polite, professional diplomatic business correspondence.',
            defaultCount: 3
        },
        {
            id: 'speed_writing',
            name: '60-Second Timed Fluency Sprint',
            category: 'writing',
            icon: 'fa-hourglass-half',
            color: '#f97316',
            level: 'A2-C2',
            description: 'Timed continuous writing sprint to build spontaneous idea generation and overcome mental blocks.',
            defaultCount: 2
        },
        {
            id: 'story_continuation',
            name: 'Story Narrative Continuation',
            category: 'writing',
            icon: 'fa-book-open',
            color: '#ec4899',
            level: 'B1-C1',
            description: 'Predict and write what happens next based on the climax or turning point of the video cue.',
            defaultCount: 2
        },
        {
            id: 'transcription_editor',
            name: 'Subtitle Auditor & Editor',
            category: 'writing',
            icon: 'fa-closed-captioning',
            color: '#06b6d4',
            level: 'B2-C2',
            description: 'Listen and fix errors, misheard words, and formatting issues in the auto-generated subtitle script.',
            defaultCount: 3
        }
    ];

    // ==================== ACTIVITY LIBRARY CONTROLLER & PROMPT BUILDER ==================== //
    const activityManager = {
        _selectedMap: new Map([
            ['flashcard', 5],
            ['multiple_choice', 5],
            ['unscramble', 3],
            ['speaking', 3]
        ]),
        _currentFilter: 'all',
        _searchQuery: '',

        init() {
            this.renderActivityCards();
            this.updatePromptSummary();
        },

        isSelected(id) {
            return this._selectedMap.has(id);
        },

        getCount(id) {
            return this._selectedMap.get(id) || 5;
        },

        toggleSelect(id, forceState) {
            const def = activityDefinitions.find(a => a.id === id);
            if (!def) return;
            const newState = (typeof forceState === 'boolean') ? forceState : !this.isSelected(id);
            if (newState) {
                this._selectedMap.set(id, def.defaultCount || 5);
            } else {
                this._selectedMap.delete(id);
            }
            this.renderActivityCards();
            this.updatePromptSummary();
        },

        setCount(id, count) {
            const num = Math.max(1, Math.min(25, parseInt(count, 10) || 1));
            this._selectedMap.set(id, num);
            this.renderActivityCards();
            this.updatePromptSummary();
        },

        stepCount(id, delta) {
            const current = this.getCount(id);
            this.setCount(id, current + delta);
        },

        selectAll() {
            activityDefinitions.forEach(def => {
                this._selectedMap.set(def.id, def.defaultCount || 5);
            });
            this.renderActivityCards();
            this.updatePromptSummary();
        },

        deselectAll() {
            this._selectedMap.clear();
            this.renderActivityCards();
            this.updatePromptSummary();
        },

        setFilter(cat) {
            this._currentFilter = cat;
            document.querySelectorAll('.smp-pill-tab').forEach(t => {
                if (t.dataset.cat === cat) t.classList.add('active');
                else t.classList.remove('active');
            });
            this.renderActivityCards();
        },

        setSearch(query) {
            this._searchQuery = (query || '').toLowerCase().trim();
            this.renderActivityCards();
        },

        renderActivityCards() {
            const container = document.getElementById('smp-activity-grid');
            if (!container) return;

            const filtered = activityDefinitions.filter(def => {
                const matchCat = (this._currentFilter === 'all' || def.category === this._currentFilter);
                const matchQuery = !this._searchQuery || 
                    def.name.toLowerCase().includes(this._searchQuery) || 
                    def.description.toLowerCase().includes(this._searchQuery) ||
                    def.category.toLowerCase().includes(this._searchQuery);
                return matchCat && matchQuery;
            });

            container.innerHTML = '';
            filtered.forEach(def => {
                const isSel = this.isSelected(def.id);
                const count = this.getCount(def.id);

                const card = document.createElement('div');
                card.className = 'smp-activity-card' + (isSel ? ' selected' : '');
                card.id = 'smp-card-' + def.id;

                card.innerHTML = \`
                    <div class="smp-card-top-row">
                        <div class="smp-card-icon-title">
                            <div class="smp-ac-icon-wrapper" style="background: \${def.color}20; color: \${def.color};">
                                <i class="fas \${def.icon}"></i>
                            </div>
                            <div>
                                <div class="smp-ac-title">\${def.name}</div>
                            </div>
                        </div>
                        <div class="smp-act-checkbox-wrapper" onclick="event.stopPropagation();">
                            <input type="checkbox" class="smp-act-checkbox" \${isSel ? 'checked' : ''} 
                                onchange="SMP.activities.manager.toggleSelect('\${def.id}', this.checked)" />
                        </div>
                    </div>
                    <div class="smp-card-meta-row">
                        <span class="smp-cat-tag">\${def.category}</span>
                        <span class="smp-level-tag">\${def.level}</span>
                    </div>
                    <div class="smp-ac-desc">\${def.description}</div>
                    <div class="smp-card-footer-row" onclick="event.stopPropagation();">
                        <div class="smp-item-stepper" title="Set reiterations to generate">
                            <button class="smp-stepper-btn" onclick="SMP.activities.manager.stepCount('\${def.id}', -1)" aria-label="Decrease count">-</button>
                            <span class="smp-stepper-val">\${count}</span>
                            <button class="smp-stepper-btn" onclick="SMP.activities.manager.stepCount('\${def.id}', 1)" aria-label="Increase count">+</button>
                        </div>
                        <div class="smp-card-btn-group">
                            <button class="smp-btn-primary smp-btn-xs" onclick="SMP.activities.openSingleModal('\${def.id}')" title="Configure single prompt">
                                <i class="fas fa-magic"></i> Prompt
                            </button>
                            <button class="smp-btn-accent smp-btn-xs" onclick="SMP.activities.playDirectDemo('\${def.id}')" title="Play Interactive Demo Now">
                                <i class="fas fa-play"></i> Play Demo
                            </button>
                        </div>
                    </div>
                \`;

                card.onclick = (e) => {
                    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.smp-item-stepper')) return;
                    this.toggleSelect(def.id);
                };

                container.appendChild(card);
            });
        },

        updatePromptSummary() {
            const countEl = document.getElementById('smp-summary-count');
            const pillsEl = document.getElementById('smp-prompt-selected-tags');
            const fullPromptEl = document.getElementById('smp-full-ai-prompt');

            const selectedList = [];
            this._selectedMap.forEach((count, id) => {
                const def = activityDefinitions.find(a => a.id === id);
                if (def) selectedList.push({ ...def, count });
            });

            if (countEl) countEl.textContent = selectedList.length + ' / ' + activityDefinitions.length;

            if (pillsEl) {
                pillsEl.innerHTML = '';
                if (selectedList.length === 0) {
                    pillsEl.innerHTML = '<span style="color:var(--smp-text-muted);font-size:0.8rem;font-style:italic;">No activities selected. Check items above or click "Select All".</span>';
                } else {
                    selectedList.forEach(item => {
                        const tag = document.createElement('span');
                        tag.className = 'smp-selected-tag';
                        tag.style.borderColor = item.color;
                        tag.innerHTML = \`<i class="fas \${item.icon}" style="color:\${item.color}"></i> \${item.name} <strong>(\${item.count}x)</strong> <button onclick="SMP.activities.manager.toggleSelect('\${item.id}', false)">&times;</button>\`;
                        pillsEl.appendChild(tag);
                    });
                }
            }

            if (fullPromptEl) {
                fullPromptEl.textContent = this.generateBatchAiPrompt(selectedList);
            }
        },

        generateBatchAiPrompt(selectedItems) {
            if (!selectedItems || selectedItems.length === 0) {
                return "Please select one or more activities from the library above to generate a comprehensive AI prompt.";
            }

            const targetLevel = (document.getElementById('smp-prompt-level-select') || {}).value || 'B1-B2 Intermediate';
            const reqList = selectedItems.map(item => \`- \${item.name} (\${item.id}): Exactly \${item.count} items/reiterations (CEFR \${item.level || targetLevel})\`).join('\\n');

            return \`# SYSTEM INSTRUCTION: MULTI-ACTIVITY INTERACTIVE LESSON GENERATOR
You are an expert pedagogical language AI and curriculum designer.
Analyze the attached/provided video transcript, dialogue, or topic context, and generate a comprehensive interactive activity pack with precise TIMESTAMPS distributed across the video timeline.

## TARGET AUDIENCE & LEVEL:
Target Proficiency: \${targetLevel}

## EXACT ACTIVITIES & REITERATION COUNTS TO PRODUCE:
\${reqList}

## CRITICAL OUTPUT SPECIFICATIONS:
1. Return ONLY a single, strictly valid JSON object matching the schema below.
2. Do NOT wrap in markdown formatting backticks or write conversational preambles.
3. Every generated activity MUST include a 'timestamp' property (in seconds, e.g., 15, 45, 90, 150) strategically spaced throughout the media timeline so activities pop up or appear clickable during video playback.
4. ANSWER-LENGTH ANTI-CUE RULE (MANDATORY for every item that has an option list — multiple choice, comprehension quiz, vocabulary choice): a learner must never be able to score by picking the longest option.
   - All options in one item must be within ±2 words of each other and carry the same level of detail (count words, not characters).
   - THE LONGEST OPTION MUST NEVER BE THE CORRECT ONE. If the correct answer is the longest, shorten it or lengthen the distractors until a distractor is longer.
   - The correct option must not be the only one with a number, a name, a comma or extra qualifying detail, and must not echo keywords from the question more than the distractors do.
   - Distractors must be equally plausible and from the same topic/word family; rotate the correct answer's position so it is never the same index twice in a row.
   - SILENTLY SELF-CHECK EVERY OPTION SET BEFORE RETURNING and rewrite any item whose longest option is the correct one.

## REQUIRED JSON SCHEMA TEMPLATE:
{
  "title": "Interactive Video Lesson",
  "cefrLevel": "\${targetLevel}",
  "activities": [
    {
      "id": "act_1",
      "type": "flashcard",
      "timestamp": 15,
      "term": "ubiquitous",
      "ipa": "/juːˈbɪk.wɪ.təs/",
      "partOfSpeech": "adjective",
      "level": "B2",
      "meaning": "Present, appearing, or found everywhere.",
      "examples": [
        "Smartphones have become ubiquitous in modern daily life.",
        "Coffee shops are ubiquitous in downtown Seattle."
      ],
      "conceptCheckingQuestion": "If something is ubiquitous, is it rare or common? (Common)"
    },
    {
      "id": "act_2",
      "type": "multiple_choice",
      "timestamp": 45,
      "question": "What is the primary factor driving the author's argument?",
      "options": [
        "Technological innovation",
        "Economic downturn",
        "Geographic expansion",
        "Cultural stagnation"
      ],
      "correctAnswer": 0,
      "explanation": "The speaker specifically highlighted innovation as the central catalyst."
    },
    {
      "id": "act_3",
      "type": "unscramble",
      "timestamp": 75,
      "targetSentence": "Consistent daily practice is the true key to fluency.",
      "words": ["practice", "Consistent", "the", "to", "daily", "is", "fluency.", "true", "key"]
    },
    {
      "id": "act_4",
      "type": "wordmaster",
      "timestamp": 105,
      "word": "FLUENT",
      "clue": "Able to express oneself easily and articulately."
    },
    {
      "id": "act_5",
      "type": "speaking",
      "timestamp": 135,
      "prompt": "Mastering natural connected speech requires deliberate listening."
    },
    {
      "id": "act_6",
      "type": "fill_blanks",
      "timestamp": 165,
      "sentence": "She decided to ___ the proposal after reviewing the budget.",
      "blanks": ["approve"],
      "hint": "Verb meaning to officially agree to something."
    }
  ]
}

Now, generate the complete JSON containing all requested activities and exact counts.\`;
        }
    };

    // ==================== ACTIVITY RENDERERS ENGINE ==================== //
    const activityRenderers = {
        _currentQuizData: [],
        _currentFlashcards: [],
        _currentFlashcardIdx: 0,
        _unscrambleData: null,
        _dictationData: null,
        _wordMasterData: null,
        _snowmanData: null,
        _dialogueData: null,
        _speakingData: null,

        _escHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        // --- 1. Flashcard & Lexical Cards Renderer ---
        renderFlashcard(item) {
            const list = Array.isArray(item) ? item : [item];
            this._currentFlashcards = list;
            this._currentFlashcardIdx = 0;
            this._showFlashcardAt(0);
            const overlay = $('smp-flashcard-overlay');
            if (overlay) overlay.style.display = 'flex';
        },

        _showFlashcardAt(idx) {
            if (!this._currentFlashcards || !this._currentFlashcards[idx]) return;
            const item = this._currentFlashcards[idx];

            const flipCard = $('smp-fc-flip-card');
            if (flipCard) flipCard.classList.remove('flipped');
            
            const termEl = $('smp-fc-term');
            if (termEl) termEl.textContent = item.term || item.word || 'Vocabulary Word';
            
            const ipaEl = $('smp-fc-ipa');
            if (ipaEl) ipaEl.textContent = item.ipa || item.phonetic || '/.../';
            
            const formEl = $('smp-fc-form');
            if (formEl) formEl.textContent = item.partOfSpeech || item.form || 'Word';
            
            const useEl = $('smp-fc-use');
            if (useEl) useEl.textContent = item.level || 'CEFR B1/B2';
            
            const meaningEl = $('smp-fc-meaning');
            if (meaningEl) meaningEl.textContent = item.meaning || item.definition || 'Definition and usage notes.';

            const examplesEl = $('smp-fc-examples');
            if (examplesEl) {
                examplesEl.innerHTML = '';
                const exList = item.examples || (item.example ? [item.example] : []);
                exList.forEach(ex => {
                    const p = document.createElement('p');
                    p.className = 'smp-example-text';
                    p.innerHTML = '<i class="fas fa-quote-left" style="opacity:0.4;margin-right:6px;"></i>' + this._escHtml(ex);
                    examplesEl.appendChild(p);
                });
                if (item.conceptCheckingQuestion || item.ccq) {
                    const ccq = document.createElement('div');
                    ccq.className = 'smp-ccq-box';
                    ccq.innerHTML = '<i class="fas fa-brain" style="color:var(--smp-accent);margin-right:6px;"></i><strong>Concept Check:</strong> ' + this._escHtml(item.conceptCheckingQuestion || item.ccq);
                    examplesEl.appendChild(ccq);
                }
            }

            const counterEl = $('smp-fc-counter');
            if (counterEl) counterEl.textContent = (idx + 1) + ' / ' + this._currentFlashcards.length;
        },

        nextFlashcard() {
            if (!this._currentFlashcards || this._currentFlashcards.length === 0) return;
            this._currentFlashcardIdx = (this._currentFlashcardIdx + 1) % this._currentFlashcards.length;
            this._showFlashcardAt(this._currentFlashcardIdx);
        },

        prevFlashcard() {
            if (!this._currentFlashcards || this._currentFlashcards.length === 0) return;
            this._currentFlashcardIdx = (this._currentFlashcardIdx - 1 + this._currentFlashcards.length) % this._currentFlashcards.length;
            this._showFlashcardAt(this._currentFlashcardIdx);
        },

        flipFlashcard() {
            const flipCard = $('smp-fc-flip-card');
            if (flipCard) flipCard.classList.toggle('flipped');
        },

        // --- 2. Comprehensive Quiz & Assessment Renderer ---
        renderQuiz(questions, titleText = 'Interactive Comprehension Quiz') {
            this._currentQuizData = Array.isArray(questions) ? questions : [questions];
            const container = $('smp-quiz-container');
            if (!container) return;
            container.innerHTML = '';

            const titleEl = document.querySelector('#smp-quiz-overlay .smp-quiz-header h3');
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-graduation-cap" style="color:var(--smp-accent);"></i> ' + this._escHtml(titleText);

            this._currentQuizData.forEach((q, qi) => {
                const item = document.createElement('div');
                item.className = 'smp-quiz-item';
                item.dataset.qi = qi;

                const qType = q.type || 'multiple_choice';
                let html = '<div class="smp-quiz-q-title"><strong>Question ' + (qi + 1) + ':</strong> ' + this._escHtml(q.question || q.prompt || q.sentence || '') + '</div>';

                if (qType === 'multiple_choice' || qType === 'true_false' || qType === 'accent_detective' || qType === 'inference_lab') {
                    html += '<div class="smp-quiz-options">';
                    (q.options || []).forEach((opt, oi) => {
                        const isCorrect = typeof opt === 'object' ? !!opt.correct : (oi === q.correctAnswer);
                        const optText = typeof opt === 'object' ? opt.text : opt;
                        html += '<button class="smp-quiz-opt-btn" onclick="SMP.activities.handleQuizChoice(this, ' + qi + ', ' + isCorrect + ', \\'' + (q.id || ('q_' + qi)) + '\\', ' + (q.points || 10) + ')">' +
                            '<span class="smp-opt-badge">' + String.fromCharCode(65 + oi) + '</span> ' + this._escHtml(optText) + '</button>';
                    });
                    html += '</div>';
                } else if (qType === 'fill_blanks' || qType === 'tense_transformer') {
                    const sentence = q.sentence || q.question || 'The presenter decided to ___ the results immediately.';
                    const parts = sentence.split('___');
                    html += '<div class="smp-fitb-sentence">';
                    parts.forEach((part, pi) => {
                        html += this._escHtml(part);
                        if (pi < parts.length - 1) {
                            const expected = Array.isArray(q.blanks) ? q.blanks[pi] : (q.answer || '');
                            html += ' <input type="text" class="smp-fitb-input" data-qi="' + qi + '" data-blank-idx="' + pi + '" data-answer="' + this._escHtml(expected) + '" placeholder="..." /> ';
                        }
                    });
                    html += '</div>';
                    html += '<button class="smp-btn-accent smp-btn-sm" style="margin-top:10px;" onclick="SMP.activities.checkFillBlanks(' + qi + ', \\'' + (q.id || ('q_' + qi)) + '\\', ' + (q.points || 10) + ')"><i class="fas fa-check"></i> Check Answers</button>';
                } else if (qType === 'matching' || qType === 'speed_match' || qType === 'collocation_wheel') {
                    html += '<div class="smp-match-container" id="smp-match-' + qi + '">';
                    html += '<div class="smp-match-col source">';
                    (q.pairs || []).forEach((pair, pi) => {
                        html += '<div class="smp-match-item" draggable="true" ondragstart="event.dataTransfer.setData(\\'text\\', \\'' + pi + '\\')"><i class="fas fa-grip-vertical" style="opacity:0.5;margin-right:6px;"></i>' + this._escHtml(pair.term || pair.left) + '</div>';
                    });
                    html += '</div><div class="smp-match-col target">';
                    (q.pairs || []).forEach((pair, pi) => {
                        html += '<div class="smp-match-target" ondragover="event.preventDefault()" ondrop="SMP.activities.handleMatchDrop(event, this, ' + qi + ', ' + pi + ')">' + this._escHtml(pair.definition || pair.right) + '</div>';
                    });
                    html += '</div></div>';
                }

                html += '<div id="smp-qfb' + qi + '" class="smp-quiz-feedback" style="display:none;"></div>';
                item.innerHTML = html;
                container.appendChild(item);
            });

            const overlay = $('smp-quiz-overlay');
            if (overlay) overlay.style.display = 'flex';
        },

        // --- 3. Sentence Builder / Unscrambler Renderer ---
        renderUnscramble(data) {
            this._unscrambleData = data;
            const targetZone = $('smp-unscramble-target-zone');
            const sourceZone = $('smp-unscramble-source-zone');
            if (!targetZone || !sourceZone) return;
            targetZone.innerHTML = '';
            sourceZone.innerHTML = '';
            
            const fb = $('smp-unscramble-feedback');
            if (fb) fb.style.display = 'none';

            const rawSentence = data.targetSentence || data.sentence || 'Consistent daily practice is the key to fluency.';
            const words = data.words || rawSentence.split(' ').filter(w => w.length > 0);
            
            // Randomize order
            const shuffled = [...words].sort(() => Math.random() - 0.5);

            shuffled.forEach((w) => {
                const chip = document.createElement('div');
                chip.className = 'smp-word-chip';
                chip.textContent = w;
                chip.dataset.word = w;
                chip.onclick = () => {
                    if (chip.parentElement === sourceZone) {
                        targetZone.appendChild(chip);
                    } else {
                        sourceZone.appendChild(chip);
                    }
                };
                sourceZone.appendChild(chip);
            });

            const overlay = $('smp-unscramble-overlay');
            if (overlay) overlay.style.display = 'flex';
        },

        // --- 4. Audio Dictation & Transcription Renderer ---
        renderDictation(data) {
            this._dictationData = data;
            const inp = $('smp-dictation-input');
            if (inp) inp.value = '';
            const fb = $('smp-dictation-feedback');
            if (fb) fb.style.display = 'none';
            const overlay = $('smp-dictation-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.playDictationAudio(1.0);
        },

        playDictationAudio(speed = 1.0) {
            if (!this._dictationData) return;
            const text = this._dictationData.sentence || this._dictationData.text || 'Listening carefully is the foundation of clear speech.';
            if (window.SMP && SMP.speech) {
                SMP.speech.speak(text, speed);
            }
        },

        // --- 5. Speaking & Shadowing Coach Renderer ---
        renderSpeaking(data) {
            this._speakingData = data;
            const text = data.text || data.sentence || data.prompt || 'Consistency is the true key to mastering any language.';
            const promptEl = $('smp-speaking-prompt');
            if (promptEl) promptEl.textContent = text;
            const resultEl = $('smp-speaking-result');
            if (resultEl) resultEl.textContent = 'Press "Start Speaking" and read aloud.';
            const fillEl = $('smp-accuracy-fill');
            if (fillEl) fillEl.style.width = '0%';
            const labelEl = $('smp-accuracy-label');
            if (labelEl) labelEl.textContent = '0% Match';
            const micAnim = $('smp-mic-animation');
            if (micAnim) micAnim.className = 'smp-mic-idle';
            const overlay = $('smp-speaking-overlay');
            if (overlay) overlay.style.display = 'flex';
        },

        // --- 6. WordMaster / Wordle Game Renderer ---
        renderWordMaster(data) {
            const word = (data.word || 'FLUENT').toUpperCase().trim();
            this._wordMasterData = {
                word: word,
                clue: data.clue || 'Able to express oneself easily and articulately in speech or writing.',
                attempts: 0,
                maxAttempts: 6,
                history: []
            };

            const clueEl = $('smp-wm-clue');
            if (clueEl) clueEl.textContent = '💡 Clue: ' + this._wordMasterData.clue;
            
            const grid = $('smp-wm-grid');
            if (grid) {
                grid.innerHTML = '';
                grid.style.display = 'grid';
                grid.style.gridTemplateColumns = 'repeat(' + word.length + ', 44px)';
                grid.style.gap = '6px';
                grid.style.justifyContent = 'center';
                grid.style.margin = '16px 0';

                for (let r = 0; r < 6; r++) {
                    for (let c = 0; c < word.length; c++) {
                        const tile = document.createElement('div');
                        tile.className = 'smp-wordle-tile';
                        tile.id = 'wm-tile-' + r + '-' + c;
                        tile.style.width = '44px';
                        tile.style.height = '44px';
                        tile.style.border = '2px solid var(--smp-border)';
                        tile.style.borderRadius = '6px';
                        tile.style.display = 'flex';
                        tile.style.alignItems = 'center';
                        tile.style.justifyContent = 'center';
                        tile.style.fontSize = '1.2rem';
                        tile.style.fontWeight = '800';
                        grid.appendChild(tile);
                    }
                }
            }

            const inp = $('smp-wm-input');
            if (inp) {
                inp.value = '';
                inp.maxLength = word.length;
            }
            const fb = $('smp-wm-feedback');
            if (fb) fb.style.display = 'none';
            const overlay = $('smp-wordmaster-overlay');
            if (overlay) overlay.style.display = 'flex';
        },

        // --- 7. Snowman / Hangman Word Guesser Renderer ---
        renderSnowman(data) {
            const word = (data.word || 'VOCABULARY').toUpperCase().trim();
            this._snowmanData = {
                word: word,
                clue: data.clue || 'All the words used or known by a particular person in a language.',
                guessedLetters: new Set(),
                wrongGuesses: 0,
                maxWrong: 6
            };

            const clueEl = $('smp-snowman-clue');
            if (clueEl) clueEl.textContent = '💡 Clue: ' + this._snowmanData.clue;
            this._updateSnowmanUI();

            const keyboard = $('smp-snowman-keyboard');
            if (keyboard) {
                keyboard.innerHTML = '';
                keyboard.style.display = 'flex';
                keyboard.style.flexWrap = 'wrap';
                keyboard.style.gap = '6px';
                keyboard.style.justifyContent = 'center';
                keyboard.style.margin = '14px 0';

                'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => {
                    const btn = document.createElement('button');
                    btn.className = 'smp-kb-key';
                    btn.textContent = l;
                    btn.style.width = '32px';
                    btn.style.height = '36px';
                    btn.style.fontWeight = '700';
                    btn.style.borderRadius = '4px';
                    btn.style.border = '1px solid var(--smp-border)';
                    btn.style.background = 'var(--smp-card-bg)';
                    btn.style.color = 'var(--smp-text)';
                    btn.style.cursor = 'pointer';
                    btn.onclick = () => SMP.activities.guessSnowmanLetter(l, btn);
                    keyboard.appendChild(btn);
                });
            }

            const fb = $('smp-snowman-feedback');
            if (fb) fb.style.display = 'none';
            const overlay = $('smp-snowman-overlay');
            if (overlay) overlay.style.display = 'flex';
        },

        _updateSnowmanUI() {
            const data = this._snowmanData;
            if (!data) return;
            let display = '';
            let won = true;

            for (let l of data.word) {
                if (l === ' ' || l === '-' || data.guessedLetters.has(l)) {
                    display += l + ' ';
                } else {
                    display += '_ ';
                    won = false;
                }
            }
            const wordEl = $('smp-snowman-word');
            if (wordEl) {
                wordEl.textContent = display.trim();
                wordEl.style.fontSize = '1.6rem';
                wordEl.style.letterSpacing = '4px';
                wordEl.style.fontWeight = '800';
                wordEl.style.margin = '10px 0';
            }

            const snowmenStages = ['⛄ ❄️ ❄️ ❄️', '⛄ ❄️ ❄️', '⛄ ❄️', '⛄', '💧 ⛄', '💧 💧', '💧 💧 💧 (Melted!)'];
            const figEl = $('smp-snowman-figure');
            if (figEl) {
                figEl.textContent = snowmenStages[Math.min(data.wrongGuesses, snowmenStages.length - 1)];
                figEl.style.fontSize = '2rem';
            }

            if (won) {
                const fb = $('smp-snowman-feedback');
                if (fb) {
                    fb.className = 'smp-quiz-feedback correct';
                    fb.innerHTML = '🎉 <strong>Brilliant!</strong> You solved the word: <strong>' + data.word + '</strong>';
                    fb.style.display = 'block';
                }
                markCompleted('snowman_' + data.word, 15);
            } else if (data.wrongGuesses >= data.maxWrong) {
                const fb = $('smp-snowman-feedback');
                if (fb) {
                    fb.className = 'smp-quiz-feedback incorrect';
                    fb.innerHTML = '❄️ <strong>The snowman melted!</strong> The correct word was: <strong>' + data.word + '</strong>';
                    fb.style.display = 'block';
                }
            }
        },

        // --- 8. Conversational Dialogue Roleplay Renderer ---
        renderDialogue(data) {
            this._dialogueData = {
                title: data.title || 'Conversational English Roleplay',
                lines: data.lines || [
                    { speaker: 'Speaker A', text: "Hi! Could you help me practice for my presentation tomorrow?" },
                    { speaker: 'Speaker B', text: "Of course! Let's go over the key talking points together." },
                    { speaker: 'Speaker A', text: "Thank you! What should I focus on first?" },
                    { speaker: 'Speaker B', text: "Start with a strong hook to capture the audience's attention." }
                ],
                currentStep: 0
            };

            const titleEl = $('smp-dialogue-title');
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-comments" style="color:var(--smp-accent);"></i> ' + this._escHtml(this._dialogueData.title);
            
            const chat = $('smp-dialogue-chat');
            if (chat) {
                chat.innerHTML = '';
                chat.style.display = 'flex';
                chat.style.flexDirection = 'column';
                chat.style.gap = '10px';
                chat.style.maxHeight = '300px';
                chat.style.overflowY = 'auto';
                chat.style.padding = '10px';

                this._dialogueData.lines.forEach((line, i) => {
                    const isLeft = line.speaker === 'Speaker A' || i % 2 === 0;
                    const msg = document.createElement('div');
                    msg.className = 'smp-dialogue-line ' + (isLeft ? 'left' : 'right');
                    msg.id = 'smp-dl-' + i;
                    msg.style.display = 'flex';
                    msg.style.flexDirection = 'column';
                    msg.style.alignItems = isLeft ? 'flex-start' : 'flex-end';

                    msg.innerHTML = \`
                        <div style="font-size:0.72rem;font-weight:700;color:var(--smp-text-muted);margin-bottom:2px;">
                            <i class="fas \${isLeft ? 'fa-user-circle' : 'fa-user-tie'}"></i> \${this._escHtml(line.speaker || 'Speaker')}
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <div style="background:\${isLeft ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)'};border:1px solid \${isLeft ? '#3b82f6' : '#f59e0b'};border-radius:12px;padding:8px 12px;font-size:0.9rem;color:var(--smp-text);max-width:80%;">
                                \${this._escHtml(line.text)}
                            </div>
                            <button class="smp-btn-xs" data-text="\${this._escHtml(line.text)}" onclick="SMP.speech.speak(this.dataset.text)" title="Listen (TTS)">
                                <i class="fas fa-volume-up"></i>
                            </button>
                        </div>
                    \`;
                    chat.appendChild(msg);
                });
            }

            const overlay = $('smp-dialogue-overlay');
            if (overlay) overlay.style.display = 'flex';
        },

        // --- Demo Data Registry for ALL 45+ Activities ---
        getDemoDataForActivity(actId) {
            const registry = {
                flashcard: [
                    {
                        term: "articulate",
                        ipa: "/ɑːˈtɪk.jə.lət/",
                        partOfSpeech: "adjective",
                        level: "B2/C1",
                        meaning: "Expressing oneself clearly and effectively in speech or writing.",
                        examples: [
                            "She is an articulate speaker who conveys complex ideas simply.",
                            "The candidate gave an articulate response to the interview question."
                        ],
                        conceptCheckingQuestion: "Does an articulate person struggle to explain things or explain them clearly? (Clearly)"
                    },
                    {
                        term: "perseverance",
                        ipa: "/ˌpɜː.sɪˈvɪə.rəns/",
                        partOfSpeech: "noun",
                        level: "B2",
                        meaning: "Persistence in doing something despite difficulty or delay in achieving success.",
                        examples: [
                            "Learning a language requires continuous perseverance and daily habit."
                        ],
                        conceptCheckingQuestion: "If you give up immediately, are you showing perseverance? (No)"
                    }
                ],
                flexcard: [
                    {
                        term: "resilient",
                        ipa: "/rɪˈzɪl.jənt/",
                        partOfSpeech: "adjective",
                        level: "B2/C1",
                        meaning: "Able to withstand or recover quickly from difficult conditions.",
                        examples: ["Local communities proved resilient following the unexpected storm."],
                        conceptCheckingQuestion: "If someone is resilient, do they recover quickly or stay broken? (Recover quickly)"
                    }
                ],
                picture_vocab: [
                    {
                        term: "glacier",
                        ipa: "/ˈɡlæs.i.ər/",
                        partOfSpeech: "noun",
                        level: "A2/B1",
                        meaning: "A slowly moving mass of ice formed by the accumulation of snow.",
                        examples: ["The massive glacier flows carved deep valleys across the landscape."],
                        conceptCheckingQuestion: "Is a glacier made of liquid water or solid ice? (Solid ice)"
                    }
                ],
                collocation_wheel: [
                    {
                        type: "matching",
                        question: "Match the verbs with their natural noun collocations:",
                        pairs: [
                            { term: "Make", definition: "an effort / a mistake / a decision" },
                            { term: "Pay", definition: "attention / a compliment / a visit" },
                            { term: "Take", definition: "advantage of / a risk / responsibility" },
                            { term: "Do", definition: "business / someone a favor / research" }
                        ]
                    }
                ],
                idiom_spotlight: [
                    {
                        term: "Bite the bullet",
                        ipa: "/baɪt ðə ˈbʊl.ɪt/",
                        partOfSpeech: "idiom",
                        level: "B2",
                        meaning: "To endure a painful or difficult situation that is unavoidable.",
                        examples: ["I decided to bite the bullet and tell my manager about the delayed project."]
                    }
                ],
                etymology_roots: [
                    {
                        term: "Benefactor (Root: Bene = Good, Fact = Make/Do)",
                        ipa: "/ˈben.ɪ.fæk.tər/",
                        partOfSpeech: "noun",
                        level: "C1",
                        meaning: "A person who gives money or other help to a person or cause.",
                        examples: ["The anonymous benefactor funded the university's new library."]
                    }
                ],
                synonym_ladder: [
                    {
                        type: "multiple_choice",
                        question: "Which word represents the most extreme intensity?",
                        options: ["Warm", "Hot", "Scorching", "Mild"],
                        correctAnswer: 2,
                        explanation: "'Scorching' denotes overwhelmingly severe, blistering heat."
                    }
                ],
                phrasal_verbs: [
                    {
                        type: "multiple_choice",
                        question: "Choose the correct particle: 'She always looks ___ her younger brother when their parents are away.'",
                        options: ["up", "after", "into", "forward to"],
                        correctAnswer: 1,
                        explanation: "'Look after' means to take care of or supervise someone."
                    }
                ],
                fill_blanks: [
                    {
                        type: "fill_blanks",
                        question: "Complete the sentence with the correct verb form:",
                        sentence: "If she had known about the delay, she would have ___ her flight.",
                        blanks: ["rescheduled"],
                        points: 15
                    }
                ],
                unscramble: {
                    targetSentence: "Active listening is essential for effective communication.",
                    words: ["essential", "communication.", "Active", "listening", "is", "for", "effective"]
                },
                tense_transformer: [
                    {
                        type: "fill_blanks",
                        question: "Transform to Present Perfect Continuous: 'They (study) English for five years.'",
                        sentence: "They ___ English for five years.",
                        blanks: ["have been studying"],
                        points: 15
                    }
                ],
                error_detective: [
                    {
                        type: "multiple_choice",
                        question: "Identify the error: 'Neither of the candidates were prepared for the debate questions.'",
                        options: [
                            "Neither",
                            "were (should be 'was')",
                            "prepared",
                            "questions"
                        ],
                        correctAnswer: 1,
                        explanation: "'Neither of' takes a singular verb ('was')."
                    }
                ],
                speaking: {
                    prompt: "Practice speaking clearly with natural rhythm and intonation."
                },
                minimal_pairs: [
                    {
                        type: "multiple_choice",
                        question: "Which word has the long /iː/ vowel sound?",
                        options: ["Ship", "Sheep", "Chip", "Sit"],
                        correctAnswer: 1,
                        explanation: "'Sheep' has the long /iː/ phoneme, unlike 'ship' (/ɪ/)."
                    }
                ],
                dialogue_roleplay: {
                    title: "Ordering Coffee & Clarifying Requests",
                    lines: [
                        { speaker: "Barista", text: "Welcome! What can I get started for you today?" },
                        { speaker: "Customer", text: "Could I have an oat milk cappuccino, please?" },
                        { speaker: "Barista", text: "Sure thing! Would you like cinnamon sprinkled on top?" },
                        { speaker: "Customer", text: "Yes please, that would be lovely." }
                    ]
                },
                wordmaster: {
                    word: "FLUENT",
                    clue: "Able to speak or write a language easily and accurately."
                },
                snowman: {
                    word: "PRONUNCIATION",
                    clue: "The manner in which someone speaks or articulates words."
                },
                multiple_choice: [
                    {
                        type: "multiple_choice",
                        question: "What is the primary message conveyed in this video lesson?",
                        options: [
                            "Grammar rules should only be memorized from textbooks",
                            "Consistent active practice and immersion lead to natural fluency",
                            "Translation is the best method for second language acquisition",
                            "Accent reduction is more important than vocabulary building"
                        ],
                        correctAnswer: 1,
                        explanation: "The core pedagogical philosophy emphasizes active production and immersion over rote memorization."
                    }
                ],
                true_false: [
                    {
                        type: "true_false",
                        question: "Shadowing native speech at different playback speeds helps build articulation muscle memory.",
                        options: ["True", "False"],
                        correctAnswer: 0,
                        explanation: "Speech shadowing is clinically proven to improve phonetic rhythm and motor coordination."
                    }
                ],
                dictation: {
                    sentence: "Effective communication depends on both listening and speaking."
                }
            };

            return registry[actId] || registry['flashcard'];
        }
    };
    `;
};
