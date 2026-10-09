import React, { useState, useEffect, useMemo } from 'react';
import { Learner, GroupClass } from '../../../types2';
import SectionCard from '../SectionCard';
import { categorizeFact } from '../../../utils/greetingGenerator';

interface FunFactsProps {
    learner: Learner | GroupClass;
    onUpdate: (updatedData: Learner | GroupClass) => void;
    isTabContent?: boolean;
}

const CATEGORIES = [
    { name: "People", icon: "👥", color: "bg-purple-50/70 border-purple-200 text-purple-950 ring-purple-100", tag: "bg-purple-100 text-purple-800" },
    { name: "Places", icon: "📍", color: "bg-amber-50/70 border-amber-200 text-amber-950 ring-amber-100", tag: "bg-amber-100 text-amber-800" },
    { name: "Things", icon: "📦", color: "bg-slate-50/70 border-slate-200 text-slate-950 ring-slate-100", tag: "bg-slate-100 text-slate-800" },
    { name: "Work", icon: "💼", color: "bg-blue-50/70 border-blue-200 text-blue-950 ring-blue-100", tag: "bg-blue-100 text-blue-800" },
    { name: "Life", icon: "🌱", color: "bg-emerald-50/70 border-emerald-200 text-emerald-950 ring-emerald-100", tag: "bg-emerald-100 text-emerald-800" },
    { name: "Dates", icon: "📅", color: "bg-rose-50/70 border-rose-200 text-rose-950 ring-rose-100", tag: "bg-rose-100 text-rose-800" },
    { name: "Likes & Dislikes", icon: "💖", color: "bg-pink-50/70 border-pink-200 text-pink-950 ring-pink-100", tag: "bg-pink-100 text-pink-800" },
    { name: "Other", icon: "📝", color: "bg-gray-50/70 border-gray-200 text-gray-950 ring-gray-100", tag: "bg-gray-200 text-gray-800" }
];

