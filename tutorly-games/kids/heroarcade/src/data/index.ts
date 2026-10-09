import { Theme, Lang, Tr, Word } from './types';
import { themes1 } from './themes1';
import { themes2 } from './themes2';
import { themes3 } from './themes3';
import { themes4 } from './themes4';
import { themes5 } from './themes5';
import { themes6 } from './themes6';
import { themes7 } from './themes7';
import { themes8 } from './themes8';
import { themes9 } from './themes9';
import { themes10 } from './themes10';
import { themes11 } from './themes11';
import { themes12 } from './themes12';

export const BUILT_IN_THEMES: Theme[] = [
  ...themes1, ...themes2, ...themes3, ...themes4, ...themes5,
  ...themes6, ...themes7, ...themes8, ...themes9, ...themes10, ...themes11, ...themes12,
];

/** CCQ frames – {w} is replaced by the word in the learning language. */
export const CCQ_FRAMES: Record<Lang, string[]> = {
  en: ['What is this?', 'Is this a {w}?', 'Can you say "{w}"?', 'Do you like {w}?', 'What color is the {w}?', 'Is the {w} big or small?', 'Where can you see a {w}?', 'Point to the {w}!'],
  zh: ['这是什么？', '这是{w}吗？', '你能说"{w}"吗？', '你喜欢{w}吗？', '{w}是什么颜色？', '{w}是大的还是小的？', '你在哪里能看到{w}？', '指一指{w}！'],
  fr: ['Qu\'est-ce que c\'est ?', 'C\'est {w} ?', 'Tu peux dire « {w} » ?', 'Tu aimes {w} ?', 'De quelle couleur est {w} ?', '{w}, c\'est grand ou petit ?', 'Où peux-tu voir {w} ?', 'Montre {w} !'],
  it: ['Che cos\'è?', 'È {w}?', 'Puoi dire "{w}"?', 'Ti piace {w}?', 'Di che colore è {w}?', '{w} è grande o piccolo?', 'Dove puoi vedere {w}?', 'Indica {w}!'],
  de: ['Was ist das?', 'Ist das {w}?', 'Kannst du „{w}“ sagen?', 'Magst du {w}?', 'Welche Farbe hat {w}?', 'Ist {w} groß oder klein?', 'Wo kannst du {w} sehen?', 'Zeig auf {w}!'],
  tr: ['Bu ne?', 'Bu {w} mi?', '"{w}" diyebilir misin?', '{w} sever misin?', '{w} ne renk?', '{w} büyük mü küçük mü?', '{w} nerede görebilirsin?', '{w} göster!'],
  fa: ['این چیست؟', 'این {w} است؟', 'می‌توانی بگویی «{w}»؟', '{w} دوست داری؟', '{w} چه رنگی است؟', '{w} بزرگ است یا کوچک؟', 'کجا می‌توانی {w} ببینی؟', 'به {w} اشاره کن!'],
};

