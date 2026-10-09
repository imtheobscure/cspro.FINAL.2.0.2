import React, { FC, useState, useRef, useEffect } from 'react';
import type { LearnerProfile, LearnerContent } from '../../types';
import { getFeedbackForText, getGenerativeResponse } from '../../services/generation/chatService';
import Spinner from './Spinner';

// Fix: Add type definitions for the Web Speech API which are not standard in all TS lib versions.
// This interface defines the properties and methods for the SpeechRecognition object.
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: any) => void) | null;
    onresult: ((event: any) => void) | null;
}

// This declares that the `SpeechRecognition` and `webkitSpeechRecognition` constructors
// exist on the global `Window` object.
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

type ChatMode = 'feedback' | 'generator';
interface Message {
    sender: 'user' | 'ai' | 'system';
    text: string;
}

const ChatWidget: FC<{
    learner: LearnerProfile;
    content: LearnerContent | undefined;
}> = ({ learner, content }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<ChatMode>('feedback');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            const recognition = recognitionRef.current;
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsRecording(true);
            recognition.onend = () => setIsRecording(false);
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                handleSubmit(transcript);
            };
        }
    }, []);

    const handleToggleRecording = () => {
        if (!recognitionRef.current) return;
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setInput('');
            recognitionRef.current.start();
        }
    };

    const handleSubmit = async (text: string) => {
        const userMessage = text.trim();
        if (!userMessage || isLoading) return;

        setIsLoading(true);
        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setInput('');

        try {
            let aiResponse = '';
            if (mode === 'feedback') {
                aiResponse = await getFeedbackForText(userMessage, learner, content?.rawText || '');
            } else {
                aiResponse = await getGenerativeResponse(userMessage);
            }
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { sender: 'system', text: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleModeChange = (newMode: ChatMode) => {
        setMode(newMode);
        setMessages([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(input);
        }
    };

    const renderMessage = (msg: Message, index: number) => {
        if (msg.sender === 'system') {
            return <div key={index} className="px-3 py-2 text-xs text-center text-gray-500">{msg.text}</div>;
        }
        const isUser = msg.sender === 'user';
        return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md rounded-lg px-3 py-2 ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                </div>
            </div>
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen && (
                <div className="w-80 h-[450px] bg-white rounded-lg shadow-2xl flex flex-col transition-all mb-4">
                    {/* Header */}
                    <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                        <div className="flex justify-center items-center text-xs bg-gray-200 rounded-full p-0.5">
                            <button onClick={() => handleModeChange('feedback')} className={`px-4 py-1 rounded-full font-semibold transition-all ${mode === 'feedback' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>Feedback</button>
                            <button onClick={() => handleModeChange('generator')} className={`px-4 py-1 rounded-full font-semibold transition-all ${mode === 'generator' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'}`}>Generator</button>
                        </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center text-sm text-gray-400 mt-4">
                                {mode === 'feedback' 
                                    ? "Speak or type something to get feedback on your English."
                                    : "Ask me to generate anything for you!"
                                }
                            </div>
                        )}
                        {messages.map(renderMessage)}
                         {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-xs md:max-w-md rounded-lg px-3 py-2 bg-gray-200">
                                    <Spinner />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    {/* Input */}
                    <div className="p-3 border-t">
                        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }} className="flex items-center space-x-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isRecording ? 'Listening...' : 'Type or speak... (Shift+Enter for new line)'}
                                className="flex-1 p-2 border border-gray-300 rounded-md text-sm bg-white text-black resize-none"
                                disabled={isLoading || isRecording}
                                rows={3}
                            />
                            {recognitionRef.current && (
                                <button type="button" onClick={handleToggleRecording} disabled={isLoading} className={`p-2 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700'}`}>
                                    <i className="fas fa-microphone"></i>
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 transition-transform hover:scale-110">
                <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'}`}></i>
            </button>
        </div>
    );
};

export default ChatWidget;