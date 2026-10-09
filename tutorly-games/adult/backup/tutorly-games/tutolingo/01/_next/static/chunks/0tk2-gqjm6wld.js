(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,42903,e=>{"use strict";var t=e.i(17444),a=e.i(10161),n=e.i(8413),o=e.i(35788),r=e.i(26138);let s="English";var i=e.i(35423),l=e.i(53838);e.s(["default",0,function(){let{pack:e}=(0,i.useContent)(),{state:c,update:d}=(0,l.useStore)(),[m,u]=(0,a.useState)("auto"===c.l1?"":c.l1),[h,p]=(0,a.useState)(c.learnerInfo),[g,x]=(0,a.useState)(!1);(0,a.useEffect)(()=>{g||(u(t=>t||(c.l1&&"auto"!==c.l1?c.l1:e.meta.l1?(0,r.languageName)(e.meta.l1):"")),p(e=>e||c.learnerInfo))},[g,c.l1,c.learnerInfo,e.meta.l1]);let[f,v]=(0,a.useState)(e.meta.sourceDocument??""),[b,y]=(0,a.useState)(e.meta.targetLanguage||s),[w,N]=(0,a.useState)(e.meta.level??""),[k,C]=(0,a.useState)(!1),[E,T]=(0,a.useState)(!1),[j,S]=(0,a.useState)(null),L=(0,a.useRef)(null),R=(0,a.useMemo)(()=>{var e;let t,a,n,o;return t=(e={l1:(0,r.languageCode)(m)??"",l1Name:m?(0,r.languageName)(m):"«the learner's first language»",targetLanguage:b||s,learnerInfo:h,sourceName:f,level:w}).l1Name||e.l1,a=e.learnerInfo.trim()||"No extra learner details were provided — keep examples general but natural.",n=e.sourceName.trim()||"the attached source document",o=e.level.trim()||"the level taught by the source document",`# ROLE
You are an expert curriculum engineer, corpus linguist and pedagogical content designer. You read a source PDF (coursebook, unit, grammar book, textbook chapter or any teaching material) and convert it into ONE single, complete, machine-readable JSON file for the language-learning app "Tutolingo". The app renders every activity in the user interface in ENGLISH; all *learner-facing translations* must be in the learner's first language (L1) given below.

# LEARNER CONTEXT (personalise everything for this person)
- Learner's first language (L1): ${t}${e.l1?` (ISO code: ${e.l1})`:" (written out by the learner — use it as given)"}
- Language being learned (target language): ${e.targetLanguage}
- Target level: ${o}
- Learner profile: ${a}

Use the learner profile actively: whenever you write an example sentence, a mini-dialogue, a reading line or an exercise, make the topic, names, jobs, hobbies and situations match this learner's profile (their age, interests, goals, profession, exam targets). Two learners with the same PDF must receive visibly different examples.

# SOURCE MATERIAL — THIS IS THE ONLY SOURCE OF TRUTH
- Source document: ${n}
- Cover 100% of the material in that document. Nothing may be skipped.
- You are TRANSCRIBING AND STRUCTURING THE ATTACHED DOCUMENT, not writing a textbook. Every item in the JSON must be traceable to a specific place in that file.
- Use NO outside knowledge: do not add vocabulary, rules, idioms or dialogues that the document does not contain, even if you know them well or think they would be useful. If it is not in the file, it does not go in the JSON.
- Every item you output must carry a "sourceRef" (where in the file it came from) AND a "sourceQuote" (the exact words copied from the file that the item is built on). Copy these character-for-character in the source language — do not translate, paraphrase, tidy up or reconstruct them.
- If you cannot quote the file for an item, that item must not be in the JSON.

# ABSOLUTE OUTPUT RULES
1. Output ONE single JSON file. No markdown, no code fences, no commentary, no explanation before or after. The first character of your answer must be "{" and the last must be "}".
2. The JSON must be syntactically valid at all times: double-quoted keys and strings only, no comments, no trailing commas, no smart quotes, no ellipses. Escape internal quotes and newlines.
3. Do not sample, summarise, abbreviate, deduplicate aggressively or write "…etc.". Enumerate EVERY vocabulary item, EVERY grammar point, EVERY idiom/expression, EVERY dialogue and EVERY sentence group the document contains. Quantity is part of the task.
4. Use all of your available output tokens. If the document is long, keep going until the whole document is covered. Do not stop early, do not ask questions, do not offer a plan — produce the file.
5. Include ONLY the content types that actually exist in the document. If there is no grammar (or no idioms, or no conversations), simply omit that key or set it to [] — never invent material to fill a section, and never leave a key with placeholder junk.
6. Never invent facts that are not in the source document. You may add short pedagogical scaffolding (a definition wording, a natural example sentence, a translation) but the underlying items must come from the document. Scaffolding must stay faithful to the document's own wording, register and level — it may not introduce a new topic, a new rule or a new word list.
6a. GROUNDING IS MANDATORY: each vocabulary item, grammar point, idiom, conversation and sentence must include a non-empty "sourceQuote" copied verbatim from the attached file plus a "sourceRef" locating it. An item without both is invalid and must be removed rather than guessed.
7. The meaning of every item must respect the source document's wording, register and level.
8. All translations ("native" fields) must be in ${t}. All "target" fields must be in ${e.targetLanguage}.
9. Provide integer-free stable ids: "v1, v2, …" for vocabulary, "g1, …" grammar, "i1, …" idioms, "c1, …" conversations, "s1, …" sentences.
10. If the source document is longer than one response, prioritise completeness of the sections in this order: vocabulary → grammar → idioms/expressions → conversations → sentences, and never truncate an item mid-way. Every item must be complete.
11. ANSWER-LENGTH ANTI-CUE RULE (mandatory for EVERY option set you write — grammar "exercises", "fillBlank" and "listenSelect" banks): a learner must never be able to score by picking the longest option.
    • All options in one item must be within \xb12 words of each other and carry the same level of detail (count words, not characters).
    • THE LONGEST OPTION MUST NEVER BE THE CORRECT ONE. If the correct answer is the longest, shorten it or lengthen the distractors until at least one distractor is longer.
    • The correct option must not be the only one with a number, a name, a comma, a subordinate clause or extra qualifying detail, and must not echo words from the prompt more than the distractors do.
    • Every distractor must be equally plausible and come from the same topic/word family as the correct answer.
    • Rotate the position of the correct answer across items — it must never sit at the same index twice in a row.
    • SILENTLY SELF-CHECK EVERY ITEM BEFORE RETURNING, and rewrite any item whose longest option is the correct one. An item you have not checked must not be in the file.

# CONTENT MODEL — map the document onto exactly these five sections
1. "vocabulary" — every new word, phrase or lexical chunk taught in the document.
2. "grammar" — every rule, structure, tense or pattern explained in the document, each with exercises derived from the document's own examples plus natural variants.
3. "idioms" — idioms, phrasal verbs, collocations, proverbs, slang and fixed expressions present in the document (use "type" to classify).
4. "conversations" — every dialogue, role-play, model conversation or scripted exchange in the document.
5. "sentences" — every remaining notable example sentence, exercise sentence, reading line or drill sentence in the document that is not already inside the four sections above, so nothing is lost.

# TUTOLINGO ACTIVITY MAPPING (the app's player supports exactly these activity kinds)
- "match": pairs of target-language item ↔ its meaning/translation  → driven by "vocabulary" and "idioms".
- "select_translation": pick the correct target-language word for a meaning (or the meaning of a word) → driven by "vocabulary" and "idioms".
- "fill_blank": a sentence from the document with one word removed and four options → driven by "vocabulary" examples and grammar exercises.
- "type_hear": listen to a sentence and type it → driven by "sentences" and "conversations".
- "reorder": put the shuffled words of a sentence back in order → driven by "sentences" and "conversations".
- "listen_select": hear a word/sentence and choose it from options → driven by "vocabulary", "sentences".
- "speak": read a sentence out loud (speech recognition) → driven by "sentences", "conversations" and vocabulary chunks.
- "tap_complete": grammar tap-the-correct-option exercise → driven by "grammar.exercises".
So: every vocabulary item needs a meaning + a natural sentence, every grammar point needs at least 4 exercises with options, every idiom needs a meaning + an example, and every conversation needs turn-by-turn lines. That is what makes the eight activity kinds above possible.
Optional: you may additionally supply an "activities" object with explicit activity banks ("matchPairs", "fillBlank", "reorder", "listenSelect", "typeHear", "speak", "tapComplete") when you want to control a specific exercise exactly as it should appear.

# EXACT JSON SCHEMA (follow keys, nesting and types precisely)
{
  "meta": {
    "app": "Tutolingo",
    "version": "1.0",
    "sourceDocument": "${n}",
    "l1": "${e.l1}",
    "l1Name": "${t}",
    "targetLanguage": "${e.targetLanguage}",
    "level": "${o}",
    "learnerProfile": "<copy of the learner profile above>",
    "theme": "<overall theme of the document>",
    "createdAt": "<ISO date>",
    "coverage": {
      "pagesProcessed": "<number or range of the source document>",
      "sectionsCovered": ["<every chapter/unit/section you processed>"],
      "vocabularyCount": 0,
      "grammarCount": 0,
      "idiomCount": 0,
      "conversationCount": 0,
      "sentenceCount": 0,
      "omissions": ["<anything in the document you could not convert, with a reason — use an empty array if nothing was omitted>"]
    }
  },
  "vocabulary": [
    {
      "id": "v1",
      "term": "<the word or chunk in ${e.targetLanguage}>",
      "pos": "<part of speech>",
      "level": "<A1|A2|B1|B2|C1|C2>",
      "pronunciation": "<IPA if the document provides one, else \\"\\">",
      "definition": "<simple definition in ${e.targetLanguage}>",
      "translation": "<translation in ${t}>",
      "example": { "target": "<personalised example sentence>", "native": "<translation of that sentence in ${t}>" },
      "collocations": ["<typical collocations>"],
      "synonyms": ["<synonyms>"],
      "antonyms": ["<antonyms>"],
      "unit": "<chapter / unit label from the document>",
      "sourceRef": "<page number, exercise number or section title>",
      "sourceQuote": "<verbatim words copied from the document that teach this word — never translated, never paraphrased>",
      "tags": ["<topic tags, e.g. travel, work>"]
    }
  ],
  "grammar": [
    {
      "id": "g1",
      "title": "<grammar point title>",
      "level": "<CEFR level>",
      "rule": "<the rule explained in ${e.targetLanguage}>",
      "nativeRule": "<the same rule explained in ${t}>",
      "structure": "<formula, e.g. Subject + base verb (+s/es)>",
      "examples": [ { "target": "<example>", "native": "<translation in ${t}>" } ],
      "commonMistakes": ["<typical learner errors, ideally in ${t} if the document mentions them>"],
      "exercises": [
        {
          "type": "multiple_choice",
          "prompt": "<a sentence or question, with ___ for the gap when a gap is needed>",
          "options": ["<4 options>"],
          "answer": "<the correct option, exactly as written in options>",
          "explanation": "<why, in ${e.targetLanguage}>",
          "nativeExplanation": "<why, in ${t}>"
        }
      ],
      "unit": "<unit label>",
      "sourceRef": "<page/exercise>",
      "sourceQuote": "<verbatim rule/sentence copied from the document that teaches this grammar point>",
      "tags": ["<tags>"]
    }
  ],
  "idioms": [
    {
      "id": "i1",
      "expression": "<idiom / phrasal verb / collocation in ${e.targetLanguage}>",
      "type": "<idiom|phrasal_verb|collocation|proverb|slang|expression>",
      "meaning": "<meaning in ${e.targetLanguage}>",
      "literalMeaning": "<word-by-word literal reading>",
      "nativeMeaning": "<equivalent meaning in ${t}>",
      "example": { "target": "<personalised example>", "native": "<translation in ${t}>" },
      "register": "<formal|neutral|informal|slang>",
      "usageNotes": "<when and how to use it>",
      "unit": "<unit label>",
      "sourceRef": "<page/exercise>",
      "sourceQuote": "<verbatim line copied from the document where this expression appears>",
      "tags": ["<tags>"]
    }
  ],
  "conversations": [
    {
      "id": "c1",
      "title": "<conversation title>",
      "setting": "<where/when the conversation happens>",
      "level": "<CEFR level>",
      "goal": "<what the learner practises here>",
      "nativeSummary": "<one-line summary in ${t}>",
      "turns": [
        { "speaker": "A", "name": "<speaker name or role>", "target": "<line in ${e.targetLanguage}>", "native": "<line in ${t}>" },
        { "speaker": "B", "name": "<speaker name or role>", "target": "<line in ${e.targetLanguage}>", "native": "<line in ${t}>" }
      ],
      "keyPhrases": [ { "target": "<useful chunk>", "native": "<translation in ${t}>" } ],
      "sourceRef": "<page/section>",
      "sourceQuote": "<verbatim first line(s) of the dialogue copied from the document>",
      "tags": ["<tags>"]
    }
  ],
  "sentences": [
    { "id": "s1", "target": "<sentence in ${e.targetLanguage}>", "native": "<translation in ${t}>", "sourceRef": "<page/exercise>", "sourceQuote": "<the sentence exactly as it appears in the document>", "tags": ["<tags>"] }
  ],
  "activities": {
    "matchPairs": [ { "pairs": [ { "target": "<item>", "native": "<translation in ${t}>" } ], "sourceRef": "<page>" } ],
    "fillBlank": [ { "sentence": "<sentence with ______>", "answer": "<the missing word>", "options": ["<4 options>"], "native": "<sentence translation in ${t}>" } ],
    "reorder": [ { "sentence": "<target-language sentence>", "native": "<translation in ${t}>" } ],
    "listenSelect": [ { "prompt": "<word or sentence>", "answer": "<the correct option>", "options": ["<4 options>"], "native": "<translation in ${t}>" } ],
    "typeHear": [ { "sentence": "<sentence to dictate>", "native": "<translation in ${t}>" } ],
    "speak": [ { "sentence": "<sentence to read aloud>", "native": "<translation in ${t}>" } ],
    "tapComplete": [ { "prompt": "<gap sentence with ___>", "options": ["<4 options>"], "answer": "<correct option>", "explanation": "<why>", "native": "<translation in ${t}>" } ]
  }
}

# QUALITY CHECKLIST — verify before you finish
- Every vocabulary item has: term, definition, translation in ${t}, example.target AND example.native.
- Every grammar point has: rule, nativeRule, at least 3 examples with "native", and at least 4 exercises with 4 options each and a matching "answer".
- Every idiom has: meaning, nativeMeaning and an example with "native".
- Every conversation has at least 6 turns, each with target + native.
- No empty strings where content is expected; no duplicated ids; valid JSON; one single object at the root.
- meta.coverage counts match the real array lengths.
- GROUNDING: every vocabulary item, grammar point, idiom, conversation and sentence has a non-empty "sourceRef" AND "sourceQuote", and each "sourceQuote" is copied verbatim from the attached file (not invented, not translated).
- NO OUTSIDE CONTENT: if you imagine closing the file, your JSON should still be a complete, faithful index of that file and nothing more.
- Nothing from the source document is left out (or it is listed in meta.coverage.omissions).
- Every learner-facing translation is in ${t}, and only in ${t}.

# FINAL INSTRUCTION
Before writing, internally enumerate the document's sections so you know what to cover. Then produce the complete, single, valid JSON object — built only from the attached document, every item carrying its verbatim "sourceQuote" and "sourceRef", using as many tokens as you need.
`},[m,b,h,f,w]);async function O(){try{await navigator.clipboard.writeText(R)}catch{let e=document.createElement("textarea");e.value=R,document.body.appendChild(e),e.select(),document.execCommand("copy"),document.body.removeChild(e)}C(!0),S(null),setTimeout(()=>C(!1),2500)}return(0,t.jsxs)(o.PageShell,{children:[(0,t.jsx)(o.ContentStatus,{}),(0,t.jsx)(o.SectionTitle,{icon:"🤖",title:"AI content prompt",sub:`One prompt → one massive JSON file → the whole ${o.APP_NAME} course`}),(0,t.jsx)("div",{className:"mb-3 rounded-3xl border-2 border-slate-200 bg-white p-4",children:(0,t.jsxs)("ol",{className:"list-decimal space-y-1 pl-5 text-sm text-slate-600",children:[(0,t.jsx)("li",{children:"Answer the two questions below: type the learner's first language (L1) and their profile."}),(0,t.jsxs)("li",{children:["Press ",(0,t.jsx)("b",{children:"Copy AI prompt"})," and paste it into your AI agent together with the PDF."]}),(0,t.jsxs)("li",{children:["The agent answers with one single JSON file. Save it as ",(0,t.jsx)("code",{className:"rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs",children:"content/tutolingo-content.json"})," next to the app."]}),(0,t.jsxs)("li",{children:["Run the ",(0,t.jsx)(n.default,{href:"/check",className:"font-black text-[#1CB0F6]",children:"content-pack checker"}),"on the agent's answer — it lists missing translations, thin exercises and empty sections before anything goes live."]}),(0,t.jsxs)("li",{children:["Reload ",o.APP_NAME," — lessons, words, grammar, conversations and idioms all appear automatically."]})]})}),(0,t.jsxs)("div",{ref:L,className:"card-light mb-3 rounded-3xl border-2 border-[#1CB0F6] bg-white p-4",children:[(0,t.jsx)("h2",{className:"font-black text-slate-800",children:"1 · Who is this content for?"}),(0,t.jsxs)("p",{className:"mt-1 text-xs text-slate-400",children:["The learner's first language (L1) decides the language of ",(0,t.jsx)("b",{children:"every"})," translation in the generated file."]}),(0,t.jsxs)("label",{className:`mt-3 block text-sm font-black text-slate-600 ${m?"":"text-red-500"}`,htmlFor:"prompt-l1",children:["Learner's first language (L1) — type it ",(0,t.jsx)("span",{className:"text-red-400",children:"*"})]}),(0,t.jsx)(o.L1Input,{id:"prompt-l1",value:m,packDefault:e.meta.l1,onChange:e=>{x(!0),u("auto"===e?"":e),S(null)}}),(0,t.jsx)("label",{className:"mt-3 block text-sm font-black text-slate-600",htmlFor:"prompt-learner",children:"Learner information (used to personalise examples)"}),(0,t.jsx)("textarea",{id:"prompt-learner",value:h,onChange:e=>{x(!0),p(e.target.value),S(null)},rows:4,placeholder:"e.g. Sara, 27, marketing manager in Tehran, preparing for IELTS 7.5, loves cooking and football, struggles with tenses.",className:"mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#58CC02]"}),(0,t.jsx)("p",{className:"mt-1 text-[11px] text-slate-400",children:"Names, age, job, interests, goals, weak areas, exam targets… the more specific, the more personal the generated examples and dialogues."}),(0,t.jsxs)("details",{className:"mt-3",children:[(0,t.jsx)("summary",{className:"cursor-pointer text-xs font-black text-slate-500",children:"Optional: source file, level and target language"}),(0,t.jsxs)("div",{className:"mt-2 grid gap-2 sm:grid-cols-3",children:[(0,t.jsxs)("label",{className:"text-xs font-bold text-slate-500",children:["Source document",(0,t.jsx)("input",{value:f,onChange:e=>v(e.target.value),placeholder:"Unit 4 – Present Tenses.pdf",className:"mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"})]}),(0,t.jsxs)("label",{className:"text-xs font-bold text-slate-500",children:["Level",(0,t.jsx)("input",{value:w,onChange:e=>N(e.target.value),placeholder:"B1–B2",className:"mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"})]}),(0,t.jsxs)("label",{className:"text-xs font-bold text-slate-500",children:["Target language",(0,t.jsx)("input",{value:b,onChange:e=>y(e.target.value),className:"mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"})]})]}),(0,t.jsx)("button",{onClick:()=>d(e=>({...e,l1:m||e.l1,learnerInfo:h})),className:"btn-3d mt-2 rounded-xl border-[#1899D6] bg-[#1CB0F6] px-4 py-2 text-xs font-black text-white",children:"Save to my profile"})]})]}),(0,t.jsxs)("div",{className:"card-light mb-3 rounded-3xl border-2 border-slate-200 bg-white p-4",children:[(0,t.jsx)("h2",{className:"font-black text-slate-800",children:"2 · Copy the prompt to your AI agent"}),j&&(0,t.jsx)("p",{className:"mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm font-bold text-red-500",children:j}),(0,t.jsxs)("div",{className:"mt-3 flex flex-wrap gap-2",children:[(0,t.jsx)("button",{onClick:function(){if(!m){T(!0),S("Type the learner's first language first — it decides which language every translation is written in."),L.current?.scrollIntoView({behavior:"smooth",block:"center"});return}if(!h.trim()){T(!0),S("Add a little learner information so the agent can personalise the examples (you can keep it very short).");return}O()},className:"btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] px-6 py-3 text-sm font-black text-white",children:k?"Copied ✓":"📋 Copy AI prompt"}),(0,t.jsx)("button",{onClick:function(){let e=new Blob([R],{type:"text/plain;charset=utf-8"}),t=URL.createObjectURL(e),a=document.createElement("a");a.href=t,a.download="tutolingo-content-prompt.txt",a.click(),URL.revokeObjectURL(t)},className:"btn-3d rounded-2xl border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-500",children:"⬇️ Download .txt"}),(0,t.jsx)(n.default,{href:"/check",className:"btn-3d rounded-2xl border-[#1899D6] bg-[#1CB0F6] px-5 py-3 text-sm font-black text-white",children:"🔍 Check a pack"}),(0,t.jsxs)("span",{className:"self-center text-xs font-bold text-slate-400",children:["L1: ",m?(0,r.languageName)(m):"not selected"," · ",R.length.toLocaleString("en-US")," characters"]})]}),(0,t.jsx)("p",{className:"mt-2 text-[11px] text-slate-400",children:"Tip: paste the prompt together with the PDF, then ask the agent to reply with the JSON only."})]}),(0,t.jsxs)("div",{className:"card-light rounded-3xl border-2 border-slate-200 bg-white p-4",children:[(0,t.jsx)("h2",{className:"mb-2 font-black text-slate-800",children:"3 · Prompt preview"}),(0,t.jsx)("pre",{className:"max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600",children:R})]}),E&&(0,t.jsx)("div",{className:"fixed inset-0 z-50 grid place-items-center bg-black/40 p-4",onClick:()=>T(!1),children:(0,t.jsxs)("div",{className:"animate-pop-in w-full max-w-md rounded-3xl bg-white p-5",onClick:e=>e.stopPropagation(),children:[(0,t.jsx)("h3",{className:"text-lg font-black text-slate-800",children:"🌍 Which language should translations use?"}),(0,t.jsx)("p",{className:"mt-1 text-sm text-slate-500",children:"Type the learner's first language (any language) so the agent writes every translation in it."}),(0,t.jsx)("div",{className:"mt-3",children:(0,t.jsx)(o.L1Input,{id:"prompt-l1-modal",value:m,packDefault:e.meta.l1,onChange:e=>u("auto"===e?"":e)})}),!h.trim()&&(0,t.jsx)("textarea",{value:h,onChange:e=>p(e.target.value),rows:3,placeholder:"Learner information (age, job, interests, goals)…",className:"mt-2 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#58CC02]"}),(0,t.jsxs)("div",{className:"mt-3 grid grid-cols-2 gap-2",children:[(0,t.jsx)("button",{onClick:()=>T(!1),className:"rounded-2xl border-2 border-slate-200 py-2.5 text-sm font-black text-slate-500",children:"Cancel"}),(0,t.jsx)("button",{onClick:function(){m?(T(!1),d(e=>({...e,l1:m,learnerInfo:h.trim()?h:e.learnerInfo})),O()):S("Please type the learner's first language to continue.")},className:"btn-3d rounded-2xl border-[#46A302] bg-[#58CC02] py-2.5 text-sm font-black text-white",children:"Save & copy"})]})]})})]})}],42903)}]);