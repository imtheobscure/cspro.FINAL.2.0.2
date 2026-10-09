import * as idb from 'idb-keyval';

// Synchronous in-memory cache for fast, seamless getAvatarUrl loading
export const customAvatarsCache = new Map<string, string>();

/**
 * Preload all custom profile pictures from IndexedDB into memory.
 * This is fast and takes less than 1-2MB of memory for even hundreds of students.
 */
export const loadAllCustomAvatars = async () => {
    try {
        const allKeys = await idb.keys();
        for (const key of allKeys) {
            if (typeof key === 'string' && key.startsWith('custom-avatar-')) {
                const val = await idb.get<string>(key);
                if (val) {
                    const avatarId = key.replace('custom-avatar-', '');
                    customAvatarsCache.set(avatarId, val);
                }
            }
        }
        console.log(`[CustomAvatarStore] Preloaded ${customAvatarsCache.size} custom avatars into cache.`);
    } catch (err) {
        console.error("[CustomAvatarStore] Failed to load custom avatars from IndexedDB:", err);
    }
};

/**
 * Save a compressed base64 profile picture on a learner profile, keeping study profiles lightweight.
 */
export const saveCustomAvatar = async (learnerId: string, base64: string) => {
    const avatarId = `custom:${learnerId}`;
    try {
        await idb.set(`custom-avatar-${avatarId}`, base64);
        customAvatarsCache.set(avatarId, base64);
    } catch (err) {
        console.error("[CustomAvatarStore] Failed to save custom avatar:", err);
    }
};

/**
 * Get cached base64 image URL synchronous.
 */
export const getCustomAvatar = (avatarId: string): string | undefined => {
    return customAvatarsCache.get(avatarId);
};

/**
 * Direct export mappings for separate JSON backup downloads.
 */
export const exportAllCustomAvatars = async (): Promise<Record<string, string>> => {
    const result: Record<string, string> = {};
    try {
        const allKeys = await idb.keys();
        for (const key of allKeys) {
            if (typeof key === 'string' && key.startsWith('custom-avatar-')) {
                const val = await idb.get<string>(key);
                if (val) {
                    const avatarId = key.replace('custom-avatar-', '');
                    result[avatarId] = val;
                }
            }
        }
    } catch (err) {
        console.error("[CustomAvatarStore] Export custom avatars failed:", err);
    }
    return result;
};
