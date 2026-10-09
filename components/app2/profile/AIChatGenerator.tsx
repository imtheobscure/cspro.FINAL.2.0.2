import React, { useMemo, useState } from 'react';
import { Learner, GroupClass } from '../../../types2';
import { generateLocalGreetings, generateLocalGoodbyes } from '../../../utils/greetingGenerator';

const CHAT_TAGS = [
    { label: "👋 Warm Greeting", color: "bg-amber-50 text-amber-800 border border-amber-200" },
    { label: "📝 Session Recap", color: "bg-sky-50 text-sky-850 border border-sky-200" },
    { label: "✨ Praise & Encouragement", color: "bg-emerald-50 text-emerald-850 border border-emerald-200" },
    { label: "📚 Homework Nudge", color: "bg-indigo-50 text-indigo-850 border border-indigo-200" },
    { label: "💡 Core Takeaway & Tip", color: "bg-purple-50 text-purple-850 border border-purple-200" },
    { label: "👋 Goodbye & Question", color: "bg-rose-50 text-rose-850 border border-rose-200" }
];

const CARD_STYLES = [
    {
        title: "Energetic & Adventurous",
        bg: "bg-amber-50 border-amber-200 text-amber-950",
        tag: "bg-amber-100 text-amber-800",
        icon: "⚡"
    },
    {
        title: "Calm & Professional",
        bg: "bg-indigo-50 border-indigo-200 text-indigo-950",
        tag: "bg-indigo-100 text-indigo-800",
        icon: "🎓"
    },
    {
        title: "Cozy & Empathetic",
        bg: "bg-emerald-50 border-emerald-200 text-emerald-950",
        tag: "bg-emerald-100 text-emerald-800",
        icon: "💚"
    },
    {
        title: "Playful & Witty",
        bg: "bg-rose-50 border-rose-200 text-rose-950",
        tag: "bg-rose-100 text-rose-800",
        icon: "🚀"
    }
];

// Sub-component for individual greeting/goodbye cards
const PersonalizedCard: React.FC<{ text: string; style: typeof CARD_STYLES[0] }> = ({ text, style }) => {
    const [copied, setCopied] = useState(false);
    const wordCount = useMemo(() => text.split(/\s+/).filter(Boolean).length, [text]);

    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className={`p-5 rounded-2xl border ${style.bg} transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between h-full`}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${style.tag} flex items-center gap-1`}>
                        <span>{style.icon}</span> {style.title}
                    </span>
                    <span className="text-[10px] font-mono bg-white/60 px-2.5 py-0.5 rounded-full border border-black/5 font-bold">
                        {wordCount} words
                    </span>
                </div>
                <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{text}</p>
            </div>
            <button
                onClick={handleCopy}
                className="mt-4 w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
                <i className={`fas ${copied ? 'fa-check text-green-600' : 'fa-copy'}`}></i>
                {copied ? 'Copied!' : 'Copy Message'}
            </button>
        </div>
    );
};

// Individual chat bubble component
const ChatBubble: React.FC<{ message: string; tagLabel?: string; tagColor?: string }> = ({ message, tagLabel, tagColor }) => {
    const isHoliday = message.startsWith(':::HOLIDAY:::');
    const displayMessage = isHoliday ? message.replace(':::HOLIDAY:::', '') : message;
    
    const bubbleClass = isHoliday 
        ? "bg-gradient-to-r from-pink-500 to-rose-400 text-white border border-pink-200"
        : "bg-brand-blue text-white";

    const handleCopy = () => {
        navigator.clipboard.writeText(displayMessage).then(() => {
            // Success indicator
        });
    };

    return (
        <div className="group relative flex flex-col items-start gap-1 p-4 bg-white border border-slate-150 rounded-2xl shadow-sm hover:shadow-md transition-all w-full max-w-sm lg:max-w-md">
            {tagLabel && (
                <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${tagColor || 'bg-slate-100 text-slate-700'}`}>
                    {tagLabel}
                </span>
            )}
            <div className="flex w-full mt-2 items-start justify-between gap-2">
                <div className={`${bubbleClass} p-3.5 rounded-2xl rounded-tl-none flex-1 shadow-sm`}>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed font-semibold">{displayMessage}</p>
                </div>
                <button
                    onClick={handleCopy}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm shrink-0 mt-1"
                    title="Copy message"
                >
                    <i className="fas fa-copy text-xs"></i>
                </button>
            </div>
        </div>
    );
};

