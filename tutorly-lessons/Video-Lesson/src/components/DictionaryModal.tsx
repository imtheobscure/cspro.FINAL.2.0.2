import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { speak } from '../utils/tts';
import type { DictionaryResult } from '../types';

export const DictionaryModal: React.FC = () => {
  const { showDictionary, setShowDictionary, dictionaryWord } = useStore();
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showDictionary || !dictionaryWord) return;
    setResult(null);
    setError('');
    setLoading(true);
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(dictionaryWord.toLowerCase())}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const d = data[0];
          setResult({
            word: d.word,
            phonetic: d.phonetic ?? d.phonetics?.[0]?.text,
            meanings: (d.meanings ?? []).slice(0, 3).map((m: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }) => ({
              partOfSpeech: m.partOfSpeech,
              definitions: (m.definitions ?? []).slice(0, 2).map((def: { definition: string; example?: string }) => ({
                definition: def.definition,
                example: def.example,
              })),
            })),
          });
        } else {
          setError('No definition found for "' + dictionaryWord + '"');
        }
      })
      .catch(() => setError('Could not connect to dictionary. Check your connection.'))
      .finally(() => setLoading(false));
  }, [showDictionary, dictionaryWord]);

  const ccq = result
    ? `Can you use the word "${result.word}" in a sentence about your daily life?`
    : '';

  return (
    <AnimatePresence>
      {showDictionary && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowDictionary(false)}
        >
          <motion.div
            className="bg-gray-950 border border-teal-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl"
            style={{ boxShadow: '0 0 40px rgba(20,184,166,0.2)' }}
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 150 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-black text-teal-400">📖 {dictionaryWord}</h3>
                {result?.phonetic && (
                  <p className="text-gray-400 text-sm">{result.phonetic}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => speak(dictionaryWord, null, 0.85)}
                  className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-xl hover:bg-teal-500/30 transition-colors"
                  title="Listen"
                >
                  🔊
                </button>
                <button
                  onClick={() => setShowDictionary(false)}
                  className="w-10 h-10 rounded-xl bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            {loading && (
              <div className="flex items-center gap-3 py-8">
                <motion.div
                  className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-gray-400">Looking up definition...</span>
              </div>
            )}

            {error && (
              <div className="py-4 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {result.meanings.map((meaning, i) => (
                  <div key={i} className="bg-gray-900 rounded-2xl p-4">
                    <span className="text-xs font-black uppercase tracking-widest text-teal-400 bg-teal-500/10 px-2 py-1 rounded-lg">
                      {meaning.partOfSpeech}
                    </span>
                    {meaning.definitions.map((def, j) => (
                      <div key={j} className="mt-3">
                        <p className="text-white text-sm leading-relaxed">
                          <span className="text-teal-400 font-bold">{j + 1}.</span> {def.definition}
                        </p>
                        {def.example && (
                          <div className="flex items-start gap-2 mt-2 bg-black/30 rounded-xl p-2">
                            <span className="text-gray-500 text-xs">e.g.</span>
                            <p className="text-gray-300 text-xs italic flex-1">"{def.example}"</p>
                            <button
                              onClick={() => speak(def.example!, null, 0.85)}
                              className="text-gray-500 hover:text-teal-400 text-xs ml-1 flex-shrink-0"
                            >
                              🔊
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* CCQ */}
            {result && (
              <motion.div
                className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h4 className="text-purple-400 font-bold text-sm mb-2">💬 Concept Check (CCQ)</h4>
                <p className="text-gray-300 text-sm">{ccq}</p>
                <button
                  onClick={() => speak(ccq, null, 0.9)}
                  className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  🔊 Hear the question
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
