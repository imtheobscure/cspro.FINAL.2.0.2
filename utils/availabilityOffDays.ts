/**
 * Parses a learner's free-text reply (collected through the SMART Goal popup's
 * "days they are unavailable / next month plans / holidays" questions) into
 * machine-readable "days off":
 *
 *  - offWeekdays: weekday indexes (0=Sunday … 6=Saturday) the learner repeats weekly
 *  - offDates:    one-off calendar dates (yyyy-MM-dd), e.g. "not available Sep 15"
 *  - detected:    human labels of everything found, for display
 *
 * English-only, heuristic and deliberately conservative: it only marks a day off
 * when the sentence clearly says the learner is unavailable (or explicitly lists
 * the only days they ARE available — then the rest of the week is treated as off).
 */

export interface LearnerOffDays {
    offWeekdays: number[];
    offDates: string[];
    detected: string[];
}

const WEEKDAY_IDX: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tues: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thurs: 4, thur: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
};
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTH_IDX: Record<string, number> = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5,
    june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9,
    october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

// Regex literals only (reliable everywhere) — no string-built patterns.
const WEEKDAY_RE = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|tues|thurs|thur|mon|tue|wed|thu|fri|sat|sun)s?\b/gi;
const WEEKDAY_RANGE_RE = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|tues|thurs|thur|mon|tue|wed|thu|fri|sat|sun)s?\s+(?:through|thru|to|until)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|tues|thurs|thur|mon|tue|wed|thu|fri|sat|sun)s?\b/gi;
const MONTH_RE = /\b(september|october|november|december|january|february|april|august|june|july|march|sept|sep|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug)\b/gi;

// Markers that point at times the learner is NOT free.
const NEGATIVE_RE = /(unavailable|not available|not free|not able|can'?t|cannot|can not|busy|off|away|except|excluding|other than|no class|doesn'?t work|don'?t work|won'?t work|not good|unable|travel|travelling|traveling|trip|vacation|holiday|on leave|working)/i;
// Markers that point at times the learner IS free.
const POSITIVE_RE = /(available|am free|is free|can do|works? for me|good for me|prefer|usually (?:do|take)|best (?:for me|time)|fine (?:for me|with me))/i;
const ONLY_RE = /(only|just|exclusively)/i;

const dayIdxFromWord = (word: string): number => WEEKDAY_IDX[word.toLowerCase()];

function collectWeekdays(clause: string): Set<number> {
    const found = new Set<number>();
    WEEKDAY_RANGE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WEEKDAY_RANGE_RE.exec(clause)) !== null) {
        const a = dayIdxFromWord(m[1]);
        const b = dayIdxFromWord(m[2]);
        if (a === undefined || b === undefined) continue;
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) found.add(i);
    }
    WEEKDAY_RE.lastIndex = 0;
    while ((m = WEEKDAY_RE.exec(clause)) !== null) {
        const idx = dayIdxFromWord(m[1]);
        if (idx !== undefined) found.add(idx);
    }
    return found;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pushDate = (found: string[], d: Date) => {
    const key = toKey(d);
    if (!found.includes(key)) found.push(key);
};
const firstDayNumber = (text: string): number | null => {
    const m = /\b(\d{1,2})(?:st|nd|rd|th)?\b/.exec(text);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n >= 1 && n <= 31 ? n : null;
};

/**
 * Finds date mentions ("Sep 15", "Sep 20 to 28", "Sep 20 to Oct 2", "Oct 10-14")
 * by walking month-name mentions and reading the day numbers that follow them.
 */
