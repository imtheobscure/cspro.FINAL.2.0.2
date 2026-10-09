import React, { FC, useState, useEffect } from 'react';

const DEFAULT_VOICE_NAME = 'Microsoft Ava Multilingual online';

const ReadAloudButton: FC<{ text: string; voiceURI?: string }> = ({ text, voiceURI }) => {
    const [avaUri, setAvaUri] = useState<string>('');

    useEffect(() => {
        const findAva = () => {
            const voices = window.speechSynthesis.getVoices();
            const ava = voices.find(v => v.name.toLowerCase().includes(DEFAULT_VOICE_NAME.toLowerCase()));
            if (ava) {
                setAvaUri(ava.voiceURI);
                return true;
            }
            return false;
        };
        if (!findAva()) {
            const interval = setInterval(() => {
                if (findAva()) clearInterval(interval);
            }, 200);
            setTimeout(() => clearInterval(interval), 5000);
        }
    }, []);

    const findAvaVoice = (): SpeechSynthesisVoice | undefined => {
        return window.speechSynthesis.getVoices().find(v => v.name.toLowerCase().includes(DEFAULT_VOICE_NAME.toLowerCase()));
    };

    const handleRead = () => {
        try {
            if (!window.speechSynthesis) {
                alert("Sorry, your browser does not support text-to-speech.");
                return;
            }
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const targetURI = voiceURI || avaUri;
                if (targetURI) {
                    const selectedVoice = voices.find(v => v.voiceURI === targetURI);
                    if (selectedVoice) utterance.voice = selectedVoice;
                } else {
                    const ava = findAvaVoice();
                    if (ava) utterance.voice = ava;
                }
            }
            speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech synthesis failed.", e);
        }
    };

    return (
        <button
            onClick={handleRead}
            onMouseEnter={handleRead}
            className="ml-3 p-0 w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
            title="Read text aloud"
        >
            <span className="text-xl">💭</span>
        </button>
    );
};

export default ReadAloudButton;
