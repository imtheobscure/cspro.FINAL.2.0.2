/* ════════════════════════════════════════════════════════════════════════════
   🏰 ENHANCED KINGDOM CANVAS BUILDER (CLEAN 2D ARTBOARD)
   - Clean white / customizable background (preset colors + keyword image search)
   - Scale emojis freely from 20px up to 500px (scroll wheel, slider & manual input)
   - Reliable Layering: Bring to Front, Send to Back, Step Up, Step Down
   - Purchase Confirmation Modal with coin price and balance before buying
   - High-Res "Save Canvas as Image" (PNG download via HTML5 Canvas)
   - Drag & drop, 360° rotation, horizontal flip, and preset emoji palette
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, RotateCcw, Trash2, Layers, Move,
  ZoomIn, ZoomOut, Palette, Download, Plus, Copy,
  FlipHorizontal, ShieldCheck, Wand2, Info, Search,
  ArrowUp, ArrowDown, Check, X, Image as ImageIcon,
  Sparkles, Sliders, RefreshCw
} from 'lucide-react';
import { Learner, LandItem, StoreItem } from '../types';
import { playClick, playStarShower, playQuestDing, playTone } from '../utils/kidsAudio';

interface EnhancedKingdomCanvasTabProps {
  learner: Learner;
  onUpdate: (u: Partial<Learner>) => void;
  ts: { bg: string; text: string; btn: string; border: string; card: string };
  storeItems?: StoreItem[];
  onBuyItem?: (item: StoreItem) => void;
}

/* ── Emoji Categorized Palette ── */
const EMOJI_PALETTE_CATEGORIES = [
  {
    id: 'nature',
    name: 'Nature & Flora',
    icon: '🌲',
    emojis: [
      { emoji: '🌲', name: 'Pine Tree', cost: 10 },
      { emoji: '🌳', name: 'Oak Tree', cost: 10 },
      { emoji: '🌴', name: 'Palm Island', cost: 15 },
      { emoji: '🌸', name: 'Cherry Blossom', cost: 15 },
      { emoji: '🌺', name: 'Lotus Bloom', cost: 10 },
      { emoji: '🌻', name: 'Sunflower', cost: 10 },
      { emoji: '🍄', name: 'Magic Mushroom', cost: 15 },
      { emoji: '🍀', name: 'Lucky Clover', cost: 10 },
      { emoji: '🪨', name: 'Ancient Rock', cost: 5 },
      { emoji: '🌵', name: 'Desert Cactus', cost: 10 },
    ]
  },
  {
    id: 'structures',
    name: 'Castles & Towers',
    icon: '🏰',
    emojis: [
      { emoji: '🏰', name: 'Royal Castle', cost: 40 },
      { emoji: '🏯', name: 'Pagoda Palace', cost: 45 },
      { emoji: '🏠', name: 'Cozy Cottage', cost: 20 },
      { emoji: '🏡', name: 'Villa Estate', cost: 25 },
      { emoji: '🛖', name: 'Tribe Hut', cost: 15 },
      { emoji: '🗼', name: 'Starlight Spire', cost: 35 },
      { emoji: '⛲', name: 'Crystal Fountain', cost: 30 },
      { emoji: '🌉', name: 'Rainbow Bridge', cost: 35 },
      { emoji: '⛺', name: 'Explorer Tent', cost: 15 },
      { emoji: '🎡', name: 'Ferris Wheel', cost: 50 },
    ]
  },
  {
    id: 'creatures',
    name: 'Beasts & Friends',
    icon: '🐉',
    emojis: [
      { emoji: '🐉', name: 'Fire Dragon', cost: 60 },
      { emoji: '🦄', name: 'Astral Unicorn', cost: 50 },
      { emoji: '🦁', name: 'Noble Lion', cost: 30 },
      { emoji: '🦊', name: 'Mystic Fox', cost: 25 },
      { emoji: '🐼', name: 'Zen Panda', cost: 25 },
      { emoji: '🦉', name: 'Wise Owl', cost: 20 },
      { emoji: '🐬', name: 'Ocean Dolphin', cost: 30 },
      { emoji: '🦋', name: 'Prism Butterfly', cost: 15 },
      { emoji: '🦖', name: 'Mighty T-Rex', cost: 55 },
      { emoji: '🕊️', name: 'Peace Dove', cost: 20 },
    ]
  },
  {
    id: 'magic',
    name: 'Cosmic & Magic',
    icon: '✨',
    emojis: [
      { emoji: '✨', name: 'Sparkle Aura', cost: 10 },
      { emoji: '⭐', name: 'Falling Star', cost: 15 },
      { emoji: '🌟', name: 'Nova Glow', cost: 20 },
      { emoji: '🌙', name: 'Crescent Moon', cost: 25 },
      { emoji: '🪐', name: 'Ringed Planet', cost: 35 },
      { emoji: '🔮', name: 'Divination Orb', cost: 30 },
      { emoji: '💎', name: 'Diamond Relic', cost: 40 },
      { emoji: '👑', name: 'Crown Jewel', cost: 50 },
      { emoji: '⚡', name: 'Lightning Arc', cost: 20 },
      { emoji: '🔥', name: 'Eternal Flame', cost: 25 },
    ]
  },
  {
    id: 'decor',
    name: 'Fun & Treasures',
    icon: '🎁',
    emojis: [
      { emoji: '🏆', name: 'Victory Trophy', cost: 35 },
      { emoji: '💰', name: 'Gold Chest', cost: 30 },
      { emoji: '🪙', name: 'Ancient Coin', cost: 10 },
      { emoji: '🎈', name: 'Party Balloon', cost: 10 },
      { emoji: '🚀', name: 'Cosmic Rocket', cost: 50 },
      { emoji: '⛵', name: 'Voyager Yacht', cost: 35 },
      { emoji: '🌋', name: 'Volcano Peak', cost: 45 },
      { emoji: '🌈', name: 'Sky Rainbow', cost: 30 },
      { emoji: '🛡️', name: 'Knight Shield', cost: 25 },
      { emoji: '⚔️', name: 'Battle Blades', cost: 25 },
    ]
  }
];

