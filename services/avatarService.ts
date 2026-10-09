import { Learner } from "../types2";
import { getCustomAvatar } from "./customAvatarStore";

const EMOJIS = ['🐶', '😸', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'];

export const getAvatarUrl = (gender: Learner['gender'] | 'Group', avatarId: string | undefined, name?: string): string => {
    if (avatarId && avatarId.startsWith('custom:')) {
        const customImg = getCustomAvatar(avatarId);
        if (customImg) return customImg;
    }

    const isLikelyEmoji = avatarId ? Array.from(avatarId).length <= 2 : false;

    const hasNoCustomAvatar = !avatarId || avatarId === 'avatar-default' || avatarId === 'default' || avatarId.startsWith('default');

    if (hasNoCustomAvatar && name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 16777215)).toString(16).padStart(6, '0');
        const init = name.length > 1 ? name.substring(0, 2).toUpperCase() : name.substring(0, 1).toUpperCase();
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <rect width="100" height="100" fill="#${color}" rx="50" ry="50"/>
            <text x="50" y="54" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="40" font-weight="bold">${init}</text>
        </svg>`;
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    }

    if (avatarId && !isLikelyEmoji && avatarId.length > 5) {
        if (avatarId.startsWith('http')) return avatarId;
        if (avatarId.startsWith('data:image/')) return avatarId;
    }
    
    // Default to emoji wrapper if it is an emoji, or fallback if anything else fails
    const emojiStr = isLikelyEmoji ? avatarId : (name ? name.substring(0,2) : '👤');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <style>
            .em { font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; }
        </style>
        <rect width="100" height="100" fill="#e2e8f0" rx="50" ry="50"/>
        <text class="em" x="50" y="54" dominant-baseline="middle" text-anchor="middle" font-size="55">${emojiStr}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

export const generateRandomAvatarId = (): string => {
    // Return a random emoji
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return randomEmoji;
}

export const getMoodBasedGreeting = (learner: Learner): string => {
    const overallProgress = learner.competencies.reduce((acc, comp) => acc + comp.progress, 0) / learner.competencies.length;

    if (learner.streak > 5 && overallProgress > 60) {
        return `Hello! ${learner.name} is doing an amazing job. Let's look at the progress.`;
    }
    if (learner.streak > 0 || overallProgress > 40) {
        return `Hello! Here is the latest progress report for ${learner.name}.`;
    }
    return `Hello. Let's review how we can help ${learner.name} get back on track.`;
}