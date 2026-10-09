import * as idb from 'idb-keyval';
import LZString from 'lz-string';

export function getMainAppLearners() {
    try {
        const data = localStorage.getItem('learner-profile-storage');
        if (!data) return [];
        try {
            const trimmed = data.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                const parsed = JSON.parse(data);
                return parsed.state?.learners || parsed.learners || [];
            }
        } catch(e) {}
        const decompressed = LZString.decompressFromUTF16(data);
        if (decompressed) {
            const parsed = JSON.parse(decompressed);
            return parsed.state?.learners || parsed.learners || [];
        }
        const parsed = JSON.parse(data);
        return parsed.state?.learners || [];
    } catch (e) {
        return [];
    }
}

export async function getMainAppLearnersAsync(): Promise<any[]> {
    try {
        const idbData = await idb.get<any>('learner-profile-storage');
        if (idbData) {
            const parsed = typeof idbData === 'string' ? JSON.parse(idbData) : idbData;
            return parsed.state?.learners || parsed.learners || [];
        }
        return getMainAppLearners();
    } catch (e) {
        return getMainAppLearners();
    }
}

export async function updateMainAppXp(learnerId: string, addedXp: number) {
    try {
        // 1. Update in IndexedDB
        const idbData = await idb.get<any>('learner-profile-storage');
        if (idbData) {
            const parsed = typeof idbData === 'string' ? JSON.parse(idbData) : idbData;
            if (parsed.state && parsed.state.learners) {
                parsed.state.learners = parsed.state.learners.map((l: any) => {
                    if (l.id === learnerId) {
                        return { ...l, xp: (l.xp || 0) + addedXp };
                    }
                    return l;
                });
                await idb.set('learner-profile-storage', JSON.stringify(parsed));
            }
        }
        
        // 2. Also update in localStorage if present
        const data = localStorage.getItem('learner-profile-storage');
        if (data) {
            let parsed: any = null;
            try {
                parsed = JSON.parse(data);
            } catch(e) {
                const decompressed = LZString.decompressFromUTF16(data);
                if (decompressed) parsed = JSON.parse(decompressed);
            }
            if (parsed && parsed.state && parsed.state.learners) {
                parsed.state.learners = parsed.state.learners.map((l: any) => {
                    if (l.id === learnerId) {
                        return { ...l, xp: (l.xp || 0) + addedXp };
                    }
                    return l;
                });
                try {
                    localStorage.setItem('learner-profile-storage', JSON.stringify(parsed));
                } catch (lsErr) {
                    // Safe to ignore quota error here as IDB is updated
                }
            }
        }
    } catch (e) {
        console.error('Failed to sync XP back to main app', e);
    }
}