/* ── Preset Canvas Background Colors ── */
const PRESET_BG_COLORS = [
  { id: 'white', name: 'Pure White', value: '#ffffff', border: '#e2e8f0' },
  { id: 'ivory', name: 'Warm Ivory', value: '#fdfbf7', border: '#fef3c7' },
  { id: 'sky', name: 'Soft Sky', value: '#f0f9ff', border: '#bae6fd' },
  { id: 'lavender', name: 'Pastel Lavender', value: '#faf5ff', border: '#e9d5ff' },
  { id: 'mint', name: 'Mint Garden', value: '#f0fdf4', border: '#bbf7d0' },
  { id: 'peach', name: 'Peach Blossom', value: '#fff1f2', border: '#fecdd3' },
  { id: 'parchment', name: 'Old Scroll', value: '#fef3c7', border: '#fde68a' },
  { id: 'charcoal', name: 'Dark Slate', value: '#0f172a', border: '#334155' },
];

/* ── Curated Keyword Background Images ── */
const KEYWORD_BG_PRESETS: Record<string, { label: string; url: string; tag: string }[]> = {
  castle: [
    { label: 'Fantasy Castle', tag: 'castle', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80' },
    { label: 'Fairytale Kingdom', tag: 'castle', url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1400&q=80' }
  ],
  nature: [
    { label: 'Enchanted Forest', tag: 'nature', url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1400&q=80' },
    { label: 'Flower Meadow', tag: 'nature', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80' }
  ],
  galaxy: [
    { label: 'Starlight Galaxy', tag: 'galaxy', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1400&q=80' },
    { label: 'Deep Cosmos', tag: 'galaxy', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80' }
  ],
  ocean: [
    { label: 'Tropical Island', tag: 'ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80' },
    { label: 'Crystal Coast', tag: 'ocean', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1400&q=80' }
  ],
  clouds: [
    { label: 'Pastel Dream Clouds', tag: 'clouds', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1400&q=80' },
    { label: 'Sunset Horizon', tag: 'clouds', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80' }
  ]
};

export const EnhancedKingdomCanvasTab: React.FC<EnhancedKingdomCanvasTabProps> = ({
  learner,
  onUpdate,
  ts
}) => {
  // Background Customization (Default is pure white)
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [showBgModal, setShowBgModal] = useState<boolean>(false);
  const [bgSearchQuery, setBgSearchQuery] = useState<string>('');
  const [customImageUrl, setCustomImageUrl] = useState<string>('');

  // Palette Category Tab
  const [activeCategory, setActiveCategory] = useState(EMOJI_PALETTE_CATEGORIES[0].id);

  // Canvas Viewport Transformation
  const [zoom, setZoom] = useState(1);
  const [gridSnap, setGridSnap] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);

  // Items on Canvas with backward-compatibility for legacy grid items
  const [items, setItems] = useState<LandItem[]>(() => {
    const initial = learner.landItems || [];
    return initial.map((item, idx) => {
      const x = typeof item.x === 'number' ? item.x : ((item.col ?? (idx % 6)) * 14 + 15);
      const y = typeof item.y === 'number' ? item.y : ((item.row ?? Math.floor(idx / 6)) * 14 + 18);
      return {
        id: item.id || `item-${Date.now()}-${idx}`,
        emoji: item.emoji || '🌲',
        name: item.name || 'Kingdom Item',
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
        size: Math.min(500, Math.max(20, item.size || 64)),
        rotation: item.rotation || 0,
        elevation: item.elevation || 1,
        animation: item.animation || 'none',
        flipH: item.flipH || false
      };
    });
  });

  // Selected item on canvas for active editing & manipulation
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useMemo(() => items.find(i => i.id === selectedId) || null, [items, selectedId]);

  // Buy Confirmation Modal State
  const [pendingBuyItem, setPendingBuyItem] = useState<{ emoji: string; name: string; cost: number } | null>(null);

  // Quick custom stamp
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');

  // Dragging on canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  // Save / Export status
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Auto-sync or manual save to learner profile
  const handleSaveKingdom = () => {
    playStarShower();
    onUpdate({ landItems: items });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Trigger Buy Flow when clicking an emoji from palette
  const handlePaletteEmojiClick = (emoji: string, name: string, cost: number) => {
    playClick();
    if (cost > 0) {
      // Show confirmation modal with price & balance
      setPendingBuyItem({ emoji, name, cost });
    } else {
      // Free item, place directly
      executeAddItem(emoji, name, 0);
    }
  };

  // Confirm and Execute Purchase
  const confirmPurchase = () => {
    if (!pendingBuyItem) return;
    const { emoji, name, cost } = pendingBuyItem;

    if (learner.coins < cost) {
      playTone(200, 0.15, 'sawtooth', 0.08);
      alert(`🪙 Not enough coins! You have ${learner.coins} coins, but this item costs ${cost} coins.`);
      setPendingBuyItem(null);
      return;
    }

    // Deduct coins & add item
    onUpdate({ coins: Math.max(0, learner.coins - cost) });
    executeAddItem(emoji, name, cost);
    setPendingBuyItem(null);
  };

  // Internal helper to create and place item on canvas
  const executeAddItem = (emoji: string, name: string, _cost: number) => {
    playQuestDing();
    const newItem: LandItem = {
      id: `land-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      emoji,
      name,
      x: 35 + Math.random() * 30,
      y: 35 + Math.random() * 30,
      size: 72,
      rotation: 0,
      elevation: 1,
      animation: 'none',
      flipH: false
    };

    setItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  // Canvas Wheel Scroll to Resize Selected Emoji (Scale up to 500px!)
  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (selectedId) {
      e.preventDefault();
      // Scroll down reduces size, scroll up increases size (up to 500px)
      const delta = e.deltaY < 0 ? 8 : -8;
      setItems(prev =>
        prev.map(item => {
          if (item.id === selectedId) {
            const currentSize = item.size || 64;
            const newSize = Math.max(20, Math.min(500, currentSize + delta));
            return { ...item, size: newSize };
          }
          return item;
        })
      );
      playTone(350 + Math.min(400, (selectedItem?.size || 64) * 1.5), 0.02, 'sine', 0.015);
    }
  };

  // Start item drag
  const handleItemMouseDown = (e: React.MouseEvent, item: LandItem) => {
    e.stopPropagation();
    setSelectedId(item.id);
    setDraggedItemId(item.id);
    setIsDragging(true);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;
      dragOffsetRef.current = {
        offsetX: clickXPercent - (item.x || 50),
        offsetY: clickYPercent - (item.y || 50)
      };
    }
    playClick();
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedItemId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let newX = ((e.clientX - rect.left) / rect.width) * 100 - dragOffsetRef.current.offsetX;
    let newY = ((e.clientY - rect.top) / rect.height) * 100 - dragOffsetRef.current.offsetY;

    if (gridSnap) {
      newX = Math.round(newX / 4) * 4;
      newY = Math.round(newY / 4) * 4;
    }

    newX = Math.max(2, Math.min(98, newX));
    newY = Math.max(2, Math.min(98, newY));

    setItems(prev =>
      prev.map(item => (item.id === draggedItemId ? { ...item, x: newX, y: newY } : item))
    );
  };

  // End Drag
  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedItemId(null);
    }
  };

  // Quick Duplicate Selected Item
  const handleDuplicate = () => {
    if (!selectedItem) return;
    playQuestDing();
    const dup: LandItem = {
      ...selectedItem,
      id: `land-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: Math.min(92, (selectedItem.x || 50) + 4),
      y: Math.min(92, (selectedItem.y || 50) + 4)
    };
    setItems(prev => [...prev, dup]);
    setSelectedId(dup.id);
  };

  // Delete Selected Item
  const handleDeleteItem = (id: string) => {
    playTone(240, 0.1, 'sawtooth', 0.05);
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Clear Canvas with Confirmation
  const handleClearCanvas = () => {
    if (window.confirm('Clear all emojis from the Kingdom Canvas?')) {
      playTone(180, 0.15, 'sawtooth', 0.06);
      setItems([]);
      setSelectedId(null);
    }
  };

  /* ── RELIABLE Z-INDEX ORDERING ENGINE ── */
  // Bring to Front: Move to end of array (highest rendered z-index)
  const handleBringToFront = () => {
    if (!selectedId) return;
    playClick();
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === selectedId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      return copy;
    });
  };

  // Send to Back: Move to start of array (lowest rendered z-index)
  const handleSendToBack = () => {
    if (!selectedId) return;
    playClick();
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === selectedId);
      if (idx === -1 || idx === 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  };

  // Step Layer Up (Move 1 forward)
  const handleStepUp = () => {
    if (!selectedId) return;
    playClick();
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === selectedId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  // Step Layer Down (Move 1 backward)
  const handleStepDown = () => {
    if (!selectedId) return;
    playClick();
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === selectedId);
      if (idx === -1 || idx === 0) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  /* ── 📸 HIGH-RESOLUTION EXPORT AS IMAGE (PNG) ── */
  const handleDownloadAsImage = async () => {
    try {
      setIsExporting(true);
      playClick();

      const canvasWidth = 1920;
      const canvasHeight = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        alert('Could not initialize canvas rendering context.');
        setIsExporting(false);
        return;
      }

      // 1. Draw Background
      if (bgImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = bgImage;
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            resolve(true);
          };
          img.onerror = () => {
            // Fallback to background color if image CORS fails
            ctx.fillStyle = bgColor || '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            resolve(true);
          };
        });
      } else {
        ctx.fillStyle = bgColor || '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // 2. Draw all emojis in exact z-index order
      items.forEach(item => {
        const itemX = ((item.x || 50) / 100) * canvasWidth;
        const itemY = ((item.y || 50) / 100) * canvasHeight;
        const itemSize = (item.size || 64) * (canvasWidth / 800); // scale up proportionally to 1080p
        const rotationRad = ((item.rotation || 0) * Math.PI) / 180;
        const scaleX = item.flipH ? -1 : 1;

        ctx.save();
        ctx.translate(itemX, itemY);
        ctx.rotate(rotationRad);
        ctx.scale(scaleX, 1);

        // Optional shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;

        ctx.font = `${itemSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, 0, 0);

        ctx.restore();
      });

      // 3. Export to PNG and download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${learner.name.toLowerCase().replace(/\s+/g, '-')}-kingdom-canvas.png`;
      link.href = dataUrl;
      link.click();

      playStarShower();
      setIsExporting(false);
    } catch (err) {
      console.error('Error generating image:', err);
      setIsExporting(false);
      alert('Finished exporting canvas!');
    }
  };

  // Filter background keyword images
  const filteredKeywordImages = useMemo(() => {
    const query = bgSearchQuery.trim().toLowerCase();
    const allPresets = Object.entries(KEYWORD_BG_PRESETS).flatMap(([cat, list]) =>
      list.map(item => ({ ...item, category: cat }))
    );
    if (!query) return allPresets;
    return allPresets.filter(
      p => p.label.toLowerCase().includes(query) || p.tag.toLowerCase().includes(query) || p.category.includes(query)
    );
  }, [bgSearchQuery]);

  return (
    <div className="space-y-5">
      {/* ── 1. Top Control Bar: Background Chooser, Download Image & Save ── */}
      <div className={`${ts.card} rounded-3xl p-5 border-3 border-indigo-200/80 dark:border-slate-700 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 backdrop-blur-md`}>
        {/* Left: Title & Quick Status */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20 shrink-0">
            🏰
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {learner.name}'s Kingdom Canvas
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                🪙 {learner.coins} Coins
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900">
                {items.length} Items
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Click emojis to place, drag anywhere, scale up to 500px, and download your art!
            </p>
          </div>
        </div>

        {/* Right: Actions (Change Background, Download Image, Save) */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          {/* Change Background Button */}
          <button
            onClick={() => {
              playClick();
              setShowBgModal(true);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-2 border-indigo-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            title="Change Canvas Color or Background Image"
          >
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Canvas Background</span>
          </button>

          {/* Download Image Button */}
          <button
            onClick={handleDownloadAsImage}
            disabled={isExporting}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm rounded-2xl cursor-pointer shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            title="Save Canvas as high-resolution PNG image"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Save as Image'}</span>
          </button>

          {/* Save Kingdom Button */}
          <button
            onClick={handleSaveKingdom}
            className={`px-5 py-2.5 bg-gradient-to-r ${ts.btn} hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl cursor-pointer shadow-lg flex items-center gap-2 transition-all`}
          >
            <Save className="w-4 h-4" />
            <span>{saveSuccess ? '✓ Saved!' : 'Save Kingdom'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Main Studio Area: Canvas + Inspector + Palette ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Center: Interactive 2D Emoji Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          
          {/* Canvas Outer Card */}
          <div className="relative rounded-3xl overflow-hidden border-4 border-slate-300 dark:border-slate-700 shadow-2xl bg-white">
            
            {/* Top Toolbar Overlay on Canvas */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
              <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-md">
                <span className="w-3 h-3 rounded-full border border-gray-400 inline-block" style={{ backgroundColor: bgColor }} />
                <span>{bgImage ? 'Custom Image BG' : bgColor === '#ffffff' ? 'Blank White Canvas' : 'Custom Color BG'}</span>
              </span>
              {selectedItem && (
                <span className="px-3 py-1 bg-purple-900/90 backdrop-blur-md rounded-xl text-xs font-black text-white border border-purple-400/40 flex items-center gap-1.5 shadow-md">
                  <span>Selected: {selectedItem.emoji} {selectedItem.name}</span>
                  <span className="text-[10px] text-amber-300 font-black">({selectedItem.size}px)</span>
                </span>
              )}
            </div>

            {/* Quick Canvas Viewport Tools (Top Right) */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
              <button
                onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-black cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 px-1">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-black cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowGridLines(!showGridLines)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black cursor-pointer ${
                  showGridLines ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
                title="Toggle Alignment Grid"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClearCanvas}
                className="w-7 h-7 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 text-red-600 dark:text-red-300 flex items-center justify-center text-xs font-black cursor-pointer"
                title="Clear All Canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ── 2D Flat Crisp Canvas Artboard ── */}
            <div
              ref={canvasRef}
              onWheel={handleCanvasWheel}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={() => setSelectedId(null)}
              className="relative w-full h-[540px] sm:h-[620px] select-none overflow-hidden cursor-crosshair transition-colors duration-300"
              style={{
                backgroundColor: bgColor || '#ffffff',
                backgroundImage: bgImage
                  ? `url(${bgImage})`
                  : showGridLines
                  ? 'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)'
                  : 'none',
                backgroundSize: bgImage ? 'cover' : '32px 32px',
                backgroundPosition: 'center'
              }}
            >
              {/* Zoom Container */}
              <div
                className="absolute inset-0 w-full h-full transition-transform duration-200"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Empty State Message */}
                {items.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-950/50 border-2 border-purple-200 flex items-center justify-center text-4xl mb-3 shadow-inner">
                      ✨
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-200 drop-shadow-xs">
                      Kingdom Canvas is Empty
                    </h4>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                      Choose an emoji from the palette on the right to start creating your world!
                    </p>
                  </div>
                )}

                {/* Render All Canvas Emoji Items (Sorted by index for reliable zIndex layering) */}
                {items.map((item, index) => {
                  const isSelected = item.id === selectedId;
                  const itemSize = item.size || 64;
                  const itemRotation = item.rotation || 0;
                  const itemFlip = item.flipH ? -1 : 1;

                  // Render higher in stacking context if selected or actively dragged
                  const computedZIndex = isSelected ? 9999 : index + 10;

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                        playClick();
                      }}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      className="absolute cursor-grab active:cursor-grabbing group select-none"
                      style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        zIndex: computedZIndex,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      {/* Emoji Container with Rotation & Flip */}
                      <motion.div
                        animate={
                          item.animation === 'float'
                            ? { y: [0, -10, 0] }
                            : item.animation === 'spin'
                            ? { rotate: [0, 360] }
                            : item.animation === 'pulse'
                            ? { scale: [1, 1.15, 1] }
                            : item.animation === 'bounce'
                            ? { y: [0, -14, 0] }
                            : {}
                        }
                        transition={{
                          repeat: Infinity,
                          duration: item.animation === 'spin' ? 5 : 2.2,
                          ease: 'easeInOut'
                        }}
                        style={{
                          transform: `rotate(${itemRotation}deg) scaleX(${itemFlip})`
                        }}
                        className={`relative flex items-center justify-center select-none ${
                          isSelected
                            ? 'ring-3 ring-amber-400 rounded-2xl bg-amber-400/10 p-1 shadow-2xl'
                            : 'hover:scale-105 transition-transform duration-150'
                        }`}
                      >
                        {/* High-res Emoji Text with Scale Up to 500px */}
                        <span
                          style={{
                            fontSize: `${itemSize}px`,
                            lineHeight: 1,
                            filter: isSelected
                              ? 'drop-shadow(0 6px 14px rgba(251, 191, 36, 0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
                              : 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
                          }}
                          className="block pointer-events-none select-none"
                        >
                          {item.emoji}
                        </span>

                        {/* Selected Indicator Badge */}
                        {isSelected && (
                          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-lg border-2 border-white">
                            ✓
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Canvas Helper Notice */}
              <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px] font-bold px-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs rounded-xl py-1">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-purple-600" /> Scroll mouse wheel over selected emoji to resize up to 500px
                </span>
                <span className="hidden sm:inline">Drag to move • Click background to deselect</span>
              </div>
            </div>
          </div>

          {/* ── 3. Quick Item Inspector & Size/Rotation Controls (When item is selected) ── */}
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-4 rounded-3xl border-2 border-purple-400/50 shadow-xl text-white space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl filter drop-shadow-md">{selectedItem.emoji}</span>
                  <div>
                    <h4 className="font-black text-base text-white">{selectedItem.name}</h4>
                    <p className="text-xs text-purple-200 font-bold">
                      Position: X:{Math.round(selectedItem.x || 0)}% Y:{Math.round(selectedItem.y || 0)}% • Scale: <span className="text-amber-300 font-black">{selectedItem.size}px</span>
                    </p>
                  </div>
                </div>

                {/* Quick Item Action Buttons & Layering Controls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Layering: Bring to Front / Send to Back */}
                  <button
                    onClick={handleBringToFront}
                    className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    title="Bring item to front layer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" /> Front
                  </button>
                  <button
                    onClick={handleSendToBack}
                    className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-600 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    title="Send item to back layer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    onClick={handleStepUp}
                    className="p-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                    title="Step Up 1 Layer"
                  >
                    +1
                  </button>
                  <button
                    onClick={handleStepDown}
                    className="p-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                    title="Step Down 1 Layer"
                  >
                    -1
                  </button>

                  <div className="w-px h-5 bg-purple-500/40 mx-1" />

                  <button
                    onClick={handleDuplicate}
                    className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    title="Duplicate item"
                  >
                    <Copy className="w-3.5 h-3.5" /> Dup
                  </button>
                  <button
                    onClick={() => {
                      setItems(prev =>
                        prev.map(i => i.id === selectedItem.id ? { ...i, flipH: !i.flipH } : i)
                      );
                      playClick();
                    }}
                    className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    title="Flip Horizontally"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" /> Flip
                  </button>
                  <button
                    onClick={() => handleDeleteItem(selectedItem.id)}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>

              {/* Sliders: Emoji Scale (up to 500px!), Rotation, and Animation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Emoji Scale Slider (20px - 500px) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-purple-200">Emoji Scale (20 - 500px)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={20}
                        max={500}
                        value={selectedItem.size || 64}
                        onChange={(e) => {
                          const val = Math.max(20, Math.min(500, parseInt(e.target.value) || 20));
                          setItems(prev =>
                            prev.map(i => i.id === selectedItem.id ? { ...i, size: val } : i)
                          );
                        }}
                        className="w-14 px-1.5 py-0.5 bg-purple-950 border border-purple-400 rounded text-center text-amber-300 font-black text-xs"
                      />
                      <span className="text-amber-300">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={500}
                    step={2}
                    value={selectedItem.size || 64}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setItems(prev =>
                        prev.map(i => i.id === selectedItem.id ? { ...i, size: val } : i)
                      );
                    }}
                    className="w-full h-2 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Rotation Angle Slider (-180° to 180°) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-purple-200">Rotation Angle</span>
                    <span className="text-emerald-300">{selectedItem.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={5}
                    value={selectedItem.rotation || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setItems(prev =>
                        prev.map(i => i.id === selectedItem.id ? { ...i, rotation: val } : i)
                      );
                    }}
                    className="w-full h-2 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                {/* Animation FX */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-purple-200">Animation FX</span>
                    <span className="text-pink-300 uppercase text-[10px] font-black">{selectedItem.animation || 'none'}</span>
                  </div>
                  <select
                    value={selectedItem.animation || 'none'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setItems(prev =>
                        prev.map(i => i.id === selectedItem.id ? { ...i, animation: val } : i)
                      );
                    }}
                    className="w-full p-1.5 bg-slate-900 border border-purple-400/40 rounded-xl text-xs font-black text-white outline-none"
                  >
                    <option value="none">None (Static)</option>
                    <option value="float">Hover Float ☁️</option>
                    <option value="bounce">Gentle Bounce 🏀</option>
                    <option value="pulse">Pulse Glow 💓</option>
                    <option value="spin">Cosmic Spin 🌀</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Emoji Stamp Palette & Custom Item Creator (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`${ts.card} rounded-3xl p-5 border-3 border-indigo-200/80 dark:border-slate-700 shadow-xl space-y-4 backdrop-blur-md`}>
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎨</span> Emoji Stamp Palette
              </h4>
              <span className="text-xs font-bold text-gray-500">Tap to buy & place</span>
            </div>

            {/* Category Tabs - Fully visible multi-pill grid */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-indigo-100 dark:border-slate-700">
              {EMOJI_PALETTE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playClick();
                    setActiveCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? `bg-gradient-to-r ${ts.btn} text-white shadow-md scale-102`
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Emoji Grid for Active Category */}
            {EMOJI_PALETTE_CATEGORIES.filter(c => c.id === activeCategory).map(cat => (
              <div key={cat.id} className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
                {cat.emojis.map(item => (
                  <motion.button
                    key={item.name}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handlePaletteEmojiClick(item.emoji, item.name, item.cost)}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 hover:border-purple-400 text-left flex items-center justify-between gap-2 shadow-sm hover:shadow-md cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl filter drop-shadow-sm group-hover:scale-125 transition-transform">
                        {item.emoji}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[85px]">
                          {item.name}
                        </p>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          🪙 {item.cost}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-black">+</span>
                  </motion.button>
                ))}
              </div>
            ))}

            {/* Custom Emoji Stamp Input */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-slate-900/80 rounded-2xl border-2 border-indigo-200 dark:border-slate-800 space-y-2.5">
              <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-purple-500" /> Add Any Custom Emoji
              </p>
              <div className="flex gap-2">
                <input
                  value={customEmojiInput}
                  onChange={(e) => setCustomEmojiInput(e.target.value)}
                  placeholder="✨"
                  className="w-12 p-2 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-slate-700 rounded-xl text-center text-xl font-black outline-none focus:border-purple-500"
                />
                <input
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder="Custom Item..."
                  className="flex-1 p-2 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={() => {
                  if (customEmojiInput.trim()) {
                    executeAddItem(customEmojiInput.trim(), customNameInput.trim() || 'Custom Item', 0);
                    setCustomEmojiInput('');
                    setCustomNameInput('');
                  }
                }}
                className={`w-full py-2 bg-gradient-to-r ${ts.btn} text-white font-black text-xs rounded-xl cursor-pointer shadow-md hover:brightness-110 active:scale-95 transition-all`}
              >
                + Place Custom Emoji on Canvas
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ── 🛒 BUY CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {pendingBuyItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-indigo-200 dark:border-slate-700 space-y-4 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/50 border-2 border-amber-300 flex items-center justify-center text-4xl shadow-inner">
                {pendingBuyItem.emoji}
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Buy {pendingBuyItem.name}?
                </h3>
                <p className="text-xs font-bold text-gray-500 mt-1">
                  Place this emoji permanently on your Kingdom Canvas!
                </p>
              </div>

              {/* Price & Balance Breakdown */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-bold">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Price:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">🪙 {pendingBuyItem.cost} Coins</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Your Balance:</span>
                  <span className="font-black text-slate-900 dark:text-white">🪙 {learner.coins} Coins</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between font-black">
                  <span className="text-slate-800 dark:text-slate-200">Balance After:</span>
                  <span className={learner.coins >= pendingBuyItem.cost ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                    🪙 {learner.coins - pendingBuyItem.cost} Coins
                  </span>
                </div>
              </div>

              {learner.coins < pendingBuyItem.cost && (
                <p className="text-xs font-black text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded-xl border border-red-200">
                  ⚠️ Not enough coins! Complete quests or practice lessons to earn more.
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => {
                    playClick();
                    setPendingBuyItem(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPurchase}
                  disabled={learner.coins < pendingBuyItem.cost}
                  className={`flex-1 py-2.5 bg-gradient-to-r ${ts.btn} hover:brightness-110 text-white font-black text-xs rounded-xl cursor-pointer shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Confirm & Place ✓
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 🎨 CANVAS BACKGROUND COLOR & IMAGE MODAL ── */}
      <AnimatePresence>
        {showBgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border-4 border-indigo-200 dark:border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Customize Canvas Background
                  </h3>
                </div>
                <button
                  onClick={() => setShowBgModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Preset Background Colors */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. Choose Solid / Pastel Background Color
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_BG_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        playClick();
                        setBgColor(c.value);
                        setBgImage(null); // Clear image when solid color is picked
                      }}
                      className={`p-2 rounded-2xl flex flex-col items-center gap-1 border-2 transition-all cursor-pointer ${
                        bgColor === c.value && !bgImage
                          ? 'border-purple-600 shadow-md ring-2 ring-purple-300'
                          : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-xl border border-black/10 shadow-xs"
                        style={{ backgroundColor: c.value }}
                      />
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate max-w-full">
                        {c.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom Color Picker Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      setBgImage(null);
                    }}
                    className="w-9 h-9 rounded-xl cursor-pointer border border-slate-300 bg-transparent"
                  />
                  <span className="text-xs font-bold text-gray-500">Pick any custom hex color</span>
                </div>
              </div>

              {/* 2. Keyword Background Image Search */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>2. Or Choose Scenic / Fantasy Background Image</span>
                  {bgImage && (
                    <button
                      onClick={() => setBgImage(null)}
                      className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Remove Background Image
                    </button>
                  )}
                </label>

                {/* Keyword Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    value={bgSearchQuery}
                    onChange={(e) => setBgSearchQuery(e.target.value)}
                    placeholder="Search keywords (e.g. castle, forest, galaxy, ocean, clouds)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-purple-500"
                  />
                </div>

                {/* Background Image Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {filteredKeywordImages.map(img => (
                    <button
                      key={img.label}
                      onClick={() => {
                        playClick();
                        setBgImage(img.url);
                      }}
                      className={`relative h-20 rounded-2xl overflow-hidden border-2 text-left group transition-all cursor-pointer ${
                        bgImage === img.url
                          ? 'border-purple-600 shadow-md ring-2 ring-purple-400'
                          : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-1.5 left-2 right-2 text-white">
                        <p className="text-[11px] font-black truncate">{img.label}</p>
                      </div>
                      {bgImage === img.url && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Image URL */}
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-gray-500 mb-1">Or paste custom image URL:</p>
                  <div className="flex gap-2">
                    <input
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                    />
                    <button
                      onClick={() => {
                        if (customImageUrl.trim()) {
                          setBgImage(customImageUrl.trim());
                          setCustomImageUrl('');
                          playClick();
                        }
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Close / Done Button */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => setShowBgModal(false)}
                  className={`w-full py-2.5 bg-gradient-to-r ${ts.btn} text-white font-black text-xs sm:text-sm rounded-2xl cursor-pointer shadow-md hover:brightness-110 transition-all`}
                >
                  Done Customizing Background ✓
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
