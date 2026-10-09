import { CourseLevel, GroupClass, GroupParticipant, Learner, Session } from '../types2';

/**
 * Group-class rosters: the AI prompt, and the parser for what comes back.
 *
 * WHY THIS EXISTS
 * ---------------
 * A group class is not a set of individual learner accounts. The tutor has a
 * transcript (everyone introducing themselves), a chat export, an enrolment form or
 * a page of notes — and needs those people in the app as a roster they can teach:
 * a name, a level, facts to open a conversation with, and how each person should be
 * handled in class.
 *
 * So the flow is deliberately "copy a prompt, paste the JSON back":
 *
 *   1. `GROUP_ROSTER_PROMPT` is copied to the clipboard and handed to any external AI
 *      together with the transcript or file (that is where the tutor's own AI lives —
 *      this app never sees the paste);
 *   2. the AI answers with a strict JSON object;
 *   3. the tutor pastes that back into the app, `parseGroupRoster` validates it
 *      tolerantly (models wrap JSON in prose, rename keys and use arrays where a
 *      string was asked for), and the roster is created in one go.
 *
 * One code path, used by the group profile's roster manager and by the
 * "Create New Group Class" modal, so both behave identically.
 */

/** What the tutor copies. `context` lets the prompt name the class. */
export function groupRosterPrompt(context = 'my group class'): string {
    return `You are preparing the participant roster for ${context} in a tutoring workspace.

INPUT
I am giving you everything I have about the people in this group: a transcript of them
introducing themselves, chat messages, an enrolment form, notes, or a mix. Read all of it.
If I have not attached anything yet, wait for it — do not invent a roster.

WHAT TO RETURN
Return ONLY valid JSON. No commentary, no explanation, no markdown fences, no trailing
commas. Exactly this shape:

{
  "groupSummary": "1-3 sentences: the shared level, the shared goal, and what kind of group this is.",
  "learners": [
    {
      "name": "Full name exactly as written",
      "cefr": "A1 | A2 | B1 | B2 | C1 | C2 | unknown",
      "facts": "2-4 sentences about this person: job or studies, why they are learning, family, everyday life, anything a tutor could open a conversation with. Never leave this empty — derive it from what they said.",
      "interests": "comma-separated topics THEY enjoy, in their own words",
      "l1": "this learner's first language, e.g. Arabic — or unknown if never stated",
      "email": "only if the text actually contains one",
      "phone": "only if the text actually contains one",
      "country": "country or city, only if stated",
      "goals": "what they actually want to be able to do in English",
      "talkative": "high | medium | low",
      "routing": "how a tutor should use this person in class: ask often / ask only easy questions / keep off the spot / pair with someone specific / reading and writing only. If there is no signal, use \\"none\\"."
    }
  ]
}

RULES
1. One entry per DISTINCT person. Never add a person who was not described, and never split
   one person into two.
2. Estimate "cefr" only from evidence in the text — vocabulary range, fluency, grammar
   mistakes, hesitation. If there is no evidence, use "unknown". Never guess high.
3. If someone is described as shy, quiet, reluctant, a beginner, or anxious, set
   "talkative": "low" and say in "routing" how to include them safely (e.g. "ask only
   closed questions first", "give them the reading part").
4. If someone is described as chatty, confident or dominant, set "talkative": "high" and
   say in "routing" how to channel them (e.g. "ask often, but ask them to wait their turn").
5. Copy "name" verbatim — I will match these people by name.
6. If two people share a first name, use the fullest form you have for each.
7. ALWAYS give "l1" when the learner reveals their first language, their nationality, or the
   language they translate into. It matters: a group may share one L1 or be a mix, and the
   lesson has to know which. Use "unknown" rather than guessing.
8. NEVER invent an email address, phone number or country — leave those fields out entirely
   when the text does not contain them.
9. Write everything in English, even if the input is in another language.`;
}

export interface ParsedGroupRoster {
    participants: Omit<GroupParticipant, 'id'>[];
    groupSummary: string;
    /** Fatal problems: nothing usable was found. */
    errors: string[];
    /** Non-fatal notes worth showing the tutor before importing. */
    warnings: string[];
}

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** `first` / `firstNonEmpty` — models rename keys constantly. */
function first(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
}

