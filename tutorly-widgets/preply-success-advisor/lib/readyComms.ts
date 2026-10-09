/**
 * Ready communication — the message you send a tutor today.
 *
 * Every other prompt in this app produces something for the AI. This one produces
 * something for a person: a paste-ready check-in that says what you already know
 * about their week, and then asks for exactly the numbers the app is missing.
 *
 * It exists because of the bottleneck in the real workflow — you open a tutor, you
 * know you should write to them, and you spend ten minutes working out what to say
 * and what to ask. The data to answer both questions is already on this screen: the
 * snapshots, the plan, the audit, the open follow-ups, the profile gaps, the trends.
 *
 * Both languages are produced from the same items, never translated at the end, so a
 * Persian question can never drift out of sync with its English twin.
 *
 * One deliberate rule that the checks enforce: **the Persian body is Persian**. Money
 * is written the way an Iranian writes it ("۴۲۰ دلار", "۴۲ میلیون تومان"), profile
 * labels have Persian names, and every nudge is built here from numbers rather than
 * borrowing an English sentence from the nudge engine. The only English left inside
 * the Persian text is a phrase the AI wrote elsewhere (a plan focus, an audit action,
 * a follow-up), and those are wrapped in «» so they read as quotes rather than as a
 * glitch.
 */

import type { Platform, Tutor } from "../types";
import { accountCompleteness, averages, latestSnapshot, phaseMeta, upcomingEvents, weekTrend } from "./domain";
import { num, pct, tinyDate, toToman, usd, toman } from "./format";
import { planProgress } from "./prompts";

export type CommsLang = "en" | "fa";

/** The four things a check-in can contain. */
export type CommsGroup = "update" | "numbers" | "profile" | "strategy";

export interface CommsItem {
  /** Stable id — selection survives re-renders and data changes. */
  id: string;
  group: CommsGroup;
  /** One sentence, English, already carrying this tutor's real numbers. */
  en: string;
  /** The same sentence in Persian. Never a runtime translation of `en`. */
  fa: string;
}

export const GROUP_LABEL: Record<CommsGroup, { en: string; fa: string; icon: string }> = {
  update: { en: "What I see on your side", fa: "آنچه از سمت شما میبینم", icon: "📌" },
  numbers: { en: "Send me these numbers", fa: "این اعداد را برایم بفرستید", icon: "🔢" },
  profile: { en: "Profile details to complete", fa: "اطلاعات پروفایل که باید کامل شود", icon: "🧩" },
  strategy: { en: "Two questions about your week", fa: "دو پرسش دربارهٔ هفتهٔ شما", icon: "🧭" },
};

const ORDER: CommsGroup[] = ["update", "numbers", "profile", "strategy"];

/* --------------------------------------------------------------- Persian ---- */

/** Persian text is written with Latin digits by default — what people actually type
 *  in Telegram. This converts to ۱۲۳ for the mentors who prefer them. */
