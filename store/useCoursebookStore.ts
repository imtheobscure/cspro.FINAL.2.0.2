import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbZustandStorage } from '../utils/storageAdapter';
import { CoursebookDetailed, COURSEBOOK_MANAGER_DATA } from '../data/CoursebookManagerData';

export type Coursebook = CoursebookDetailed;

// Helper to normalize title for fuzzy duplicate detection
const normalizeTitle = (title: string): string => {
    return (title || '')
        .toLowerCase()
        .replace(/\(2nd ed\.\)/g, '')
        .replace(/\(3rd ed\.\)/g, '')
        .replace(/\(4th ed\.\)/g, '')
        .replace(/\(5th ed\.\)/g, '')
        .replace(/2nd edition/g, '')
        .replace(/3rd edition/g, '')
        .replace(/oxford/g, '')
        .replace(/pearson/g, '')
        .replace(/cambridge/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
};

// Map COURSEBOOK_MANAGER_DATA by ID and by lowercased title for fast lookups
const managerMapById = new Map<string, CoursebookDetailed>(
    COURSEBOOK_MANAGER_DATA.map(b => [b.id.toLowerCase(), b])
);
const managerMapByName = new Map<string, CoursebookDetailed>(
    COURSEBOOK_MANAGER_DATA.map(b => [b.coursebook.toLowerCase(), b])
);

// Primary seeded list directly from COURSEBOOK_MANAGER_DATA (authoritative 103 complete titles)
const primarySeeded: CoursebookDetailed[] = COURSEBOOK_MANAGER_DATA.map(b => ({ ...b }));

interface CoursebookState {
    coursebooks: CoursebookDetailed[];
    // Tutor-set cover images (uploaded data URLs or pasted URLs) keyed by book id — persisted on the local hard disk, never lost
    coverOverrides: Record<string, string>;
    // Ids of official (seeded) books that were edited by the tutor (TOC JSON pastes, added/reordered levels).
    // Those books are persisted in full so nothing is lost after a reload.
    editedOfficialIds: string[];
    addCoursebook: (book: CoursebookDetailed) => void;
    updateCoursebook: (id: string, updates: Partial<CoursebookDetailed>) => void;
    deleteCoursebook: (id: string) => void;
    setCoverOverride: (id: string, src: string) => void;
}

// Hydrates stored coursebook array with rich data from COURSEBOOK_MANAGER_DATA & purges legacy duplicates
const hydrateCoursebooks = (persistedBooks: CoursebookDetailed[]): CoursebookDetailed[] => {
    if (!Array.isArray(persistedBooks) || persistedBooks.length === 0) {
        return primarySeeded;
    }

    const mergedMap = new Map<string, CoursebookDetailed>();

    // Add all official primarySeeded first
    primarySeeded.forEach(book => mergedMap.set(book.id, book));

    // Merge persisted books (preserving user custom books and updating matching official books with latest rich fields)
    persistedBooks.forEach(pBook => {
        if (!pBook || !pBook.coursebook) return;

        // Skip legacy-generated incomplete book IDs that caused duplicates
        if (pBook.id && pBook.id.startsWith('book-')) {
            return;
        }

        const normPName = normalizeTitle(pBook.coursebook);
        const matchingOfficial = 
            (pBook.id && managerMapById.get(pBook.id.toLowerCase())) ||
            (pBook.coursebook && managerMapByName.get(pBook.coursebook.toLowerCase())) ||
            COURSEBOOK_MANAGER_DATA.find(b => normalizeTitle(b.coursebook) === normPName);

        if (matchingOfficial) {
            // Deep merge official rich data with custom overrides
            mergedMap.set(matchingOfficial.id, {
                ...matchingOfficial,
                ...pBook,
                // Ensure latest rich arrays and objects are retained from official data if pBook doesn't have them
                levelDetails: pBook.levelDetails && pBook.levelDetails.length > 0 ? pBook.levelDetails : matchingOfficial.levelDetails,
                extraResources: pBook.extraResources && pBook.extraResources.length > 0 ? pBook.extraResources : matchingOfficial.extraResources,
                keySellingPoints: pBook.keySellingPoints && pBook.keySellingPoints.length > 0 ? pBook.keySellingPoints : matchingOfficial.keySellingPoints,
                tableOfContents: pBook.tableOfContents && pBook.tableOfContents.length > 0 ? pBook.tableOfContents : matchingOfficial.tableOfContents,
                authors: pBook.authors || matchingOfficial.authors,
                editionYear: pBook.editionYear || matchingOfficial.editionYear,
                hoursPerLevel: pBook.hoursPerLevel || matchingOfficial.hoursPerLevel,
                components: pBook.components || matchingOfficial.components,
                digitalPlatform: pBook.digitalPlatform || matchingOfficial.digitalPlatform,
                examAlignment: pBook.examAlignment || matchingOfficial.examAlignment,
                methodology: pBook.methodology || matchingOfficial.methodology,
                bestFor: pBook.bestFor || matchingOfficial.bestFor,
                notIdealFor: pBook.notIdealFor || matchingOfficial.notIdealFor,
                teacherSupport: pBook.teacherSupport || matchingOfficial.teacherSupport,
                publisherUrl: pBook.publisherUrl || matchingOfficial.publisherUrl,
                gseRange: pBook.gseRange || matchingOfficial.gseRange,
                classFit: pBook.classFit || matchingOfficial.classFit,
                contentsNote: pBook.contentsNote || matchingOfficial.contentsNote,
                coverImage: matchingOfficial.coverImage || pBook.coverImage,
            });
        } else if (pBook.id && pBook.id.startsWith('custom-')) {
            // User-added custom book
            mergedMap.set(pBook.id, pBook);
        }
    });

    return Array.from(mergedMap.values());
};

export const useCoursebookStore = create<CoursebookState>()(
    persist(
        (set) => ({
            coursebooks: primarySeeded,
            coverOverrides: {},
            editedOfficialIds: [],
            addCoursebook: (book) => set((state) => ({ coursebooks: [...state.coursebooks, { ...book, id: book.id || `custom-${Date.now()}` }] })),
            updateCoursebook: (id, updates) => set((state) => {
                const isOfficial = !id.startsWith('custom-');
                return {
                    coursebooks: state.coursebooks.map(b => b.id === id ? { ...b, ...updates } : b),
                    // Mark edited official books so the whole record is persisted on the local hard disk
                    editedOfficialIds: isOfficial && !(state.editedOfficialIds || []).includes(id)
                        ? [...(state.editedOfficialIds || []), id]
                        : state.editedOfficialIds
                };
            }),
            deleteCoursebook: (id) => set((state) => ({
                coursebooks: state.coursebooks.filter(b => b.id !== id),
                editedOfficialIds: (state.editedOfficialIds || []).filter(e => e !== id)
            })),
            setCoverOverride: (id, src) => set((state) => {
                // Empty string removes the override so the catalog cover (or fallback) shows again
                if (!src) {
                    const next = { ...state.coverOverrides };
                    delete next[id];
                    return { coverOverrides: next };
                }
                return { coverOverrides: { ...state.coverOverrides, [id]: src } };
            })
        }),
        {
            name: 'coursebook-storage-v2',
            storage: createJSONStorage(() => idbZustandStorage),
            partialize: (state) => ({
                // Persist custom books + any official book the tutor edited (TOC pastes, level adds/reorders)
                coursebooks: (state.coursebooks || []).filter(b => b.id.startsWith('custom-') || (state.editedOfficialIds || []).includes(b.id)),
                coverOverrides: state.coverOverrides,
                editedOfficialIds: state.editedOfficialIds || []
            }),
            merge: (persistedState: any, currentState: CoursebookState) => {
                const persistedBooks = persistedState?.coursebooks;
                return {
                    ...currentState,
                    coursebooks: hydrateCoursebooks(persistedBooks),
                    coverOverrides: persistedState?.coverOverrides || {},
                    editedOfficialIds: Array.isArray(persistedState?.editedOfficialIds) ? persistedState.editedOfficialIds : []
                };
            }
        }
    )
);


