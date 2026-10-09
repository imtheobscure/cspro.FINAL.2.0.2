/* ════════════════════════════════════════════════════════════════════════════
   🏪 KIDS LEARNING KINGDOM — Mystical Reward Shop
   ════════════════════════════════════════════════════════════════════════════
   A super-gamified, screen-share-friendly 3D card shop where:
   - Teachers create items with emoji selector + attribute editor
   - Items have stock counts → when bought, stock decreases for everyone
   - The same shop is mirrored on the Learner Profile (so both teacher and
     learners see identical inventory)
   - Each item is rendered as a giant 3D rarity-based card
   - The teacher's chosen character emoji + name is shown as the Storekeeper
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoreItem, Rarity, TeacherProfile } from './types';

interface RewardShopProps {
  storeItems: StoreItem[];
  setStoreItems: React.Dispatch<React.SetStateAction<StoreItem[]>>;
  coins: number;
  onPurchase: (item: StoreItem) => void;
  teacher: TeacherProfile;
  /** When true: this is the teacher's admin view on the Dashboard so they can add/edit/delete items */
  teacherAdmin?: boolean;
  /** When true: shows a "BUY" button on every card (used in learner profile context) */
  buyerMode?: boolean;
  ownedIds?: string[];
}

const RARITY_GRADIENTS: Record<Rarity, string> = {
  common:    'from-slate-300 via-slate-200 to-slate-400',
  rare:      'from-blue-400 via-cyan-300 to-indigo-500',
  epic:      'from-purple-500 via-fuchsia-400 to-pink-600',
  legendary: 'from-amber-400 via-yellow-300 to-orange-500',
};

const RARITY_BORDERS: Record<Rarity, string> = {
  common:    'border-slate-400',
  rare:      'border-cyan-400',
  epic:      'border-fuchsia-500',
  legendary: 'border-yellow-400',
};

const RARITY_GLOW: Record<Rarity, string> = {
  common:    'shadow-[0_0_20px_rgba(148,163,184,0.5)]',
  rare:      'shadow-[0_0_25px_rgba(34,211,238,0.6)]',
  epic:      'shadow-[0_0_30px_rgba(217,70,239,0.7)]',
  legendary: 'shadow-[0_0_40px_rgba(251,191,36,0.8)]',
};

const RARITY_BADGE: Record<Rarity, string> = {
  common:    'bg-slate-500',
  rare:      'bg-cyan-500',
  epic:      'bg-fuchsia-600',
  legendary: 'bg-amber-500',
};

const CATEGORY_EMOJI: Record<NonNullable<StoreItem['category']>, string> = {
  potion:   '🧪',
  food:     '🍎',
  land:     '🌲',
  avatar:   '🎭',
  pet:      '🐾',
  special:  '⭐',
};

const COMMON_ITEM_EMOJIS = ['🧪','🍎','💖','⚔️','🛡️','🌲','🌸','🏰','🦄','🔮','⭐','🍔','🍩','🍕','🍪','🥤','🏹','🪄','📜','🗝️','💎','👑','🎁','🎮','🚀','🐉','🦋','🌈'];

/* ═══ Storekeeper banner ═══ */
const StorekeeperBanner: React.FC<{ teacher: TeacherProfile; coins: number }> = ({ teacher, coins }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-[2.5rem] p-5 mb-6 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 border-4 border-yellow-200 shadow-2xl"
  >
    <div className="absolute -right-6 -top-6 text-9xl opacity-20 select-none">🏪</div>
    <div className="absolute -left-6 -bottom-10 text-9xl opacity-20 select-none">💰</div>
    <div className="flex items-center gap-5 relative z-10">
      <motion.div
        animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-6xl shadow-2xl border-4 border-yellow-200 shrink-0"
      >
        {teacher.characterEmoji}
      </motion.div>
      <div className="flex-1 text-white">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-90">{teacher.storeOwnerTitle}</p>
        <h2 className="text-2xl md:text-3xl font-black drop-shadow">{teacher.characterName}'s Mystical Shop 🪄</h2>
        <p className="text-xs font-bold opacity-95 mt-1">"Welcome adventurer! Spend your hard-earned coins on rare treasures! 🎁"</p>
      </div>
      <div className="bg-white/20 backdrop-blur px-4 py-3 rounded-2xl border-2 border-white/40 shrink-0 text-center">
        <p className="text-[10px] font-black uppercase opacity-90 text-white">Vault</p>
        <p className="text-2xl font-black text-white">🪙 {coins}</p>
      </div>
    </div>
  </motion.div>
);

