export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

export interface QuickAction {
  id: string;
  emoji: string;
  label: string;
  say: string;
}

export interface NPC {
  id: string;
  name: string;
  avatar: string; // dataURL or http url
  role: string;
  voiceURI: string; // SpeechSynthesisVoice.voiceURI
  personality: string;
  speechSpeed: number; // 0.8 - 1.2
  pitch: number; // 0.5 - 2
  relationshipToLearner: string;
  tone: string;
  mood: string;
  L1: string;
  spokenLanguages: string; // comma separated
  multilingual: boolean;
  catchphrases: string[];
  quickActions: QuickAction[];
  mic: boolean; // mic on indicator
}

export interface Learner {
  id: string;
  name: string;
  avatar: string;
  score: number;
  badges: string[];
  rarity: Rarity;
}

/**
 * One piece of rich content attached to a chat message.
 *
 * Everything the classroom can post — a photo, a GIF, a voice note, an embedded
 * YouTube/SoundCloud player, a live site frame, a local file the tutor dropped in
 * — travels as one of these, so a bubble is just "text + attachments" and the
 * renderer never has to guess what it is looking at.
 */
export type ChatAttachmentKind =
  | "sticker" // built-in big-emoji / animated sticker
  | "gif" // animated image (built-in pack, GIF file or GIF url)
  | "image"
  | "voice" // recorded voice note (has a waveform + transcript)
  | "audio"
  | "video"
  | "youtube"
  | "soundcloud"
  | "site" // embedded web page
  | "file"
  | "link";

export interface ChatAttachment {
  id: string;
  kind: ChatAttachmentKind;
  /** Where the media actually is. `data:` survives a reload, `blob:` does not. */
  url: string;
  mime?: string;
  name?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  /** Normalised 0..1 bars, for voice notes and local audio. */
  waveform?: number[];
  /** Poster frame for videos and embeds. */
  thumb?: string;
  /** Ready-to-frame URL for youtube / soundcloud / site attachments. */
  embedUrl?: string;
  title?: string;
  author?: string;
  provider?: string;
  /** What the voice note says, so it can be read, searched and re-spoken. */
  transcript?: string;
  caption?: string;
  /** Built-in sticker / GIF identity (see src/chat/stickers.ts). */
  stickerId?: string;
  animate?: string;
  /** True when `url` is a blob: URL that dies with the tab — show, don't persist. */
  sessionOnly?: boolean;
  /** Emoji this attachment was built from, when it came from the emoji picker. */
  emoji?: string;
  /** A SoundCloud single track frames shorter than a playlist/profile. */
  audioOnly?: boolean;
}

export interface ChatReaction {
  emoji: string;
  by: string; // author name of whoever reacted
  ts: number;
}

export interface ChatReplyPreview {
  id: string;
  author: string;
  text: string;
}

/** Who a message went out as, and which voice should read it back. */
export interface ChatVoice {
  npcId?: string;
  voiceURI?: string;
  rate?: number;
  pitch?: number;
}

export interface ChatMessage {
  id: string;
  npcId?: string; // if from npc
  authorName: string;
  authorAvatar?: string;
  html: string; // formatted html
  ts: number;
  system?: boolean;
  reaction?: string; // emoji
  /** Rich content. Older messages only have `html` and still render. */
  attachments?: ChatAttachment[];
  replyTo?: ChatReplyPreview | null;
  reactions?: ChatReaction[];
  editedTs?: number;
  deletedTs?: number;
  /** Delivery ticks. Outgoing messages move sent → delivered → read. */
  status?: "sent" | "delivered" | "read";
  seenBy?: string[];
  /** True for anything the tutor typed/sent (right-hand side, like Telegram). */
  outbound?: boolean;
  /** Voice metadata for bubbles a character "spoke". */
  speak?: ChatVoice & { text?: string };
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  active: boolean;
}

export interface ReactionAnim {
  id: string;
  name: string;
  emoji: string;
  url?: string; // optional custom image/animation URL
  style:
    | "rain"
    | "dance"
    | "explode"
    | "spiral"
    | "fountain"
    | "wave";
}

export interface CanvasTab {
  id: string;
  title: string;
  html: string;
}

export interface CanvasTemplate {
  id: string;
  cat: string;
  name: string;
  tags: string[];
  desc: string;
  prompt: string;
}

export interface ParticipantScore {
  score: number;
  badges: string[];
  rarity: Rarity;
}

export interface DialogueLine {
  npcId: string;
  text: string;
  isQuestion?: boolean;
  branches?: string[];
}

export interface Dialogue {
  id: string;
  title: string;
  lines: DialogueLine[];
}

export interface TutorProfile {
  name: string;
  avatar: string;
  info: string;
  facts: string;
}

export interface AppState {
  npcs: NPC[];
  learners: Learner[];
  messages: ChatMessage[];
  polls: Poll[];
  reactions: ReactionAnim[];
  canvasTabs: CanvasTab[];
  canvasTemplates: CanvasTemplate[];
  dialogues: Dialogue[];
  tutor: TutorProfile;
  settings: {
    soundEffects: boolean;
    backgroundChatter: boolean;
    panelOpen: boolean;
    liveViewerCount: number;
    liveAuto: boolean;
    goLive: boolean;
  };
  speaker: {
    npcId: string | null;
    text: string;
    emoji: string | null;
    speaking: boolean;
  };
  raisedHands: { id: string; name: string; ts: number }[];
  transcripts: { id: string; text: string; ts: number }[];
  transcriptTemplates: { id: string; label: string; prompt: string }[];
  participantScores: Record<string, ParticipantScore>;
  catSettings: {
    enabled: boolean;
    mode: "hover" | "select";
    voiceURI: string;
    rate: number;
    pitch: number;
    catEmoji: string;
  };
  peer: {
    hosting: boolean;
    peerId: string | null;
    controlGranted: string | null; // peerId who has control
    pendingControl: string | null;
  };
  classTimer: {
    targetTs: number | null; // when class starts
    duration: number; // seconds
    reminded: boolean;
  };
  countdownTimer: {
    duration: number; // seconds
    remaining: number;
    running: boolean;
    fullscreen: boolean;
  };
  activeReaction: { id: string; ts: number } | null;
  floatingEmojis: { id: string; emoji: string; x: number; ts: number }[];
}

export interface BroadcastEvent {
  type: string;
  payload?: any;
}
