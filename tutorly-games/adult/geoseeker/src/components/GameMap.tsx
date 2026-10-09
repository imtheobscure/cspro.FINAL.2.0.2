/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Map, MapMouseEvent, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { useGame } from '../context/GameContext';
import { Target, MapPin, EyeOff, Navigation, Sparkles, Navigation2 } from 'lucide-react';
import { Player } from '../types';
import StreetView from './StreetView';

// Custom Polyline helper component to draw lines on Google Maps safely
interface PolylineProps {
  path: { lat: number; lng: number }[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
}

function Polyline({ path, strokeColor = '#3B82F6', strokeOpacity = 0.8, strokeWeight = 3 }: PolylineProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      map
    });

    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, strokeColor, strokeOpacity, strokeWeight]);

  return null;
}

interface CircleProps {
  center: { lat: number; lng: number };
  radius: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
}

function Circle({
  center,
  radius,
  strokeColor = '#F59E0B',
  strokeOpacity = 0.7,
  strokeWeight = 2,
  fillColor = '#F59E0B',
  fillOpacity = 0.1
}: CircleProps) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !center) return;

    const circle = new google.maps.Circle({
      center,
      radius,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
      clickable: false,
      map
    });

    circleRef.current = circle;

    return () => {
      circle.setMap(null);
    };
  }, [map, center, radius, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity]);

  return null;
}

