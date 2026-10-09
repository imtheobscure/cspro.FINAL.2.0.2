
import React, { FC, useState, useEffect } from 'react';
import type { StudyGuideOutput, LearnerProfile, Slide, Flashcard } from '../../types';
import Button from '../ui/Button';
import { handleSaveStudyGuideAsInteractiveHtml } from '../../utils/studyGuideHtmlGenerator';

const AudioPlayer: FC<{ overview: StudyGuideOutput['audioOverview'] }> = ({ overview }) => {
    const isScriptArray = Array.isArray(overview.script);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);

    useEffect(() => {
        return () => {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, []);

    const togglePlay = () => {
        if (!isScriptArray || !window.speechSynthesis || overview.script.length === 0) return;

        if (isPlaying) {
             window.speechSynthesis.cancel();
             setIsPlaying(false);
             setCurrentLineIndex(-1);
             return;
        }

        setIsPlaying(true);
        let currentIndex = 0;

        const speakNext = (index: number) => {
             // Need to check play state softly
             // Though this closure might race condition if state is changing. 
             // Better to just rely on speechsynthesis cancel.
             
             if (index >= overview.script.length) {
                  setIsPlaying(false);
                  setCurrentLineIndex(-1);
                  return;
             }
             setCurrentLineIndex(index);
             const line = overview.script[index];
             const utterance = new SpeechSynthesisUtterance(line.text || '');
             
             if (line.voice) {
                  let selectedVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === line.voice || v.name === line.voice);
                  if (!selectedVoice) {
                      selectedVoice = window.speechSynthesis.getVoices().find(v => line.voice.includes(v.name) || v.name.includes(line.voice));
                  }
                  if (selectedVoice) utterance.voice = selectedVoice;
             }
             
             utterance.onend = () => speakNext(index + 1);
             utterance.onerror = () => speakNext(index + 1);
             
             window.speechSynthesis.speak(utterance);
        };

        window.speechSynthesis.cancel();
        speakNext(0);
    };

    if (isScriptArray) {
        return (
            <div className="text-center p-6 bg-white rounded-lg shadow-inner">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{overview.title}</h3>
                
                <div className="mb-6 flex justify-center">
                    <Button onClick={togglePlay} className={`${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}>
                        <i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play'} mr-2`}></i> 
                        {isPlaying ? 'Stop Podcast' : 'Play Live Podcast'}
                    </Button>
                </div>

                <div className="p-4 bg-gray-100 rounded text-left max-h-[400px] overflow-y-auto space-y-4 shadow-inner">
                    {overview.script.map((line: any, idx: number) => (
                        <div key={idx} className={`p-3 rounded border transition-colors ${currentLineIndex === idx ? 'bg-blue-100 border-blue-400 font-bold' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-500 uppercase">{line.speaker}</span>
                                {line.voice && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{line.voice}</span>}
                            </div>
                            <p className={`text-sm ${currentLineIndex === idx ? 'text-blue-900' : 'text-gray-800'}`}>{line.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!overview.audioBase64) {
        return (
            <div className="text-center p-6 bg-white rounded-lg shadow-inner">
                <h3 className="text-xl font-bold text-gray-800">{overview.title}</h3>
                <p className="text-red-500 my-4">Audio was not pre-generated for this guide. Please regenerate the Study Guide.</p>
                <div className="p-4 bg-gray-100 rounded text-left max-h-60 overflow-y-auto">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Script Preview:</p>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{overview.script && typeof overview.script === 'string' ? overview.script.substring(0, 500) : ''}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-center p-6 bg-white rounded-lg shadow-inner">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{overview.title}</h3>
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-6 text-white text-3xl shadow-lg">
                <i className="fas fa-podcast"></i>
            </div>
            <p className="text-gray-600 mb-6">Listen to a deep-dive conversation about your lesson.</p>
            <audio controls src={`data:audio/wav;base64,${overview.audioBase64}`} className="w-full max-w-md mx-auto" />
        </div>
    );
};

const SlidesDisplay: FC<{ slides: Slide[] }> = ({ slides }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    if(!slides || slides.length === 0) return <p>No slides generated.</p>;
    
    const nextSlide = () => setCurrentSlideIndex(prev => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
    
    const slide = slides[currentSlideIndex];

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Lesson Analysis Slides ({currentSlideIndex + 1}/{slides.length})</h3>
            
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-4 border-purple-500 w-full max-w-3xl min-h-[400px] flex flex-col justify-center">
                <h4 className="text-2xl font-bold text-purple-800 mb-4 border-b pb-2">{slide.title}</h4>
                <div className="text-gray-800 mb-6 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: slide.content }} />
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h5 className="font-bold text-gray-700 text-sm mb-2 uppercase">Key Takeaways</h5>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {slide.bulletPoints.map((bp, j) => <li key={j}>{bp}</li>)}
                    </ul>
                </div>
                
                {slide.personalizedExamples && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h5 className="font-bold text-green-800 text-sm mb-2 uppercase">For You</h5>
                        <ul className="list-none space-y-1 text-green-900 italic">
                             {slide.personalizedExamples.map((ex, k) => <li key={k}>"{ex}"</li>)}
                        </ul>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center w-full max-w-3xl mt-6">
                <Button onClick={prevSlide} className="bg-gray-600 hover:bg-gray-700 w-32">
                    <i className="fas fa-arrow-left mr-2"></i> Prev
                </Button>
                <Button onClick={nextSlide} className="bg-gray-600 hover:bg-gray-700 w-32">
                    Next <i className="fas fa-arrow-right ml-2"></i>
                </Button>
            </div>
        </div>
    );
};

const FlashcardViewer: FC<{ flashcards: Flashcard[], learner: LearnerProfile }> = ({ flashcards, learner }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    if (!flashcards || flashcards.length === 0) {
        return <p className="text-gray-500 text-center py-8">No flashcards generated.</p>
    }
    
    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex(prev => (prev + 1) % flashcards.length);
    };
    const handlePrev = () => {
        setIsFlipped(false);
        setCurrentIndex(prev => (prev - 1 + flashcards.length) % flashcards.length);
    };
    const handleReadAloud = (text: string) => {
        if (!window.speechSynthesis) return;
        if (speechSynthesis.speaking) speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (learner.readAloudVoice) {
            const selectedVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === learner.readAloudVoice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        speechSynthesis.speak(utterance);
    };
    const card = flashcards[currentIndex];

    return (
        <div className="max-w-xl mx-auto">
            <div className="perspective-1000">
                <div className={`relative w-full h-80 transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                    <div className="absolute w-full h-full backface-hidden bg-white rounded-lg shadow-xl flex flex-col justify-center items-center p-6 cursor-pointer border-4 border-blue-300">
                        <p className="text-4xl font-bold text-blue-800 text-center">{card.term}</p>
                        <p className="text-xs text-gray-400 mt-4">Tap to flip</p>
                        <button onClick={(e) => { e.stopPropagation(); handleReadAloud(card.term); }} className="absolute bottom-4 right-4 text-blue-500 hover:text-blue-700 text-2xl"><i className="fas fa-volume-up"></i></button>
                    </div>
                    <div className="absolute w-full h-full backface-hidden bg-blue-50 rounded-lg shadow-xl flex flex-col justify-center p-6 cursor-pointer border-4 border-blue-300 rotate-y-180 overflow-y-auto">
                        <p className="text-lg font-semibold text-blue-900 mb-2 text-center">{card.definition}</p>
                        <p className="text-md italic text-gray-600 text-center mb-4">"{card.example}"</p>
                        {card.wouldYouRather && (
                            <div className="bg-white p-2 rounded text-xs text-center border border-blue-200">
                                <strong>Would You Rather:</strong><br/>
                                {card.wouldYouRather.optionA} OR {card.wouldYouRather.optionB}?
                            </div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleReadAloud(`${card.definition}. For example: ${card.example}`); }} className="absolute bottom-4 right-4 text-blue-500 hover:text-blue-700 text-2xl"><i className="fas fa-volume-up"></i></button>
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center mt-6">
                <Button onClick={handlePrev} className="bg-gray-600 hover:bg-gray-700"><i className="fas fa-arrow-left mr-2"></i> Prev</Button>
                <p className="font-semibold text-gray-700">{currentIndex + 1} / {flashcards.length}</p>
                <Button onClick={handleNext} className="bg-gray-600 hover:bg-gray-700">Next <i className="fas fa-arrow-right ml-2"></i></Button>
            </div>
            <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .rotate-y-180 { transform: rotateY(180deg); } .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }`}</style>
        </div>
    );
};

const StudyGuideRenderer: FC<{ content: StudyGuideOutput; learner: LearnerProfile }> = ({ content, learner }) => {
    const [activeTab, setActiveTab] = useState('audio');

    const renderContent = () => {
        switch(activeTab) {
            case 'audio': return <AudioPlayer overview={content.audioOverview} />;
            case 'slides': return <SlidesDisplay slides={content.summarySlides} />;
            case 'flashcards': return <FlashcardViewer flashcards={content.flashcards} learner={learner} />;
            default: return null;
        }
    };

    return (
        <div className="mt-6">
            <div className="flex justify-end mb-4">
                 <Button onClick={() => handleSaveStudyGuideAsInteractiveHtml(content, learner, `StudyGuide_${learner.name.replace(/\s+/g, '_')}.html`)} className="bg-teal-600 hover:bg-teal-700">
                    ⬇️ Save as Interactive HTML
                </Button>
            </div>
            <div className="border border-gray-300 rounded-lg bg-gray-50">
                <div className="flex border-b border-gray-300 overflow-x-auto">
                    <button onClick={() => setActiveTab('audio')} className={`px-4 py-3 font-semibold transition-colors flex-shrink-0 ${activeTab === 'audio' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fas fa-headphones-alt mr-2"></i>Audio Podcast
                    </button>
                    <button onClick={() => setActiveTab('slides')} className={`px-4 py-3 font-semibold transition-colors flex-shrink-0 ${activeTab === 'slides' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fas fa-layer-group mr-2"></i>Analysis Slides
                    </button>
                    <button onClick={() => setActiveTab('flashcards')} className={`px-4 py-3 font-semibold transition-colors flex-shrink-0 ${activeTab === 'flashcards' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fas fa-clone mr-2"></i>Flashcards ({content.flashcards.length})
                    </button>
                </div>
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default StudyGuideRenderer;