export function toPersianDigits(value: string): string {
  return value.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** "$420" becomes "۴۲۰ دلار", because a price in Persian is a number and a word. */
function faUsd(amount: number): string {
  return `${num(amount)} دلار`;
}

/** "۴۲ میلیون تومان" — the way Iranians quote large amounts out loud. */
function faToman(usdAmount: number, rialPerUsd: number): string {
  const value = toToman(usdAmount, rialPerUsd);
  if (!Number.isFinite(value) || value <= 0) return "0 تومان";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} میلیارد تومان`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} میلیون تومان`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} هزار تومان`;
  return `${Math.round(value)} تومان`;
}

/** Persian names for the profile pieces `accountCompleteness` reports in English. */
const FA_PROFILE_LABEL: Record<string, string> = {
  "Headlines (3)": "سه تیتر",
  Description: "متن معرفی",
  "Intro video script": "متن ویدیوی معرفی",
  "Profile photo": "عکس پروفایل",
  "Subjects with detail": "درسها همراه با توضیح",
  "Proficiency levels": "سطحهای زبانی",
  "Age groups": "گروههای سنی",
  Certificates: "مدارک",
  Specialties: "تخصصها",
  "Availability set": "ساعتهای در دسترس",
  "Price set": "قیمت",
};

const faProfileLabel = (label: string) => FA_PROFILE_LABEL[label] ?? `«${label}»`;

/** Persian names for the four roster phases. */
const FA_PHASE: Record<string, string> = {
  preparing: "آماده‌سازی اطلاعات حساب",
  waiting: "در انتظار تأیید حساب",
  active: "حساب فعال",
  passive: "حساب غیرفعال",
};

/** Persian names for the cultural calendar. */
const FA_EVENT: Record<string, string> = {
  Nowruz: "نوروز",
  "Chaharshanbe Suri": "چهارشنبهسوری",
  "Eid al-Fitr": "عید فطر",
  "Yalda Night": "شب یلدا",
  Muharram: "محرم",
  Mehregan: "مهرگان",
};

/* -------------------------------------------------------------- the items -- */

/**
 * Everything worth telling and asking this tutor, in one pass.
 *
 * The order matters: what you have, then what you need — a message that opens with
 * three questions and no gift reads as an audit.
 */
export function buildCommsItems(tutor: Tutor, platform: Platform, rialPerUsd: number, now = new Date()): CommsItem[] {
  const items: CommsItem[] = [];
  const last = latestSnapshot(tutor);
  const avg = averages(tutor, 4);
  const trend = weekTrend(tutor);
  const completeness = accountCompleteness(tutor.account);
  const phase = phaseMeta(tutor.phase);
  const commission = platform.commission || 0;
  const daysInStage = Math.max(0, Math.round((now.getTime() - new Date(tutor.phaseSince || tutor.createdAt).getTime()) / 86_400_000));
  const daysSinceNumbers = last ? Math.round((now.getTime() - new Date(last.weekOf || last.createdAt).getTime()) / 86_400_000) : -1;

  /* ---------------------------------------------------------------- updates */

  if (last) {
    const convertedEn = last.trialsConverted ? `, ${num(last.trialsConverted)} of them booked again` : "";
    const convertedFa = last.trialsConverted ? ` که ${num(last.trialsConverted)} موردش ماندگار شد` : "";
    const ratingEn = last.rating ? `, rating ${num(last.rating, 1)}` : "";
    const ratingFa = last.rating ? ` و امتیاز ${num(last.rating, 1)}` : "";
    items.push({
      id: "update:week",
      group: "update",
      en: `Last week on ${platform.name}: ${num(last.lessons)} lessons, ${num(last.trials)} trials${convertedEn}, ${usd(last.earningsUsd)} (about ${toman(last.earningsUsd, rialPerUsd)})${ratingEn}.`,
      fa: `هفتهٔ گذشته در ${platform.name}: ${num(last.lessons)} درس، ${num(last.trials)} جلسهٔ آزمایشی${convertedFa}، درآمد ${faUsd(last.earningsUsd)} (حدود ${faToman(last.earningsUsd, rialPerUsd)})${ratingFa}.`,
    });
  } else {
    items.push({
      id: "update:no-numbers",
      group: "update",
      en: `I have no weekly numbers from you yet, so everything I show you on the dashboard is a guess until the first week is logged.`,
      fa: `هنوز هیچ عدد هفتگیای از شما ندارم؛ تا هفتهٔ اول ثبت نشود، هر چیزی که در داشبورد نشانتان میدهم حدس است.`,
    });
  }

  if (last && trend.direction !== "flat") {
    const up = trend.direction === "up";
    items.push({
      id: "update:trend",
      group: "update",
      en: `Earnings are ${up ? "up" : "down"} ${pct(Math.abs(trend.earningsPercent))} on the week before, and lessons are ${up ? "+" : "−"}${num(Math.abs(trend.lessonsDelta))}.`,
      fa: `درآمد نسبت به هفتهٔ قبل ${pct(Math.abs(trend.earningsPercent))} ${up ? "بیشتر" : "کمتر"} شده و تعداد درسها ${num(Math.abs(trend.lessonsDelta))} ${up ? "بالا" : "پایین"} رفته است.`,
    });
  } else if (last) {
    items.push({
      id: "update:trend",
      group: "update",
      en: `Earnings are steady week on week — about ${usd(avg.earningsUsd)} a week across the last ${num(avg.sampleSize || 1)} weeks.`,
      fa: `درآمد هفتهبههفته ثابت مانده؛ حدود ${faUsd(avg.earningsUsd)} در هفته در ${num(avg.sampleSize || 1)} هفتهٔ گذشته.`,
    });
  }

  const plan = tutor.plan;
  if (plan && plan.weeks.length) {
    const progress = planProgress(plan);
    const current = plan.weeks.find((w) => !w.done) ?? plan.weeks[plan.weeks.length - 1];
    items.push({
      id: "update:plan",
      group: "update",
      en: `Your 90-day plan is ${progress.done} of ${progress.total} weeks done. This week's focus: “${current.focus}” and the number that proves it is “${current.metric}”.`,
      fa: `از برنامهٔ ۹۰ روزه ${progress.done} هفته از ${progress.total} هفته انجام شده. تمرکز این هفته: «${current.focus}» و معیار سنجشش: «${current.metric}».`,
    });
  } else {
    const early = daysInStage <= 2;
    items.push({
      id: "update:phase",
      group: "update",
      en: early
        ? `We have not started the 90-day plan yet, and you have only just arrived on the roster — this is the best week to build it, before the calendar fills up with whatever comes.`
        : `We have no 90-day plan yet — you are ${num(daysInStage)} days into the “${phase.label}” stage, which is the right moment to build one.`,
      fa: early
        ? `برنامهٔ ۹۰ روزه را هنوز شروع نکردهایم و شما تازه به فهرست اضافه شدهاید؛ همین هفته بهترین وقت ساختنش است، پیش از آنکه تقویم با هر چه پیش بیاید پر شود.`
        : `هنوز برنامهٔ ۹۰ روزه نداریم؛ شما ${num(daysInStage)} روز است در مرحلهٔ «${FA_PHASE[tutor.phase] ?? phase.label}» هستید و همین حالا بهترین وقت ساختن آن است.`,
    });
  }

  const audit = tutor.audit;
  if (audit) {
    const top = [...(audit.actions ?? [])].sort((a, b) => (a.impact === "High" ? -1 : 1) - (b.impact === "High" ? -1 : 1))[0];
    items.push({
      id: "update:audit",
      group: "update",
      en: `Profile score ${num(audit.powerScore)}/100${top ? `, and the biggest single lever is: ${top.title}.` : "."}`,
      // The lever's title is written by the audit, in English — quoted so the
      // Persian sentence reads as a quote and not as a broken translation.
      fa: `امتیاز پروفایل ${num(audit.powerScore)} از ۱۰۰${top ? ` و مهمترین کار باقیمانده: «${top.title}»` : ""}.`,
    });
  }

  if (completeness.missing.length) {
    items.push({
      id: "update:completeness",
      group: "update",
      en: `The profile is ${completeness.percent}% complete — still missing: ${completeness.missing.slice(0, 4).join(", ")}.`,
      fa: `پروفایل ${completeness.percent}% کامل است؛ این موارد ماندهاند: ${completeness.missing.slice(0, 4).map(faProfileLabel).join("، ")}.`,
    });
  }

  const openFollowUps = tutor.logs
    .flatMap((l) => l.followUps ?? [])
    .filter((f) => !f.done)
    .slice(-3);
  if (openFollowUps.length) {
    const quoted = openFollowUps.map((f) => `«${f.text}»`);
    items.push({
      id: "update:followups",
      group: "update",
      en: `Still open from our last conversation: ${openFollowUps.map((f) => f.text).join("; ")}.`,
      fa: `از گفتوگوی قبلیمان اینها باز ماندهاند: ${quoted.join("، ")}.`,
    });
  }

  /*
   * Nudges, written here rather than borrowed.
   *
   * The nudge engine's own sentences are English and read like an internal alert
   * ("84 days in Preparing — send a check-in"). Sending that to a tutor, or pasting
   * it untranslated into a Persian message, is exactly the failure this card exists
   * to prevent — so the signals that matter are rebuilt as tutor-facing sentences in
   * both languages, from the numbers themselves.
   */
  const alerts: CommsItem[] = [];
  if (last && last.trials === 0) {
    alerts.push({
      id: "update:no-trials",
      group: "update",
      en: `No trial lessons last week. Trials are the top of the funnel — without them the calendar empties about six weeks from now, and it is invisible until it happens.`,
      fa: `هفتهٔ گذشته هیچ جلسهٔ آزمایشی نداشتید. جلسهٔ آزمایشی ابتدای این کار است؛ بدون آن، تقویمتان حدود شش هفته بعد خالی میشود و تا وقتی اتفاق نیفتاده دیده نمیشود.`,
    });
  }
  if (last && last.responseHours > 8) {
    alerts.push({
      id: "update:slow-replies",
      group: "update",
      en: `Your average reply time is ${num(last.responseHours, 1)} hours. Under eight is where the platform's own guidance sits, and it moves search ranking more than anything else you can change this week.`,
      fa: `میانگین زمان پاسخدهی شما ${num(last.responseHours, 1)} ساعت است. زیر هشت ساعت نقطهٔ مطلوب پلتفرم است و از هر کار دیگری در این هفته بیشتر روی رتبهٔ نمایش شما اثر میگذارد.`,
    });
  }
  if (last && last.cancellations > 1) {
    alerts.push({
      id: "update:cancellations",
      group: "update",
      en: `${num(last.cancellations)} lessons were cancelled last week. If it was illness or travel, say so — but if it is the timetable slipping, that is worth fixing now.`,
      fa: `هفتهٔ گذشته ${num(last.cancellations)} درس لغو شد. اگر بهخاطر بیماری یا سفر بوده بگویید تا در برنامه لحاظ کنم؛ اما اگر نظم تقویم بههم خورده، همین حالا باید درست شود.`,
    });
  }
  if (!last && daysInStage > 30) {
    alerts.push({
      id: "update:starting",
      group: "update",
      en: `${num(daysInStage)} days in and still no numbers logged — let us spend ten minutes getting the first week in, because every score on this dashboard is guesswork until then.`,
      fa: `${num(daysInStage)} روز گذشته و هنوز عددی ثبت نشده؛ بیایید ده دقیقه وقت بگذاریم و هفتهٔ اول را وارد کنیم، چون تا آن موقع همهٔ امتیازهای داشبورد حدس است.`,
    });
  }
  if (last && daysSinceNumbers > 9) {
    alerts.push({
      id: "update:stale-numbers",
      group: "update",
      en: `The newest numbers I have are from ${tinyDate(last.weekOf || last.createdAt)} (${num(daysSinceNumbers)} days ago), so the trend line is flat only because it is empty.`,
      fa: `تازهترین عددی که دارم مربوط به ${tinyDate(last.weekOf || last.createdAt)} است (${num(daysSinceNumbers)} روز پیش)، پس خط روند فقط بهخاطر خالی بودن، صاف به نظر میرسد.`,
    });
  }
  items.push(...alerts.slice(0, 2));

  const event = upcomingEvents(now, 21)[0];
  if (event) {
    items.push({
      id: "update:event",
      group: "update",
      en: `${event.emoji} ${event.name} is ${num(event.inDays)} days away — worth planning your slots around it now.`,
      fa: `${event.emoji} ${FA_EVENT[event.name] ?? event.name} ${num(event.inDays)} روز دیگر است — بهتر است از حالا برای ظرفیت آن روزها برنامه بریزیم.`,
    });
  }

  /* ---------------------------------------------------------- what to send */

  items.push({
    id: "ask:week-numbers",
    group: "numbers",
    en: `Send this week's numbers: how many lessons, how many trials, and how many of those booked again.`,
    fa: `اعداد این هفته را بفرستید: چند درس، چند جلسهٔ آزمایشی و چند نفرشان ماندگار شدند.`,
  });
  if (!last || daysSinceNumbers > 9) {
    items.push({
      id: "ask:insight-shot",
      group: "numbers",
      en: `If it is quicker, just send a screenshot of your Insight page — I will enter the numbers myself.`,
      fa: `اگر سریعتر است، فقط یک اسکرینشات از صفحهٔ Insight بفرستید؛ خودم اعداد را وارد میکنم.`,
    });
  }
  items.push({
    id: "ask:earnings",
    group: "numbers",
    en: `What did you actually earn this week, in dollars or Toman?`,
    fa: `این هفته واقعاً چقدر درآمد داشتید؛ دلاری یا تومانی؟`,
  });
  items.push({
    id: "ask:students",
    group: "numbers",
    en: `How many active students do you have right now, and how many are new this week?`,
    fa: `الان چند شاگرد فعال دارید و این هفته چند نفرشان تازه شروع کردهاند؟`,
  });
  items.push({
    id: "ask:quality",
    group: "numbers",
    en: `Current rating, average response time and how many lessons you had to cancel — those three move your ranking more than anything else.`,
    fa: `امتیاز فعلی، میانگین زمان پاسخدهی و تعداد درسهایی که لغو شدهاند — این سه مورد بیشتر از هر چیز روی رتبهٔ شما اثر میگذارند.`,
  });
  items.push({
    id: "ask:price",
    group: "numbers",
    en: tutor.account.priceUsd
      ? `Are you still on ${usd(tutor.account.priceUsd)} an hour? If it changed, tell me the new number so the salary${commission ? ` and the ${pct(commission * 100)} commission` : ""} stay accurate.`
      : `What are you charging an hour now? I cannot project your income without it.`,
    fa: tutor.account.priceUsd
      ? `همان ${faUsd(tutor.account.priceUsd)} در ساعت هستید؟ اگر عوض شده، عدد جدید را بگویید تا محاسبات${commission ? ` و ${pct(commission * 100)} کمیسیون پلتفرم` : ""} درست بماند.`
      : `الان ساعتی چقدر میگیرید؟ بدون این عدد نمیتوانم درآمدتان را پیشبینی کنم.`,
  });

  /* -------------------------------------------------------- profile pieces */

  if (completeness.missing.includes("Certificates")) {
    items.push({
      id: "ask:certificates",
      group: "profile",
      en: `Have you finished any certificate or degree since we started? Send the exact title and the year and I will add it.`,
      fa: `از زمانی که شروع کردیم مدرک یا گواهی جدیدی گرفتهاید؟ عنوان دقیق و سالش را بفرستید تا اضافه کنم.`,
    });
  }
  if (completeness.missing.includes("Availability set")) {
    items.push({
      id: "ask:availability",
      group: "profile",
      en: `How many hours a week are you genuinely online and reachable? Availability you cannot keep costs you bookings and ranking.`,
      fa: `واقعاً چند ساعت در هفته آنلاین و در دسترس هستید؟ ساعتهایی که نتوانید نگه دارید، هم رزرو و هم رتبه را از شما میگیرد.`,
    });
  }
  if (completeness.missing.includes("Profile photo")) {
    items.push({
      id: "ask:photo",
      group: "profile",
      en: `A clear, well-lit photo with your face visible is still missing — it is the cheapest win we have left.`,
      fa: `یک عکس واضح با نور خوب که چهرهتان دیده شود هنوز نداریم؛ این ارزانترین بهبودی است که مانده.`,
    });
  }
  if (completeness.missing.includes("Subjects with detail")) {
    items.push({
      id: "ask:subjects",
      group: "profile",
      en: `Which subjects can you honestly teach this month, and which of them do you want more students in?`,
      fa: `این ماه واقعاً چه درسهایی را میتوانید تدریس کنید و در کدامشان شاگرد بیشتری میخواهید؟`,
    });
  }

  /* --------------------------------------------------------------- strategy */

  items.push({
    id: "ask:demand",
    group: "strategy",
    en: `What are students asking you for most this week — conversation, exams, business English, kids?`,
    fa: `این هفته بیشتر چه درخواستی از شاگردها داشتهاید — مکالمه، آزمون، انگلیسی کاری یا کودکان؟`,
  });
  items.push({
    id: "ask:blocker",
    group: "strategy",
    en: `What is the one thing slowing you down at the moment: not enough open slots, the price, or the level of students you are getting?`,
    fa: `الان بزرگترین چیزی که سرعتتان را کم کرده چیست: وقت خالی کم، قیمت، یا سطح شاگردهایی که میگیرید؟`,
  });
  items.push({
    id: "ask:goal-shift",
    group: "strategy",
    en: tutor.goal
      ? `Is the target still ${usd(tutor.goal.monthlyIncomeUsd)} a month and ${num(tutor.goal.hoursPerWeek)} hours a week, or has it moved?`
      : `Do you already have a monthly income target in mind, so I can build the 90-day plan around it?`,
    fa: tutor.goal
      ? `هدف هنوز ماهی ${faUsd(tutor.goal.monthlyIncomeUsd)} و هفتهای ${num(tutor.goal.hoursPerWeek)} ساعت است یا تغییر کرده؟`
      : `عدد هدف ماهانهتان را مشخص کردهاید تا برنامهٔ ۹۰ روزه را بر پایهٔ آن بسازم؟`,
  });

  return items;
}