function asText(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) {
        return value
            .map((v) => (typeof v === 'string' ? v : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)))
            .filter(Boolean)
            .join('; ');
    }
    if (typeof value === 'object') {
        // A model that answered with {job: ..., goal: ...} instead of prose.
        return Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${k}: ${asText(v)}`)
            .join('; ');
    }
    return String(value).trim();
}

function asCefr(value: unknown): string {
    const raw = asText(value).toUpperCase();
    const hit = CEFR.find((level) => raw.includes(level));
    return hit || 'unknown';
}

function asTalkative(value: unknown): GroupParticipant['talkative'] {
    const raw = asText(value).toLowerCase();
    if (/high|chatty|talkative|confident|outgoing|dominant|very/.test(raw)) return 'high';
    if (/low|shy|quiet|reluctant|silent|beginner|anxious|nervous/.test(raw)) return 'low';
    if (/medium|moderate|average|sometimes|normal/.test(raw)) return 'medium';
    return 'unknown';
}

/**
 * The first `{...}` or `[...]` that balances, so a model that wrapped the JSON in
 * prose or fences still imports. Scans rather than regex-matches because a `}` inside
 * a quoted fact would fool a regex.
 */
function extractJson(raw: string): string | null {
    const text = String(raw || '').replace(/^\uFEFF/, '');
    const start = (() => {
        const brace = text.indexOf('{');
        const bracket = text.indexOf('[');
        if (brace === -1) return bracket;
        if (bracket === -1) return brace;
        return Math.min(brace, bracket);
    })();
    if (start === -1) return null;

    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === open) depth++;
        else if (ch === close) {
            depth--;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return null;
}

/**
 * Validate and normalise whatever the AI returned.
 *
 * Never throws: the tutor gets a list of problems to fix, or an imported roster.
 */
export function parseGroupRoster(raw: string): ParsedGroupRoster {
    const out: ParsedGroupRoster = { participants: [], groupSummary: '', errors: [], warnings: [] };
    const text = String(raw || '').trim();
    if (!text) {
        out.errors.push('Paste the JSON the AI gave you first.');
        return out;
    }

    const json = extractJson(text);
    if (!json) {
        out.errors.push('No JSON found in that text. Copy the AI answer from its first { to its last } and paste it again.');
        return out;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch (e) {
        // The one repair worth attempting: a trailing comma, which almost every model
        // still emits occasionally, and smart quotes pasted from a chat window.
        const repaired = json
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/,\s*([}\]])/g, '$1');
        try {
            parsed = JSON.parse(repaired);
            out.warnings.push('The JSON had a small formatting problem (a trailing comma or smart quotes) which was repaired automatically — check the names below.');
        } catch {
            out.errors.push(`That is not valid JSON (${(e as Error).message}). Paste only the object or array the AI returned.`);
            return out;
        }
    }

    const container = Array.isArray(parsed)
        ? { learners: parsed }
        : (parsed as Record<string, unknown>) || {};
    // Both words are accepted: the prompt now says "learners", older answers say
    // "participants", and other models invent their own key.
    const list = Array.isArray(parsed)
        ? parsed
        : first(container, ['learners', 'participants', 'roster', 'students', 'people', 'members', 'class', 'attendees']);

    if (!Array.isArray(list)) {
        out.errors.push('The JSON does not contain a "learners" array. Ask the AI again using the prompt exactly as it is.');
        return out;
    }

    out.groupSummary = asText(first(container, ['groupSummary', 'summary', 'group_profile', 'classSummary', 'overview']));

    const seen = new Set<string>();
    list.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') {
            out.warnings.push(`Entry ${index + 1} is not an object and was skipped.`);
            return;
        }
        const record = Array.isArray(entry) ? {} : (entry as Record<string, unknown>);
        const name = asText(first(record, ['name', 'fullName', 'full_name', 'student', 'studentName', 'participant', 'Name'])) || '';
        if (!name) {
            out.warnings.push(`Entry ${index + 1} has no name and was skipped.`);
            return;
        }
        const key = name.toLowerCase().replace(/\s+/g, ' ');
        if (seen.has(key)) {
            out.warnings.push(`"${name}" appears twice — the duplicate was merged away.`);
            return;
        }
        seen.add(key);

        const facts = asText(first(record, ['facts', 'about', 'background', 'description', 'bio', 'notes', 'info']));
        const cefr = asCefr(first(record, ['cefr', 'level', 'cefrLevel', 'englishLevel', 'proficiency', 'cefr_level']));
        const talkative = asTalkative(first(record, ['talkative', 'talkativeness', 'speaks', 'participation', 'confidence']));
        let routing = asText(first(record, ['routing', 'howToUse', 'how_to_use', 'handling', 'classRole', 'ask', 'instruction']));
        if (/^none$/i.test(routing)) routing = '';

        out.participants.push({
            name,
            cefr,
            l1: asText(first(record, ['l1', 'L1', 'firstLanguage', 'nativeLanguage', 'motherTongue', 'language'])),
            facts,
            interests: asText(first(record, ['interests', 'likes', 'hobbies', 'topics'])),
            goals: asText(first(record, ['goals', 'goal', 'why', 'motivation', 'objective'])),
            talkative,
            routing,
            email: asText(first(record, ['email', 'e-mail', 'mail'])) || '',
            phone: asText(first(record, ['phone', 'telephone', 'mobile', 'whatsapp', 'number'])) || '',
            country: asText(first(record, ['country', 'city', 'location', 'timezone'])) || '',
            progress: 0,
            attendance: [],
        });

        if (!facts) out.warnings.push(`"${name}" has no facts — add a line about them so the AI can build questions around them.`);
        if (cefr === 'unknown') out.warnings.push(`"${name}" has no CEFR level; the class level will be used instead.`);
    });

    if (out.participants.length === 0) {
        out.errors.push('No learners with a name were found in that JSON.');
    }
    return out;
}

/**
 * A first draft of the mandatory questioning plan, written from the roster.
 *
 * This is what the tutor edits in "Step 2 · Customization & Lesson Structure": who gets
 * asked more, who has to be protected, and which activity parts belong to which people.
 * Generated here rather than asked of an AI so it is instant, free and always matches the
 * roster in front of the tutor — they can then rewrite it in their own words.
 */
export function suggestGroupRoutingPlan(participants: GroupParticipant[]): string {
    if (participants.length === 0) return '';

    const label = (p: GroupParticipant) => {
        const level = participantLevelLabel(p);
        return level === 'Unknown level' ? p.name : `${p.name} (${level})`;
    };

    const askMore = participants.filter((p) => p.talkative === 'high' || p.talkative === 'medium');
    const protect = participants.filter((p) => p.talkative === 'low');

    const lines: string[] = [];

    if (askMore.length) {
        lines.push('Ask MORE questions of:');
        askMore.forEach((p) => {
            const detail =
                p.talkative === 'high'
                    ? 'can take long answers — give them the open, opinion and storytelling questions, but cut them off politely so others speak'
                    : 'comfortable with normal open questions — ask them second so the quieter members answer first';
            lines.push(`  • ${label(p)} — ${detail}${p.interests ? ` Their topics: ${p.interests}.` : ''}`);
        });
    }

    if (protect.length) {
        lines.push('Ask LESS of, and PROTECT:');
        protect.forEach((p) => {
            lines.push(
                `  • ${label(p)} — never put them on the spot first, no cold-calling for long answers. ` +
                    'Use closed or choice questions, reading, writing and pair work until they volunteer.'
            );
        });
    }

    const withRouting = participants.filter((p) => (p.routing || '').trim());
    if (withRouting.length) {
        lines.push('Use these parts with these people ONLY:');
        withRouting.forEach((p) => lines.push(`  • ${label(p)} — ${p.routing?.trim()}`));
    }

    const goals = participants.filter((p) => (p.goals || '').trim());
    if (goals.length) {
        lines.push('Point every activity at each person\'s own reason for learning:');
        goals.forEach((p) => lines.push(`  • ${label(p)} — ${p.goals?.trim()}`));
    }

    return lines.join('\n');
}

/** `{ name, cefr }` line for a roster card badge, never empty. */
export function participantLevelLabel(participant: Omit<GroupParticipant, 'id'>): string {
    const level = String(participant.cefr || '').toUpperCase();
    return CEFR.includes(level) ? level : 'Unknown level';
}

/**
 * Everyone's information as the lines the lesson generator already understands.
 *
 * The generator reads `learner.facts` (an array of strings) and `learner.interests`,
 * so a group is taught by putting the ROSTER there — the same fields a single learner's
 * profile fills in. That is the whole bridging trick: the group inherits every lesson
 * feature (Level, Step 1/2/3, activities, companions) with no change to the generator,
 * and the AI is told who to ask what.
 */
export function buildGroupLessonFacts(
    participants: GroupParticipant[],
    groupRouting?: string,
    groupSummary?: string
): { facts: string[]; interests: string; names: string } {
    const facts: string[] = [];
    const names: string[] = [];

    if (groupSummary && groupSummary.trim()) {
        facts.push(`ABOUT THIS GROUP (as a whole): ${groupSummary.trim()}`);
    }
    if (participants.length === 0) {
        facts.push('This is a GROUP CLASS with no roster entered yet. Keep every task level-generic until learners are added.');
    } else {
        facts.push(
            `This is a GROUP CLASS. Each lesson must serve ${participants.length} different people in the same room. ` +
                'Never treat this as one learner with mixed facts: address the named learners individually.'
        );
    }

    participants.forEach((p) => {
        names.push(p.name);
        const bits: string[] = [`NAME: ${p.name}`];
        if (participantLevelLabel(p) !== 'Unknown level') bits.push(`CEFR: ${participantLevelLabel(p)}`);
        if (p.l1) bits.push(`L1 (first language): ${p.l1}`);
        if (p.country) bits.push(`COUNTRY: ${p.country}`);
        if (p.talkative && p.talkative !== 'unknown') bits.push(`TALKATIVENESS: ${p.talkative}`);
        if (p.facts) bits.push(`FACTS: ${p.facts}`);
        if (p.interests) bits.push(`INTERESTS: ${p.interests}`);
        if (p.goals) bits.push(`GOALS: ${p.goals}`);
        if (p.routing) bits.push(`HOW TO USE THEM IN CLASS: ${p.routing}`);
        else if (p.talkative === 'low') bits.push('HOW TO USE THEM IN CLASS: keep them on safe, closed or written tasks first; never put them on the spot.');
        else if (p.talkative === 'high') bits.push('HOW TO USE THEM IN CLASS: give them speaking parts, but stop them dominating the quieter members.');
        facts.push(bits.join(' | '));
    });

    if (groupRouting && groupRouting.trim()) {
        facts.push(
            'MANDATORY GROUP QUESTIONING PLAN set by the tutor. This overrides any general ' +
                'suggestion you would otherwise make — follow it literally, including who to ask more, ' +
                'who to leave alone, and which activity formats belong to which people only: ' +
                groupRouting.trim()
        );
    }

    const interests = [...new Set(participants.map((p) => (p.interests || '').trim()).filter(Boolean))].join(', ');
    return { facts, interests, names: names.join(', ') };
}

/**
 * What the class can be translated into as a WHOLE.
 *
 * "they might all have the same L1 or different" is the common case, and the answer changes
 * what the lesson may do: one shared L1 means real support is possible, a mix means the
 * lesson must not translate into any single language. Returns the shared language, or
 * 'Multiple', or '' when nobody's L1 is known.
 */
export function groupL1FromRoster(participants: GroupParticipant[]): string {
    const s = groupL1Summary(participants);
    if (s.shared) return s.shared;
    return s.languages.length > 1 ? 'Multiple' : '';
}

/**
 * What is actually known about the room's first languages.
 *
 * The distinction that matters: one learner with 'Arabic' recorded out of three is NOT a
 * class that shares Arabic. Claiming it would put a translation strategy into every lesson
 * based on a single line of a form — so `shared` is only set when EVERY learner is recorded
 * and they agree. `languages` is what is known so far, which is what the class profile shows
 * back to the tutor ("Arabic (1/3)") instead of hiding the gap.
 */
export interface GroupL1Summary {
    /** The one language the whole class shares, or '' when that is not established. */
    shared: string;
    /** Every distinct recorded first language, in its original spelling. */
    languages: string[];
    /** How many learners have an L1 recorded. */
    recorded: number;
    total: number;
}

export function groupL1Summary(participants: GroupParticipant[]): GroupL1Summary {
    const list = participants || [];
    const known = list.map((p) => (p.l1 || '').trim()).filter((v) => v && !/^unknown$/i.test(v));
    const languages: string[] = [];
    known.forEach((value) => {
        if (!languages.some((seen) => seen.toLowerCase() === value.toLowerCase())) languages.push(value);
    });
    return {
        shared: languages.length === 1 && known.length === list.length && list.length > 0 ? languages[0] : '',
        languages,
        recorded: known.length,
        total: list.length,
    };
}

/**
 * The block appended to EVERY lesson prompt in the Lesson Creator.
 *
 * The generator builds one prompt string per lesson (through a chain of `prompt +=`) and
 * sends it as `promptText` — both to the AI and to the clipboard when the tutor copies the
 * prompt out. So this single block reaches every lesson type, every activity and the
 * clipboard, which is what "all the prompts must include this" actually requires. It is
 * deliberately written as a hard override, not a preference.
 *
 * Returns '' for an ordinary one-to-one learner, so nothing changes for them.
 */
export function groupClassPromptBlock(learner: any): string {
    if (!learner || !learner.isGroupClass) return '';

    const roster = String(learner.groupRoster || '').trim();
    const routing = String(learner.groupRouting || '').trim();
    const names = String(learner.groupNames || '').trim();
    const l1 = String(learner.groupL1 || '').trim();
    const count = Number(learner.groupLearnerCount) || 0;

    const lines: string[] = [
        '',
        '## THIS IS A GROUP CLASS — NON-NEGOTIABLE',
        `This lesson is taught to ${count || 'several'} learners sitting in ONE room together. It is NOT a one-to-one lesson: every text, question, activity and instruction has to work for everyone in the room at the same time.`,
    ];

    if (names) {
        lines.push(`THE LEARNERS IN THE ROOM: ${names}. Address them BY NAME — say who each question is for instead of asking the room.`);
    }
    if (roster) {
        lines.push('', 'ROSTER — level, background and how to use each person. Obey it:', roster);
    }
    if (routing) {
        lines.push(
            '',
            'MANDATORY QUESTIONING PLAN SET BY THE TUTOR. This OVERRIDES any distribution of questions you would otherwise choose — follow it literally, including who is asked more, who must never be put on the spot, and which activity formats belong to which learners only:',
            routing
        );
    }

    lines.push(
        '',
        'RULES',
        '1. Ask NAMED learners, not "the class". Distribute questions exactly as the plan above says.',
        '2. Respect each learner\'s own CEFR level — never give a B2 question to an A2 learner. Where the room is mixed, write each task at two levels (a core version and a stretch version) and label which is which.',
        '3. Shy / low-talkativeness learners: give them closed or choice questions, reading or writing roles and pair work first. Never start with them, and never cold-call them for a long answer.',
        '4. Dominant learners: use them for model answers and demonstrations, then explicitly hand the next item to somebody else by name.',
        l1 && l1 !== 'Multiple'
            ? `5. First language: everyone here shares ${l1}. Use it ONLY for short supporting glosses and error explanations — the lesson itself stays in English.`
            : l1 === 'Multiple'
            ? '5. First languages differ across this group, so do NOT translate into any single language: at most give a one-word gloss in each learner\'s own L1 where it is listed above, and never make translation the main task.'
            : '5. First languages are NOT fully recorded for this group. Do NOT translate as a whole: at most give a one-word gloss, and only for a learner whose own L1 is listed in the roster above. Ask before using any translation at all.',
        '6. Peer work matters more than in a one-to-one lesson: include pair and small-group tasks, and say who works with whom using their names.',
        '7. Use each learner\'s own facts, interests and goals in your examples and questions, and never mix up who said what.'
    );

    return lines.join('\n');
}

/**
 * The class profile as text — "Copy Profile Facts" for a whole class.
 *
 * The individual profile's button copies one person's profile; a group class needs the
 * class-level facts AND every learner, so the tutor can paste the whole picture into an AI,
 * an email or a report.
 */
export function buildGroupProfileFacts(group: GroupClass, participants: GroupParticipant[]): string {
    const lines: string[] = [];
    lines.push(`GROUP CLASS PROFILE — ${group.name}`);
    lines.push(`Class level (CEFR): ${group.level || 'not set'}`);
    lines.push(`Learners: ${participants.length}`);
    if (group.schedule) lines.push(`Schedule: ${group.schedule}`);
    if (group.dateCreated) lines.push(`Created: ${group.dateCreated}`);
    const l1 = groupL1FromRoster(participants);
    if (l1) lines.push(`Class L1 for translations: ${l1 === 'Multiple' ? 'Multiple (mixed first languages)' : l1}`);
    lines.push('');

    lines.push('LEARNERS');
    if (participants.length === 0) {
        lines.push('(no learners entered yet)');
    }
    participants.forEach((p, i) => {
        const bits = [participantLevelLabel(p)];
        if (p.l1) bits.push(`L1: ${p.l1}`);
        if (p.talkative && p.talkative !== 'unknown') bits.push(p.talkative === 'low' ? 'shy / quiet' : p.talkative === 'high' ? 'very talkative' : 'steady');
        const logged = p.attendance?.length || 0;
        if (logged) bits.push(`attendance ${Math.round(((p.attendance || []).filter((a) => a.present).length / logged) * 100)}%`);
        lines.push(`${i + 1}. ${p.name} — ${bits.join(' · ')}`);
        if (p.facts) lines.push(`   Facts: ${p.facts}`);
        if (p.interests) lines.push(`   Interests: ${p.interests}`);
        if (p.goals) lines.push(`   Goals: ${p.goals}`);
        if (p.routing) lines.push(`   How to use in class: ${p.routing}`);
        const contact = [p.email, p.phone, p.country].filter(Boolean).join(' · ');
        if (contact) lines.push(`   Contact: ${contact}`);
    });

    if (group.groupRouting && group.groupRouting.trim()) {
        lines.push('', 'MANDATORY QUESTIONING PLAN (Step 2)', group.groupRouting.trim());
    }
    if (group.rosterSource) {
        lines.push('', `Roster source: ${group.rosterSource}`);
    }
    return lines.join('\n');
}

/** One-line label for the class: `Arabic`, `Mixed (3)`, `Arabic (1/3)`, or `Not set`. */
export function groupL1Label(participants: GroupParticipant[]): string {
    const s = groupL1Summary(participants);
    if (s.shared) return s.shared;
    if (s.languages.length > 1) return `Mixed (${s.languages.length})`;
    if (s.languages.length === 1) return `${s.languages[0]} (${s.recorded}/${s.total})`;
    return 'Not set';
}

/** `A2×2 · B1×1` — a class's level spread as one chip (e.g. on the dashboard card). */
export function groupLevelSpread(participants: GroupParticipant[]): string {
    const counts = new Map<string, number>();
    (participants || []).forEach((p) => {
        const level = participantLevelLabel(p);
        if (level === 'Unknown level') return;
        counts.set(level, (counts.get(level) || 0) + 1);
    });
    const spread = [...counts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([level, n]) => `${level}×${n}`)
        .join(' · ');
    return spread || 'levels not set';
}

/** Attendance rate for one learner, or null when no session has been logged for them yet. */
export function attendanceRateFor(participant: GroupParticipant): number | null {
    const logged = participant.attendance || [];
    if (logged.length === 0) return null;
    return Math.round((logged.filter((a) => a.present).length / logged.length) * 100);
}

/** CEFR letter → the app's own course level, so roster learners sit in the same charts. */
export function cefrToCourseLevel(cefr: string | undefined, fallback: CourseLevel = CourseLevel.Intermediate): CourseLevel {
    const map: Record<string, CourseLevel> = {
        A1: CourseLevel.Beginner,
        A2: CourseLevel.Elementary,
        B1: CourseLevel.Intermediate,
        B2: CourseLevel.UpperIntermediate,
        C1: CourseLevel.Advanced,
        C2: CourseLevel.Expert,
    };
    return map[String(cefr || '').toUpperCase()] || fallback;
}

/** The app's course level → the CEFR letter a roster keeps on the card. */
export function courseLevelToCefr(level: CourseLevel | string | undefined, fallback = ''): string {
    const map: Record<string, string> = {
        [CourseLevel.Beginner]: 'A1',
        [CourseLevel.Elementary]: 'A2',
        [CourseLevel.Intermediate]: 'B1',
        [CourseLevel.UpperIntermediate]: 'B2',
        [CourseLevel.Advanced]: 'C1',
        [CourseLevel.Expert]: 'C2',
        [CourseLevel.Master]: 'C2',
    };
    return map[String(level || '')] || fallback;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * THE ROSTER, SEEN AS LEARNERS
 *
 * Every other tab in a class profile — Overview, Sessions, Calendar, Feedback,
 * Competition, Automation — was written against `Learner` objects and works by
 * iterating the people in the class. A roster learner has no account behind them,
 * so instead of rewriting those tabs we hand them the roster in the shape they
 * already understand. That is why adding a learner to a class makes them appear
 * everywhere at once, and why no tab can silently go blank when the class was built
 * from a transcript rather than from linked accounts.
 *
 * The id is prefixed so writes can be routed back: `roster:<participantId>` is edited
 * with `updateGroupParticipant`, never `updateLearner` (which would create a phantom
 * individual account — exactly what a group class must not do).
 * ──────────────────────────────────────────────────────────────────────────── */

export const ROSTER_LEARNER_PREFIX = 'roster:';

export function rosterLearnerId(participantId: string): string {
    return `${ROSTER_LEARNER_PREFIX}${participantId}`;
}

export function isRosterLearnerId(id: string | undefined): boolean {
    return !!id && id.startsWith(ROSTER_LEARNER_PREFIX);
}

/** The roster record behind a learner id, or '' when it is a real account. */
export function rosterParticipantIdFromLearnerId(id: string | undefined): string {
    return isRosterLearnerId(id) ? String(id).slice(ROSTER_LEARNER_PREFIX.length) : '';
}

/**
 * The roster as the `Learner` shape the rest of the app renders.
 *
 * Everything the tabs read is derived from what the tutor actually entered: level from
 * CEFR, XP and streak from progress, `attended` flags from the logged attendance, facts
 * as the same `[Tag] value` lines the lesson generator understands, and an empty
 * `avatarId` so the avatar service draws that learner's own initials instead of a
 * stranger's face.
 */
export function rosterAsLearners(participants: GroupParticipant[], group: GroupClass): Learner[] {
    const groupSessions = (group.sessions || []) as Session[];
    return (participants || []).map((p) => {
        const progress = Math.max(0, Math.min(100, Number(p.progress) || 0));
        const attendanceRate = attendanceRateFor(p);
        const facts: string[] = [];
        if (p.facts) facts.push(p.facts);
        if (p.interests) facts.push(`[Interests] ${p.interests}`);
        if (p.goals) facts.push(`[Goals] ${p.goals}`);
        if (p.l1) facts.push(`[L1] ${p.l1}`);
        if (p.routing) facts.push(`[How to use them in class] ${p.routing}`);

        const sessions = groupSessions.map((s) => {
            const entry = (p.attendance || []).find((a) => a.sessionId === s.id);
            return entry ? ({ ...s, attended: entry.present } as Session) : s;
        });

        return {
            id: rosterLearnerId(p.id),
            name: p.name,
            email: p.email || '',
            phone: p.phone || '',
            country: p.country || '',
            city: '',
            timezone: '',
            // Empty on purpose: the avatar service falls back to name initials.
            avatarId: '',
            level: cefrToCourseLevel(p.cefr, group.level),
            cefrLevel: p.cefr,
            l1Language: p.l1,
            facts,
            vocabulary: [],
            status: 'active' as const,
            joinedAt: group.dateCreated || '',
            competencies: [],
            needs: [],
            goals: p.goals ? [p.goals] : [],
            goalsList: p.goals ? [p.goals] : [],
            interests: p.interests || '',
            learningStyle: '',
            expectations: '',
            occupation: '',
            gender: 'Other' as const,
            birthday: '',
            languages: p.l1 ? [p.l1] : [],
            sessions,
            streak: 0,
            xp: Math.round(progress * 10),
            achievements: [],
            notes: p.notes || '',
            coursePlan: group.coursePlan,
            // Markers the class profile reads to route edits and to label the card.
            isGroupRosterLearner: true,
            rosterParticipantId: p.id,
            talkative: p.talkative,
            attendanceRate,
        } as unknown as Learner;
    });
}