/* ═══ Item Card ═══ */
const ShopCard: React.FC<{
  item: StoreItem;
  coins: number;
  onBuy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  owned?: boolean;
  teacherAdmin?: boolean;
  buyerMode?: boolean;
}> = ({ item, coins, onBuy, onEdit, onDelete, owned, teacherAdmin, buyerMode }) => {
  const rarity = item.rarity || 'common';
  const canAfford = coins >= item.cost;
  const inStock = item.stock > 0;

  return (
    <motion.div
      whileHover={{ y: -6, rotateY: 8, rotateX: 4, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className={`relative rounded-[2rem] overflow-hidden border-4 ${RARITY_BORDERS[rarity]} ${RARITY_GLOW[rarity]} bg-gradient-to-br ${RARITY_GRADIENTS[rarity]} h-[340px] flex flex-col`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Stock badge */}
      <div className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full">
        📦 STOCK: {item.stock}
      </div>

      {/* Rarity badge */}
      <div className={`absolute top-3 right-3 z-20 ${RARITY_BADGE[rarity]} text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg`}>
        {rarity}
      </div>

      {/* Owned overlay */}
      {owned && (
        <div className="absolute inset-0 z-30 bg-emerald-600/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-3xl px-6 py-3 shadow-2xl border-4 border-emerald-500">
            <p className="text-2xl font-black text-emerald-700">✅ OWNED</p>
          </div>
        </div>
      )}

      {/* Out of stock overlay */}
      {!inStock && !owned && (
        <div className="absolute inset-0 z-30 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-3xl px-6 py-3 shadow-2xl border-4 border-red-500">
            <p className="text-2xl font-black text-red-600">😿 SOLD OUT</p>
          </div>
        </div>
      )}

      {/* Big emoji */}
      <div className="flex-1 flex items-center justify-center relative">
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="text-9xl drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}
        >
          {item.emoji}
        </motion.div>
      </div>

      {/* Info footer */}
      <div className="bg-black/40 backdrop-blur-md p-3 text-white">
        <div className="flex items-center justify-between mb-1">
          <p className="font-black text-base drop-shadow truncate">{item.name}</p>
          {item.category && <span className="text-xs">{CATEGORY_EMOJI[item.category]}</span>}
        </div>
        {item.description && (
          <p className="text-[10px] font-bold opacity-90 line-clamp-2 mb-2">{item.description}</p>
        )}

        {/* Effects/Attributes */}
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {item.effect === 'attack' && (
            <span className="text-[10px] font-black bg-red-500/80 px-2 py-0.5 rounded-full">⚔️ +{item.effectValue} ATK</span>
          )}
          {item.effect === 'defense' && (
            <span className="text-[10px] font-black bg-blue-500/80 px-2 py-0.5 rounded-full">🛡️ +{item.effectValue} DEF</span>
          )}
          {item.effect === 'heal' && (
            <span className="text-[10px] font-black bg-pink-500/80 px-2 py-0.5 rounded-full">💖 HEAL</span>
          )}
          {item.effect === 'land' && (
            <span className="text-[10px] font-black bg-green-500/80 px-2 py-0.5 rounded-full">🌲 LAND DECOR</span>
          )}
          {item.effect === 'cosmetic' && (
            <span className="text-[10px] font-black bg-purple-500/80 px-2 py-0.5 rounded-full">✨ COSMETIC</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="bg-yellow-500/90 px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1">
            🪙 {item.cost}
          </div>

          {/* Action buttons */}
          {teacherAdmin && (
            <div className="flex gap-1">
              <button
                onClick={onEdit}
                className="px-2 py-1 bg-white/30 hover:bg-white/50 rounded-lg text-[10px] font-black cursor-pointer"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={onDelete}
                className="px-2 py-1 bg-red-500/80 hover:bg-red-600 rounded-lg text-[10px] font-black cursor-pointer"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          )}

          {buyerMode && !owned && inStock && (
            <button
              onClick={onBuy}
              disabled={!canAfford}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                canAfford
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg cursor-pointer'
                  : 'bg-gray-500/60 text-white/50 cursor-not-allowed'
              }`}
            >
              {canAfford ? '✨ BUY' : '🔒 Need More'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ═══ Editor Modal ═══ */
const ItemEditor: React.FC<{
  item: Partial<StoreItem> | null;
  onSave: (item: StoreItem) => void;
  onClose: () => void;
}> = ({ item, onSave, onClose }) => {
  const [draft, setDraft] = useState<Partial<StoreItem>>(item || {
    emoji: '🧪',
    name: '',
    cost: 50,
    stock: 5,
    effect: 'attack',
    effectValue: 5,
    category: 'potion',
    rarity: 'common',
    description: '',
  });

  if (!item) return null;

  const handleSave = () => {
    if (!draft.name?.trim()) {
      alert('Please give the item a name!');
      return;
    }
    const final: StoreItem = {
      id: draft.id || `item-${Date.now()}`,
      emoji: draft.emoji || '🧪',
      name: draft.name.trim(),
      cost: draft.cost || 50,
      stock: draft.stock ?? 5,
      effect: (draft.effect as any) || 'cosmetic',
      effectValue: draft.effectValue,
      category: draft.category || 'special',
      rarity: draft.rarity || 'common',
      description: draft.description || '',
    };
    onSave(final);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-[2.5rem] shadow-2xl border-4 border-white/80 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 p-5 text-white rounded-t-[2.5rem] flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">🛠️ {draft.id ? 'Edit Item' : 'Forge New Item'}</h2>
          <button onClick={onClose} className="w-9 h-9 bg-white/20 rounded-full font-black hover:bg-white/30 cursor-pointer">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Emoji selector */}
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-2 uppercase">Emoji * (Big visible icon)</label>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-20 h-20 rounded-2xl bg-white border-4 border-indigo-200 flex items-center justify-center text-5xl shadow">{draft.emoji}</div>
              <input
                type="text"
                value={draft.emoji || ''}
                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                placeholder="Type or paste emoji"
                className="flex-1 p-3 bg-white border-2 border-indigo-200 rounded-xl font-black text-2xl outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-white/60 rounded-xl border border-indigo-100">
              {COMMON_ITEM_EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setDraft({ ...draft, emoji: em })}
                  className={`w-9 h-9 text-2xl rounded-lg hover:bg-indigo-100 cursor-pointer ${draft.emoji === em ? 'bg-indigo-200 ring-2 ring-indigo-500' : ''}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Name & description */}
          <div>
            <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Item Name *</label>
            <input
              value={draft.name || ''}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g., Magic Attack Elixir"
              className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Description</label>
            <textarea
              rows={2}
              value={draft.description || ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Cool description for kids..."
              className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold outline-none text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Cost (🪙)</label>
              <input
                type="number" min={1}
                value={draft.cost || 0}
                onChange={(e) => setDraft({ ...draft, cost: parseInt(e.target.value) || 0 })}
                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Stock 📦</label>
              <input
                type="number" min={0}
                value={draft.stock ?? 0}
                onChange={(e) => setDraft({ ...draft, stock: parseInt(e.target.value) || 0 })}
                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-black outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Category</label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as any })}
                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold cursor-pointer outline-none"
              >
                <option value="potion">🧪 Potion</option>
                <option value="food">🍎 Food</option>
                <option value="land">🌲 Land Decor</option>
                <option value="avatar">🎭 Avatar Cosmetic</option>
                <option value="pet">🐾 Pet Item</option>
                <option value="special">⭐ Special</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Rarity</label>
              <select
                value={draft.rarity}
                onChange={(e) => setDraft({ ...draft, rarity: e.target.value as Rarity })}
                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold cursor-pointer outline-none"
              >
                <option value="common">⚪ Common</option>
                <option value="rare">🔵 Rare</option>
                <option value="epic">🟣 Epic</option>
                <option value="legendary">🟡 Legendary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Effect Type</label>
              <select
                value={draft.effect}
                onChange={(e) => setDraft({ ...draft, effect: e.target.value as any })}
                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold cursor-pointer outline-none"
              >
                <option value="attack">⚔️ Attack +</option>
                <option value="defense">🛡️ Defense +</option>
                <option value="heal">💖 Heal / Mood</option>
                <option value="land">🌲 Land Decor</option>
                <option value="cosmetic">✨ Cosmetic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-indigo-950 mb-1 uppercase">Effect Value</label>
              <input
                type="number"
                value={draft.effectValue || 0}
                onChange={(e) => setDraft({ ...draft, effectValue: parseInt(e.target.value) || 0 })}
                className="w-full p-3 bg-white border-2 border-indigo-200 rounded-xl font-black outline-none"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="pt-4 border-t-2 border-dashed border-indigo-200">
            <p className="text-xs font-black text-indigo-950 mb-2 uppercase">📌 Live Card Preview</p>
            <div className="max-w-xs mx-auto">
              <ShopCard
                item={{
                  id: draft.id || 'preview',
                  emoji: draft.emoji || '🧪',
                  name: draft.name || 'Item Name',
                  cost: draft.cost || 0,
                  stock: draft.stock ?? 0,
                  effect: (draft.effect as any) || 'cosmetic',
                  effectValue: draft.effectValue,
                  category: draft.category,
                  rarity: draft.rarity,
                  description: draft.description,
                }}
                coins={9999}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl font-black cursor-pointer">Cancel</button>
            <button onClick={handleSave} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black shadow-lg cursor-pointer">
              💾 Save Item
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ═══ Main Reward Shop ═══ */
export const RewardShop: React.FC<RewardShopProps> = ({
  storeItems, setStoreItems, coins, onPurchase, teacher,
  teacherAdmin = false, buyerMode = false, ownedIds = [],
}) => {
  const [filter, setFilter] = useState<'all' | NonNullable<StoreItem['category']>>('all');
  const [editing, setEditing] = useState<Partial<StoreItem> | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return storeItems;
    return storeItems.filter(i => i.category === filter);
  }, [storeItems, filter]);

  const handleSaveItem = (item: StoreItem) => {
    setStoreItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? item : i);
      return [...prev, item];
    });
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item from the shop forever?')) {
      setStoreItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleBuy = (item: StoreItem) => {
    if (item.stock <= 0) { alert('😿 This item is sold out!'); return; }
    if (coins < item.cost) { alert('🪙 Not enough coins! Earn more XP first!'); return; }
    onPurchase(item);
  };

  return (
    <div className="space-y-5">
      <StorekeeperBanner teacher={teacher} coins={coins} />

      {/* Filters & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 backdrop-blur rounded-3xl p-4 border-2 border-white/80 shadow-xl">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all' as const, label: 'All', emoji: '🌟' },
            { id: 'potion' as const, label: 'Potions', emoji: '🧪' },
            { id: 'food' as const, label: 'Food', emoji: '🍎' },
            { id: 'land' as const, label: 'Land', emoji: '🌲' },
            { id: 'avatar' as const, label: 'Avatar', emoji: '🎭' },
            { id: 'pet' as const, label: 'Pet', emoji: '🐾' },
            { id: 'special' as const, label: 'Special', emoji: '⭐' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 cursor-pointer transition-all ${
                filter === c.id ? 'bg-indigo-600 text-white border-indigo-700 shadow' : 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {teacherAdmin && (
          <button
            onClick={() => setEditing({})}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black rounded-2xl shadow-lg hover:scale-105 transition-transform cursor-pointer text-sm"
          >
            ➕ Forge New Item
          </button>
        )}
      </div>

      {/* Item Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/70 rounded-3xl border-4 border-dashed border-indigo-200">
          <div className="text-7xl mb-3">🪄</div>
          <p className="text-xl font-black text-indigo-950">The shop is empty!</p>
          <p className="text-sm font-bold text-gray-500 mt-1">
            {teacherAdmin ? 'Click "Forge New Item" to create your first treasure!' : 'The storekeeper hasn\'t stocked any items yet!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <ShopCard
              key={item.id}
              item={item}
              coins={coins}
              owned={ownedIds.includes(item.id)}
              teacherAdmin={teacherAdmin}
              buyerMode={buyerMode}
              onBuy={() => handleBuy(item)}
              onEdit={() => setEditing(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <ItemEditor
            item={editing}
            onSave={handleSaveItem}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RewardShop;
