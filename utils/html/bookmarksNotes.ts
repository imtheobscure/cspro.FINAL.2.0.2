import type { LearnerProfile } from '../../types';
import { getBnEngineBundle } from './bnEngine';

/**
 * Bookmarks & Notes widgets — MOVED VERBATIM from the Micro Lesson V1 generator
 * (utils/englishLessonHtmlGenerator.ts) into the shared Annotation Toolbar bundle
 * (utils/html/annotations.ts). Nothing was cut: the full notes editor (34+ templates,
 * speech dictation, linguistic assistant, themes, exports) and the bookmarks panel
 * (with the Time & Study Log analytics) are shipped untouched below.
 *
 * The bundle is loaded lazily by getBookmarksNotesBootstrap():
 *  - Micro Lesson V1 (window.LessonApp) → injects these panels + CSS into the page and
 *    wires the Annotation Toolbar buttons to LessonApp.showBookmarks / LessonApp.toggleNotes.
 *  - Pages that already ship their own native Bookmark/Notes panels (e.g. Micro Lesson V2)
 *    → only the Toolbar buttons are wired to the page's own toggleBookmarks / toggleNotes.
 *  - Pages with no bookmark/notes engine → the Toolbar buttons are hidden.
 */
export const NOTES_PANEL_HTML = `
    <div class="notes-panel theme-yellow" id="notes-panel" style="display:none;">
      <div class="notes-header">
        <div class="notes-title-wrap">
          <i class="fas fa-edit notes-title-icon"></i>
          <div>
            <h4>Notes</h4>
            <span class="notes-subtitle" id="notes-word-stats">0 words · 0 chars</span>
          </div>
        </div>
        <div class="notes-hdr-actions">
          <button class="notes-action-btn" onclick="LessonApp.cycleNoteTheme()" title="Cycle Theme (Yellow, Sky, Mint, Pink, Violet, Slate)"><i class="fas fa-palette"></i></button>
          <button class="notes-action-btn" onclick="LessonApp.toggleNotesMaximized()" title="Maximize Editor" id="notes-max-btn"><i class="fas fa-expand-alt"></i></button>
          <button class="notes-action-btn" onclick="LessonApp.toggleNotesDocked()" title="Pin Note (Stays open on outside click)" id="notes-pin-btn"><i class="fas fa-thumbtack"></i></button>
          <button class="notes-action-btn close-btn" onclick="LessonApp.toggleNotes()" title="Close"><i class="fas fa-times"></i></button>
        </div>
      </div>

      <!-- Notes Page Management Bar -->
      <div class="notes-pages-bar" id="notes-pages-bar">
        <div class="notes-pages-nav">
          <button class="notes-page-nav-btn" onclick="LessonApp.prevNotePage()" title="Previous Page" id="notes-prev-page-btn" disabled><i class="fas fa-chevron-left"></i></button>
          <div class="notes-page-selector-wrap" title="Click to edit current page title">
            <span class="notes-page-counter" id="notes-page-counter">Page 1 / 1</span>
            <input type="text" class="notes-page-name-input" id="notes-page-name-input" value="Page 1" placeholder="Page Title..." oninput="LessonApp.renameCurrentNotePage(this.value)" />
          </div>
          <button class="notes-page-nav-btn" onclick="LessonApp.nextNotePage()" title="Next Page" id="notes-next-page-btn" disabled><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="notes-pages-actions">
          <button class="notes-page-action-btn add-btn" onclick="LessonApp.addNotePage()" title="Add New Page (+)">
            <i class="fas fa-plus"></i> <span>Add Page</span>
          </button>
          <button class="notes-page-action-btn del-btn" onclick="LessonApp.deleteCurrentNotePage()" title="Delete Current Page" id="notes-del-page-btn">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>

      <!-- Quick Page Tabs Bar (shows when multiple pages exist) -->
      <div class="notes-page-tabs" id="notes-page-tabs" style="display:none;"></div>

      <div class="notes-toolbar-container">
        <!-- Row 1: Formatting Tools -->
        <div class="notes-tb-group">
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('bold')" title="Bold (Ctrl+B)"><i class="fas fa-bold"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('italic')" title="Italic (Ctrl+I)"><i class="fas fa-italic"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('underline')" title="Underline (Ctrl+U)"><i class="fas fa-underline"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('strikeThrough')" title="Strikethrough (Alt+S)"><i class="fas fa-strikethrough"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('superscript')" title="Superscript"><i class="fas fa-superscript"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('subscript')" title="Subscript"><i class="fas fa-subscript"></i></button>
          <span class="tb-divider"></span>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('formatBlock','<h1>')" title="Heading 1">H1</button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('formatBlock','<h2>')" title="Heading 2">H2</button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('formatBlock','<h3>')" title="Heading 3">H3</button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('formatBlock','<p>')" title="Paragraph">P</button>
          <span class="tb-divider"></span>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('insertUnorderedList')" title="Bullet List"><i class="fas fa-list-ul"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('insertOrderedList')" title="Numbered List"><i class="fas fa-list-ol"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.insertNoteChecklist()" title="Insert Task Checklist"><i class="fas fa-tasks"></i></button>
          <span class="tb-divider"></span>
          <input type="color" id="noteTxtClr" value="#1e293b" onchange="LessonApp.execNoteFmt('foreColor',this.value)" class="notes-color-picker" title="Text Color">
          <input type="color" id="noteHlClr" value="#fef08a" onchange="LessonApp.execNoteFmt('hiliteColor',this.value)" class="notes-color-picker" title="Highlight Color">
          <button class="notes-tb-btn" onclick="LessonApp.execNoteFmt('removeFormat')" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
        </div>

        <!-- Row 2: Smart Tools & Templates & Media & Pen Tool -->
        <div class="notes-tb-group smart-tools-row">
          <button class="notes-tb-btn mic-btn" id="notes-mic-btn" onclick="LessonApp.toggleNotesSpeechToText()" title="Voice Speech-To-Text Dictation"><i class="fas fa-microphone"></i> <span>Dictate</span></button>
          
          <!-- Categorized 34+ Templates Dropdown -->
          <div class="notes-dropdown-wrap" id="notes-tpl-wrap">
            <button class="notes-tb-btn dropdown-toggle" onclick="LessonApp.toggleNoteTemplateMenu(event)" title="Browse & Insert 34+ Study & Linguistic Templates"><i class="fas fa-magic" style="color:#8b5cf6;"></i> <span>Templates</span> <i class="fas fa-caret-down"></i></button>
            <div class="notes-menu-popup tpl-menu-popup" id="notes-tpl-menu" style="display:none;">
              <div class="tpl-menu-header">
                <div class="tpl-search-wrap">
                  <i class="fas fa-search"></i>
                  <input type="text" id="notes-tpl-search" class="tpl-search-input" placeholder="Search 34+ templates..." oninput="LessonApp.filterNoteTemplates(this.value)" />
                </div>
                <div class="tpl-category-pills">
                  <button class="tpl-cat-pill active" onclick="LessonApp.setTemplateCategory('all', event)">All</button>
                  <button class="tpl-cat-pill" onclick="LessonApp.setTemplateCategory('general', event)">General</button>
                  <button class="tpl-cat-pill" onclick="LessonApp.setTemplateCategory('speaking', event)">Speaking</button>
                  <button class="tpl-cat-pill" onclick="LessonApp.setTemplateCategory('grammar', event)">Grammar</button>
                  <button class="tpl-cat-pill" onclick="LessonApp.setTemplateCategory('vocab', event)">Vocab</button>
                  <button class="tpl-cat-pill" onclick="LessonApp.setTemplateCategory('writing', event)">Writing</button>
                  <button class="tpl-cat-pill" onclick="LessonApp.setTemplateCategory('exam', event)">Exams</button>
                </div>
              </div>
              <div class="tpl-list-scroll" id="notes-tpl-list">
                <!-- General & Study -->
                <div class="tpl-item" data-cat="general" onclick="LessonApp.insertNoteTemplate('summary')"><i class="fas fa-file-alt text-blue"></i> <div><strong>Lesson Executive Summary</strong><small>Objectives, Key Notes, Action Items & Next Steps</small></div></div>
                <div class="tpl-item" data-cat="general" onclick="LessonApp.insertNoteTemplate('cornell')"><i class="fas fa-columns text-purple"></i> <div><strong>Cornell Notes Method</strong><small>Cues/Keywords, Lecture Notes, Synthesis Summary</small></div></div>
                <div class="tpl-item" data-cat="general" onclick="LessonApp.insertNoteTemplate('active_recall')"><i class="fas fa-brain text-gold"></i> <div><strong>Smart Active Recall & Questions</strong><small>Core Concepts, Self-Test Queries, Action Roadmap</small></div></div>
                <div class="tpl-item" data-cat="general" onclick="LessonApp.insertNoteTemplate('milestone')"><i class="fas fa-trophy text-orange"></i> <div><strong>Progress & Breakthrough Tracker</strong><small>Today's Breakthroughs, Friction Areas, CEFR Goal</small></div></div>
                <div class="tpl-item" data-cat="general" onclick="LessonApp.insertNoteTemplate('tutor_debrief')"><i class="fas fa-chalkboard-teacher text-green"></i> <div><strong>Tutor Debrief & Homework Sheet</strong><small>Tutor Observations, Practice Drills, Next Focus</small></div></div>

                <!-- Speaking & Fluency -->
                <div class="tpl-item" data-cat="speaking" onclick="LessonApp.insertNoteTemplate('speaking_clinic')"><i class="fas fa-microphone-alt text-pink"></i> <div><strong>Speaking Clinic & Diagnostic</strong><small>Fluency Metrics, Pronunciation, Intonation, Idioms</small></div></div>
                <div class="tpl-item" data-cat="speaking" onclick="LessonApp.insertNoteTemplate('pronunciation_drill')"><i class="fas fa-volume-up text-blue"></i> <div><strong>Pronunciation & Connected Speech</strong><small>Minimal Pairs, Linking, Elision & Syllable Stress</small></div></div>
                <div class="tpl-item" data-cat="speaking" onclick="LessonApp.insertNoteTemplate('debate_matrix')"><i class="fas fa-balance-scale text-purple"></i> <div><strong>Debate & Argumentation Matrix</strong><small>Motion, Arguments For & Against, Rebuttal Strategy</small></div></div>
                <div class="tpl-item" data-cat="speaking" onclick="LessonApp.insertNoteTemplate('roleplay_script')"><i class="fas fa-theater-masks text-gold"></i> <div><strong>Roleplay & Dialogue Scenario</strong><small>Setting, Role A/B Prompts & Target Expressions</small></div></div>
                <div class="tpl-item" data-cat="speaking" onclick="LessonApp.insertNoteTemplate('pitch_blueprint')"><i class="fas fa-chart-line text-green"></i> <div><strong>Presentation & Pitch Blueprint</strong><small>Hook, Problem/Solution, 3 Core Pillars, Call to Action</small></div></div>
                <div class="tpl-item" data-cat="speaking" onclick="LessonApp.insertNoteTemplate('smalltalk_tree')"><i class="fas fa-comments text-orange"></i> <div><strong>Small Talk & Conversation Starters</strong><small>Opening Icebreakers, Branching Follow-ups, Graceful Exits</small></div></div>

                <!-- Grammar & Accuracy -->
                <div class="tpl-item" data-cat="grammar" onclick="LessonApp.insertNoteTemplate('grammar_box')"><i class="fas fa-graduation-cap text-orange"></i> <div><strong>Grammar Focus Box</strong><small>Rule, Formula, Positive/Negative/Q Forms, Pitfalls</small></div></div>
                <div class="tpl-item" data-cat="grammar" onclick="LessonApp.insertNoteTemplate('tense_timeline')"><i class="fas fa-history text-blue"></i> <div><strong>Tense Timeline & Contrast Matrix</strong><small>Tense A vs Tense B, Signal Time Words, Nuanced Pairs</small></div></div>
                <div class="tpl-item" data-cat="grammar" onclick="LessonApp.insertNoteTemplate('error_log')"><i class="fas fa-exclamation-triangle text-pink"></i> <div><strong>Error Correction & Prevention Log</strong><small>Incorrect Form, Grammar Rule, Correct Form, Sentence</small></div></div>
                <div class="tpl-item" data-cat="grammar" onclick="LessonApp.insertNoteTemplate('conditionals')"><i class="fas fa-code-branch text-purple"></i> <div><strong>Conditionals & Modals Master Guide</strong><small>0/1st/2nd/3rd/Mixed Conditionals & Probability Nuance</small></div></div>
                <div class="tpl-item" data-cat="grammar" onclick="LessonApp.insertNoteTemplate('prepositions')"><i class="fas fa-link text-green"></i> <div><strong>Prepositions & Collocations Clinic</strong><small>Dependent Prepositions & High-Frequency Pairings</small></div></div>
                <div class="tpl-item" data-cat="grammar" onclick="LessonApp.insertNoteTemplate('passive_active')"><i class="fas fa-exchange-alt text-gold"></i> <div><strong>Passive vs Active Voice Matrix</strong><small>Agent vs Action Focus, Transformation, Academic Use</small></div></div>

                <!-- Vocabulary & Idioms -->
                <div class="tpl-item" data-cat="vocab" onclick="LessonApp.insertNoteTemplate('vocab_vault')"><i class="fas fa-book text-green"></i> <div><strong>Lexical Vault (with L1 Translation)</strong><small>Word, IPA, Part of Speech, Definition, L1, Example</small></div></div>
                <div class="tpl-item" data-cat="vocab" onclick="LessonApp.insertNoteTemplate('phrasal_pack')"><i class="fas fa-bolt text-gold"></i> <div><strong>Phrasal Verbs Power Pack</strong><small>Phrasal Verb, Literal vs Idiom, Separable, 2 Dialogues</small></div></div>
                <div class="tpl-item" data-cat="vocab" onclick="LessonApp.insertNoteTemplate('idioms_lab')"><i class="fas fa-fire text-orange"></i> <div><strong>Idioms & Colloquial Slang Bank</strong><small>Idiom, Cultural Vibe, Natural Usage & Warning</small></div></div>
                <div class="tpl-item" data-cat="vocab" onclick="LessonApp.insertNoteTemplate('awl_builder')"><i class="fas fa-feather-alt text-purple"></i> <div><strong>Academic Word List (AWL) Builder</strong><small>Academic Term, Word Family (noun/verb/adj/adv), Sentence</small></div></div>
                <div class="tpl-item" data-cat="vocab" onclick="LessonApp.insertNoteTemplate('business_bank')"><i class="fas fa-briefcase text-blue"></i> <div><strong>Executive & Business English Bank</strong><small>Corporate Term, High-Register Synonym, Meeting Usage</small></div></div>
                <div class="tpl-item" data-cat="vocab" onclick="LessonApp.insertNoteTemplate('synonyms_spectrum')"><i class="fas fa-sliders-h text-pink"></i> <div><strong>Synonyms & Nuances Spectrum</strong><small>Base Word -> Nuanced Synonyms -> Context Appropriateness</small></div></div>

                <!-- Writing & Composition -->
                <div class="tpl-item" data-cat="writing" onclick="LessonApp.insertNoteTemplate('essay_5p')"><i class="fas fa-pen-nib text-purple"></i> <div><strong>5-Paragraph Essay Blueprint</strong><small>Hook & Thesis, 3 Evidence Bodies, Counter & Conclusion</small></div></div>
                <div class="tpl-item" data-cat="writing" onclick="LessonApp.insertNoteTemplate('business_email')"><i class="fas fa-envelope-open-text text-blue"></i> <div><strong>Formal Business Email / Letter</strong><small>Salutation, Purpose Statement, Action Request, Sign-off</small></div></div>
                <div class="tpl-item" data-cat="writing" onclick="LessonApp.insertNoteTemplate('ielts_task2')"><i class="fas fa-university text-orange"></i> <div><strong>IELTS/TOEFL Task 2 Academic Essay</strong><small>Prompt Breakdown, Paraphrase, Body Paragraphs, Synthesis</small></div></div>
                <div class="tpl-item" data-cat="writing" onclick="LessonApp.insertNoteTemplate('ielts_task1')"><i class="fas fa-chart-pie text-green"></i> <div><strong>IELTS Task 1 Data Report Outline</strong><small>Overview Statement, Key Trends, Data Pairs, Transitions</small></div></div>
                <div class="tpl-item" data-cat="writing" onclick="LessonApp.insertNoteTemplate('meeting_minutes')"><i class="fas fa-clipboard-list text-gold"></i> <div><strong>Meeting Minutes & Action Register</strong><small>Attendees, Agenda, Decisions Reached, Action Table</small></div></div>
                <div class="tpl-item" data-cat="writing" onclick="LessonApp.insertNoteTemplate('story_arc')"><i class="fas fa-book-open text-pink"></i> <div><strong>Creative Story Arc & Narrative</strong><small>Setting/Hook, Inciting Incident, Climax, Resolution</small></div></div>

                <!-- Exams & Assessment -->
                <div class="tpl-item" data-cat="exam" onclick="LessonApp.insertNoteTemplate('ielts_speaking')"><i class="fas fa-certificate text-gold"></i> <div><strong>IELTS Speaking Full Cheat Sheet</strong><small>Band 7+ Fillers, Part 2 1-Min Notes, Part 3 Framework</small></div></div>
                <div class="tpl-item" data-cat="exam" onclick="LessonApp.insertNoteTemplate('toefl_speaking')"><i class="fas fa-stopwatch text-pink"></i> <div><strong>TOEFL Speaking 45s Response Matrix</strong><small>Topic Statement, Reason 1+Detail, Reason 2+Detail, Ending</small></div></div>
                <div class="tpl-item" data-cat="exam" onclick="LessonApp.insertNoteTemplate('cambridge_use')"><i class="fas fa-key text-blue"></i> <div><strong>Cambridge C1/C2 Use of English</strong><small>Key Word Transformations, Inversion & Cleft Structures</small></div></div>
                <div class="tpl-item" data-cat="exam" onclick="LessonApp.insertNoteTemplate('self_audit')"><i class="fas fa-user-check text-green"></i> <div><strong>Self-Reflection & Error Audit</strong><small>What Clicked, What Confused Me, 10-Minute Action Plan</small></div></div>
                <div class="tpl-item" data-cat="exam" onclick="LessonApp.insertNoteTemplate('flashcards_sheet')"><i class="fas fa-clone text-purple"></i> <div><strong>Daily 5-3-1 Flashcard Matrix</strong><small>5 New Words, 3 New Sentences, 1 Pronunciation Challenge</small></div></div>
              </div>
            </div>
          </div>

          <button class="notes-tb-btn" onclick="LessonApp.embedNoteMedia()" title="Add YouTube, MP3 Audio, GIF, or Link"><i class="fas fa-photo-video" style="color:#3b82f6;"></i> <span>Media Link</span></button>
          <button class="notes-tb-btn" onclick="LessonApp.copyStyledNote()" title="Copy Note with Theme Formatting"><i class="fas fa-copy" style="color:#d97706;"></i> <span>Copy Card</span></button>
          <button class="notes-tb-btn" onclick="LessonApp.shakeNotesFocus()" title="Shake Effect Focus"><i class="fas fa-ghost" style="color:#ec4899;"></i></button>
          <button class="notes-tb-btn" onclick="LessonApp.showNoteHotkeysModal()" title="Keyboard Shortcuts"><i class="fas fa-keyboard"></i></button>
          
          <!-- Pen Action Button with Dropdown Chevron (Linguistic Assistant) -->
          <div class="notes-split-btn-wrap" id="notes-pen-wrap">
            <button class="notes-tb-btn pen-action-btn" id="notes-pen-btn" onclick="LessonApp.runActivePenAction(event)" title="Linguistic Analysis (Click to run)" aria-label="Run Linguistic Analysis">
              <i class="fas fa-feather-alt" style="color:#06b6d4;"></i>
              <span id="notes-pen-label" style="font-size:0.75rem; font-weight:700; color:#0891b2; margin-left:2px;">Analysis</span>
            </button>
            <button class="notes-tb-btn pen-arrow-btn" id="notes-pen-arrow" onclick="LessonApp.togglePenMenu(event)" title="Choose Linguistic Mode & Settings" aria-label="Linguistic Menu">
              <i class="fas fa-chevron-down" style="font-size:0.65rem; color:#0891b2;"></i>
            </button>
            <div class="notes-menu-popup pen-menu-popup" id="notes-pen-menu" style="display:none;">
              <div class="pen-menu-header">
                <i class="fas fa-feather-alt" style="color:#06b6d4; font-size:1.1rem;"></i>
                <div>
                  <strong>Linguistic Assistant</strong>
                  <small>Integrated proofreading, styling & assessment</small>
                </div>
              </div>
              <div class="pen-menu-list">
                <div class="pen-menu-item featured" id="pen-item-full" onclick="LessonApp.selectAndRunPenMode('full', event)">
                  <i class="fas fa-sparkles text-cyan"></i>
                  <div style="flex:1;">
                    <strong>Linguistic Analysis</strong>
                    <small>Integrated all-in-one assistant (Corrections, Paraphrased, Styles, Scores, Vocabulary & Rules)</small>
                  </div>
                  <i class="fas fa-check pen-mode-check" id="pen-check-full" style="color:#06b6d4; font-size:0.8rem;"></i>
                </div>
                <div class="pen-menu-item" id="pen-item-redline" onclick="LessonApp.selectAndRunPenMode('redline', event)">
                  <i class="fas fa-highlighter text-red"></i>
                  <div style="flex:1;">
                    <strong>Corrections</strong>
                    <small>Inline strikethroughs on errors with bold green corrections</small>
                  </div>
                  <i class="fas fa-check pen-mode-check" id="pen-check-redline" style="display:none; color:#06b6d4; font-size:0.8rem;"></i>
                </div>
                <div class="pen-menu-item" id="pen-item-elevate" onclick="LessonApp.selectAndRunPenMode('elevate', event)">
                  <i class="fas fa-magic text-purple"></i>
                  <div style="flex:1;">
                    <strong>Paraphrased</strong>
                    <small>Sophisticated native phrasing & lexical upgrade</small>
                  </div>
                  <i class="fas fa-check pen-mode-check" id="pen-check-elevate" style="display:none; color:#06b6d4; font-size:0.8rem;"></i>
                </div>
                <div class="pen-menu-item" id="pen-item-styles" onclick="LessonApp.selectAndRunPenMode('styles', event)">
                  <i class="fas fa-sliders-h text-blue"></i>
                  <div style="flex:1;">
                    <strong>Styles</strong>
                    <small>Formal executive, casual conversational & raw colloquial</small>
                  </div>
                  <i class="fas fa-check pen-mode-check" id="pen-check-styles" style="display:none; color:#06b6d4; font-size:0.8rem;"></i>
                </div>
                <div class="pen-menu-item" id="pen-item-score" onclick="LessonApp.selectAndRunPenMode('score', event)">
                  <i class="fas fa-chart-pie text-gold"></i>
                  <div style="flex:1;">
                    <strong>Scores</strong>
                    <small>Speaking & writing scorecards with CEFR benchmarks</small>
                  </div>
                  <i class="fas fa-check pen-mode-check" id="pen-check-score" style="display:none; color:#06b6d4; font-size:0.8rem;"></i>
                </div>
                <div class="pen-menu-item" id="pen-item-vocab" onclick="LessonApp.selectAndRunPenMode('vocab', event)">
                  <i class="fas fa-book-reader text-green"></i>
                  <div style="flex:1;">
                    <strong>Vocabulary</strong>
                    <small>At-level & above-level vocabulary with native translations</small>
                  </div>
                  <i class="fas fa-check pen-mode-check" id="pen-check-vocab" style="display:none; color:#06b6d4; font-size:0.8rem;"></i>
                </div>
                <div class="pen-menu-item" id="pen-item-pronunciation" onclick="LessonApp.selectAndRunPenMode('pronunciation', event)">
                  <i class="fas fa-microphone-alt text-blue"></i>
                  <div style="flex:1;">
                    <strong>Pronunciation & Golden Rule</strong>
                    <small>Phonetic clinic, connected speech & golden rules</small>
                  </div>
                  <i class="fas fa-check pen-mode-check" id="pen-check-pronunciation" style="display:none; color:#06b6d4; font-size:0.8rem;"></i>
                </div>
                <div class="pen-menu-divider"></div>
                <div class="pen-menu-item settings-item" onclick="LessonApp.showEditorialSettingsModal()">
                  <i class="fas fa-cog text-slate"></i>
                  <div>
                    <strong>Editorial & Linguistic Settings...</strong>
                    <small>Configure custom API key, model & L1 language</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="notes-body">
        <div id="notes-editor" class="notes-editor-content" contenteditable="true" oninput="LessonApp.saveNotes()" placeholder="Type your notes here... (Paste images, GIFs, YouTube or MP3 links directly, or right-click for translation & dictionary definitions)"></div>
      </div>

      <!-- Framed Notes Footer neatly inside the panel frame -->
      <div class="notes-footer">
        <div class="notes-footer-left">
          <span class="notes-status-badge" id="notes-saved-status"><i class="fas fa-check-circle" style="color:#10b981;"></i> Auto-Saved</span>
        </div>
        <div class="notes-footer-right">
          <button class="notes-ftr-btn save-btn" onclick="LessonApp.saveAllNotesManually()" title="Save all pages to storage">
            <i class="fas fa-save"></i> Save All
          </button>
          <button class="notes-ftr-btn pdf-btn" onclick="LessonApp.exportNotes('pdf')" title="Open print-friendly notes in new tab to Save as PDF">
            <i class="fas fa-file-pdf"></i> PDF
          </button>
          <button class="notes-ftr-btn" onclick="LessonApp.exportNotes('txt')" title="Export all pages as TXT">
            <i class="fas fa-file-alt"></i> TXT
          </button>
          <button class="notes-ftr-btn" onclick="LessonApp.exportNotes('html')" title="Export all pages as HTML">
            <i class="fas fa-file-code"></i> HTML
          </button>
          <button class="notes-ftr-btn clear-btn" onclick="LessonApp.clearCurrentPageNotes()" title="Clear current page notes">
            <i class="fas fa-eraser"></i> Clear
          </button>
        </div>
      </div>
    </div>
  `;

