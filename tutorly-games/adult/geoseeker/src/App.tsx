/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import GameMap from './components/GameMap';
import GameSidebar from './components/GameSidebar';
import CelebratoryLeaderboard from './components/CelebratoryLeaderboard';
import { APIProvider } from '@vis.gl/react-google-maps';

function GameContent() {
  const { gameState, resetCampaign } = useGame();

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      {/* Broad, readable sidebar */}
      <div className="w-[420px] h-full flex-shrink-0 z-20 shadow-2xl shadow-slate-950 bg-slate-900 border-r border-slate-800">
        <GameSidebar />
      </div>

      {/* Main Map Area with high density space allocation */}
      <div className="flex-1 h-full relative p-2.5 bg-slate-955">
        <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-900 relative">
          <GameMap />
        </div>
      </div>

      {/* Full-Screen Celebratory Leaderboard overlay */}
      {gameState.status === 'campaign_finished' && (
        <CelebratoryLeaderboard 
          players={gameState.players} 
          onMainMenu={resetCampaign} 
        />
      )}
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const storedKey = localStorage.getItem('google_maps_api_key');
    const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (storedKey) {
      setApiKey(storedKey);
    } else if (envKey) {
      setApiKey(envKey);
    }
  }, []);

  return (
    <GameProvider>
      <APIProvider apiKey={apiKey}>
        <GameContent />
      </APIProvider>
    </GameProvider>
  );
}