function collectMonthDates(clause: string, referenceYear: number): string[] {
    const found: string[] = [];
    MONTH_RE.lastIndex = 0;
    const mentions: { start: number; end: number; month: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = MONTH_RE.exec(clause)) !== null) {
        mentions.push({ start: m.index, end: m.index + m[0].length, month: MONTH_IDX[m[1].toLowerCase()] });
    }
    if (mentions.length === 0) return found;

    // Single dates and same-month windows for each mention.
    for (let i = 0; i < mentions.length; i++) {
        const { end, month } = mentions[i];
        const nextStart = i + 1 < mentions.length ? mentions[i + 1].start : clause.length;
        const seg = clause.slice(end, Math.min(nextStart, end + 40));
        const d1 = firstDayNumber(seg);
        if (d1 === null) continue;

        // Range within the same month: "Oct 10-14", "Sep 20 to 28" (month not repeated).
        const rest = seg.slice(seg.search(/\d/));
        const d2 = /(?:-|–|—|to|until|through|thru|till)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i.exec(rest)?.[1];
        const sameMonthRange = d2 ? parseInt(d2, 10) : null;

        if (sameMonthRange !== null && sameMonthRange >= 1 && sameMonthRange <= 31 && sameMonthRange !== d1) {
            const from = Math.min(d1, sameMonthRange);
            const to = Math.max(d1, sameMonthRange);
            const start = new Date(referenceYear, month - 1, from);
            for (let k = 0; k <= to - from; k++) pushDate(found, new Date(start.getTime() + k * DAY_MS));
        } else {
            pushDate(found, new Date(referenceYear, month - 1, d1));
            pushDate(found, new Date(referenceYear + 1, month - 1, d1));
        }
    }

    // Windows that repeat or cross a month boundary: "Sep 20 to Sep 28", "Sep 20 to Oct 2".
    for (let i = 0; i + 1 < mentions.length; i++) {
        const a = mentions[i];
        const b = mentions[i + 1];
        const gap = clause.slice(a.end, Math.min(b.start, a.end + 40));
        if (!/(?:-|–|—|to|until|through|thru|till)/i.test(gap)) continue;
        const d1 = firstDayNumber(gap);
        const d2 = firstDayNumber(clause.slice(b.end, Math.min(clause.length, b.end + 20)));
        if (d1 === null || d2 === null) continue;
        // Span day-by-day from (a.month, d1) to (b.month, d2), bounded.
        let start = new Date(referenceYear, a.month - 1, d1);
        let end = new Date(referenceYear, b.month - 1, d2);
        if (end < start) end = new Date(referenceYear + 1, b.month - 1, d2);
        let guard = 0;
        while (start <= end && guard < 45) {
            pushDate(found, start);
            start = new Date(start.getTime() + DAY_MS);
            guard++;
        }
    }
    return found;
}

export function parseLearnerOffDays(reply?: string, referenceDate?: Date): LearnerOffDays {
    const offWeekdays = new Set<number>();
    const offDates: string[] = [];
    const detected: string[] = [];
    if (!reply) return { offWeekdays: [], offDates: [], detected: [] };

    const ref = referenceDate || new Date();
    // Split on sentence ends AND contrastive connectors so "free Mondays but
    // Thursdays are no good" is judged clause by clause.
    const clauses = reply.split(/([.;!?\n]+|\s+but\s+|\s+however\s+|\s+unless\s+)/i)
        .map(s => s.trim())
        .filter(s => s && !/^[.;!?\n]+$/.test(s));

    let listedAvailableOnly = false;
    const allAvailable = new Set<number>();

    for (const clause of clauses) {
        const weekdays = collectWeekdays(clause);
        const dates = collectMonthDates(clause, ref.getFullYear());
        const negative = NEGATIVE_RE.test(clause);
        const only = ONLY_RE.test(clause);
        const positive = POSITIVE_RE.test(clause) || (only && weekdays.size > 0);

        if (negative) {
            weekdays.forEach(w => { offWeekdays.add(w); detected.push(WEEKDAY_LABELS[w] + 's'); });
            dates.forEach(d => { if (!offDates.includes(d)) offDates.push(d); });
        } else if (positive) {
            weekdays.forEach(w => allAvailable.add(w));
            if (only && weekdays.size > 0) listedAvailableOnly = true;
        }
    }

    // "I'm only available on Mon and Wed" → the other weekdays are off.
    if (listedAvailableOnly && allAvailable.size > 0 && allAvailable.size < 7) {
        for (let i = 0; i < 7; i++) {
            if (!allAvailable.has(i)) {
                offWeekdays.add(i);
                detected.push(WEEKDAY_LABELS[i] + 's');
            }
        }
    }

    return {
        offWeekdays: [...offWeekdays].sort((a, b) => a - b),
        offDates,
        detected: Array.from(new Set(detected)).sort(),
    };
}

export const weekdayLabel = (idx: number) => WEEKDAY_LABELS[idx];
