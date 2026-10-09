
import React, { FC, useState, useEffect, useRef } from 'react';
import type { LearnerProfile } from '../../types';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Card from '../ui/Card';
import { SearchableVoiceSelect } from '../ui/SearchableVoiceSelect';
import { getProfileContext } from '../../services/generation/core';
import { resolveGlobalReadAloudVoice } from '../../utils/characters';

interface AudioLine {
    speaker: string;
    text: string;
}

interface AudioScript {
    title: string;
    lines: AudioLine[];
}

const AudioGenerator: FC<{ learner: LearnerProfile }> = ({ learner }) => {
    const [scriptType, setScriptType] = useState<'podcast' | 'explainer'>('podcast');
    const [languageMode, setLanguageMode] = useState<'target' | 'bilingual'>('bilingual');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [hostVoice, setHostVoice] = useState('');
    const [guestVoice, setGuestVoice] = useState('');
    
    const [promptText, setPromptText] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [script, setScript] = useState<AudioScript | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const [isRecording, setIsRecording] = useState(false);

    // Load Voices with priority for Microsoft Multilingual
    useEffect(() => {
        const getVoices = () => {
            const list = window.speechSynthesis.getVoices();
            setVoices(list);

            // Priority 0: the learner's global Read Aloud Voice (Adult Profile → Step 2)
            // always wins, exactly like every other generator in the app.
            const preferred = resolveGlobalReadAloudVoice(learner?.readAloudVoice);
            const preferredMatch = list.find(v => v.voiceURI === preferred) || list.find(v => v.name === preferred);
            if (preferredMatch) {
                // The global Read Aloud Voice is applied to every speaker slot; each one can
                // still be re-pointed by hand in the pickers below.
                setHostVoice(preferredMatch.voiceURI);
                setGuestVoice(preferredMatch.voiceURI);
                return;
            }

            // Priority 1: Microsoft Ava Multilingual (Host)
            const ava = list.find(v => v.name.includes("Ava Multilingual") || v.name.includes("Ava"));
            if(ava) setHostVoice(ava.voiceURI);
            else {
                // Fallback Host
                const female = list.find(v => v.name.includes("Female") || v.name.includes("Google US English"));
                if(female) setHostVoice(female.voiceURI);
            }

            // Priority 2: Microsoft Brian Multilingual (Guest)
            const brian = list.find(v => v.name.includes("Brian Multilingual") || v.name.includes("Brian"));
            if(brian) setGuestVoice(brian.voiceURI);
            else {
                // Fallback Guest
                const male = list.find(v => (v.name.includes("Male") || v.name.includes("Guy")) && v.voiceURI !== hostVoice);
                if(male) setGuestVoice(male.voiceURI);
            }
        };

        getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
             window.speechSynthesis.onvoiceschanged = getVoices;
        }
    }, [learner?.readAloudVoice]);

    useEffect(() => {
        generatePrompt();
    }, [scriptType, languageMode, learner]);

    const generatePrompt = () => {
        const profileCtx = getProfileContext(learner);
        const l1 = learner.l1Language || "Native Language";
        const target = learner.targetLanguage || "English";
        
        let instructions = "";
        if (scriptType === 'podcast') {
            instructions = `Create a natural, engaging conversation between a Host and a Guest about a topic interesting to ${learner.name} (${learner.interests}).`;
        } else {
            instructions = `Create a clear, structured audio explainer script (monologue) teaching a concept relevant to ${learner.name} (${learner.interests}).`;
        }
        
        if (languageMode === 'bilingual') {
            instructions += `\nCRITICAL: Use a mix of ${target} and ${l1}. Explain complex ideas in ${l1}, but model examples in ${target}.`;
        } else {
            instructions += `\nCRITICAL: Use ONLY ${target}. Do NOT simplify the language. Use sophisticated, academic, and extensive vocabulary. The goal is deep immersion, not simplification. Make the text detailed, thorough, and voluminous.`;
        }

        const prompt = `
--- YOUR TASK (SETUP) ---
You are an expert audio script writer for advanced language learners.

**CRITICAL INSTRUCTION: STOP! DO NOT GENERATE YET.**
I have NOT provided the source text yet.
1. Read the instructions below to understand the required JSON structure.
2. **DO NOT** output the JSON yet.
3. Your response to THIS prompt should be ONLY: "Please provide the source text or PDF content."
4. I will then paste the text in the next message. Once you receive the text, THEN you must generate the JSON script based on that text.

--- LEARNER CONTEXT ---
${profileCtx}

--- SCRIPT INSTRUCTIONS ---
Target: ${target}
Support Language: ${l1}
Type: ${scriptType}
Details: ${instructions}
**LENGTH**: The script must be LONG and DETAILED. Minimum 1000 words. Do not summarize.

--- OUTPUT FORMAT ---
Return ONLY a valid JSON object. No markdown.
{
  "title": "Title of the Audio Lesson",
  "lines": [
    { "speaker": "${scriptType === 'podcast' ? 'Host' : 'Teacher'}", "text": "..." },
    ${scriptType === 'podcast' ? '{ "speaker": "Guest", "text": "..." }' : ''}
  ]
}
`;
        setPromptText(prompt);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
        alert("Prompt copied!");
    };

    const handleRender = () => {
        try {
            let clean = jsonInput.trim();
            if (clean.startsWith('```json')) clean = clean.substring(7);
            if (clean.startsWith('```')) clean = clean.substring(3);
            if (clean.endsWith('```')) clean = clean.slice(0, -3);
            
            const parsed = JSON.parse(clean);
            if (!parsed.lines || !Array.isArray(parsed.lines)) throw new Error("Invalid schema");
            setScript(parsed);
            setCurrentLineIndex(-1);
            setIsPlaying(false);
            window.speechSynthesis.cancel();
        } catch (e) {
            alert("Invalid JSON: " + e);
        }
    };

    // --- PLAYBACK LOGIC ---

    // We use a ref to track if we should continue playing recursively
    const isPlayingRef = useRef(false);

    const playScriptSequence = (startIndex: number) => {
        if (!script) return;
        
        // If we reached the end
        if (startIndex >= script.lines.length) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setCurrentLineIndex(-1);
            return;
        }

        if (!isPlayingRef.current) return;

        setCurrentLineIndex(startIndex);
        const line = script.lines[startIndex];
        
        const u = new SpeechSynthesisUtterance(line.text);
        
        // Select Voice dynamically based on current selection state
        const voicesList = window.speechSynthesis.getVoices();
        const vURI = (line.speaker === 'Host' || line.speaker === 'Teacher') ? hostVoice : guestVoice;
        const voice = voicesList.find(v => v.voiceURI === vURI);
        if (voice) u.voice = voice;
        
        // Rate adjustment for clarity if needed
        u.rate = 1.0; 

        u.onend = () => {
            if (isPlayingRef.current) {
                // Small pause between speakers for natural flow
                setTimeout(() => playScriptSequence(startIndex + 1), 300);
            }
        };

        u.onerror = (e) => {
            console.error("TTS Error", e);
            // Try to skip to next line on error
            if (isPlayingRef.current) {
                playScriptSequence(startIndex + 1);
            }
        };
        
        window.speechSynthesis.speak(u);
    };

    const togglePlay = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            isPlayingRef.current = false;
        } else {
            window.speechSynthesis.cancel(); // Ensure clear slate
            setIsPlaying(true);
            isPlayingRef.current = true;
            playScriptSequence(0);
        }
    };

    // --- RECORDING LOGIC (Tab Capture) ---

    const handleRecordAndDownload = async () => {
        if (!script) return;

        // 1. Confirm with user
        const confirm = window.confirm("To record high-quality audio, we need to capture your tab's audio output.\n\n1. Select 'Chrome Tab' or 'This Tab'.\n2. IMPORTANT: Ensure 'Share tab audio' is CHECKED.\n3. Do not switch tabs while recording.");
        if (!confirm) return;

        setIsRecording(true);
        setIsPlaying(true);
        isPlayingRef.current = true;

        try {
            // 2. Request Display Media (Tab Audio)
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true, // Required to get audio option in most browsers
                audio: true,
                // @ts-ignore - experimental features types
                preferCurrentTab: true 
            });

            // Check if audio track exists
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                stream.getTracks().forEach(track => track.stop());
                throw new Error("No audio track selected. Did you check 'Share tab audio'?");
            }

            const mimeType = MediaRecorder.isTypeSupported('audio/mp4') 
                ? 'audio/mp4' 
                : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

            // 3. Setup Recorder with Audio Track ONLY
            const audioStream = new MediaStream([audioTrack]);
            const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks to clear the sharing indicator
                stream.getTracks().forEach(track => track.stop());
                
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${script.title.replace(/\s+/g, '_')}_Audio_Recording.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                setIsRecording(false);
                setIsPlaying(false);
                isPlayingRef.current = false;
            };

            // 4. Start Recorder
            mediaRecorder.start();

            // 5. Start Playback (Custom loop to detect end)
            window.speechSynthesis.cancel();
            
            const playRecordSequence = (index: number) => {
                if (index >= script.lines.length) {
                    // Finished
                    setTimeout(() => mediaRecorder.stop(), 1000); // Capture tail
                    return;
                }

                setCurrentLineIndex(index);
                const line = script.lines[index];
                const u = new SpeechSynthesisUtterance(line.text);
                
                // Re-fetch voices to be safe
                const voicesList = window.speechSynthesis.getVoices();
                const vURI = (line.speaker === 'Host' || line.speaker === 'Teacher') ? hostVoice : guestVoice;
                const voice = voicesList.find(v => v.voiceURI === vURI);
                if (voice) u.voice = voice;

                u.onend = () => {
                    setTimeout(() => playRecordSequence(index + 1), 300);
                };
                
                u.onerror = () => {
                     // If error, try to stop gracefully
                     mediaRecorder.stop();
                }

                window.speechSynthesis.speak(u);
            };

            playRecordSequence(0);

        } catch (e) {
            console.error(e);
            alert("Recording failed: " + (e instanceof Error ? e.message : String(e)));
            setIsRecording(false);
            setIsPlaying(false);
            isPlayingRef.current = false;
            window.speechSynthesis.cancel();
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-xl font-bold mb-4 text-purple-700">🎧 Audio Lesson Creator</h3>
                <p className="text-sm text-gray-600 mb-4">Generate in-depth scripts and record high-quality browser voices (like Microsoft Ava/Brian) directly to a file.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="font-bold block mb-1">Type</label>
                        <select className="w-full p-2 border rounded bg-white text-black" value={scriptType} onChange={(e: any) => setScriptType(e.target.value)}>
                            <option value="podcast">Podcast (2 Speakers)</option>
                            <option value="explainer">Explainer (1 Speaker)</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-bold block mb-1">Language Mode</label>
                        <select className="w-full p-2 border rounded bg-white text-black" value={languageMode} onChange={(e: any) => setLanguageMode(e.target.value)}>
                            <option value="target">Target Language Only</option>
                            <option value="bilingual">Bilingual (L1 Support)</option>
                        </select>
                    </div>
                </div>

                <div className="mb-4">
                     <label className="font-bold block mb-1">Select Browser Voices</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SearchableVoiceSelect value={hostVoice} onChange={setHostVoice} />
                        {scriptType === 'podcast' && (
                            <SearchableVoiceSelect value={guestVoice} onChange={setGuestVoice} />
                        )}
                     </div>
                     <p className="text-xs text-gray-500 mt-1">Recommended: Microsoft "Natural" or "Multilingual" voices.</p>
                </div>

                <div className="mb-4">
                    <label className="font-bold block mb-1">1. Copy Prompt</label>
                    <div className="relative">
                        <Textarea value={promptText} readOnly rows={4} className="text-xs font-mono bg-gray-50" />
                        <button onClick={handleCopy} className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 text-xs rounded">Copy</button>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="font-bold block mb-1">2. Paste JSON</label>
                    <Textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder="Paste { title: ..., lines: [...] } here..." rows={4} className="text-xs font-mono" />
                    <Button onClick={handleRender} className="mt-2 w-full bg-blue-600 hover:bg-blue-700">Render Audio Script</Button>
                </div>
            </Card>

            {script && (
                <Card className="border-l-4 border-green-500">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">{script.title}</h3>
                        <div className="flex gap-2">
                             <Button onClick={togglePlay} disabled={isRecording} className={`${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                {isPlaying && !isRecording ? <><i className="fas fa-stop mr-2"></i>Stop</> : <><i className="fas fa-play mr-2"></i>Play Preview</>}
                            </Button>
                            
                            <Button onClick={handleRecordAndDownload} disabled={isRecording} className="bg-indigo-600 hover:bg-indigo-700">
                                {isRecording ? <span className="animate-pulse">🔴 Recording...</span> : <><i className="fas fa-circle mr-2"></i>Record & Download</>}
                            </Button>
                        </div>
                    </div>
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto p-2 bg-gray-50 rounded border">
                        {script.lines.map((line, i) => (
                            <div key={i} className={`p-2 rounded ${i === currentLineIndex ? 'bg-yellow-100 border-l-4 border-yellow-500' : 'bg-white'}`}>
                                <span className="font-bold text-gray-700 uppercase text-xs">{line.speaker}</span>
                                <p className="text-sm text-gray-900">{line.text}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic">
                        * "Record & Download" captures the high-quality browser audio (e.g., Edge Neural Voices) by recording the tab output. You must select "Share tab audio" when prompted.
                    </p>
                </Card>
            )}
        </div>
    );
};

export default AudioGenerator;