/** Items grouped in reading order, for the picker UI. */
export function groupCommsItems(items: CommsItem[]): { group: CommsGroup; items: CommsItem[] }[] {
  return ORDER.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter((g) => g.items.length);
}

/** How a mentor would address them: their own script in their own language. */
function firstName(tutor: Tutor, lang: CommsLang): string {
  const persian = (tutor.name || "").trim();
  const latin = (tutor.latinName || "").trim();
  const source = lang === "fa" ? persian || latin : latin || persian;
  const first = source.split(/[\s,]+/)[0];
  return first || (lang === "fa" ? "دوست من" : "there");
}

export interface RenderOptions {
  items: CommsItem[];
  tutor: Tutor;
  lang: CommsLang;
  /** Ids the mentor left ticked. Unticked items are simply absent. */
  includeIds: Set<string> | string[];
  /** Persian digits (۱۲۳) instead of Latin ones. Persian version only. */
  persianDigits?: boolean;
  /** Sign-off line, added to whichever language is rendered. */
  signOff?: string;
}

/**
 * The paste-ready message.
 *
 * Deliberate structure: a greeting, what you see, what you need, a thank-you. Plain
 * text on purpose — a chat client would show markdown asterisks as asterisks — and no
 * emoji soup.
 */
export function renderReadyMessage({ items, tutor, lang, includeIds, persianDigits = false, signOff }: RenderOptions): string {
  const include = includeIds instanceof Set ? includeIds : new Set(includeIds);
  const chosen = items.filter((i) => include.has(i.id));
  const name = firstName(tutor, lang);
  const groups = groupCommsItems(chosen);

  const header =
    lang === "fa"
      ? [`سلام ${name} جان 👋`, `یک چکاین کوتاه؛ هم از سمت من چند نکته هست و هم چند عدد که برای تحلیل دقیق لازم دارم.`]
      : [`Hi ${name} 👋`, `Quick check-in — here is what I can see on your side, plus a few numbers I need so the analysis is accurate.`];

  const blocks = groups.map(({ group, items: groupItems }) => {
    const label = GROUP_LABEL[group];
    return [`${label.icon} ${label[lang]}`, ...groupItems.map((i) => `• ${lang === "fa" ? i.fa : i.en}`)].join("\n");
  });

  const thanks =
    lang === "fa"
      ? "ممنون 🙏 بهمحض اینکه اینها را بفرستید، تحلیلها و برنامهٔ هفتهٔ آینده را برایتان آماده میکنم."
      : "Thank you 🙏 As soon as I have these I will send back the analysis and the plan for next week.";

  // No date line: a chat client already timestamps the message, and a trailing
  // "(Sep 23)" on a Persian paragraph reads like machine output.
  const parts = [header.join("\n"), blocks.join("\n\n"), thanks, (signOff ?? "").trim()].filter((p) => p && p.trim());

  const text = parts.join("\n\n");
  return persianDigits && lang === "fa" ? toPersianDigits(text) : text;
}

/** Both versions in one paste, separated — for a mentor who sends the English text and
 *  keeps the Persian one, or the other way round. */
export function renderBoth(options: Omit<RenderOptions, "lang" | "persianDigits">): string {
  const en = renderReadyMessage({ ...options, lang: "en" });
  const fa = renderReadyMessage({ ...options, lang: "fa", persianDigits: true });
  return `${en}\n\n${"─".repeat(28)}\n\n${fa}`;
}
