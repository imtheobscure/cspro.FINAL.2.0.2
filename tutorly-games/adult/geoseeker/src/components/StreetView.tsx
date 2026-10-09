/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { EyeOff } from 'lucide-react';

interface StreetViewProps {
  location: { lat: number; lng: number };
}

export default function StreetView({ location }: StreetViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const streetViewLibrary = useMapsLibrary('streetView');
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [hasStreetView, setHasStreetView] = useState<boolean | null>(null);

  useEffect(() => {
    if (!containerRef.current || !streetViewLibrary) return;

    const svService = new streetViewLibrary.StreetViewService();
    
    // Check for nearest panorama within 5000 meters
    svService.getPanorama({ location, radius: 5000 }, (data, status) => {
      if (status === 'OK' && data?.location?.latLng) {
        setHasStreetView(true);
        const validLocation = data.location.latLng;
        
        if (!panoramaRef.current) {
          panoramaRef.current = new streetViewLibrary.StreetViewPanorama(containerRef.current!, {
            position: validLocation,
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: false,
            showRoadLabels: false,
            linksControl: false,
            panControl: true,
            enableCloseButton: false,
            fullscreenControl: true,
            zoomControl: true,
          });
        } else {
          panoramaRef.current.setPosition(validLocation);
        }
      } else {
        setHasStreetView(false);
      }
    });
  }, [location, streetViewLibrary]);

  if (hasStreetView === false) {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
        <EyeOff className="w-8 h-8 mb-2 opacity-40 text-red-500 animate-pulse" />
        <p className="text-sm font-bold uppercase tracking-wider text-slate-350">Street View Feed Offline</p>
        <p className="text-xs text-slate-400 mt-1">Tutorly host clues will guide you safely!</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-850 shadow-inner relative">
      <div ref={containerRef} className="w-full h-full" />
      {hasStreetView === null && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
          <span className="text-[10px] text-slate-500 tracking-widest font-mono uppercase">Intertwining Coordinates...</span>
        </div>
      )}
    </div>
  );
}
