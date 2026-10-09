export const generateStandalonePlaceGameHtml = (data: any, learnerName: string): string => {
    // Prevent nested HTML content from breaking the stringified JSON and script block
    const dataObj = { ...data };
    if (dataObj.htmlContent) delete dataObj.htmlContent;
    
    // Stringify and escape < to prevent early closure of </script>
    const jsonStr = JSON.stringify(dataObj).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guess The Place: ${data.city}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #111827; color: #f3f4f6; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #374151; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #6b7280; border-radius: 4px; }
        .animate-pulse-slow { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    </style>
</head>
<body class="p-6">
    <div id="app" class="max-w-4xl mx-auto"></div>

    <script>
        const gameData = ${jsonStr};
        let currentPlaceIndex = 0;
        let guessedPlaces = [false, false, false, false, false];
        let isAudioPlaying = false;
        let isChecking = false;
        let imageSeed = Math.floor(Math.random() * 1000);

        function getImages(prompts) {
            // Using a slightly more reliable sizing parameter or fallback to generic placeholders if pollination fails
            return prompts.map((p, i) => 'https://image.pollinations.ai/prompt/' + encodeURIComponent(p) + '?width=800&height=600&nologo=true&seed=' + (imageSeed + i));
        }

        function refreshImages() {
            imageSeed += 10;
            renderApp();
        }

        // Helper to format text with tooltips [word:definition]
        function formatTooltips(text) {
            if (!text) return '';
            return text.replace(/\\[([^:]+):([^\\]]+)\\]/g, (match, word, def) => {
                return \`<span class="relative group cursor-help font-semibold text-blue-300 border-b border-dashed border-blue-400">
                    \${word}
                    <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 border border-gray-600 shadow-xl rounded text-xs text-white z-50 normal-case leading-tight">
                        \${def}
                    </span>
                </span>\`;
            });
        }
        
        function playLocalPhrase(text) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                // Try to find Microsoft Ava or similar natural voice
                const voices = window.speechSynthesis.getVoices();
                let matched = voices.find(v => v.name.includes('Ava') || v.lang.includes(v.lang)) || voices[0];
                if (matched) utter.voice = matched;
                window.speechSynthesis.speak(utter);
            }
        }


        function renderApp() {
            const app = document.getElementById('app');
            const place = gameData.places[currentPlaceIndex];
            const images = getImages(place.imagePrompts).slice(0, 4);

            let html = \`
                <div class="bg-gray-900 text-gray-100 p-6 rounded-2xl shadow-2xl space-y-6">
                    <div class="text-center">
                        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                            Guess The Place: \${gameData.city}
                        </h2>
                        <div class="flex justify-center gap-2 mb-4">
                            \${gameData.places.map((p, i) => \`
                                <button onclick="selectPlace(\${i})" class="w-10 h-10 rounded-full font-bold flex items-center justify-center transition-all \${guessedPlaces[i] ? 'bg-emerald-500 text-white' : (i === currentPlaceIndex ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.7)]' : 'bg-gray-700 text-gray-400 hover:bg-gray-600')}">
                                    \${guessedPlaces[i] ? '<i class="fas fa-check"></i>' : (i + 1)}
                                </button>
                            \`).join('')}
                        </div>
                    </div>

                    <div class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 p-4">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-gray-400 font-bold text-sm uppercase tracking-wider"><i class="fas fa-camera mr-2"></i>Visual Clues</h4>
                            <button onclick="refreshImages()" class="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-gray-200 transition-colors">
                                <i class="fas fa-sync-alt mr-1"></i> Refresh Images
                            </button>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-4 h-64">
                            \${images.map(img => \`
                                <div class="relative w-full h-full overflow-hidden rounded-lg group">
                                    <img src="\${img}" alt="Clue" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                                </div>
                            \`).join('')}
                        </div>

                        <div class="text-lg leading-relaxed text-gray-300 mb-6 italic border-l-4 border-blue-500 pl-4">
                            "\${formatTooltips(place.descriptiveText)}"
                        </div>
            \`;

            if (!guessedPlaces[currentPlaceIndex]) {
                html += \`
                        <div class="p-4 bg-gray-700 border border-gray-600 rounded-lg shadow-inner">
                            <div class="flex gap-2">
                                <input id="guessInput" type="text" placeholder="Name this location..." \${isChecking ? 'disabled' : ''} class="flex-grow p-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 \${isChecking ? 'opacity-50' : ''}" />
                                <button onclick="handleGuess()" \${isChecking ? 'disabled' : ''} class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg transition-colors">
                                    \${isChecking ? '...' : 'GUESS'}
                                </button>
                            </div>
                            <p id="feedbackMsg" class="mt-3 font-bold text-center text-lg hidden"></p>
                            
                            <div class="mt-4 pt-4 border-t border-gray-600 text-center">
                                <p class="text-sm text-gray-400 mb-2">Need more clues?</p>
                                <button id="playBtn" onclick="handlePlayAudio()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg w-full max-w-sm mx-auto flex items-center justify-center transition-colors">
                                    <i class="fas fa-headphones mr-2"></i> \${isAudioPlaying ? 'Stop Virtual Tour' : 'Listen to Virtual Tour Audio'}
                                </button>
                            </div>
                        </div>
                \`;
            } else {
                html += \`
                        <div class="space-y-6">
                            <div class="bg-emerald-900/30 border border-emerald-500 rounded-lg p-4 text-center">
                                <h3 class="text-xl font-bold text-emerald-400">Correct! This is \${place.placeName}!</h3>
                                <p class="text-emerald-200 mt-2 text-lg">Quotation piece unlocked: <span class="font-extrabold text-yellow-300">"\${place.quotationWordRavel}"</span></p>
                            </div>
                            
                            <div class="space-y-6">
                                <div class="bg-emerald-900/30 border border-emerald-500 rounded-lg p-4 text-center">
                                    <h3 class="text-xl font-bold text-emerald-400">Correct! This is \${place.placeName}!</h3>
                                    <p class="text-emerald-200 mt-2 text-lg">Quotation piece unlocked: <span class="font-extrabold text-yellow-300">"\${place.quotationWordRavel}"</span></p>
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="bg-gray-700 rounded-lg p-4 shadow">
                                        <h4 class="text-blue-300 font-bold border-b border-gray-600 pb-2 mb-2"><i class="fas fa-lightbulb mr-2"></i>Fun Facts</h4>
                                        <ul class="list-disc pl-4 space-y-2 text-sm text-gray-200">
                                            \${place.funFacts.map(f => \`<li>\${formatTooltips(f.text || f)} \${f.ccq ? \`<div class="mt-1 text-xs text-yellow-200 border-l-2 border-yellow-500 pl-2"><strong>CCQ:</strong> \${f.ccq}</div>\` : ''}</li>\`).join('')}
                                        </ul>
                                    </div>
                                    <div class="bg-gray-700 rounded-lg p-4 shadow">
                                        <h4 class="text-pink-300 font-bold border-b border-gray-600 pb-2 mb-2"><i class="fas fa-landmark mr-2"></i>Culture Notes</h4>
                                        <ul class="list-disc pl-4 space-y-2 text-sm text-gray-200">
                                            \${place.cultureNotes.map(f => \`<li>\${formatTooltips(f.text || f)} \${f.ccq ? \`<div class="mt-1 text-xs text-yellow-200 border-l-2 border-yellow-500 pl-2"><strong>CCQ:</strong> \${f.ccq}</div>\` : ''}</li>\`).join('')}
                                        </ul>
                                    </div>
                                    <div class="bg-gray-700 rounded-lg p-4 shadow">
                                        <h4 class="text-emerald-300 font-bold border-b border-gray-600 pb-2 mb-2"><i class="fas fa-utensils mr-2"></i>Things to Try</h4>
                                        <ul class="list-disc pl-4 space-y-2 text-sm text-gray-200">
                                            \${place.thingsToTry.map(f => \`<li>\${formatTooltips(f.text || f)} \${f.ccq ? \`<div class="mt-1 text-xs text-yellow-200 border-l-2 border-yellow-500 pl-2"><strong>CCQ:</strong> \${f.ccq}</div>\` : ''}</li>\`).join('')}
                                        </ul>
                                    </div>
                                    <div class="bg-gray-700 rounded-lg p-4 shadow">
                                        <h4 class="text-red-300 font-bold border-b border-gray-600 pb-2 mb-2"><i class="fas fa-ban mr-2"></i>Things to Avoid</h4>
                                        <ul class="list-disc pl-4 space-y-2 text-sm text-gray-200">
                                            \${place.thingsToAvoid.map(f => \`<li>\${formatTooltips(f.text || f)} \${f.ccq ? \`<div class="mt-1 text-xs text-yellow-200 border-l-2 border-yellow-500 pl-2"><strong>CCQ:</strong> \${f.ccq}</div>\` : ''}</li>\`).join('')}
                                        </ul>
                                    </div>
                                </div>
                                
                                \${place.localPhrases && place.localPhrases.length > 0 ? \`
                                <div class="bg-gray-800 border border-gray-600 p-4 rounded-lg">
                                    <h4 class="text-indigo-400 font-bold border-b border-gray-600 pb-2 mb-4"><i class="fas fa-language mr-2"></i>Local Phrases to Use</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        \${place.localPhrases.map(phrase => \`
                                            <div class="bg-gray-700 p-3 rounded-lg border border-gray-600 flex justify-between items-center">
                                                <div>
                                                    <div class="text-xs text-indigo-300 uppercase tracking-wider mb-1">\${phrase.category || 'Phrase'}</div>
                                                    <div class="text-white font-bold">\${phrase.local}</div>
                                                    <div class="text-sm text-gray-300 italic">"\${phrase.english}"</div>
                                                    <div class="text-xs text-gray-400 mt-1">Pronunciation: \${phrase.phonetic}</div>
                                                </div>
                                                <button onclick="playLocalPhrase('\${phrase.local}')" class="text-indigo-400 hover:text-white transition-colors p-2 bg-gray-800 rounded-full h-10 w-10 flex items-center justify-center">
                                                    <i class="fas fa-volume-up"></i>
                                                </button>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                                \` : ''}

                                \${place.situationalDialogue && place.situationalDialogue.length > 0 ? \`
                                <div class="bg-gray-800 border border-gray-600 p-4 rounded-lg">
                                    <h4 class="text-teal-400 font-bold border-b border-gray-600 pb-2 mb-4"><i class="fas fa-comments mr-2"></i>Situational Dialogue</h4>
                                    <div class="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        \${place.situationalDialogue.map(line => \`
                                            <div class="p-3 rounded-lg \${((line.speaker || line.character || '').toLowerCase()).includes('learner') ? 'bg-teal-900/40 ml-4 border border-teal-800' : 'bg-gray-700/60 mr-4 border border-gray-600'}">
                                                <div class="font-bold text-xs mb-1 \${((line.speaker || line.character || '').toLowerCase()).includes('learner') ? 'text-teal-300' : 'text-gray-300'}">\${line.speaker || line.character || ""}</div>
                                                <div class="text-sm text-gray-200">\${formatTooltips(line.text)}</div>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                                \` : ''}
                                
                                \${place.comprehensionQuestions && place.comprehensionQuestions.length > 0 ? \`
                                <div class="bg-gray-800 border border-gray-600 p-4 rounded-lg">
                                    <h4 class="text-amber-400 font-bold border-b border-gray-600 pb-2 mb-4"><i class="fas fa-question-circle mr-2"></i>Comprehension Check</h4>
                                    <div class="space-y-4">
                                        \${place.comprehensionQuestions.map((q, idx) => \`
                                            <div class="bg-gray-700 p-3 rounded-lg border border-gray-600">
                                                <div class="font-bold text-sm text-white mb-2">\${idx + 1}. \${q.question}</div>
                                                <details class="group">
                                                    <summary class="text-xs text-amber-400 cursor-pointer font-bold select-none">Show Answer</summary>
                                                    <div class="mt-2 text-sm text-gray-300 border-l border-amber-500 pl-3">
                                                        \${q.answer}
                                                    </div>
                                                </details>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                                \` : ''}

                                <div class="bg-gray-800 border border-gray-600 p-4 rounded-lg">
                                    <h4 class="text-yellow-400 font-bold border-b border-gray-600 pb-2 mb-4"><i class="fas fa-headphones mr-2"></i>Virtual Tour Transcript</h4>
                                    <div class="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        \${place.audioScript.map(line => \`
                                            <div class="p-3 rounded-lg \${line.speaker === 'Tourist' ? 'bg-blue-900/40 ml-4' : 'bg-purple-900/40 mr-4'}">
                                                <div class="font-bold text-xs mb-1 \${line.speaker === 'Tourist' ? 'text-blue-300' : 'text-purple-300'}">\${line.speaker || line.character || ""}</div>
                                                <div class="text-sm text-gray-200">\${formatTooltips(line.text)}</div>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                            </div>

                \`;
            }

            html += \`
                    </div>
                    
                    <div class="bg-black/50 p-6 rounded-xl border-t border-gray-600 text-center">
                        <h3 class="text-gray-400 font-bold text-sm tracking-widest uppercase mb-4">The Secret Quotation Reveal</h3>
                        <div class="flex flex-wrap justify-center gap-3">
                            \${gameData.places.map((p, i) => \`
                                <div class="px-4 py-2 border-b-2 font-mono text-lg \${guessedPlaces[i] ? 'text-yellow-400 border-yellow-400' : 'text-gray-600 border-gray-600'}">
                                    \${guessedPlaces[i] ? p.quotationWordRavel : '?'.repeat(p.quotationWordRavel.length)}
                                </div>
                            \`).join('')}
                        </div>
                        \${guessedPlaces.every(Boolean) ? \`
                            <div class="mt-6 text-yellow-300 animate-fade-in">
                                <p class="text-2xl font-serif italic mb-2">"\${gameData.quotation}"</p>
                                <p class="text-lg font-bold">— \${gameData.quotationAuthor}</p>
                            </div>
                        \` : ''}
                    </div>
                </div>
            \`;

            app.innerHTML = html;

            // Add enter key support
            const input = document.getElementById('guessInput');
            if (input) {
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        handleGuess();
                    }
                });
            }
        }

        window.selectPlace = function(index) {
            currentPlaceIndex = index;
            window.speechSynthesis.cancel();
            isAudioPlaying = false;
            renderApp();
        };

        window.handleGuess = function() {
            const inputEl = document.getElementById('guessInput');
            if (!inputEl) return;
            const guess = inputEl.value;
            if (!guess.trim()) return;

            isChecking = true;
            renderApp();

            let count = 3;
            const fb = document.getElementById('feedbackMsg');
            if(fb) { fb.style.display = 'block'; fb.className = 'mt-3 font-bold text-center text-lg text-blue-400 animate-pulse'; }

            const interval = setInterval(() => {
                if (count > 0) {
                    if(fb) fb.innerText = \`Analyzing... \${count}\`;
                    count--;
                } else {
                    clearInterval(interval);
                    isChecking = false;
                    
                    const placeName = gameData.places[currentPlaceIndex].placeName.toLowerCase();
                    if (guess.toLowerCase().includes(placeName) || placeName.includes(guess.toLowerCase())) {
                        guessedPlaces[currentPlaceIndex] = true;
                        if(fb) {
                            fb.innerText = "CORRECT! Location Confirmed.";
                            fb.className = 'mt-3 font-bold text-center text-lg text-emerald-400';
                        }
                    } else {
                        if(fb) {
                            fb.innerText = "INCORRECT. Target not identified.";
                            fb.className = 'mt-3 font-bold text-center text-lg text-red-400';
                        }
                    }
                    renderApp(); // re-render layout
                }
            }, 600);
        };

        window.handlePlayAudio = function() {
            if (isAudioPlaying) {
                window.speechSynthesis.cancel();
                isAudioPlaying = false;
                renderApp();
                return;
            }

            isAudioPlaying = true;
            renderApp(); // update button state

            let currentLine = 0;
            const script = gameData.places[currentPlaceIndex].audioScript;
            
            function playLine() {
                if (!isAudioPlaying) return;
                if (currentLine >= script.length) {
                    isAudioPlaying = false;
                    renderApp();
                    return;
                }
                const line = script[currentLine];
                const utter = new SpeechSynthesisUtterance(line.text);
                const voices = window.speechSynthesis.getVoices();
                let matched = voices.find(v => v.name.includes(line.voice));
                if (matched) utter.voice = matched;
                
                utter.onend = () => {
                    currentLine++;
                    playLine();
                };
                window.speechSynthesis.speak(utter);
            }
            // Need a slight delay to ensure voices are loaded in some browsers
            setTimeout(playLine, 100); 
        };

        // Initialize voices and render
        window.speechSynthesis.onvoiceschanged = () => {};
        renderApp();
    </script>
</body>
</html>`;
};
