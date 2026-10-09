import React, { useState, useEffect } from 'react';
import { PlayIcon, DownloadFileIcon } from './Icons';

const AudioPlayer: React.FC<{ scriptText: string, scriptIndex: number }> = ({ scriptText, scriptIndex }) => {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [filterText, setFilterText] = useState('');
    
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
            if (availableVoices.length > 0 && !selectedVoiceURI) {
                // Default to a natural-sounding English voice if possible
                const defaultVoice = availableVoices.find(v => v.name.includes('Natural') && v.lang.includes('en')) || 
                                     availableVoices.find(v => v.lang.includes('en')) || 
                                     availableVoices[0];
                if (defaultVoice) {
                    setSelectedVoiceURI(defaultVoice.voiceURI);
                }
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredVoices = voices.filter(v => 
        v.name.toLowerCase().includes(filterText.toLowerCase()) || 
        v.lang.toLowerCase().includes(filterText.toLowerCase())
    );

    const handlePlayAndRecord = async () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(scriptText);
        const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
    };

    const handleDownloadMp3 = async () => {
        if (isRecording) return;
        try {
            // Request microphone access to record the TTS output
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
                const url = URL.createObjectURL(audioBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `script-${scriptIndex + 1}.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
                setIsPlaying(false);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPlaying(true);

            const utterance = new SpeechSynthesisUtterance(scriptText);
            const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
            utterance.onend = () => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            };
            utterance.onerror = () => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            };
            
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error(e);
            alert("Microphone permission is required to record and save the TTS audio.");
            setIsRecording(false);
            setIsPlaying(false);
        }
    };

    return (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-300">
             <div className="flex flex-col sm:flex-row items-center gap-3 text-gray-800 font-medium text-sm w-full">
                 <input 
                     type="text" 
                     placeholder="Filter voice..." 
                     value={filterText}
                     onChange={(e) => setFilterText(e.target.value)}
                     className="p-2 border border-gray-400 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full sm:max-w-[150px]"
                 />
                 <select 
                    value={selectedVoiceURI} 
                    onChange={e => setSelectedVoiceURI(e.target.value)}
                    className="flex-grow p-2 border border-gray-400 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 max-w-full sm:max-w-[250px] overflow-hidden text-ellipsis"
                 >
                     {filteredVoices.map(v => (
                         <option key={v.voiceURI} value={v.voiceURI}>
                             {v.name} ({v.lang})
                         </option>
                     ))}
                     {filteredVoices.length === 0 && <option value="">No voices match filter</option>}
                 </select>
                 
                 <div className="flex items-center space-x-2">
                     <button 
                        onClick={handlePlayAndRecord} 
                        disabled={isRecording}
                        className={`p-2 rounded-full border transition-colors flex items-center gap-2 px-4 shadow-sm ${(isPlaying && !isRecording) ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white border-green-300 text-[#58cc02] hover:bg-green-50'} disabled:opacity-50`}
                        title={(isPlaying && !isRecording) ? "Stop playing" : "Play text aloud"}
                     >
                        <PlayIcon className="h-5 w-5" />
                        <span>{(isPlaying && !isRecording) ? "Stop" : "Play Aloud"}</span>
                     </button>
                     
                     <button 
                        onClick={handleDownloadMp3} 
                        disabled={isRecording}
                        className={`p-2 rounded-full border transition-colors flex items-center gap-2 px-4 shadow-sm ${isRecording ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' : 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50'} disabled:opacity-50`}
                        title={isRecording ? "Recording..." : "Play & Record to MP3"}
                     >
                         <DownloadFileIcon className="h-5 w-5"/>
                         <span>{isRecording ? "Recording..." : "Play & Save MP3"}</span>
                     </button>
                 </div>
            </div>
        </div>
    );
};

export default AudioPlayer;
