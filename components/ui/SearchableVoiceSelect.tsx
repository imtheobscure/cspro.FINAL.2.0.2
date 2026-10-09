import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_APP_CHARACTERS, getCharacterAvatar, isCompanionVoiceCode, DEFAULT_READ_ALOUD_VOICE } from '../../utils/characters';
import { groupVoicesForSelect, buildVoiceAvatarDataUri } from '../../utils/voiceGroups';
import { AppCharacter } from '../../types';

export { DEFAULT_READ_ALOUD_VOICE };

interface Props {
  value: string;
  onChange: (val: string) => void;
  showCharactersBar?: boolean;
  /** Hides the custom character voice profiles — shows only natural system voices (Microsoft Azure). */
  hideCharacters?: boolean;
  /**
   * Shows the Classmate companion profiles (Alexander Wright, Maya Lin…) in the dropdown.
   * Companion profiles belong to Classmate lessons ONLY — Conversation Maker, Audio Lab,
   * Study Guide and every other tool pick a real speech voice instead. Off by default.
   */
  allowCharacterVoices?: boolean;
  /** Global Read Aloud Voice shown/labelled when the stored value is empty or a legacy companion profile. */
  defaultVoice?: string;
}

export const SearchableVoiceSelect: React.FC<Props> = ({ value, onChange, showCharactersBar = false, hideCharacters = false, allowCharacterVoices = false, defaultVoice }) => {
  // Companion profiles are strictly opt-in: a leftover Classmate choice can therefore never
  // appear (or be picked) inside Conversation Maker, Audio Lab, Study Guide, place game, etc.
  const showCompanions = allowCharacterVoices && !hideCharacters;
  const characters = useAppStore(state => state.characters) || DEFAULT_APP_CHARACTERS;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autoSetRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Auto-select the natural Microsoft Ava Multilingual voice by default when
  // voices become available and no voice has been chosen yet.
  useEffect(() => {
    if (!value && !autoSetRef.current && voices.length > 0) {
      // The global Read Aloud Voice wins when it is available on this machine.
      const preferred = defaultVoice
        ? voices.find(v => v.voiceURI === defaultVoice || v.name === defaultVoice || v.name.toLowerCase().includes(defaultVoice.toLowerCase()))
        : undefined;
      const ava = preferred ||
                  voices.find(v => v.name.toLowerCase().includes('microsoft ava')) ||
                  voices.find(v => v.name.toLowerCase().includes('microsoft emma')) ||
                  voices.find(v => v.name.toLowerCase().includes('natural') && !v.name.toLowerCase().includes('david'));
      if (ava) {
        autoSetRef.current = true;
        onChange(ava.voiceURI);
      }
    }
  }, [value, onChange, voices, defaultVoice]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Grouped & ordered natural voices: British (red) first, then US/AU/CA/IE/NZ..., then others.
  const groupedVoices = useMemo(() => groupVoicesForSelect(voices), [voices]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groupedVoices;
    return groupedVoices
      .map(g => ({
        ...g,
        options: g.options.filter(o =>
          o.label.toLowerCase().includes(q) ||
          o.voice.name.toLowerCase().includes(q) ||
          o.voice.lang.toLowerCase().includes(q) ||
          o.shortLabel.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.options.length > 0);
  }, [groupedVoices, search]);

  const filteredCharacters = characters.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.voice && c.voice.toLowerCase().includes(search.toLowerCase()))
  );

  // Match if current value matches character code or voice (Classmate companions only)
  const activeChar = showCompanions
    ? characters.find(c => c.code.toLowerCase() === value?.toLowerCase() || c.voice?.toLowerCase() === value?.toLowerCase() || c.name?.toLowerCase() === value?.toLowerCase())
    : undefined;
  const selectedVoice = voices.find(v => v.voiceURI === value) || 
                        (activeChar?.voice ? voices.find(v => v.voiceURI === activeChar.voice || v.name.toLowerCase().includes(activeChar.voice.toLowerCase())) : undefined) ||
                        (value ? voices.find(v => v.name.toLowerCase().includes(value.toLowerCase())) : undefined);

  // A legacy companion profile saved as a "voice" is never shown as if it were a voice.
  const legacyCompanionValue = !showCompanions && isCompanionVoiceCode(value);
  const fallbackLabel = defaultVoice || DEFAULT_READ_ALOUD_VOICE;
  const displayName = activeChar
    ? `🎭 [${activeChar.code}] ${activeChar.name} (${activeChar.voice || 'Voice'})`
    : selectedVoice
      ? `${selectedVoice.name} (${selectedVoice.lang})`
      : legacyCompanionValue
        ? fallbackLabel
        : (value || fallbackLabel);

  return (
    <div ref={wrapperRef} className="relative w-full space-y-1.5">
      {showCharactersBar && showCompanions && characters && characters.length > 0 && (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
            <span>Choose Character Voice Profile:</span>
            {activeChar && <span className="text-amber-600 font-bold">Selected: {activeChar.name}</span>}
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
            {characters.map(char => {
              const isSelected = activeChar?.code === char.code || value?.toLowerCase() === char.code.toLowerCase() || (char.voice && value === char.voice);
              const avatar = getCharacterAvatar(char);
              return (
                <button
                  key={char.id || char.code}
                  type="button"
                  onClick={() => {
                    onChange(char.code || char.voice);
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition shrink-0 cursor-pointer ${
                    isSelected 
                      ? 'bg-amber-100 border-amber-500 text-amber-900 shadow-sm ring-2 ring-amber-400/50' 
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  title={`${char.name} (${char.code}) - ${char.voice}`}
                >
                  <img src={avatar} alt={char.name} className="w-5 h-5 rounded-full object-cover border border-amber-400" />
                  <span className="font-bold text-[11px]">{char.name}</span>
                  <span className="text-[9px] font-mono bg-black/5 px-1 rounded text-gray-600 font-semibold">{char.code}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div 
        className="w-full p-2 border border-gray-300 rounded-md bg-white text-black cursor-pointer flex justify-between items-center shadow-xs"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate text-xs font-medium">{displayName}</span>
        <i className="fas fa-chevron-down text-gray-500 text-xs ml-2"></i>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-64 flex flex-col">
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <input 
              type="text" 
              className="w-full p-1.5 border border-gray-300 rounded text-xs outline-none bg-white text-black" 
              placeholder="Search voices or characters..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto">
            {showCompanions && filteredCharacters.length > 0 && (
              <div className="p-1.5 bg-amber-50/70 border-b border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 px-1 mb-1 uppercase">Custom Character Voices</div>
                <div className="grid grid-cols-1 gap-1">
                  {filteredCharacters.map(c => (
                    <div 
                      key={c.code} 
                      className="flex items-center justify-between p-1.5 hover:bg-amber-100 rounded cursor-pointer text-xs"
                      onClick={() => { onChange(c.code); setIsOpen(false); }}
                    >
                      <div className="flex items-center gap-2">
                        <img src={getCharacterAvatar(c)} alt={c.name} className="w-5 h-5 rounded-full object-cover border border-amber-400" />
                        <span className="font-bold text-gray-800">{c.name}</span>
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-200/60 px-1 rounded">{c.code}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{c.voice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div 
              className="p-2 hover:bg-gray-100 cursor-pointer text-xs text-black font-medium border-b border-gray-100"
              onClick={() => { 
                const preferred = defaultVoice
                  ? voices.find(v => v.voiceURI === defaultVoice || v.name === defaultVoice || v.name.toLowerCase().includes(defaultVoice.toLowerCase()))
                  : undefined;
                const ava = preferred || voices.find(v => v.name.toLowerCase().includes('microsoft ava'));
                onChange(ava ? ava.voiceURI : DEFAULT_READ_ALOUD_VOICE);
                setIsOpen(false); 
              }}
            >
              ⭐ {fallbackLabel} (read-aloud default)
            </div>
            {filteredGroups.map(group => (
              <div key={group.key}>
                {/* Accent group header — British is highlighted red */}
                <div 
                  className="sticky top-0 z-10 px-2 py-1 text-[10px] font-black uppercase tracking-wider border-b border-gray-100"
                  style={{ 
                    color: group.color,
                    backgroundColor: group.isBritish ? '#fef2f2' : '#f9fafb',
                  }}
                >
                  {group.flag} {group.label}
                  {group.isBritish && <span className="ml-1 normal-case font-bold">• British voices (red)</span>}
                  {group.gender === 'female' && <span className="ml-1 normal-case">♀</span>}
                  {group.gender === 'male' && <span className="ml-1 normal-case">♂</span>}
                </div>
                {group.options.map(v => (
                  <div 
                    key={v.value}
                    className="p-1.5 hover:bg-gray-100 cursor-pointer text-xs border-b border-gray-50 flex items-center gap-2"
                    onClick={() => { onChange(v.value); setIsOpen(false); }}
                  >
                    <img 
                      src={buildVoiceAvatarDataUri(v.voice)} 
                      alt="" 
                      className="w-5 h-5 rounded-full shrink-0 border border-gray-200"
                      loading="lazy"
                    />
                    <span 
                      className="truncate font-medium"
                      style={{ color: v.color || '#111827' }}
                    >
                      {v.label}
                    </span>
                    <span className="text-gray-400 text-[10px] ml-auto shrink-0">{v.voice.lang}</span>
                  </div>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (!showCompanions || filteredCharacters.length === 0) && (
              <div className="p-2 text-gray-500 text-xs text-center">No matching voices found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};