/** Chant frames: {1}{2}{3} are words. */
export const CHANT_FRAMES: Record<Lang, string[]> = {
  en: ['{1}, {2}, {3}! Clap, clap, clap!', '{1}, {2}, {3}! Tap, tap, tap!', 'I see a {1}, I see a {2}, I see a {3} – hooray!', 'One {1}, two {2}, three {3} – yippee!'],
  zh: ['{1}，{2}，{3}！拍拍手！', '{1}，{2}，{3}！跺跺脚！', '我看到{1}，我看到{2}，我看到{3}——好耶！', '一个{1}，两个{2}，三个{3}——太棒了！'],
  fr: ['{1}, {2}, {3} ! Tape, tape, tape !', '{1}, {2}, {3} ! Frappe, frappe, frappe !', 'Je vois {1}, je vois {2}, je vois {3} – hourra !', 'Un {1}, deux {2}, trois {3} – youpi !'],
  it: ['{1}, {2}, {3}! Batti, batti, batti!', '{1}, {2}, {3}! Tocca, tocca, tocca!', 'Vedo {1}, vedo {2}, vedo {3} – evviva!', 'Un {1}, due {2}, tre {3} – urrà!'],
  de: ['{1}, {2}, {3}! Klatsch, klatsch, klatsch!', '{1}, {2}, {3}! Stampf, stampf, stampf!', 'Ich sehe {1}, ich sehe {2}, ich sehe {3} – hurra!', 'Ein {1}, zwei {2}, drei {3} – juhu!'],
  tr: ['{1}, {2}, {3}! Alkış, alkış, alkış!', '{1}, {2}, {3}! Tık, tık, tık!', '{1} görüyorum, {2} görüyorum, {3} görüyorum – yaşasın!', 'Bir {1}, iki {2}, üç {3} – yaşasın!'],
  fa: ['{1}، {2}، {3}! دست، دست، دست!', '{1}، {2}، {3}! تق، تق، تق!', '{1} می‌بینم، {2} می‌بینم، {3} می‌بینم – هورا!', 'یک {1}، دو {2}، سه {3} – آخ‌جون!'],
};

