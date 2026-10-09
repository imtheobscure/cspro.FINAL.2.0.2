// ============================================================
// WORLD TIME ZONES & GLOBAL CLASSROOM MAP
// Precise Geographic Placement on /world_map.svg (950x620)
// Live real-time clock, learner integration, time scrubber & day/night indicator.
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLearnerStore } from '../../store/useLearnerStore';
import { CourseLevel } from '../../types2';

export interface WorldMapCity {
  id: string;
  name: string;
  country?: string;
  tz: string;
  top: string;
  left: string;
  lat?: number;
  lng?: number;
  offset?: number;
  isLearner?: boolean;
  learnerType?: 'adult' | 'kid';
  learnerAvatar?: string;
}

export interface CityCoordRef {
  name: string;
  country: string;
  tz: string;
  top: string;
  left: string;
  lat: number;
  lng: number;
}

// ------------------------------------------------------------
// Precise Coordinates Calibrated Exactly to /world_map.svg (950x620)
// ------------------------------------------------------------
export const WORLD_CITIES_DATABASE: CityCoordRef[] = [
  // North America
  { name: 'New York', country: 'United States', tz: 'America/New_York', top: '31.0%', left: '29.1%', lat: 40.71, lng: -74.01 },
  { name: 'Los Angeles', country: 'United States', tz: 'America/Los_Angeles', top: '35.2%', left: '14.8%', lat: 34.05, lng: -118.24 },
  { name: 'San Francisco', country: 'United States', tz: 'America/Los_Angeles', top: '32.6%', left: '14.3%', lat: 37.77, lng: -122.42 },
  { name: 'Chicago', country: 'United States', tz: 'America/Chicago', top: '30.3%', left: '24.2%', lat: 41.88, lng: -87.63 },
  { name: 'Miami', country: 'United States', tz: 'America/New_York', top: '40.0%', left: '27.9%', lat: 25.76, lng: -80.19 },
  { name: 'Houston', country: 'United States', tz: 'America/Chicago', top: '38.4%', left: '21.9%', lat: 29.76, lng: -95.37 },
  { name: 'Seattle', country: 'United States', tz: 'America/Los_Angeles', top: '25.8%', left: '14.5%', lat: 47.61, lng: -122.33 },
  { name: 'Toronto', country: 'Canada', tz: 'America/Toronto', top: '29.0%', left: '27.8%', lat: 43.65, lng: -79.38 },
  { name: 'Vancouver', country: 'Canada', tz: 'America/Vancouver', top: '24.5%', left: '14.7%', lat: 49.28, lng: -123.12 },
  { name: 'Montreal', country: 'Canada', tz: 'America/Toronto', top: '27.7%', left: '29.3%', lat: 45.50, lng: -73.57 },
  { name: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City', top: '43.5%', left: '20.0%', lat: 19.43, lng: -99.13 },
  { name: 'Honolulu', country: 'United States (Hawaii)', tz: 'Pacific/Honolulu', top: '44.4%', left: '6.3%', lat: 21.31, lng: -157.86 },

  // South America
  { name: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo', top: '69.0%', left: '34.5%', lat: -23.55, lng: -46.63 },
  { name: 'Rio de Janeiro', country: 'Brazil', tz: 'America/Sao_Paulo', top: '68.4%', left: '35.6%', lat: -22.91, lng: -43.17 },
  { name: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires', top: '71.0%', left: '31.6%', lat: -34.60, lng: -58.38 },
  { name: 'Santiago', country: 'Chile', tz: 'America/Santiago', top: '71.8%', left: '28.9%', lat: -33.45, lng: -70.67 },
  { name: 'Bogotá', country: 'Colombia', tz: 'America/Bogota', top: '50.8%', left: '25.8%', lat: 4.71, lng: -74.07 },
  { name: 'Lima', country: 'Peru', tz: 'America/Lima', top: '58.9%', left: '24.2%', lat: -12.05, lng: -77.04 },

  // Europe & UK
  { name: 'London', country: 'United Kingdom', tz: 'Europe/London', top: '26.8%', left: '47.1%', lat: 51.51, lng: -0.13 },
  { name: 'Dublin', country: 'Ireland', tz: 'Europe/Dublin', top: '27.1%', left: '45.8%', lat: 53.35, lng: -6.26 },
  { name: 'Paris', country: 'France', tz: 'Europe/Paris', top: '29.4%', left: '48.6%', lat: 48.86, lng: 2.35 },
  { name: 'Madrid', country: 'Spain', tz: 'Europe/Madrid', top: '33.9%', left: '46.5%', lat: 40.42, lng: -3.70 },
  { name: 'Lisbon', country: 'Portugal', tz: 'Europe/Lisbon', top: '34.8%', left: '45.4%', lat: 38.72, lng: -9.14 },
  { name: 'Berlin', country: 'Germany', tz: 'Europe/Berlin', top: '27.7%', left: '51.1%', lat: 52.52, lng: 13.40 },
  { name: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam', top: '27.4%', left: '49.3%', lat: 52.37, lng: 4.89 },
  { name: 'Rome', country: 'Italy', tz: 'Europe/Rome', top: '33.1%', left: '51.1%', lat: 41.90, lng: 12.50 },
  { name: 'Stockholm', country: 'Sweden', tz: 'Europe/Stockholm', top: '20.3%', left: '52.2%', lat: 59.33, lng: 18.07 },
  { name: 'Warsaw', country: 'Poland', tz: 'Europe/Warsaw', top: '28.2%', left: '53.3%', lat: 52.23, lng: 21.01 },
  { name: 'Kyiv', country: 'Ukraine', tz: 'Europe/Kyiv', top: '28.7%', left: '55.6%', lat: 50.45, lng: 30.52 },
  { name: 'Moscow', country: 'Russia', tz: 'Europe/Moscow', top: '25.5%', left: '56.8%', lat: 55.75, lng: 37.62 },
  { name: 'Athens', country: 'Greece', tz: 'Europe/Athens', top: '35.8%', left: '53.9%', lat: 37.98, lng: 23.73 },
  { name: 'Istanbul', country: 'Turkey', tz: 'Europe/Istanbul', top: '33.9%', left: '55.4%', lat: 41.01, lng: 28.98 },

  // Middle East & Africa
  { name: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo', top: '39.7%', left: '56.1%', lat: 30.04, lng: 31.24 },
  { name: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai', top: '42.7%', left: '62.9%', lat: 25.20, lng: 55.27 },
  { name: 'Riyadh', country: 'Saudi Arabia', tz: 'Asia/Riyadh', top: '43.2%', left: '60.8%', lat: 24.71, lng: 46.68 },
  { name: 'Doha', country: 'Qatar', tz: 'Asia/Qatar', top: '42.1%', left: '62.3%', lat: 25.29, lng: 51.53 },
  { name: 'Casablanca', country: 'Morocco', tz: 'Africa/Casablanca', top: '38.1%', left: '45.8%', lat: 33.57, lng: -7.59 },
  { name: 'Lagos', country: 'Nigeria', tz: 'Africa/Lagos', top: '51.6%', left: '49.1%', lat: 6.52, lng: 3.38 },
  { name: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi', top: '54.5%', left: '58.5%', lat: -1.29, lng: 36.82 },
  { name: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg', top: '67.4%', left: '55.3%', lat: -26.20, lng: 28.05 },
  { name: 'Cape Town', country: 'South Africa', tz: 'Africa/Johannesburg', top: '72.3%', left: '52.8%', lat: -33.92, lng: 18.42 },

  // Asia
  { name: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo', top: '33.1%', left: '86.1%', lat: 35.68, lng: 139.69 },
  { name: 'Beijing', country: 'China', tz: 'Asia/Shanghai', top: '30.6%', left: '80.0%', lat: 39.90, lng: 116.40 },
  { name: 'Shanghai', country: 'China', tz: 'Asia/Shanghai', top: '37.1%', left: '82.1%', lat: 31.23, lng: 121.47 },
  { name: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong', top: '42.7%', left: '79.6%', lat: 22.32, lng: 114.17 },
  { name: 'Taipei', country: 'Taiwan', tz: 'Asia/Taipei', top: '40.3%', left: '82.8%', lat: 25.03, lng: 121.57 },
  { name: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul', top: '32.3%', left: '83.0%', lat: 37.57, lng: 126.98 },
  { name: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore', top: '52.9%', left: '78.3%', lat: 1.35, lng: 103.82 },
  { name: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok', top: '45.5%', left: '77.4%', lat: 13.76, lng: 100.50 },
  { name: 'Mumbai', country: 'India', tz: 'Asia/Kolkata', top: '45.2%', left: '68.2%', lat: 19.08, lng: 72.88 },
  { name: 'New Delhi', country: 'India', tz: 'Asia/Kolkata', top: '40.0%', left: '69.3%', lat: 28.61, lng: 77.21 },
  { name: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta', top: '55.6%', left: '79.2%', lat: -6.21, lng: 106.85 },
  { name: 'Manila', country: 'Philippines', tz: 'Asia/Manila', top: '45.2%', left: '83.6%', lat: 14.60, lng: 120.98 },
  { name: 'Kuala Lumpur', country: 'Malaysia', tz: 'Asia/Kuala_Lumpur', top: '51.9%', left: '77.7%', lat: 3.14, lng: 101.69 },
  { name: 'Hanoi', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', top: '42.7%', left: '78.4%', lat: 21.03, lng: 105.83 },

  // Oceania
  { name: 'Sydney', country: 'Australia', tz: 'Australia/Sydney', top: '74.5%', left: '88.0%', lat: -33.87, lng: 151.21 },
  { name: 'Melbourne', country: 'Australia', tz: 'Australia/Melbourne', top: '77.1%', left: '86.7%', lat: -37.81, lng: 144.96 },
  { name: 'Perth', country: 'Australia', tz: 'Australia/Perth', top: '73.9%', left: '80.5%', lat: -31.95, lng: 115.86 },
  { name: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland', top: '79.0%', left: '96.6%', lat: -36.85, lng: 174.76 },
];

export function latLngToMapPercent(lat: number, lng: number): { top: string; left: string } {
  // Longitude mapping calibrated to Prime Meridian (0°) at 47.1% on world_map.svg
  const clampedLng = Math.max(-180, Math.min(180, lng));
  let leftPct: number;
  if (clampedLng < 0) {
    leftPct = 47.1 + (clampedLng / 180) * 44.5;
  } else {
    leftPct = 47.1 + (clampedLng / 180) * 51.5;
  }

  // Latitude mapping calibrated to Equator (0°) at 54.0% on world_map.svg
  const clampedLat = Math.max(-85, Math.min(85, lat));
  let topPct: number;
  if (clampedLat >= 0) {
    topPct = 54.0 - (clampedLat / 90) * 51.0;
  } else {
    topPct = 54.0 + (Math.abs(clampedLat) / 90) * 54.0;
  }

  return {
    left: `${Math.max(2, Math.min(98, leftPct)).toFixed(1)}%`,
    top: `${Math.max(4, Math.min(96, topPct)).toFixed(1)}%`
  };
}

export function mapPercentToLatLng(topPct: number, leftPct: number): { lat: number; lng: number } {
  let lng: number;
  if (leftPct < 47.1) {
    lng = ((leftPct - 47.1) / 44.5) * 180;
  } else {
    lng = ((leftPct - 47.1) / 51.5) * 180;
  }

  let lat: number;
  if (topPct <= 54.0) {
    lat = ((54.0 - topPct) / 51.0) * 90;
  } else {
    lat = -(((topPct - 54.0) / 54.0) * 90);
  }

  return {
    lat: Math.max(-85, Math.min(85, lat)),
    lng: Math.max(-180, Math.min(180, lng))
  };
}

export function guessTimezoneFromCoordinates(topPct: number, leftPct: number): string {
  const { lng, lat } = mapPercentToLatLng(topPct, leftPct);
  // Find nearest known city in database
  let closest = WORLD_CITIES_DATABASE[0];
  let minDiff = Infinity;
  WORLD_CITIES_DATABASE.forEach((c) => {
    const dLng = c.lng - lng;
    const dLat = c.lat - lat;
    const dist = dLng * dLng + dLat * dLat;
    if (dist < minDiff) {
      minDiff = dist;
      closest = c;
    }
  });
  return closest ? closest.tz : 'UTC';
}

export const DEFAULT_MAP_CITIES: WorldMapCity[] = [
  { id: '1', name: 'New York', country: 'United States', tz: 'America/New_York', top: '31.0%', left: '29.1%' },
  { id: '2', name: 'London', country: 'United Kingdom', tz: 'Europe/London', top: '26.8%', left: '47.1%' },
  { id: '3', name: 'Paris', country: 'France', tz: 'Europe/Paris', top: '29.4%', left: '48.6%' },
  { id: '4', name: 'Moscow', country: 'Russia', tz: 'Europe/Moscow', top: '25.5%', left: '56.8%' },
  { id: '5', name: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai', top: '42.7%', left: '62.9%' },
  { id: '6', name: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo', top: '33.1%', left: '86.1%' },
  { id: '7', name: 'Sydney', country: 'Australia', tz: 'Australia/Sydney', top: '74.5%', left: '88.0%' },
  { id: '8', name: 'Rio de Janeiro', country: 'Brazil', tz: 'America/Sao_Paulo', top: '68.4%', left: '35.6%' },
  { id: '9', name: 'Los Angeles', country: 'United States', tz: 'America/Los_Angeles', top: '35.2%', left: '14.8%' },
  { id: '10', name: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg', top: '67.4%', left: '55.3%' },
  { id: '11', name: 'Mumbai', country: 'India', tz: 'Asia/Kolkata', top: '45.2%', left: '68.2%' },
  { id: '12', name: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore', top: '52.9%', left: '78.3%' },
  { id: '13', name: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo', top: '39.7%', left: '56.1%' },
  { id: '14', name: 'Toronto', country: 'Canada', tz: 'America/Toronto', top: '29.0%', left: '27.8%' },
  { id: '15', name: 'Berlin', country: 'Germany', tz: 'Europe/Berlin', top: '27.7%', left: '51.1%' },
  { id: '16', name: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul', top: '32.3%', left: '83.0%' },
  { id: '17', name: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong', top: '42.7%', left: '79.6%' },
  { id: '18', name: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok', top: '45.5%', left: '77.4%' },
  { id: '19', name: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires', top: '71.0%', left: '31.6%' },
  { id: '20', name: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland', top: '79.0%', left: '96.6%' },
];

interface WorldTimeZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapCities: WorldMapCity[];
  onUpdateCities: (cities: WorldMapCity[]) => void;
}

export const WorldTimeZonesModal: React.FC<WorldTimeZonesModalProps> = ({
  isOpen,
  onClose,
  mapCities = [],
  onUpdateCities,
}) => {
  const { learners } = useLearnerStore();

  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const [editingCity, setEditingCity] = useState<WorldMapCity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'learners' | 'cities'>('all');
  const [showGrid, setShowGrid] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'converter'>('map');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const containerRef = useRef<HTMLDivElement>(null);

  // Base reference timezone (Tehran UTC+03:30) used as the default base for calculations
  const BASE_REFERENCE_TZ = 'Asia/Tehran';

  // Live time in the base reference timezone
  const baseReferenceNow = useMemo(() => {
    try {
      const str = now.toLocaleString('en-US', { timeZone: BASE_REFERENCE_TZ });
      return new Date(str);
    } catch {
      return new Date(now);
    }
  }, [now]);

  // Target scheduled time in base reference timezone based on scrubber offset
  const targetScheduledTime = useMemo(() => {
    return new Date(baseReferenceNow.getTime() + timeOffsetHours * 3600000);
  }, [baseReferenceNow, timeOffsetHours]);

  // Formatted HH:MM string for direct time input
  const targetTimeString = useMemo(() => {
    const h = String(targetScheduledTime.getHours()).padStart(2, '0');
    const m = String(targetScheduledTime.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }, [targetScheduledTime]);

  // Handle direct time input from user
  const handleDirectTimeChange = (timeStr: string) => {
    if (!timeStr) return;
    const parts = timeStr.split(':');
    if (parts.length < 2) return;
    const targetH = parseInt(parts[0], 10);
    const targetM = parseInt(parts[1], 10);
    if (isNaN(targetH) || isNaN(targetM)) return;

    const currentMinutes = baseReferenceNow.getHours() * 60 + baseReferenceNow.getMinutes();
    const targetMinutes = targetH * 60 + targetM;
    let diffMinutes = targetMinutes - currentMinutes;

    // Wrap around -12h to +12h window
    if (diffMinutes > 720) diffMinutes -= 1440;
    if (diffMinutes < -720) diffMinutes += 1440;

    const offsetHours = diffMinutes / 60;
    // Snap to closest 0.25h (15-min) step
    const snapped = Math.round(offsetHours * 4) / 4;
    setTimeOffsetHours(Math.max(-12, Math.min(12, snapped)));
  };

  // Quick preset helper
  const handlePresetTime = (presetH: number, presetM: number = 0) => {
    const currentMinutes = baseReferenceNow.getHours() * 60 + baseReferenceNow.getMinutes();
    const targetMinutes = presetH * 60 + presetM;
    let diffMinutes = targetMinutes - currentMinutes;
    if (diffMinutes > 720) diffMinutes -= 1440;
    if (diffMinutes < -720) diffMinutes += 1440;
    const offsetHours = Math.round((diffMinutes / 60) * 4) / 4;
    setTimeOffsetHours(Math.max(-12, Math.min(12, offsetHours)));
  };

  // Step offset by hours
  const handleStepOffset = (deltaHours: number) => {
    setTimeOffsetHours((prev) => {
      const next = Math.round((prev + deltaHours) * 4) / 4;
      return Math.max(-12, Math.min(12, next));
    });
  };

  // Guarantee valid city list
  const activeCities = useMemo(() => {
    if (!mapCities || mapCities.length === 0) return DEFAULT_MAP_CITIES;
    return mapCities;
  }, [mapCities]);

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter search results from city database
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return WORLD_CITIES_DATABASE.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.tz.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Import learners from store
  const handleImportLearners = () => {
    const imported: WorldMapCity[] = [];
    const existingIds = new Set(activeCities.map((c) => c.id));

    (learners || []).forEach((l) => {
      const id = `learner-${l.id}`;
      if (existingIds.has(id)) return;

      const cityName = l.city || l.country || 'Learner Location';
      // Find matching coordinate if available
      const match = WORLD_CITIES_DATABASE.find(
        (c) =>
          c.name.toLowerCase() === (l.city || '').toLowerCase() ||
          c.country.toLowerCase() === (l.country || '').toLowerCase()
      );

      let top = '50%';
      let left = '50%';
      let tz = l.timezone || 'UTC';

      if (match) {
        top = match.top;
        left = match.left;
        tz = match.tz;
      } else {
        const fallback = latLngToMapPercent(Math.random() * 80 - 30, Math.random() * 240 - 120);
        top = fallback.top;
        left = fallback.left;
      }

      const isKid = l.level === CourseLevel.Beginner || l.level === CourseLevel.Novice || (l.avatarId && l.avatarId.includes('kid'));

      imported.push({
        id,
        name: `${l.name} (${cityName})`,
        country: l.country || 'Global',
        tz: l.timezone || tz,
        top,
        left,
        isLearner: true,
        learnerType: isKid ? 'kid' : 'adult',
        learnerAvatar: l.avatarId || (isKid ? '🧒' : '🎓')
      });
    });

    if (imported.length === 0) {
      setStatusNotice('All existing adult & kids learners are already placed on the map!');
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }

    const updated = [...activeCities, ...imported];
    onUpdateCities(updated);
    setStatusNotice(`Imported ${imported.length} learner location(s) onto your global map!`);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  const handleAddPresetCity = (cityRef: CityCoordRef) => {
    const newCity: WorldMapCity = {
      id: Date.now().toString(),
      name: cityRef.name,
      country: cityRef.country,
      tz: cityRef.tz,
      top: cityRef.top,
      left: cityRef.left,
      lat: cityRef.lat,
      lng: cityRef.lng,
    };

    onUpdateCities([...activeCities, newCity]);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setStatusNotice(`Added ${cityRef.name} (${cityRef.country}) to World Clock!`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const leftPct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    const topPct = Math.max(4, Math.min(96, (y / rect.height) * 100));

    const guessedTz = guessTimezoneFromCoordinates(topPct, leftPct);

    setEditingCity({
      id: '',
      name: 'New Custom Location',
      country: '',
      tz: guessedTz,
      top: `${topPct.toFixed(1)}%`,
      left: `${leftPct.toFixed(1)}%`
    });
  };

  const handleRecalibratePins = () => {
    const recalibrated = activeCities.map((city) => {
      const match = WORLD_CITIES_DATABASE.find(
        (c) =>
          c.name.toLowerCase() === city.name.toLowerCase() ||
          (city.country && c.country.toLowerCase() === city.country.toLowerCase())
      );
      if (match) {
        return {
          ...city,
          top: match.top,
          left: match.left,
          tz: match.tz,
          lat: match.lat,
          lng: match.lng,
        };
      }
      if (city.lat !== undefined && city.lng !== undefined) {
        const coords = latLngToMapPercent(city.lat, city.lng);
        return { ...city, top: coords.top, left: coords.left };
      }
      return city;
    });
    onUpdateCities(recalibrated);
    setStatusNotice('All map pins snapped to exact geographic positions!');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all cities to the 20 default global hubs?')) {
      onUpdateCities(DEFAULT_MAP_CITIES);
      setStatusNotice('Reset world map locations to defaults.');
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const filteredCities = useMemo(() => {
    if (filterMode === 'learners') return activeCities.filter((c) => c.isLearner);
    if (filterMode === 'cities') return activeCities.filter((c) => !c.isLearner);
    return activeCities;
  }, [activeCities, filterMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md bg-black/85 pointer-events-auto">
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 w-full max-w-7xl max-h-[96vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] relative border border-slate-700 text-white overflow-hidden animate-fade-in">
        
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-lg shadow-inner">
              🌍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">World Time Zones & Learner Clock</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Global SVG Map
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interactive real-time global map with live clocks, day/night indicators & learner location sync.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Tabs */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'map' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                🗺️ World Map
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                📋 Timezone List ({filteredCities.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('converter')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'converter' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                ⏰ Time Converter
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search City / Country */}
            <div className="relative w-64 sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Search 60+ global cities or countries..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute left-2.5 top-1.5 text-slate-400">🔍</span>

              {/* Autocomplete Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[500] max-h-60 overflow-y-auto">
                  <div className="p-1.5 space-y-1">
                    {searchResults.map((res) => (
                      <button
                        key={`${res.name}-${res.country}`}
                        type="button"
                        onClick={() => handleAddPresetCity(res)}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-600/30 rounded-lg flex items-center justify-between text-xs transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-white">{res.name}</div>
                          <div className="text-[10px] text-slate-400">{res.country} • {res.tz}</div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          + Add Pin
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Import from Learner Rosters */}
            <button
              type="button"
              onClick={handleImportLearners}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Import all Adult and Kids learner home locations onto the map"
            >
              <span>👥</span>
              <span>Import From Learners</span>
              <span className="bg-emerald-800/80 px-1.5 py-0.2 rounded text-[10px]">
                {learners?.length || 0}
              </span>
            </button>

            {/* Filter Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${filterMode === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                All ({activeCities.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('learners')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${filterMode === 'learners' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                🎓 Learners ({activeCities.filter((c) => c.isLearner).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('cities')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${filterMode === 'cities' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                🏙️ Cities ({activeCities.filter((c) => !c.isLearner).length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Grid */}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${showGrid ? 'bg-slate-800 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              🌐 Lat/Lng Grid
            </button>

            {/* Recalibrate Pins */}
            <button
              type="button"
              onClick={handleRecalibratePins}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 transition cursor-pointer"
              title="Snap all cities and learners to exact geographical positions on the world map"
            >
              🎯 Snap to Exact Map
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              ↺ Reset Defaults
            </button>
          </div>
        </div>

        {/* Status Notice Notification */}
        {statusNotice && (
          <div className="mb-2 p-2 bg-indigo-900/60 border border-indigo-500/40 rounded-xl text-center text-xs font-bold text-indigo-200 animate-fade-in">
            {statusNotice}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 relative flex flex-col">
          {activeTab === 'map' && (
            <div className="relative w-full h-[65vh] min-h-[500px] rounded-2xl overflow-hidden bg-[#070d1e] border border-slate-800 shadow-2xl flex items-center justify-center select-none">
              
              {/* World Map Container */}
              <div
                ref={containerRef}
                id="world-map-container"
                onClick={handleMapClick}
                className="relative w-full h-full cursor-crosshair overflow-hidden group"
                style={{
                  backgroundImage: 'radial-gradient(circle at 50% 50%, #0d1b3e 0%, #060b1e 100%)',
                }}
              >
                {/* Vector SVG World Map with Crisp Invert Filter */}
                <img
                  src="/world_map.svg"
                  alt="World Map"
                  className="absolute inset-0 w-full h-full object-fill opacity-45 filter invert brightness-125 contrast-125 pointer-events-none select-none"
                />

                {/* Coordinate Lat/Lng Grid Overlay */}
                {showGrid && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
                    {/* Equator (54%) & Prime Meridian (48%) */}
                    <line x1="0%" y1="54%" x2="100%" y2="54%" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 4" />
                    <line x1="48%" y1="0%" x2="48%" y2="100%" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 4" />
                    
                    {/* Latitudes */}
                    <line x1="0%" y1="20%" x2="100%" y2="20%" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 4" />
                    <line x1="0%" y1="36%" x2="100%" y2="36%" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 4" />
                    <line x1="0%" y1="72%" x2="100%" y2="72%" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 4" />
                    <line x1="0%" y1="88%" x2="100%" y2="88%" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 4" />

                    {/* Longitudes */}
                    {[12, 24, 36, 60, 72, 84, 96].map((pct) => (
                      <line
                        key={pct}
                        x1={`${pct}%`}
                        y1="0%"
                        x2={`${pct}%`}
                        y2="100%"
                        stroke="#ffffff"
                        strokeWidth="0.5"
                        strokeDasharray="2 4"
                      />
                    ))}
                  </svg>
                )}

                {/* Map Continent Labels */}
                <div className="absolute top-[28%] left-[20%] text-[10px] uppercase font-black tracking-widest text-slate-500/60 pointer-events-none">North America</div>
                <div className="absolute top-[68%] left-[30%] text-[10px] uppercase font-black tracking-widest text-slate-500/60 pointer-events-none">South America</div>
                <div className="absolute top-[22%] left-[50%] text-[10px] uppercase font-black tracking-widest text-slate-500/60 pointer-events-none">Europe</div>
                <div className="absolute top-[50%] left-[52%] text-[10px] uppercase font-black tracking-widest text-slate-500/60 pointer-events-none">Africa</div>
                <div className="absolute top-[30%] left-[72%] text-[10px] uppercase font-black tracking-widest text-slate-500/60 pointer-events-none">Asia</div>
                <div className="absolute top-[74%] left-[84%] text-[10px] uppercase font-black tracking-widest text-slate-500/60 pointer-events-none">Australia</div>

                {/* Render Interactive City & Learner Pins */}
                {filteredCities.map((city) => (
                  <DraggableAccurateMapCity
                    key={city.id}
                    city={city}
                    now={now}
                    timeOffsetHours={timeOffsetHours}
                    containerRef={containerRef}
                    onUpdate={(id, updates) => {
                      onUpdateCities(activeCities.map((c) => (c.id === id ? { ...c, ...updates } : c)));
                    }}
                    onEdit={() => setEditingCity(city)}
                  />
                ))}

                {/* Map Helper Bottom Footer */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/80 text-[11px] text-slate-300 font-medium pointer-events-none shadow-xl">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span> Daytime ☀️</span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#6366f1]"></span> Nighttime 🌙</span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span> Students 🎓</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-bold">💡 Click anywhere to drop a pin</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-900/50 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCities.map((city) => {
                  const cityTime = getAdjustedCityTime(city, now, timeOffsetHours);
                  const isNight = cityTime.getHours() < 6 || cityTime.getHours() >= 19;
                  return (
                    <div
                      key={city.id}
                      className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 hover:border-indigo-500/60 transition flex items-center justify-between gap-3 shadow"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${isNight ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                          {city.isLearner ? (city.learnerAvatar || '🎓') : (isNight ? '🌙' : '☀️')}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-white text-sm truncate flex items-center gap-1">
                            {city.name}
                            {city.isLearner && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300">
                                {city.learnerType === 'kid' ? 'Kid' : 'Adult'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {city.country || city.tz}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Map Pos: X {city.left}, Y {city.top}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-mono font-black text-base ${isNight ? 'text-indigo-300' : 'text-amber-300'}`}>
                          {cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => setEditingCity(city)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition cursor-pointer"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateCities(activeCities.filter((c) => c.id !== city.id))}
                            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700 transition cursor-pointer"
                            title="Remove"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'converter' && (
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-900/50 p-4 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Reference Time Input & Scrubber Control Center */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-purple-950/50 rounded-2xl border border-indigo-700/50 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                        <span>⏰</span>
                        <span>Interactive Global Class Time Converter</span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Set your target reference class time or use the scrubber slider to project converted local times for all your global students.
                      </p>
                    </div>

                    <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-xs font-mono font-black text-indigo-300">
                      {timeOffsetHours === 0 ? 'LIVE NOW (0h)' : `${timeOffsetHours > 0 ? '+' : ''}${timeOffsetHours}h offset`}
                    </div>
                  </div>

                  {/* Direct Time Input & Stepper */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-indigo-500/20">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Scheduled Reference Time:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={targetTimeString}
                          onChange={(e) => handleDirectTimeChange(e.target.value)}
                          className="bg-slate-900 text-white font-mono font-black text-lg px-3 py-1.5 rounded-xl border-2 border-indigo-500/60 focus:border-indigo-400 focus:outline-none shadow-inner cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-400">
                          {targetScheduledTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Steppers */}
                    <div className="flex items-center gap-1.5 self-end pb-0.5">
                      <button
                        type="button"
                        onClick={() => handleStepOffset(-1)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
                        title="Minus 1 Hour"
                      >
                        -1h
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepOffset(-0.5)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
                        title="Minus 30 Minutes"
                      >
                        -30m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepOffset(0.5)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
                        title="Plus 30 Minutes"
                      >
                        +30m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepOffset(1)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition cursor-pointer"
                        title="Plus 1 Hour"
                      >
                        +1h
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 ml-auto self-end pb-0.5">
                      <button
                        type="button"
                        onClick={() => setTimeOffsetHours(0)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${timeOffsetHours === 0 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'}`}
                      >
                        🟢 Live Now
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetTime(9, 0)}
                        className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        09:00
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetTime(14, 0)}
                        className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        14:00
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetTime(18, 30)}
                        className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        18:30
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetTime(21, 0)}
                        className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        21:00
                      </button>
                    </div>
                  </div>

                  {/* Scrubber slider inside converter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>-12h</span>
                      <span className="text-indigo-300 font-mono">
                        Drag Slider to Sweep Time Across Continents
                      </span>
                      <span>+12h</span>
                    </div>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.25"
                      value={timeOffsetHours}
                      onChange={(e) => setTimeOffsetHours(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-2.5 bg-slate-950 rounded-lg appearance-none border border-slate-700 shadow-inner"
                    />
                  </div>
                </div>

                {/* Cities Conversion List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                    <span>Monitored Learner & Global Hubs ({filteredCities.length})</span>
                    <span>Converted Target Time & Status</span>
                  </div>

                  {filteredCities.map((city) => {
                    const cityTime = getAdjustedCityTime(city, now, timeOffsetHours);
                    const hours = cityTime.getHours();
                    const isNight = hours < 6 || hours >= 22;
                    const isBusinessHours = hours >= 9 && hours <= 18;
                    const isEvening = (hours >= 18 && hours < 22) || (hours >= 6 && hours < 9);

                    return (
                      <div
                        key={city.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          city.isLearner
                            ? 'bg-indigo-950/30 border-indigo-600/40 hover:border-indigo-500'
                            : 'bg-slate-800/70 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div className="w-52 truncate flex items-center gap-2">
                          <span className="text-base">{city.isLearner ? '🎓' : isNight ? '🌙' : '☀️'}</span>
                          <div className="truncate">
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{city.name}</span>
                              {city.isLearner && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 bg-indigo-500/30 text-indigo-200 rounded border border-indigo-400/40">
                                  LEARNER
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{city.country || city.tz}</div>
                          </div>
                        </div>

                        {/* 24h Visual Bar */}
                        <div className="flex-1 h-3 bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
                          {/* Day zone overlay 9am-6pm */}
                          <div className="absolute top-0 bottom-0 left-[37.5%] w-[37.5%] bg-emerald-500/10" />
                          <div
                            className={`absolute top-0 bottom-0 w-3.5 rounded-full shadow-md ${
                              isNight ? 'bg-indigo-400 shadow-indigo-500/50' : 'bg-amber-400 shadow-amber-500/50'
                            }`}
                            style={{ left: `${Math.min(95, Math.max(0, (hours / 24) * 100))}%` }}
                          />
                        </div>

                        <div className="text-right w-44 shrink-0">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-mono font-black text-sm ${isNight ? 'text-indigo-300' : 'text-amber-300'}`}>
                              {cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({cityTime.toLocaleDateString([], { weekday: 'short' })})
                            </span>
                          </div>
                          <div className="text-[10px] font-medium mt-0.5">
                            {isNight ? (
                              <span className="text-indigo-400 flex items-center justify-end gap-1">
                                <span>🌙 Sleeping / Night</span>
                              </span>
                            ) : isBusinessHours ? (
                              <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                                <span>✅ Prime Study Time</span>
                              </span>
                            ) : (
                              <span className="text-amber-400/90 flex items-center justify-end gap-1">
                                <span>🌅 Early / Evening</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Time Scrubber Slider (Time-Travel for Scheduling) */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 font-bold whitespace-nowrap">
                ⏰ Scheduled Time:
              </span>
              <input
                type="time"
                value={targetTimeString}
                onChange={(e) => handleDirectTimeChange(e.target.value)}
                className="bg-slate-900 text-indigo-300 font-mono font-bold text-xs px-2 py-1 rounded-lg border border-indigo-500/40 focus:border-indigo-400 focus:outline-none cursor-pointer"
              />
            </div>

            <input
              type="range"
              min="-12"
              max="12"
              step="0.25"
              value={timeOffsetHours}
              onChange={(e) => setTimeOffsetHours(parseFloat(e.target.value))}
              className="flex-1 min-w-[120px] accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
            />
            
            <span className="font-mono font-bold px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 text-indigo-300 min-w-[68px] text-center">
              {timeOffsetHours === 0 ? 'LIVE NOW' : `${timeOffsetHours > 0 ? '+' : ''}${timeOffsetHours} hrs`}
            </span>

            {timeOffsetHours !== 0 && (
              <button
                type="button"
                onClick={() => setTimeOffsetHours(0)}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Reset to Live
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Monitored Locations:</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              {activeCities.length}
            </span>
          </div>
        </div>

        {/* Edit / Add Location Modal Overlay */}
        {editingCity && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[31000] flex items-center justify-center p-4"
            onClick={() => setEditingCity(null)}
          >
            <div
              className="bg-slate-800 p-6 rounded-3xl shadow-2xl border border-slate-600 max-w-md w-full text-white animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700">
                <h3 className="text-lg font-black text-white">
                  {editingCity.id ? 'Edit World Clock Location' : 'Add New Location Pin'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCity(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">City or Label Name</label>
                  <input
                    type="text"
                    value={editingCity.name}
                    onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                    placeholder="e.g. London / Emma (Adult Student)"
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Country / Region (Optional)</label>
                  <input
                    type="text"
                    value={editingCity.country || ''}
                    onChange={(e) => setEditingCity({ ...editingCity, country: e.target.value })}
                    placeholder="e.g. United Kingdom"
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">IANA Timezone Identifier</label>
                  <input
                    type="text"
                    value={editingCity.tz}
                    onChange={(e) => setEditingCity({ ...editingCity, tz: e.target.value })}
                    placeholder="e.g. Europe/London, America/New_York, Asia/Tokyo"
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Map Position X (Left)</label>
                    <input
                      type="text"
                      value={editingCity.left}
                      onChange={(e) => setEditingCity({ ...editingCity, left: e.target.value })}
                      placeholder="e.g. 48%"
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Map Position Y (Top)</label>
                    <input
                      type="text"
                      value={editingCity.top}
                      onChange={(e) => setEditingCity({ ...editingCity, top: e.target.value })}
                      placeholder="e.g. 22%"
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    disabled={!editingCity.name.trim()}
                    onClick={() => {
                      if (!editingCity.id) {
                        onUpdateCities([...activeCities, { ...editingCity, id: Date.now().toString() }]);
                      } else {
                        onUpdateCities(activeCities.map((c) => (c.id === editingCity.id ? editingCity : c)));
                      }
                      setEditingCity(null);
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    Save Location
                  </button>

                  {editingCity.id && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateCities(activeCities.filter((c) => c.id !== editingCity.id));
                        setEditingCity(null);
                      }}
                      className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold rounded-xl transition cursor-pointer"
                    >
                      Delete
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditingCity(null)}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Helper: Calculate adjusted time with custom hour offset
// ------------------------------------------------------------
function getAdjustedCityTime(city: WorldMapCity, baseDate: Date, offsetHours: number = 0): Date {
  let target: Date;
  if (city.offset !== undefined) {
    target = new Date(baseDate.getTime() + city.offset);
  } else {
    try {
      const dateStr = baseDate.toLocaleString('en-US', { timeZone: city.tz });
      target = new Date(dateStr);
    } catch {
      target = new Date(baseDate);
    }
  }
  if (offsetHours !== 0) {
    target = new Date(target.getTime() + offsetHours * 3600000);
  }
  return target;
}

// ------------------------------------------------------------
// Draggable Map Pin Component
// ------------------------------------------------------------
interface DraggableCityProps {
  city: WorldMapCity;
  now: Date;
  timeOffsetHours: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, updates: Partial<WorldMapCity>) => void;
  onEdit: () => void;
}

const DraggableAccurateMapCity: React.FC<DraggableCityProps> = ({
  city,
  now,
  timeOffsetHours,
  containerRef,
  onUpdate,
  onEdit,
}) => {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startLeftPx: 0, startTopPx: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const leftPx = (parseFloat(city.left) / 100) * rect.width;
    const topPx = (parseFloat(city.top) / 100) * rect.height;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeftPx: leftPx,
      startTopPx: topPx,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      const newLeftPx = dragRef.current.startLeftPx + deltaX;
      const newTopPx = dragRef.current.startTopPx + deltaY;

      const leftPct = Math.max(2, Math.min(98, (newLeftPx / rect.width) * 100));
      const topPct = Math.max(4, Math.min(96, (newTopPx / rect.height) * 100));

      onUpdate(city.id, {
        left: `${leftPct.toFixed(1)}%`,
        top: `${topPct.toFixed(1)}%`,
      });
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, city.id, onUpdate, containerRef]);

  const cityTime = getAdjustedCityTime(city, now, timeOffsetHours);
  const hours = cityTime.getHours();
  const isNight = hours < 6 || hours >= 19;

  return (
    <div
      className="absolute pointer-events-auto select-none"
      style={{
        top: city.top,
        left: city.left,
        transform: 'translate(-50%, -50%)',
        zIndex: dragging ? 1000 : city.isLearner ? 200 : 50,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Precision Focal Center */}
      <div className="relative flex flex-col items-center">
        {/* Glowing Beacon Dot - mathematically centered on (city.left, city.top) */}
        <div
          className={`relative w-4 h-4 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
            city.isLearner
              ? 'bg-emerald-400 text-black shadow-[0_0_14px_#34d399]'
              : isNight
              ? 'bg-indigo-400 text-white shadow-[0_0_14px_#818cf8]'
              : 'bg-amber-400 text-black shadow-[0_0_14px_#fbbf24]'
          } ${dragging ? 'scale-125' : 'hover:scale-125'}`}
          title={`${city.name} (${city.country || city.tz}) - Drag to reposition or click to edit`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white font-bold" />
          <span
            className={`absolute inset-0 rounded-full animate-ping opacity-40 pointer-events-none ${
              city.isLearner ? 'bg-emerald-400' : isNight ? 'bg-indigo-400' : 'bg-amber-400'
            }`}
          />
        </div>

        {/* Floating Badge Card anchored right below beacon */}
        <div
          className={`mt-1 px-2.5 py-1 rounded-xl text-center border whitespace-nowrap shadow-2xl backdrop-blur-md transition-all cursor-pointer ${
            city.isLearner
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 hover:bg-emerald-900'
              : isNight
              ? 'bg-slate-900/90 border-indigo-500/30 text-white hover:bg-slate-800'
              : 'bg-slate-900/90 border-amber-500/30 text-white hover:bg-slate-800'
          } hover:scale-105`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <div className="font-black text-[11px] leading-tight text-white flex items-center justify-center gap-1">
            {city.isLearner && <span>{city.learnerAvatar || '🎓'}</span>}
            <span>{city.name}</span>
          </div>
          <div
            className={`font-mono font-black text-xs mt-0.5 ${
              city.isLearner ? 'text-emerald-300' : isNight ? 'text-indigo-300' : 'text-amber-300'
            }`}
          >
            {cityTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <span className="text-[10px] ml-1">{isNight ? '🌙' : '☀️'}</span>
          </div>
        </div>

        {dragging && (
          <div className="mt-1 px-1.5 py-0.5 bg-black/80 border border-amber-400/50 rounded text-[9px] font-bold text-amber-300 uppercase tracking-widest pointer-events-none">
            {city.left}, {city.top}
          </div>
        )}
      </div>
    </div>
  );
};