export default function GameMap() {
  const { 
    gameState, 
    activeGuess, 
    setActiveGuess, 
    recordActivePlayerGuess,
    getDistanceKm
  } = useGame();

  const [mapError, setMapError] = useState<string | null>(null);
  const map = useMap();

  useEffect(() => {
    // Catch-all auth failure from Google Maps script
    (window as any).gm_authFailure = () => {
      setMapError("Google Maps API key validation failed. Please check your credentials.");
    };
    return () => {
      (window as any).gm_authFailure = undefined;
    };
  }, []);

  const currentRound = gameState.rounds[gameState.currentRoundIndex];
  const isRevealed = gameState.status === 'revealed';
  const isPlaying = gameState.status === 'playing';

  // Automatically center and zoom out when a round shifts
  useEffect(() => {
    if (map) {
      if (isRevealed && currentRound) {
        // Fit bounds to show target and all guesses
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: currentRound.lat, lng: currentRound.lng });
        
        let hasGuesses = false;
        gameState.players.forEach(p => {
          const guess = p.guesses[gameState.currentRoundIndex];
          if (guess && !guess.skipped) {
            bounds.extend({ lat: guess.lat, lng: guess.lng });
            hasGuesses = true;
          }
        });

        if (hasGuesses) {
          map.fitBounds(bounds, 80); // 80px padding
        } else {
          map.setCenter({ lat: currentRound.lat, lng: currentRound.lng });
          map.setZoom(10);
        }
      } else if (isPlaying && currentRound) {
        if (gameState.currentClueIndex === 0) {
          // First clue starting: do not zoom or center on target - keep a neutral, broad world view!
          map.setCenter({ lat: 21, lng: 9 });
          map.setZoom(3);
        } else {
          // After the first cue is skipped: focus subtly with a broader zoom and a progressive coordinate offset
          const zoomLevel = 3 + (gameState.currentClueIndex * 0.5); // Starts broad and increments slowly
          
          // Deterministic offset that narrows down as they reveal more clues
          const offsetRange = Math.max(0, 4.5 - (gameState.currentClueIndex * 0.5)); 
          const offsetLat = Math.sin(currentRound.lat * 5) * offsetRange;
          const offsetLng = Math.cos(currentRound.lng * 5) * offsetRange;
          
          map.setCenter({ 
            lat: currentRound.lat + offsetLat, 
            lng: currentRound.lng + offsetLng 
          });
          map.setZoom(zoomLevel);
        }
      } else {
        // Default center covering wider area in setup
        map.setCenter({ lat: 21, lng: 9 });
        map.setZoom(3);
      }
    }
  }, [map, gameState.currentRoundIndex, isRevealed, currentRound, isPlaying, gameState.currentClueIndex]);

  const handleMapClick = (e: MapMouseEvent) => {
    if (!isPlaying) return;
    if (gameState.activePlayerIndexForGuess === null) return;
    if (!e.detail.latLng) return;

    const latLng = e.detail.latLng as any;
    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

    setActiveGuess({ lat, lng });
  };

  if (mapError) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 p-8 text-white">
        <div className="bg-slate-950 p-7 rounded-2xl max-w-sm text-center border border-red-500 shadow-xl">
          <EyeOff className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold mb-2">Google Maps API Error</h2>
          <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
            The provided Google Maps API key could not be authenticated, or the 'Maps JavaScript API' is not enabled.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
          >
            Refresh View
          </button>
        </div>
      </div>
    );
  }

  // Active student playing indicators
  const currentActivePlayer = gameState.activePlayerIndexForGuess !== null 
    ? gameState.players[gameState.activePlayerIndexForGuess] 
    : null;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950">
      
      {/* 3D Street View Top half - Always visible during play and reveal */}
      {(isPlaying || isRevealed) && currentRound && (
        <div className="h-[50%] border-b border-slate-800 w-full relative bg-slate-900 flex flex-col z-10 transition-all duration-300 shadow-2xl">
          {/* Header toolbar */}
          <div className="bg-slate-950/80 backdrop-blur-md text-slate-300 px-4 py-2 text-[10px] uppercase font-bold tracking-widest border-b border-slate-850 flex items-center justify-between shrink-0 absolute top-0 w-full z-20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              {isRevealed ? `3D Street View Panorama: ${currentRound.name}` : '3D Mystery Clue: Look around & guess!'}
            </div>
            {isPlaying && (
              <div className="text-sky-400 animate-pulse hidden md:block">
                Drag the image to explore the surroundings
              </div>
            )}
          </div>
          
          <div className="flex-1 w-full bg-slate-950">
            {/* The active Street view loader */}
            <StreetView location={{ lat: currentRound.lat, lng: currentRound.lng }} />
          </div>
        </div>
      )}

      {/* Map portion */}
      <div className={`relative w-full transition-all duration-500 bg-slate-800 ${((isPlaying || isRevealed) && currentRound) ? 'h-[50%]' : 'h-full'}`}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={{ lat: 20, lng: 0 }}
          defaultZoom={2}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
          onClick={handleMapClick}
          mapId="DEMO_MAP_ID" // Uses Google's globally whitelisted testing map ID to support Advanced Markers and avoid ApiProjectMapError
        >
          {/* Radar search zone hint circle removed to make game more challenging */}

          {/* 1. Temporary Active Student Guess Marker */}
          {activeGuess && isPlaying && (
            <AdvancedMarker position={activeGuess}>
              <div className="relative flex flex-col items-center">
                <div className="px-2 py-1 bg-sky-600 text-white font-extrabold text-[10px] rounded shadow-lg shadow-sky-500/20 whitespace-nowrap mb-1 font-sans border border-sky-400">
                  📍 {currentActivePlayer ? `${currentActivePlayer.name}'s Pin` : 'Selected Pin'}
                </div>
                <Pin background={'#0284C7'} borderColor={'#0369A1'} glyphColor={'white'} scale={1.1} />
              </div>
            </AdvancedMarker>
          )}

          {/* 2. Revealed phase: Show Target Location */}
          {isRevealed && currentRound && (
            <AdvancedMarker position={{ lat: currentRound.lat, lng: currentRound.lng }}>
              <div className="relative flex flex-col items-center select-none animate-bounce">
                <div className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-full shadow-lg whitespace-nowrap mb-1 border border-emerald-400">
                  🎯 Hiding Spot Revealed!
                </div>
                <Pin background={'#10B981'} borderColor={'#064E3B'} glyphColor={'white'} scale={1.3}>
                  <Target className="text-white w-4 h-4" />
                </Pin>
              </div>
            </AdvancedMarker>
          )}

          {/* 3. Revealed phase: Show all registered students' guesses and connecting lines */}
          {isRevealed && currentRound && gameState.players.map((p, idx) => {
            const guess = p.guesses[gameState.currentRoundIndex];
            if (!guess || guess.skipped) return null;

            // Generate bright random colors for each student marker line
            const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981'];
            const strokeColor = colors[idx % colors.length];

            return (
              <React.Fragment key={p.id}>
                {/* Visual Line from Guess to target */}
                <Polyline 
                  path={[
                    { lat: guess.lat, lng: guess.lng },
                    { lat: currentRound.lat, lng: currentRound.lng }
                  ]}
                  strokeColor={strokeColor}
                  strokeWeight={idx === 0 ? 4 : 3}
                  strokeOpacity={0.9}
                />

                {/* Guess Pin with label info */}
                <AdvancedMarker position={{ lat: guess.lat, lng: guess.lng }}>
                  <div className="relative flex flex-col items-center group">
                    <div 
                      className="px-2 py-1 text-white font-black text-[10px] rounded shadow-md whitespace-nowrap mb-1 border border-slate-700 font-sans"
                      style={{ backgroundColor: strokeColor }}
                    >
                      👤 {p.name}: {Math.round(guess.distance).toLocaleString()} km
                    </div>
                    <Pin background={strokeColor} borderColor={'#1E293B'} glyphColor={'white'} scale={0.9} />
                  </div>
                </AdvancedMarker>
              </React.Fragment>
            );
          })}
        </Map>

        {/* Floating Controls Overlay for Screen-Share Ease */}
        {isPlaying && currentActivePlayer && activeGuess && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <img src={currentActivePlayer.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-slate-705 bg-slate-900" />
              <div className="text-sm">
                <p className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">Confirming Action</p>
                <p className="text-slate-100 font-black">{currentActivePlayer.name}'s Pin Selected</p>
              </div>
            </div>
            <button
              onClick={() => {
                recordActivePlayerGuess(false);
              }}
              className="bg-sky-600 hover:bg-sky-500 text-white font-extrabold py-3 px-6 rounded-xl transition text-sm shadow-lg shadow-sky-600/20 active:scale-95 flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              Lock Guess
            </button>
          </div>
        )}

        {/* Informative Guidance line */}
        {isPlaying && currentActivePlayer && !activeGuess && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sky-950/90 backdrop-blur border border-sky-900/60 text-sky-200 px-4 py-2 rounded-full text-xs font-semibold shadow-lg text-center animate-pulse pointer-events-none flex items-center gap-2">
            <img src={currentActivePlayer.avatar} alt="avatar" className="w-5 h-5 rounded-full border border-sky-700 bg-slate-900" />
            <span>👈 Teacher, click on the map to place <span className="font-black text-white">{currentActivePlayer.name}</span>'s guess.</span>
          </div>
        )}
      </div>

    </div>
  );
}