export const UI: Record<string, Tr> = {
  whatDoYouWant: { en: 'What do you want to eat?', zh: '你想吃什么？', fr: 'Qu\'est-ce que tu veux manger ?', it: 'Cosa vuoi mangiare?', de: 'Was möchtest du essen?', tr: 'Ne yemek istiyorsun?', fa: 'چه می‌خواهی بخوری؟' },
  iWant: { en: 'I want', zh: '我想要', fr: 'Je veux', it: 'Voglio', de: 'Ich möchte', tr: 'İstiyorum:', fa: 'می‌خواهم' },
  itIsA: { en: 'It is a', zh: '这是', fr: 'C\'est', it: 'È', de: 'Das ist', tr: 'Bu bir', fa: 'این یک' },
  howMuch: { en: 'How much is the', zh: '多少钱？', fr: 'Combien coûte', it: 'Quanto costa', de: 'Wie viel kostet', tr: 'Ne kadar?', fa: 'چند است' },
  tooExpensive: { en: 'Too expensive!', zh: '太贵了！', fr: 'Trop cher !', it: 'Troppo caro!', de: 'Zu teuer!', tr: 'Çok pahalı!', fa: 'خیلی گران است!' },
  canIHave: { en: 'Can I have it for', zh: '可以便宜一点吗？', fr: 'Je peux l\'avoir pour', it: 'Posso averlo per', de: 'Kann ich es haben für', tr: 'Şu fiyata olur mu:', fa: 'می‌شود به این قیمت بدهی' },
  coins: { en: 'coins', zh: '个硬币', fr: 'pièces', it: 'monete', de: 'Münzen', tr: 'para', fa: 'سکه' },
  up: { en: 'up', zh: '上', fr: 'haut', it: 'su', de: 'hoch', tr: 'yukarı', fa: 'بالا' },
  down: { en: 'down', zh: '下', fr: 'bas', it: 'giù', de: 'runter', tr: 'aşağı', fa: 'پایین' },
  left: { en: 'left', zh: '左', fr: 'gauche', it: 'sinistra', de: 'links', tr: 'sol', fa: 'چپ' },
  right: { en: 'right', zh: '右', fr: 'droite', it: 'destra', de: 'rechts', tr: 'sağ', fa: 'راست' },
  whereWereYou: { en: 'Where were you?', zh: '你当时在哪里？', fr: 'Où étais-tu ?', it: 'Dov\'eri?', de: 'Wo warst du?', tr: 'Neredeydin?', fa: 'کجا بودی؟' },
  whatDidYouHave: { en: 'What did you have?', zh: '你拿着什么？', fr: 'Qu\'est-ce que tu avais ?', it: 'Cosa avevi?', de: 'Was hattest du?', tr: 'Elinde ne vardı?', fa: 'چه چیزی داشتی؟' },
  whatDoYouLike: { en: 'What do you like?', zh: '你喜欢什么？', fr: 'Qu\'est-ce que tu aimes ?', it: 'Cosa ti piace?', de: 'Was magst du?', tr: 'Neyi seversin?', fa: 'چه چیزی دوست داری؟' },
  whoTookIt: { en: 'Who took it?', zh: '是谁拿的？', fr: 'Qui l\'a pris ?', it: 'Chi l\'ha preso?', de: 'Wer hat es genommen?', tr: 'Kim aldı?', fa: 'چه کسی برداشت؟' },
  iSee: { en: 'I see a', zh: '我看到', fr: 'Je vois', it: 'Vedo', de: 'Ich sehe', tr: 'Görüyorum:', fa: 'می‌بینم' },
  goodJob: { en: 'Good job!', zh: '做得好！', fr: 'Bravo !', it: 'Bravo!', de: 'Gut gemacht!', tr: 'Aferin!', fa: 'آفرین!' },
  tryAgain: { en: 'Try again!', zh: '再试一次！', fr: 'Essaie encore !', it: 'Riprova!', de: 'Versuch es nochmal!', tr: 'Tekrar dene!', fa: 'دوباره امتحان کن!' },
  listen: { en: 'Listen!', zh: '听！', fr: 'Écoute !', it: 'Ascolta!', de: 'Hör zu!', tr: 'Dinle!', fa: 'گوش کن!' },
  repeat: { en: 'Repeat after me', zh: '跟我说', fr: 'Répète après moi', it: 'Ripeti dopo di me', de: 'Sprich mir nach', tr: 'Benden sonra tekrar et', fa: 'بعد از من تکرار کن' },
  whatIsThis: { en: 'What is this?', zh: '这是什么？', fr: 'Qu\'est-ce que c\'est ?', it: 'Che cos\'è?', de: 'Was ist das?', tr: 'Bu ne?', fa: 'این چیست؟' },
  yes: { en: 'Yes', zh: '是', fr: 'Oui', it: 'Sì', de: 'Ja', tr: 'Evet', fa: 'بله' },
  no: { en: 'No', zh: '不是', fr: 'Non', it: 'No', de: 'Nein', tr: 'Hayır', fa: 'نه' },
  hello: { en: 'Hello!', zh: '你好！', fr: 'Bonjour !', it: 'Ciao!', de: 'Hallo!', tr: 'Merhaba!', fa: 'سلام!' },
  thankYou: { en: 'Thank you!', zh: '谢谢！', fr: 'Merci !', it: 'Grazie!', de: 'Danke!', tr: 'Teşekkürler!', fa: 'ممنون!' },
  yummy: { en: 'Yummy!', zh: '好吃！', fr: 'Miam !', it: 'Gnam!', de: 'Lecker!', tr: 'Nefis!', fa: 'خوشمزه!' },
};

export const NUMBER_WORDS: Record<Lang, string[]> = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  zh: ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
  fr: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'],
  it: ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'],
  de: ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'],
  tr: ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'],
  fa: ['صفر', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده'],
};

export const HEROES = [
  { id: 'max', name: 'Max', icon: '⚡', power: 'super speed', color: '#F59E0B' },
  { id: 'lina', name: 'Lina', icon: '🦸‍♀️', power: 'can fly', color: '#8B5CF6' },
  { id: 'kai', name: 'Kai', icon: '💪', power: 'super strong', color: '#10B981' },
  { id: 'zara', name: 'Zara', icon: '🐾', power: 'talks to animals', color: '#EC4899' },
  { id: 'bolt', name: 'Bolt', icon: '🤖', power: 'robot dog', color: '#3B82F6' },
];

export function ccqsFor(word: Word, lang: Lang): string[] {
  const w = word.t[lang];
  return CCQ_FRAMES[lang].map((f) => f.replace('{w}', w));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
