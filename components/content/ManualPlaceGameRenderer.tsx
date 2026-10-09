import React, { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button';

interface PlaceData {
    placeName: string;
    descriptiveText: string;
    imagePrompts?: string[];
    funFacts: any[];
    cultureNotes: any[];
    thingsToTry: any[];
    thingsToAvoid: any[];
    localPhrases?: { category: string; english: string; local: string; phonetic: string }[];
    audioScript: { speaker: string; voice: string; text: string }[];
    situationalDialogue?: { speaker: string; text: string }[];
    comprehensionQuestions?: { question: string; answer: string }[];
    quotationWordRavel: string;
}

interface PlaceGameData {
    settings?: any;
    city: string;
    quotation: string;
    quotationAuthor: string;
    places: PlaceData[];
}

export const ManualPlaceGameRenderer: React.FC<{ data: PlaceGameData }> = ({ data }) => {
    const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);
    const [guessedPlaces, setGuessedPlaces] = useState<boolean[]>(new Array(5).fill(false));
    const [guessInput, setGuessInput] = useState('');
    const [feedback, setFeedback] = useState<{message: string, isError: boolean} | null>(null);
    const [showHints, setShowHints] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [imageSeed, setImageSeed] = useState(Math.floor(Math.random() * 1000));
    
    // Audio State
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);

    const place = data.places?.[currentPlaceIndex];
    if (!place) return null;

    // Image placeholders based on prompts
    const getImages = (prompts: string[]) => {
        return prompts.map((p, i) => `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=800&height=400&nologo=true&seed=${imageSeed + i}`);
    };

    const handleGuess = () => {
        if (!guessInput.trim()) return;
        
        setIsChecking(true);
        setFeedback(null);
        
        let count = 3;
        const interval = setInterval(() => {
            if (count > 0) {
                setFeedback({ message: `Analyzing... ${count}`, isError: false });
                count--;
            } else {
                clearInterval(interval);
                setIsChecking(false);
                if (guessInput.toLowerCase().includes(place.placeName.toLowerCase()) || 
                    place.placeName.toLowerCase().includes(guessInput.toLowerCase())) {
                    
                    const newGuessed = [...guessedPlaces];
                    newGuessed[currentPlaceIndex] = true;
                    setGuessedPlaces(newGuessed);
                    setFeedback({ message: "CORRECT! Location Confirmed.", isError: false });
                    setShowHints(true);
                } else {
                    setFeedback({ message: "INCORRECT. Target not identified.", isError: true });
                }
            }
        }, 600);
    };

    const handlePlayAudio = async () => {
        if (isAudioPlaying) return;
        setIsAudioPlaying(true);
        setCurrentLineIndex(0);
    };

    useEffect(() => {
        if (isAudioPlaying && currentLineIndex < place.audioScript.length) {
            const line = place.audioScript[currentLineIndex];
            const synth = window.speechSynthesis;
            const utter = new SpeechSynthesisUtterance(line.text);
            
            let matchedVoice = synth.getVoices().find(v => v.name.includes(line.voice));
            if (matchedVoice) utter.voice = matchedVoice;
            
            utter.onend = () => setCurrentLineIndex(i => i + 1);
            synth.speak(utter);

            return () => synth.cancel();
        } else if (isAudioPlaying && currentLineIndex >= place.audioScript.length) {
            setIsAudioPlaying(false);
        }
    }, [isAudioPlaying, currentLineIndex, place.audioScript]);

    const speakLocal = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const avaVoice = voices.find(v => v.name.includes("Ava") && v.name.includes("Online"));
        if (avaVoice) utterance.voice = avaVoice;
        window.speechSynthesis.speak(utterance);
    };

    const renderListItems = (items: any[]) => {
        if (!items || !Array.isArray(items)) return null;
        return items.map((item, i) => {
            const text = typeof item === 'string' ? item : item.text;
            const ccq = typeof item === 'string' ? null : item.ccq;
            return (
                <li key={i} className="bg-gray-750 p-3 rounded-lg mb-3 shadow-sm border border-gray-700 list-none">
                    <p className="mb-1 text-gray-200 leading-relaxed text-sm">{processTooltips(text)}</p>
                    {ccq && <div className="mt-2 text-xs border-t border-gray-600 pt-2 text-yellow-300 font-semibold"><i className="fas fa-question-circle mr-1"></i>CCQ: {ccq}</div>}
                </li>
            );
        });
    };

    const processTooltips = (text: string) => {
        if (!text) return "";
        const parts = text.split(/(\[[^\]]+\])/g);
        return parts.map((part, i) => {
            if (part.startsWith('[') && part.endsWith(']')) {
                const inner = part.slice(1, -1);
                const splitIndex = inner.indexOf(':');
                if (splitIndex !== -1) {
                    const word = inner.substring(0, splitIndex).trim();
                    const definition = inner.substring(splitIndex + 1).trim();
                    return (
                        <span key={i} className="group relative inline-block border-b border-dotted border-blue-400 cursor-help text-blue-200 font-medium bg-blue-900/30 px-1 rounded">
                            {word}
                            <span className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 border border-emerald-500 text-gray-100 text-xs rounded-lg shadow-2xl z-50 text-center pointer-events-none transition-all">
                                {definition}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-emerald-500"></div>
                            </span>
                        </span>
                    );
                }
            }
            return <span key={i}>{part}</span>;
        });
    };

    const images = place.imagePrompts ? getImages(place.imagePrompts) : [];

    return (
        <div className="bg-gray-900 text-gray-100 p-6 rounded-2xl shadow-2xl space-y-6 max-w-4xl mx-auto">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                    Guess The Place: {data.city}
                </h2>
                <div className="flex justify-center gap-2 mb-4">
                    {data.places.map((p, i) => (
                        <button 
                            key={i} 
                            onClick={() => {
                                setCurrentPlaceIndex(i);
                                setShowHints(guessedPlaces[i]);
                                setFeedback(null);
                                setGuessInput('');
                            }}
                            className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-all ${guessedPlaces[i] ? 'bg-emerald-500 text-white' : (i === currentPlaceIndex ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.7)]' : 'bg-gray-700 text-gray-400 hover:bg-gray-600')}`}
                        >
                            {guessedPlaces[i] ? <i className="fas fa-check"></i> : i + 1}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 p-4">
                {images.length > 0 && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-gray-400 font-bold text-sm uppercase tracking-wider"><i className="fas fa-camera retro-icon mr-2"></i>Visual Clues</h4>
                            <button onClick={() => setImageSeed(s => s + 10)} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-gray-200 transition-colors">
                                <i className="fas fa-sync-alt mr-1"></i> Refresh Images
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 h-64">
                            {images.slice(0, 4).map((img, i) => (
                                <div key={i} className="relative w-full h-full overflow-hidden rounded-lg group">
                                    <img src={img} alt="Clue" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-lg leading-relaxed text-gray-300 mb-6 border-l-4 border-blue-500 pl-4 bg-gray-900/50 p-4 rounded-r-lg">
                    {processTooltips(place.descriptiveText)}
                </div>

                {!guessedPlaces[currentPlaceIndex] ? (
                    <div className="p-5 bg-gray-750 border border-gray-600 rounded-lg shadow-inner">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={guessInput}
                                onChange={e => setGuessInput(e.target.value)}
                                placeholder="Name this location..."
                                disabled={isChecking}
                                className="flex-grow p-4 bg-gray-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-lg border border-gray-700"
                            />
                            <Button onClick={handleGuess} disabled={isChecking} className="bg-indigo-600 hover:bg-indigo-500 font-bold px-8 text-lg">
                                {isChecking ? '...' : 'GUESS'}
                            </Button>
                        </div>
                        {feedback && (
                            <p className={`mt-4 font-bold text-center text-xl ${feedback.isError ? 'text-red-400' : 'text-emerald-400'} ${isChecking ? 'animate-pulse text-blue-400' : ''}`}>
                                {feedback.message}
                            </p>
                        )}
                        
                        <div className="mt-6 pt-5 border-t border-gray-600 text-center">
                            <p className="text-sm text-gray-400 mb-3 font-medium uppercase tracking-wider">Need more clues?</p>
                            <Button onClick={handlePlayAudio} className="bg-purple-600 hover:bg-purple-500 w-full max-w-sm mx-auto flex items-center justify-center text-lg py-3">
                                <i className="fas fa-headphones mr-2"></i> {isAudioPlaying ? 'Playing Virtual Tour...' : 'Listen to Virtual Tour Audio'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-emerald-900/30 border border-emerald-500 rounded-lg p-5 text-center shadow-lg">
                            <h3 className="text-2xl font-black text-emerald-400 mb-1">Correct! This is {place.placeName}!</h3>
                            <p className="text-emerald-200 mt-2 text-lg">Quotation piece unlocked: <span className="font-extrabold text-yellow-300 ml-2 px-2 py-1 bg-yellow-900/50 rounded">"{place.quotationWordRavel}"</span></p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800 rounded-lg p-5 shadow-lg border border-gray-700">
                                <h4 className="text-blue-400 font-bold border-b border-gray-600 pb-2 mb-3 text-lg"><i className="fas fa-lightbulb mr-2"></i>Detailed Fun Facts</h4>
                                <ul className="space-y-1 text-sm text-gray-200 m-0 p-0">
                                    {renderListItems(place.funFacts)}
                                </ul>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-5 shadow-lg border border-gray-700">
                                <h4 className="text-pink-400 font-bold border-b border-gray-600 pb-2 mb-3 text-lg"><i className="fas fa-landmark mr-2"></i>Culture Notes</h4>
                                <ul className="space-y-1 text-sm text-gray-200 m-0 p-0">
                                    {renderListItems(place.cultureNotes)}
                                </ul>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-5 shadow-lg border border-gray-700">
                                <h4 className="text-emerald-400 font-bold border-b border-gray-600 pb-2 mb-3 text-lg"><i className="fas fa-utensils mr-2"></i>Things to Try</h4>
                                <ul className="space-y-1 text-sm text-gray-200 m-0 p-0">
                                    {renderListItems(place.thingsToTry)}
                                </ul>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-5 shadow-lg border border-gray-700">
                                <h4 className="text-red-400 font-bold border-b border-gray-600 pb-2 mb-3 text-lg"><i className="fas fa-ban mr-2"></i>Things to Avoid</h4>
                                <ul className="space-y-1 text-sm text-gray-200 m-0 p-0">
                                    {renderListItems(place.thingsToAvoid)}
                                </ul>
                            </div>

                            {place.localPhrases && place.localPhrases.length > 0 && (
                                <div className="bg-gray-800 border border-gray-600 p-5 rounded-lg col-span-1 md:col-span-2 shadow-lg">
                                    <h4 className="text-yellow-400 font-bold border-b border-gray-600 pb-2 mb-4 text-lg"><i className="fas fa-language mr-2"></i>Local Phrases</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                                        {place.localPhrases.map((p, i) => (
                                            <div key={i} className="flex items-center gap-4 bg-gray-750 p-3 rounded-lg border border-gray-700 transition hover:bg-gray-700">
                                                <button onClick={() => speakLocal(p.local)} className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex-shrink-0 flex items-center justify-center transform hover:scale-110 transition shadow">
                                                    <i className="fas fa-volume-up"></i>
                                                </button>
                                                <div className="text-sm">
                                                    <div className="font-bold text-white text-base">{p.local} <span className="text-gray-400 font-normal text-xs ml-1">({p.phonetic})</span></div>
                                                    <div className="text-blue-300 italic">{p.english} <span className="text-gray-500 bg-gray-800 px-1 rounded ml-1 text-xs">{p.category}</span></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {place.situationalDialogue && place.situationalDialogue.length > 0 && (
                                <div className="bg-gray-800 border border-gray-600 p-5 rounded-lg col-span-1 md:col-span-2 shadow-lg">
                                    <h4 className="text-orange-400 font-bold border-b border-gray-600 pb-2 mb-4 text-lg"><i className="fas fa-comments mr-2"></i>Situational Dialogue</h4>
                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                        {place.situationalDialogue.map((line, i) => (
                                            <div key={i} className={`p-4 rounded-lg border-l-4 ${i % 2 === 0 ? 'bg-orange-900/20 border-orange-500 ml-4 shadow-sm' : 'bg-gray-700 border-gray-500 mr-4 shadow-sm'}`}>
                                                <div className="font-bold text-xs mb-1 text-gray-400 uppercase tracking-widest">{line.speaker}</div>
                                                <div className="text-sm text-gray-200 leading-relaxed">{processTooltips(line.text)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {place.comprehensionQuestions && place.comprehensionQuestions.length > 0 && (
                                <div className="bg-gray-800 border border-gray-600 p-5 rounded-lg col-span-1 md:col-span-2 shadow-lg">
                                    <h4 className="text-indigo-400 font-bold border-b border-gray-600 pb-2 mb-4 text-lg"><i className="fas fa-question-circle mr-2"></i>Comprehension Check</h4>
                                    <div className="space-y-3">
                                        {place.comprehensionQuestions.map((qa, i) => (
                                            <details key={i} className="bg-gray-750 p-4 rounded-lg border border-gray-700 cursor-pointer shadow-sm group">
                                                <summary className="font-bold text-blue-300 outline-none hover:text-blue-200">{qa.question}</summary>
                                                <div className="mt-3 text-sm text-emerald-300 pt-3 border-t border-gray-600 leading-relaxed">{processTooltips(qa.answer)}</div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-800 border border-gray-600 p-5 rounded-lg col-span-1 md:col-span-2 shadow-lg">
                                <h4 className="text-yellow-400 font-bold border-b border-gray-600 pb-2 mb-4 text-lg"><i className="fas fa-headphones mr-2"></i>Virtual Tour Transcript</h4>
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                    {place.audioScript.map((line, i) => (
                                        <div key={i} className={`p-4 rounded-lg shadow-sm ${line.speaker === 'Tourist' ? 'bg-blue-900/40 ml-4 border-l-4 border-blue-500' : 'bg-purple-900/40 mr-4 border-l-4 border-purple-500'}`}>
                                            <div className={`font-bold text-xs mb-1 uppercase tracking-widest ${line.speaker === 'Tourist' ? 'text-blue-300' : 'text-purple-300'}`}>{line.speaker}</div>
                                            <div className="text-sm text-gray-200 leading-relaxed">{processTooltips(line.text)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Ultimate Code Reveal Footer */}
            <div className="bg-black/80 shadow-2xl p-6 rounded-xl border-t-4 border-yellow-600 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fas fa-trophy text-6xl text-yellow-400"></i>
                </div>
                <h3 className="text-yellow-400 font-bold text-sm tracking-widest uppercase mb-6 drop-shadow-md">The Secret Quotation Reveal</h3>
                <div className="flex flex-wrap justify-center gap-4 relative z-10">
                    {data.places.map((p, i) => (
                        <div key={i} className={`px-5 py-3 border-b-4 font-mono text-xl md:text-2xl rounded-t-lg bg-gray-900/50 shadow-inner ${guessedPlaces[i] ? 'text-yellow-300 border-yellow-400 font-bold' : 'text-gray-600 border-gray-700'}`}>
                            {guessedPlaces[i] ? p.quotationWordRavel : Array(p.quotationWordRavel?.length || 5).fill('?').join('')}
                        </div>
                    ))}
                </div>
                {guessedPlaces.every(Boolean) && (
                    <div className="mt-8 animation-fade-in text-yellow-300 relative z-10 bg-yellow-900/30 p-6 rounded-lg border border-yellow-700/50 shadow-2xl">
                        <i className="fas fa-quote-left text-3xl mb-4 text-yellow-600/50"></i>
                        <p className="text-2xl md:text-3xl font-serif italic mb-4 leading-tight">"{data.quotation}"</p>
                        <p className="text-xl font-bold tracking-wider">— {data.quotationAuthor}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManualPlaceGameRenderer;
