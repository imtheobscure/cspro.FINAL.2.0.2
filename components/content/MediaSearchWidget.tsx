import React, { useState } from 'react';
import Button from '../ui/Button';

interface MediaSearchWidgetProps {
  type: string;
  onUpdate: (data: any) => void;
}

const MOCK_SOUNDS = [
  { id: 'city', name: 'Busy City Street', url: 'https://cdn.freesound.org/previews/339/339324_5121236-lq.mp3' },
  { id: 'cafe', name: 'Coffee Shop Chatter', url: 'https://cdn.freesound.org/previews/236/236113_2339665-lq.mp3' },
  { id: 'nature', name: 'Peaceful Nature / Birds', url: 'https://cdn.freesound.org/previews/515/515291_6424915-lq.mp3' },
  { id: 'office', name: 'Office Environment', url: 'https://cdn.freesound.org/previews/200/200778_3311899-lq.mp3' },
  { id: 'rain', name: 'Heavy Rain', url: 'https://cdn.freesound.org/previews/201/201208_3158097-lq.mp3' },
];

export default function MediaSearchWidget({ type, onUpdate }: MediaSearchWidgetProps) {
  const [keyword, setKeyword] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sounds, setSounds] = useState(MOCK_SOUNDS);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!keyword) return;
    setIsSearching(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 600));
    
    // Generate some picsum images based on keyword hash to make it look real
    const newImages = Array.from({ length: 4 }).map((_, i) => 
      `https://picsum.photos/seed/${encodeURIComponent(keyword)}${i}/400/300`
    );
    setImages(newImages);

    // Filter sounds or just show all for demo
    const filteredSounds = MOCK_SOUNDS.filter(s => 
      s.name.toLowerCase().includes(keyword.toLowerCase()) || 
      keyword.toLowerCase().includes(s.name.split(' ')[0].toLowerCase())
    );
    setSounds(filteredSounds.length > 0 ? filteredSounds : MOCK_SOUNDS);
    
    setIsSearching(false);
  };

  const handleSelectImage = (img: string) => {
    setSelectedImage(img);
    onUpdate({ image: img, sound: selectedSound });
  };

  const handleSelectSound = (soundUrl: string) => {
    setSelectedSound(soundUrl);
    if (playingAudio) {
      playingAudio.pause();
    }
    const audio = new Audio(soundUrl);
    audio.play();
    setPlayingAudio(audio);
    onUpdate({ image: selectedImage, sound: soundUrl });
  };

  const handleStopSound = () => {
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
    }
  };

  return (
    <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
      <h4 className="text-sm font-bold text-gray-700 mb-2">
        <i className="fas fa-search mr-2"></i> 
        Media Integrator (Images & Ambient Sounds)
      </h4>
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search places, food, street views..."
          className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={handleSearch} disabled={isSearching} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {images.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Select Image (Stock / Google Maps)</p>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, idx) => (
              <div 
                key={idx} 
                className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-blue-600 shadow-md transform scale-[1.02]' : 'border-transparent hover:border-blue-300'}`}
                onClick={() => handleSelectImage(img)}
              >
                {selectedImage === img && <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10"><i className="fas fa-check"></i></div>}
                <img src={img} alt="Search result" className="w-full h-24 object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {sounds.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex justify-between items-center">
            <span>Ambient Sounds</span>
            {playingAudio && (
              <button onClick={handleStopSound} className="text-red-500 hover:text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
                <i className="fas fa-stop-circle"></i> Stop
              </button>
            )}
          </p>
          <div className="flex flex-col gap-1">
            {sounds.map(sound => (
              <div 
                key={sound.id}
                onClick={() => handleSelectSound(sound.url)}
                className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer border ${selectedSound === sound.url ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold' : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'}`}
              >
                <span>{sound.name}</span>
                {selectedSound === sound.url ? (
                  <i className="fas fa-volume-up opacity-70 animate-pulse"></i>
                ) : (
                  <i className="fas fa-play opacity-50"></i>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