interface AIChatGeneratorProps {
    learner: Learner | GroupClass;
    onUpdate?: (updatedLearner: any) => void;
}

const AIChatGenerator: React.FC<AIChatGeneratorProps> = ({ learner }) => {
    const latestSessionWithChat = useMemo(() => {
        return [...(learner.sessions || [])]
            .filter(s => s.chatMessages && s.chatMessages.length > 0)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [learner.sessions]);

    const factsArray = useMemo(() => {
        return Array.isArray(learner.facts) ? learner.facts : [];
    }, [learner.facts]);

    const localGreetings = useMemo(() => {
        return generateLocalGreetings(learner.name, (learner as any).interests || '', factsArray);
    }, [learner.name, learner.facts]);

    const localGoodbyes = useMemo(() => {
        return generateLocalGoodbyes(learner.name, (learner as any).interests || '', factsArray);
    }, [learner.name, learner.facts]);

    const greetingsToDisplay = useMemo(() => {
        return latestSessionWithChat?.personalizedGreetings && latestSessionWithChat.personalizedGreetings.length >= 4
            ? latestSessionWithChat.personalizedGreetings
            : localGreetings;
    }, [latestSessionWithChat, localGreetings]);

    const goodbyesToDisplay = useMemo(() => {
        return latestSessionWithChat?.personalizedGoodbyes && latestSessionWithChat.personalizedGoodbyes.length >= 4
            ? latestSessionWithChat.personalizedGoodbyes
            : localGoodbyes;
    }, [latestSessionWithChat, localGoodbyes]);

    return (
        <div className="space-y-8 font-sans">
            {/* Unique Greetings Grid */}
            <div className="space-y-4 animate-fade-in">
                <div className="text-center max-w-2xl mx-auto">
                    <h3 className="font-bold text-lg text-slate-900">✨ Personalized Greetings for Say Hello</h3>
                    <p className="text-xs text-slate-500 mt-1">Four highly customized, 50+ word greeting options designed specifically for {learner.name}'s background and interests.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {greetingsToDisplay.map((text, idx) => (
                        <PersonalizedCard 
                            key={`g-${idx}`} 
                            text={text} 
                            style={CARD_STYLES[idx % CARD_STYLES.length]} 
                        />
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-100 my-6"></div>

            {/* Unique Goodbyes Grid */}
            <div className="space-y-4 animate-fade-in">
                <div className="text-center max-w-2xl mx-auto">
                    <h3 className="font-bold text-lg text-slate-900">🚀 Personalized Closings for Say Goodbye</h3>
                    <p className="text-xs text-slate-500 mt-1">Four unique, 50+ word goodbye closing options to wrap up lessons or follow up, customized for {learner.name}.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goodbyesToDisplay.map((text, idx) => (
                        <PersonalizedCard 
                            key={`b-${idx}`} 
                            text={text} 
                            style={CARD_STYLES[idx % CARD_STYLES.length]} 
                        />
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-100 my-6"></div>

            {/* Original Chat Recaps */}
            <div className="space-y-4 animate-fade-in">
                <div className="text-center max-w-2xl mx-auto">
                    <h3 className="font-bold text-sm text-slate-800">💬 Dynamic Conversation & Session Recap</h3>
                    <p className="text-xs text-slate-500 mt-1">The step-by-step follow-up timeline generated from session summaries.</p>
                </div>
                
                {latestSessionWithChat ? (
                    <div className="flex flex-row flex-wrap gap-3.5 justify-center">
                        {latestSessionWithChat.chatMessages?.map((msg, index) => {
                            const tag = CHAT_TAGS[index % CHAT_TAGS.length];
                            return (
                                <ChatBubble 
                                    key={index} 
                                    message={msg} 
                                    tagLabel={tag.label} 
                                    tagColor={tag.color} 
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="font-bold text-slate-700">No session bubbles generated yet</p>
                        <p className="text-xs text-gray-500 mt-1">Log a new session with learning notes to view custom chat dialogues here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIChatGenerator;