export const BOOKMARKS_PANEL_HTML = `
    <div class="bookmarks-panel" id="bookmarks-panel" style="display:none;">
      <div class="bookmarks-header">
        <div class="bookmarks-tab-bar">
          <button class="bm-tab-btn active" id="bm-tab-list" onclick="LessonApp.switchBookmarkTab('list')"><i class="fas fa-bookmark"></i> Bookmarks</button>
          <button class="bm-tab-btn" id="bm-tab-analytics" onclick="LessonApp.switchBookmarkTab('analytics')"><i class="fas fa-chart-line"></i> Time & Study Log</button>
        </div>
        <button class="bm-close-btn" onclick="event.stopPropagation(); if(window.LessonApp && LessonApp.closeBookmarks){ LessonApp.closeBookmarks(); } else { var p=document.getElementById('bookmarks-panel'); if(p) p.style.display='none'; } if(window.LessonApp && LessonApp.updateBookmarkCount){ try { LessonApp.updateBookmarkCount(); } catch(e) {} }" title="Close Bookmarks panel"><i class="fas fa-times"></i></button>
      </div>

      <div class="bookmarks-body" id="bookmarks-tab-list-content">
        <div id="bookmarks-list"></div>
      </div>

      <div class="bookmarks-body" id="bookmarks-tab-analytics-content" style="display:none;">
        <div class="bm-analytics-container">
          <div class="bm-time-card">
            <div class="bm-time-card-hdr">
              <i class="fas fa-stopwatch" style="color:#38bdf8;"></i>
              <span>Active Study Time</span>
            </div>
            <div class="bm-time-display" id="bm-live-session-time">00:00:00</div>
            <div class="bm-time-meta" id="bm-session-start-meta">Started Today</div>
          </div>

          <div class="bm-metrics-grid">
            <div class="bm-metric-box">
              <span class="bm-metric-val" id="bm-stat-total-time">0s</span>
              <span class="bm-metric-lbl">Total Time</span>
            </div>
            <div class="bm-metric-box">
              <span class="bm-metric-val" id="bm-stat-bm-count">0</span>
              <span class="bm-metric-lbl">Bookmarks</span>
            </div>
            <div class="bm-metric-box">
              <span class="bm-metric-val" id="bm-stat-accuracy">100%</span>
              <span class="bm-metric-lbl">Accuracy</span>
            </div>
            <div class="bm-metric-box">
              <span class="bm-metric-val" id="bm-stat-completed">0 Done</span>
              <span class="bm-metric-lbl">Completed</span>
            </div>
          </div>

          <div class="bm-visit-history">
            <h5><i class="fas fa-history" style="color:#10b981;"></i> Lesson Study Log & History</h5>
            <div id="bm-visit-history-list" class="bm-visit-history-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;

export const NOTES_BOOKMARKS_CSS = `    /* ===== NOTES PANEL (SUPER ADVANCED TEXT EDITOR) ===== */
    .notes-panel {
      position: fixed; right: 0; top: 0; width: 460px; max-width: 94vw; height: 100vh;
      background: var(--theme-surface, #ffffff); z-index: 10006; box-shadow: -8px 0 30px rgba(0,0,0,0.25);
      display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: 'Inter', system-ui, -apple-system, sans-serif; border-left: 1px solid var(--theme-text, #1e293b)15;
      color: var(--theme-text, #1e293b); backdrop-filter: none !important; opacity: 1 !important;
    }
    .notes-panel.maximized {
      width: 92vw !important; max-width: 1200px !important; right: 4vw !important; top: 3vh !important; height: 94vh !important; border-radius: 16px !important; border: 1px solid var(--theme-text-20) !important;
    }
    .notes-panel.is-pinned {
      border-left: 3px solid #8b5cf6 !important;
    }
    .notes-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; border-bottom: 1px solid var(--theme-text-12); background: var(--theme-bg);
      border-top-left-radius: inherit; border-top-right-radius: inherit;
    }
    .notes-title-wrap { display: flex; align-items: center; gap: 10px; }
    .notes-title-icon { font-size: 1.2rem; color: #8b5cf6; }
    .notes-header h4 { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--theme-text); }
    .notes-subtitle { font-size: 0.72rem; color: var(--theme-text-secondary); font-weight: 600; display: block; }
    .notes-hdr-actions { display: flex; gap: 6px; align-items: center; }
    .notes-action-btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--theme-text-15);
      background: var(--theme-surface); color: var(--theme-text); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 0.85rem; transition: all 0.2s;
    }
    .notes-action-btn:hover { background: var(--theme-primary); color: white; border-color: var(--theme-primary); }
    .notes-action-btn.close-btn:hover { background: #ef4444; color: white; border-color: #ef4444; }
    .notes-action-btn#notes-pin-btn.active,
    .notes-action-btn.is-pinned {
      background: #8b5cf6 !important; color: white !important; border-color: #8b5cf6 !important;
      box-shadow: 0 0 10px rgba(139,92,246,0.35);
    }

    /* Notes Page Management Bar */
    .notes-pages-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 12px; background: var(--theme-bg); border-bottom: 1px solid var(--theme-text-12);
      gap: 8px;
    }
    .notes-pages-nav {
      display: flex; align-items: center; gap: 5px; flex: 1; min-width: 0;
    }
    .notes-page-nav-btn {
      width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--theme-text-15);
      background: var(--theme-surface); color: var(--theme-text); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 0.72rem; transition: all 0.2s;
    }
    .notes-page-nav-btn:hover:not(:disabled) { background: var(--theme-primary); color: white; border-color: var(--theme-primary); }
    .notes-page-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .notes-page-selector-wrap {
      display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;
      background: var(--theme-surface); border: 1px solid var(--theme-text-15); border-radius: 6px; padding: 2px 8px; height: 26px;
    }
    .notes-page-counter {
      font-size: 0.72rem; font-weight: 700; color: var(--theme-text-secondary); white-space: nowrap;
    }
    .notes-page-name-input {
      border: none; background: transparent; outline: none; font-size: 0.78rem; font-weight: 700;
      color: var(--theme-text); width: 100%; min-width: 50px; text-overflow: ellipsis; padding: 0;
    }
    .notes-pages-actions {
      display: flex; align-items: center; gap: 5px;
    }
    .notes-page-action-btn {
      height: 26px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--theme-text-15);
      background: var(--theme-surface); color: var(--theme-text); font-size: 0.75rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s; white-space: nowrap;
    }
    .notes-page-action-btn.add-btn {
      background: rgba(139,92,246,0.12); color: #8b5cf6; border-color: rgba(139,92,246,0.35);
    }
    .notes-page-action-btn.add-btn:hover {
      background: #8b5cf6; color: white; border-color: #8b5cf6;
    }
    .notes-page-action-btn.del-btn {
      color: #ef4444; border-color: rgba(239,68,68,0.3); padding: 0 7px;
    }
    .notes-page-action-btn.del-btn:hover {
      background: #ef4444; color: white; border-color: #ef4444;
    }
    .notes-page-tabs {
      display: flex; gap: 4px; overflow-x: auto; padding: 4px 12px; background: var(--theme-bg);
      border-bottom: 1px solid var(--theme-text-10); scrollbar-width: thin;
    }
    .notes-page-tab-chip {
      padding: 2px 9px; border-radius: 12px; font-size: 0.7rem; font-weight: 700;
      border: 1px solid var(--theme-text-15); background: var(--theme-surface); color: var(--theme-text-secondary);
      cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px; transition: all 0.15s;
    }
    .notes-page-tab-chip:hover { border-color: #8b5cf6; color: var(--theme-text); }
    .notes-page-tab-chip.active {
      background: #8b5cf6; color: white; border-color: #8b5cf6;
    }

    /* Reorganized Organized Toolbar */
    .notes-toolbar-container {
      background: var(--theme-bg); border-bottom: 1px solid var(--theme-text-12); padding: 8px 12px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .notes-tb-group { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .notes-tb-btn {
      padding: 5px 8px; height: 30px; border-radius: 6px; border: 1px solid var(--theme-text-12);
      background: var(--theme-surface); color: var(--theme-text); font-size: 0.8rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.15s;
    }
    .notes-tb-btn:hover { background: var(--theme-primary-15); border-color: var(--theme-primary-40); color: var(--theme-primary); }
    .notes-tb-btn.mic-btn.recording { background: #ef4444; color: white; border-color: #ef4444; animation: pulseRed 1s infinite; }
    
    /* Split Pen Action Button & Dropdown Chevron */
    .notes-split-btn-wrap {
      display: inline-flex; align-items: center; position: relative; border-radius: 6px;
    }
    .notes-tb-btn.pen-action-btn {
      height: 30px; padding: 0 8px; border-radius: 6px 0 0 6px; border-right: none;
      background: rgba(6, 182, 212, 0.08); border-color: rgba(6, 182, 212, 0.35);
      color: var(--theme-text); font-weight: 700; font-size: 0.78rem;
    }
    .notes-tb-btn.pen-action-btn:hover {
      background: rgba(6, 182, 212, 0.2); border-color: #06b6d4; color: #0891b2;
    }
    .notes-tb-btn.pen-arrow-btn {
      height: 30px; width: 22px; padding: 0; justify-content: center; border-radius: 0 6px 6px 0;
      background: rgba(6, 182, 212, 0.08); border-color: rgba(6, 182, 212, 0.35);
    }
    .notes-tb-btn.pen-arrow-btn:hover {
      background: rgba(6, 182, 212, 0.2); border-color: #06b6d4;
    }
    .notes-tb-btn.pen-tool-btn {
      width: 32px; height: 30px; justify-content: center; padding: 0;
      background: rgba(6, 182, 212, 0.08); border-color: rgba(6, 182, 212, 0.35);
    }
    .notes-tb-btn.pen-tool-btn:hover {
      background: #06b6d4; border-color: #06b6d4; color: white !important;
    }
    .notes-tb-btn.pen-tool-btn:hover i { color: white !important; }
    
    /* High-contrast Redline Strikethrough & Green Additions */
    .diff-del, del.diff-del, del {
      color: #dc2626 !important;
      background: rgba(239, 68, 68, 0.12) !important;
      text-decoration: line-through !important;
      font-weight: 600 !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      margin: 0 2px !important;
      display: inline !important;
    }
    .diff-ins, ins.diff-ins, ins {
      color: #16a34a !important;
      background: rgba(22, 163, 74, 0.12) !important;
      text-decoration: none !important;
      font-weight: 700 !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      margin: 0 2px !important;
      display: inline !important;
    }
    .tb-divider { width: 1px; height: 20px; background: var(--theme-text-15); margin: 0 4px; }
    .notes-color-picker { width: 26px; height: 26px; padding: 0; border: none; background: none; cursor: pointer; border-radius: 4px; }

    /* Dropdown Menu Popup & Templates Catalog */
    .notes-dropdown-wrap { position: relative; }
    .notes-menu-popup {
      position: absolute; top: 100%; left: 0; margin-top: 4px; width: 280px;
      background: var(--theme-surface); border: 1px solid var(--theme-text-20); border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.3); z-index: 10010; padding: 6px; display: flex; flex-direction: column; gap: 4px;
    }
    .tpl-menu-popup {
      width: 340px; max-width: 90vw; padding: 10px; max-height: 440px;
    }
    .tpl-menu-header { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; padding-bottom: 8px; border-bottom: 1px solid var(--theme-text-12); }
    .tpl-search-wrap {
      display: flex; align-items: center; gap: 8px; background: var(--theme-bg); border: 1px solid var(--theme-text-15); border-radius: 8px; padding: 4px 10px;
    }
    .tpl-search-wrap i { color: var(--theme-text-secondary); font-size: 0.8rem; }
    .tpl-search-input {
      border: none; background: transparent; outline: none; font-size: 0.8rem; font-weight: 600; color: var(--theme-text); width: 100%;
    }
    .tpl-category-pills {
      display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; padding: 2px 0;
    }
    .tpl-category-pills::-webkit-scrollbar { display: none; }
    .tpl-cat-pill {
      padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; border: 1px solid var(--theme-text-15);
      background: var(--theme-surface); color: var(--theme-text-secondary); cursor: pointer; white-space: nowrap; transition: all 0.15s;
    }
    .tpl-cat-pill:hover { border-color: #8b5cf6; color: var(--theme-text); }
    .tpl-cat-pill.active { background: #8b5cf6; color: white; border-color: #8b5cf6; }
    .tpl-list-scroll {
      display: flex; flex-direction: column; gap: 4px; max-height: 310px; overflow-y: auto; scrollbar-width: thin;
    }
    .tpl-item {
      padding: 8px 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s;
    }
    .tpl-item:hover { background: var(--theme-primary-12); }
    .tpl-item i { font-size: 1.1rem; width: 22px; text-align: center; flex-shrink: 0; }
    .tpl-item strong { display: block; font-size: 0.82rem; color: var(--theme-text); }
    .tpl-item small { display: block; font-size: 0.72rem; color: var(--theme-text-secondary); line-height: 1.2; }

    /* Pen Assistant Dropdown Menu */
    .pen-menu-popup {
      width: 320px; max-width: 90vw; padding: 8px; max-height: 450px; overflow-y: auto;
    }
    .pen-menu-header {
      display: flex; align-items: center; gap: 8px; padding: 6px 10px 10px; border-bottom: 1px solid var(--theme-text-12); margin-bottom: 6px;
    }
    .pen-menu-header strong { font-size: 0.85rem; color: var(--theme-text); display: block; }
    .pen-menu-header small { font-size: 0.72rem; color: var(--theme-text-secondary); display: block; }
    .pen-menu-list { display: flex; flex-direction: column; gap: 3px; }
    .pen-menu-item {
      padding: 7px 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.15s;
    }
    .pen-menu-item:hover { background: rgba(6, 182, 212, 0.12); }
    .pen-menu-item.featured { background: rgba(6, 182, 212, 0.07); border: 1px solid rgba(6, 182, 212, 0.25); }
    .pen-menu-item i { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; }
    .pen-menu-item strong { display: block; font-size: 0.82rem; color: var(--theme-text); }
    .pen-menu-item small { display: block; font-size: 0.71rem; color: var(--theme-text-secondary); line-height: 1.2; }
    .pen-menu-divider { height: 1px; background: var(--theme-text-12); margin: 4px 0; }
    .pen-menu-item.settings-item:hover { background: var(--theme-text-10); }

    /* Note Content Area */
    .notes-body { flex: 1; padding: 14px; overflow-y: auto; background: var(--theme-surface); }
    .notes-editor-content {
      width: 100%; min-height: 100%; outline: none; color: var(--theme-text); font-size: 0.95rem; line-height: 1.7;
    }
    .notes-editor-content[placeholder]:empty:before {
      content: attr(placeholder); color: var(--theme-text-secondary); opacity: 0.6; pointer-events: none;
    }
    .notes-editor-content img { max-width: 95%; max-height: 250px; border-radius: 10px; margin: 8px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .notes-editor-content iframe { border-radius: 10px; margin: 8px 0; }
    .notes-editor-content blockquote { border-left: 4px solid #8b5cf6; background: rgba(139,92,246,0.08); padding: 8px 14px; border-radius: 0 8px 8px 0; margin: 8px 0; }

    /* Framed Notes Footer */
    .notes-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 12px; background: var(--theme-bg); border-top: 1px solid var(--theme-text-15);
      flex-shrink: 0; box-sizing: border-box; width: 100%; gap: 6px;
    }
    .notes-footer-left { display: flex; align-items: center; min-width: 0; }
    .notes-footer-right { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .notes-status-badge { font-size: 0.72rem; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 4px; }
    .notes-ftr-btn {
      padding: 5px 9px; font-size: 0.75rem; font-weight: 700; border-radius: 6px;
      border: 1px solid var(--theme-text-18); background: var(--theme-surface); color: var(--theme-text);
      cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s;
      white-space: nowrap; line-height: 1.2;
    }
    .notes-ftr-btn:hover { background: var(--theme-primary-15); border-color: var(--theme-primary-50); color: var(--theme-primary); }
    .notes-ftr-btn.save-btn { color: #8b5cf6; border-color: rgba(139,92,246,0.35); background: rgba(139,92,246,0.08); }
    .notes-ftr-btn.save-btn:hover { background: #8b5cf6; color: #fff; border-color: #8b5cf6; }
    .notes-ftr-btn.pdf-btn { color: #ef4444; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.06); }
    .notes-ftr-btn.pdf-btn:hover { background: #ef4444; color: #fff; border-color: #ef4444; }
    .notes-ftr-btn.clear-btn { color: var(--theme-error); border-color: rgba(239,68,68,0.25); }
    .notes-ftr-btn.clear-btn:hover { background: rgba(239,68,68,0.15); border-color: var(--theme-error); }

    /* Editorial Review Diff & Output Formatting */
    .diff-del { background: rgba(239, 68, 68, 0.12); color: #dc2626; text-decoration: line-through; padding: 1px 4px; border-radius: 3px; font-weight: 600; margin: 0 2px; display: inline; }
    .diff-ins { background: rgba(22, 163, 74, 0.12); color: #16a34a; font-weight: 700; text-decoration: none; padding: 1px 4px; border-radius: 3px; margin: 0 2px; display: inline; }
    .editorial-block {
      margin: 14px 0; border: 1px solid var(--theme-text-15); border-radius: 12px;
      background: var(--theme-bg); padding: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .editorial-block-hdr { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.88rem; margin-bottom: 8px; }
    .editorial-score-bar-bg { width: 100%; height: 8px; border-radius: 4px; background: var(--theme-text-15); overflow: hidden; margin: 4px 0 10px; }
    .editorial-score-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }

    /* Text Colors for Icon accents */
    .text-blue { color: #3b82f6 !important; }
    .text-green { color: #10b981 !important; }
    .text-purple { color: #8b5cf6 !important; }
    .text-gold { color: #eab308 !important; }
    .text-orange { color: #f97316 !important; }
    .text-pink { color: #ec4899 !important; }
    .text-red { color: #ef4444 !important; }
    .text-cyan { color: #06b6d4 !important; }
    .text-slate { color: #64748b !important; }

    /* Themes for Notes */
    .notes-panel.theme-yellow { background: #fffdf0 !important; color: #1e293b !important; }
    .notes-panel.theme-sky { background: #f0f9ff !important; color: #0c4a6e !important; }
    .notes-panel.theme-mint { background: #f0fdf4 !important; color: #14532d !important; }
    .notes-panel.theme-pink { background: #fdf2f8 !important; color: #831843 !important; }
    .notes-panel.theme-slate { background: #0f172a !important; color: #f8fafc !important; }
    .notes-panel.theme-violet { background: #2e1065 !important; color: #f3e8ff !important; }

    /* BOOKMARKS & ANALYTICS PANEL */
    .bookmarks-panel {
      position: fixed; right: 0; top: 0; width: 420px; max-width: 92vw; height: 100vh;
      background: var(--theme-surface, #ffffff); z-index: 10006; box-shadow: -8px 0 30px rgba(0,0,0,0.25);
      display: flex; flex-direction: column; border-left: 1px solid var(--theme-text, #1e293b)15;
      color: var(--theme-text, #1e293b); backdrop-filter: none !important; opacity: 1 !important;
    }
    .bookmarks-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 14px; border-bottom: 1px solid var(--theme-text, #1e293b)12; background: var(--theme-bg, #f8fafc);
      gap: 10px;
    }
    .bm-close-btn {
      width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px; border: 1px solid var(--theme-text, #1e293b)15;
      background: var(--theme-surface, #ffffff); color: var(--theme-text, #1e293b); cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 0.9rem; transition: all 0.2s;
    }
    .bm-close-btn:hover { background: #ef4444; color: #fff; border-color: #ef4444; transform: scale(1.05); }
    .bookmarks-tab-bar { display: flex; gap: 4px; background: var(--theme-surface); padding: 3px; border-radius: 10px; border: 1px solid var(--theme-text-10); }
    .bm-tab-btn {
      padding: 6px 12px; border-radius: 8px; border: none; background: transparent; color: var(--theme-text-secondary);
      font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
    }
    .bm-tab-btn.active { background: var(--theme-primary); color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .bookmarks-body { flex: 1; padding: 14px; overflow-y: auto; }
    .bookmark-item {
      padding: 12px 14px; border-radius: 10px; margin-bottom: 8px;
      background: var(--theme-bg); cursor: pointer; font-weight: 600;
      font-size: 0.9rem; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;
      border: 1px solid var(--theme-text-08);
    }
    .bookmark-item:hover { background: var(--theme-primary-12); border-color: var(--theme-primary-30); transform: translateX(-2px); }
    .bookmark-remove { background: none; border: none; cursor: pointer; color: var(--theme-error); font-size: 0.9rem; padding: 4px 8px; border-radius: 4px; }
    .bookmark-remove:hover { background: var(--theme-error-15); }

    /* Analytics UI inside Bookmarks */
    .bm-analytics-container { display: flex; flex-direction: column; gap: 14px; }
    .bm-time-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white;
      border-radius: 14px; padding: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 20px rgba(0,0,0,0.2);
    }
    .bm-time-card-hdr { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .bm-time-display { font-size: 2.2rem; font-weight: 900; font-family: monospace; letter-spacing: 1px; color: #38bdf8; margin: 8px 0 4px 0; text-shadow: 0 0 12px rgba(56,189,248,0.3); }
    .bm-time-meta { font-size: 0.75rem; color: #cbd5e1; }

    .bm-metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .bm-metric-box {
      background: var(--theme-bg); border: 1px solid var(--theme-text-10); border-radius: 12px; padding: 10px 12px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .bm-metric-val { font-size: 1.15rem; font-weight: 900; color: var(--theme-primary); }
    .bm-metric-lbl { font-size: 0.72rem; font-weight: 700; color: var(--theme-text-secondary); text-transform: uppercase; }

    .bm-visit-history h5 { margin: 0 0 10px 0; font-size: 0.85rem; font-weight: 800; color: var(--theme-text); display: flex; align-items: center; gap: 6px; }
    .bm-visit-history-list { display: flex; flex-direction: column; gap: 8px; }
    .bm-visit-card {
      padding: 10px 12px; border-radius: 10px; background: var(--theme-bg); border: 1px solid var(--theme-text-10);
      font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; gap: 10px;
      transition: all 0.2s ease;
    }
    .bm-visit-card.current-session {
      border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06);
    }
    .bm-live-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;
      margin-right: 4px; box-shadow: 0 0 8px #10b981; animation: bmPulseLive 1.8s infinite;
    }
    @keyframes bmPulseLive { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
    .bm-visit-card strong { color: var(--theme-text); font-weight: 700; }
    .bm-visit-card span { color: var(--theme-text-secondary); font-size: 0.74rem; }

`;

export const getBookmarksNotesBootstrap = (
  learner: LearnerProfile,
  mode: 'presenter' | 'learner' = 'presenter',
  includePanels: boolean = false,
  hostEngine: boolean = false,
): string => {
  const BN_MODE = JSON.stringify(mode);
  // Pages WITHOUT their own LessonApp (Micro Lesson V2, Conversational lessons) ship
  // the FULL V1 Bookmarks & Notes engine here, so the Annotation Toolbar buttons open
  // exactly the same panels as Micro Lesson V1 — never a simpler version.
  const bnEngine =
    includePanels && !hostEngine
      ? getBnEngineBundle({
          learnerName: learner.name || 'Student',
          l1:
            learner.l1Language ||
            (learner as any).nativeLanguage ||
            (learner as any).motherTongue ||
            (learner as any).firstLanguage ||
            'Spanish',
          level:
            learner.cefrLevel ||
            (learner as any).targetLevel ||
            (learner as any).level ||
            'Intermediate (B1-B2)',
          voiceUri: (learner as any).readAloudVoice || '',
        })
      : '';
  return `
(function () {
  // The toolbar buttons carry their own inline onclick handlers, so opening the
  // panels needs no wiring here. This script only keeps the badge count and the
  // per-mode visibility of the buttons in sync with whatever engine is present.
  var BN_MODE = ${BN_MODE};
${bnEngine ? '  // ---- Full V1-compatible Bookmarks & Notes engine (installs window.LessonApp) ----\n' + bnEngine.split('\n').map((l) => '  ' + l).join('\n') : ''}
  function syncUi() {
    var bmBtn = document.getElementById('toolbar-bookmarks-btn');
    var ntBtn = document.getElementById('toolbar-notes-btn');
    // V1 engine (native or installed by the bundle above)
    if (window.LessonApp) {
      if (window.LessonApp.updateBookmarkCount) {
        try { window.LessonApp.updateBookmarkCount(); } catch (e) {}
      }
      if (window.LessonApp.refreshBookmarkIcons) {
        try { window.LessonApp.refreshBookmarkIcons(); } catch (e) {}
      }
      // Notes are presenter-only in V1 lessons.
      if (ntBtn && BN_MODE !== 'presenter') ntBtn.style.display = 'none';
      return;
    }
    // V2-style engine (native panels, native toggle functions)
    if (typeof window.toggleBookmarks === 'function') {
      if (ntBtn && BN_MODE === 'presenter' && typeof window.toggleNotes !== 'function') ntBtn.style.display = 'none';
      return;
    }
    // No matching engine at all — hide the buttons defensively.
    if (bmBtn) bmBtn.style.display = 'none';
    if (ntBtn) ntBtn.style.display = 'none';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncUi);
  } else {
    syncUi();
  }
  window.addEventListener('load', syncUi);
})();
`;
};