const FunFacts: React.FC<FunFactsProps> = ({ learner, onUpdate, isTabContent = false }) => {
    const [isEditingRaw, setIsEditingRaw] = useState(false);
    const [rawText, setRawText] = useState('');
    const [newInputs, setNewInputs] = useState<Record<string, string>>({});

    // Parse flat array from database into groups
    const groupedFacts = useMemo(() => {
        const rawFacts = Array.isArray(learner.facts) ? learner.facts : [];
        const groups: Record<string, string[]> = {
            "People": [],
            "Places": [],
            "Things": [],
            "Work": [],
            "Life": [],
            "Dates": [],
            "Likes & Dislikes": [],
            "Other": []
        };

        rawFacts.forEach((fact: string) => {
            const trimmed = fact.trim();
            if (!trimmed) return;

            // Match bracket categories [People] etc.
            const match = trimmed.match(/^\[([a-zA-Z\s&]+)\]\s*(.*)$/i);
            if (match) {
                const category = match[1].trim();
                const content = match[2].trim();
                
                const foundCat = CATEGORIES.find(c => c.name.toLowerCase() === category.toLowerCase());
                if (foundCat) {
                    groups[foundCat.name].push(content);
                } else {
                    groups["Other"].push(trimmed);
                }
            } else {
                // Run through auto-categorizer to prefix
                const categorized = categorizeFact(trimmed);
                const secondMatch = categorized.match(/^\[([a-zA-Z\s&]+)\]\s*(.*)$/i);
                if (secondMatch) {
                    const category = secondMatch[1].trim();
                    const content = secondMatch[2].trim();
                    const foundCat = CATEGORIES.find(c => c.name.toLowerCase() === category.toLowerCase());
                    if (foundCat) {
                        groups[foundCat.name].push(content);
                    } else {
                        groups["Other"].push(content);
                    }
                } else {
                    groups["Other"].push(trimmed);
                }
            }
        });

        return groups;
    }, [learner.facts]);

    // Format all facts to raw newline text for copy/paste editing
    useEffect(() => {
        const rawLines: string[] = [];
        CATEGORIES.forEach(cat => {
            const items = groupedFacts[cat.name] || [];
            items.forEach(it => {
                rawLines.push(`[${cat.name}] ${it}`);
            });
        });
        setRawText(rawLines.join('\n'));
    }, [groupedFacts]);

    const handleSaveRaw = () => {
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        // Process each line through the categorizer to enforce clean brackets
        const processedLines = lines.map(line => {
            if (/^\[[a-zA-Z\s&]+\]/i.test(line)) {
                return line;
            }
            return categorizeFact(line);
        });
        onUpdate({ ...learner, facts: processedLines });
        setIsEditingRaw(false);
    };

    const handleSaveGroups = (updatedGroups: Record<string, string[]>) => {
        const reassembled: string[] = [];
        CATEGORIES.forEach(cat => {
            const items = updatedGroups[cat.name] || [];
            items.forEach(it => {
                const trimmed = it.trim();
                if (trimmed) {
                    reassembled.push(`[${cat.name}] ${trimmed}`);
                }
            });
        });
        onUpdate({ ...learner, facts: reassembled });
    };

    const handleAddFact = (category: string) => {
        const text = newInputs[category] || '';
        if (!text.trim()) return;

        const currentItems = groupedFacts[category] || [];
        const updatedGroups = {
            ...groupedFacts,
            [category]: [...currentItems, text.trim()]
        };

        handleSaveGroups(updatedGroups);
        setNewInputs({
            ...newInputs,
            [category]: ''
        });
    };

    const handleDeleteFact = (category: string, indexToDelete: number) => {
        const currentItems = groupedFacts[category] || [];
        const updatedGroups = {
            ...groupedFacts,
            [category]: currentItems.filter((_, idx) => idx !== indexToDelete)
        };
        handleSaveGroups(updatedGroups);
    };

    const content = (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">💡 Facts are automatically categorized during session logging, and can be managed directly in the grids below.</p>
                <div>
                     {isEditingRaw ? (
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => setIsEditingRaw(false)} className="text-xs font-bold bg-gray-200 hover:bg-gray-350 px-3 py-1.5 rounded-xl cursor-pointer transition-colors">Cancel</button>
                            <button onClick={handleSaveRaw} className="text-xs font-bold bg-brand-green hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl cursor-pointer transition-colors">Save Changes</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditingRaw(true)} className="text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-1.5">
                            <i className="fas fa-edit"></i> Mass Edit (Raw)
                        </button>
                    )}
                </div>
            </div>

            {isEditingRaw ? (
                <div className="space-y-2">
                    <p className="text-xs text-gray-400">One fact per line. Use bracket prefixes like <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-bold">[People]</code> or write plain statements to let the AI auto-categorize.</p>
                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-blue font-mono text-xs h-96 shadow-inner"
                        placeholder="e.g. [People] Mother is named Clara"
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {CATEGORIES.map(cat => {
                        const items = groupedFacts[cat.name] || [];
                        const inputValue = newInputs[cat.name] || '';
                        return (
                            <div 
                                key={cat.name} 
                                className={`p-4 rounded-2xl border flex flex-col justify-between min-h-[14rem] shadow-sm ${cat.color}`}
                            >
                                <div className="space-y-3">
                                    {/* Box Title */}
                                    <div className="flex items-center justify-between border-b pb-2 border-black/5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-lg">{cat.icon}</span>
                                            <h5 className="font-extrabold text-sm tracking-tight">{cat.name}</h5>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${cat.tag}`}>
                                            {items.length}
                                        </span>
                                    </div>

                                    {/* Facts List */}
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {items.length > 0 ? (
                                            items.map((it, idx) => (
                                                <div 
                                                    key={`${cat.name}-${idx}`}
                                                    className="group/item flex items-center justify-between gap-2 bg-white/70 hover:bg-white border border-black/5 py-1.5 px-2.5 rounded-xl text-xs transition-colors shadow-sm"
                                                >
                                                    <span className="font-semibold break-words flex-1 leading-relaxed">{it}</span>
                                                    <button 
                                                        onClick={() => handleDeleteFact(cat.name, idx)}
                                                        className="text-red-500 hover:text-red-700 w-5 h-5 rounded-md hover:bg-red-50 flex items-center justify-center shrink-0 cursor-pointer"
                                                        title="Delete fact"
                                                    >
                                                        <i className="fas fa-trash text-[10px]"></i>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[11px] text-gray-400 italic text-center py-4">No facts listed.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Add Input */}
                                <div className="mt-3 pt-2 border-t border-black/5">
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setNewInputs({ ...newInputs, [cat.name]: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddFact(cat.name);
                                                }
                                            }}
                                            placeholder={`Add ${cat.name.toLowerCase()}...`}
                                            className="bg-white/80 border border-black/10 hover:border-black/20 focus:bg-white focus:ring-1 focus:ring-black/25 text-xs px-2.5 py-1.5 rounded-xl flex-1 focus:outline-none placeholder-gray-400 font-semibold"
                                        />
                                        <button 
                                            onClick={() => handleAddFact(cat.name)}
                                            className="w-7 h-7 bg-white hover:bg-slate-50 border border-black/10 hover:border-black/20 rounded-xl flex items-center justify-center cursor-pointer shadow-sm transition-all text-slate-800"
                                            title="Add fact"
                                        >
                                            <i className="fas fa-plus text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    if (isTabContent) {
        return content;
    }

    return (
        <SectionCard title="Facts Portfolio" icon={<span>🧠</span>}>
            {content}
        </SectionCard>
    );
};

export default FunFacts;
