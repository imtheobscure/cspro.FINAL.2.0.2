import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { THEME_CONFIG, RARITY_BADGE, generateId } from '../utils/helpers';
import type { Item, Rarity } from '../types';

const RARITY_GLOW: Record<Rarity,string>={common:'rgba(156,163,175,0.3)',rare:'rgba(59,130,246,0.5)',epic:'rgba(168,85,247,0.6)',legendary:'rgba(251,191,36,0.7)'};
const RARITY_BG: Record<Rarity,string>={common:'linear-gradient(145deg,rgba(30,30,35,0.95),rgba(40,40,50,0.9))',rare:'linear-gradient(145deg,rgba(10,20,50,0.95),rgba(20,40,80,0.9))',epic:'linear-gradient(145deg,rgba(30,10,50,0.95),rgba(50,20,80,0.9))',legendary:'linear-gradient(145deg,rgba(50,35,5,0.95),rgba(70,50,10,0.9))'};

function PremiumItemCard({item,canBuy,onBuy,onEdit,onDelete,onRestock}:{item:Item;canBuy:boolean;onBuy:()=>void;onEdit:()=>void;onDelete:()=>void;onRestock:()=>void}) {
  const [tilt,setTilt]=useState({x:0,y:0});const [hovered,setHovered]=useState(false);
  const glow=RARITY_GLOW[item.rarity]; const isShiny=item.rarity==='epic'||item.rarity==='legendary';
  return (
    <div style={{perspective:'800px'}} onMouseMove={e=>{const r=e.currentTarget.getBoundingClientRect();setTilt({x:((e.clientX-r.left)/r.width-0.5)*20,y:((e.clientY-r.top)/r.height-0.5)*-20});}} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>{setTilt({x:0,y:0});setHovered(false);}}>
      <motion.div animate={{rotateY:tilt.x,rotateX:tilt.y}} transition={{type:'spring',stiffness:400,damping:30}}
        className="relative rounded-2xl overflow-hidden" style={{background:RARITY_BG[item.rarity],border:`2px solid ${glow}`,boxShadow:hovered?`0 15px 50px ${glow},0 0 0 1px ${glow}`:`0 4px 20px rgba(0,0,0,0.4)`,transformStyle:'preserve-3d'}}>
        {/* Continuous shine for epic/legendary */}
        {isShiny&&!hovered&&(<motion.div className="absolute inset-0 pointer-events-none z-10" style={{background:`linear-gradient(105deg,transparent 30%,${glow.replace(/[\d.]+\)$/,'0.08)')} 48%,rgba(255,255,255,0.06) 50%,${glow.replace(/[\d.]+\)$/,'0.08)')} 52%,transparent 70%)`}} animate={{x:['-200%','200%']}} transition={{duration:4,repeat:Infinity,repeatDelay:3}}/>)}
        {hovered&&(<motion.div className="absolute inset-0 pointer-events-none z-10" style={{background:'linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.06) 45%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.06) 55%,transparent 80%)'}} initial={{x:'-100%'}} animate={{x:'200%'}} transition={{duration:0.8}}/>)}
        {/* Rarity badge */}
        <div className="absolute top-3 right-3 z-20"><span className="text-2xl">{RARITY_BADGE[item.rarity]}</span></div>
        {/* Admin controls */}
        <div className="absolute top-3 left-3 z-20 flex gap-1">
          <button onClick={e=>{e.stopPropagation();onEdit();}} title="Edit item details" className="w-7 h-7 rounded-lg bg-black/60 text-yellow-400 text-sm flex items-center justify-center hover:bg-black/80">✏️</button>
          <button onClick={e=>{e.stopPropagation();onRestock();}} title="Add +5 stock" className="w-7 h-7 rounded-lg bg-black/60 text-green-400 text-sm flex items-center justify-center hover:bg-black/80">📦</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} title="Delete this item permanently" className="w-7 h-7 rounded-lg bg-black/60 text-red-400 text-sm flex items-center justify-center hover:bg-black/80">🗑️</button>
        </div>
        <div className="p-6" style={{transform:'translateZ(10px)'}}>
          <motion.div animate={hovered?{y:-8,scale:1.15}:{y:0,scale:1}} className="text-center mb-4">
            <span className="text-7xl md:text-8xl block" style={{filter:`drop-shadow(0 8px 25px ${glow}) drop-shadow(0 0 40px ${glow})`}}>{item.emoji}</span>
          </motion.div>
          <h3 className="text-center font-black text-2xl mb-1 text-white">{item.name}</h3>
          <p className="text-center text-sm font-bold uppercase tracking-widest mb-4 opacity-60" style={{color:item.rarity==='legendary'?'#fbbf24':item.rarity==='epic'?'#a855f7':item.rarity==='rare'?'#3b82f6':'#9ca3af'}}>{item.rarity}</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-black/30"><p className="text-xs text-gray-500">ATK</p><p className="text-xl font-black text-red-400">+{item.atk}</p></div>
            <div className="text-center p-2 rounded-lg bg-black/30"><p className="text-xs text-gray-500">DEF</p><p className="text-xl font-black text-blue-400">+{item.def}</p></div>
            <div className="text-center p-2 rounded-lg bg-black/30"><p className="text-xs text-gray-500">STOCK</p><p className="text-xl font-black text-gray-300">{item.stock>0?item.stock:'—'}</p></div>
          </div>
          <p className="text-sm text-gray-400 text-center mb-4 leading-relaxed">{item.description}</p>
          <div className="flex items-center justify-center mb-3"><span className="text-2xl font-black text-yellow-400">{item.cost} 💰</span></div>
          <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={onBuy} disabled={!canBuy||item.stock===0} title={canBuy&&item.stock>0?'Buy this item':'Cannot buy'}
            className="w-full py-3 rounded-xl font-black text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{background:canBuy&&item.stock>0?glow.replace(/[\d.]+\)$/,'1)'):'#333',color:canBuy&&item.stock>0?'#000':'#666'}}>
            {item.stock===0?'SOLD OUT':canBuy?'⚡ ACQUIRE':'💰 NEED MORE'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export function ShopForge() {
  const {state,dispatch}=useGame();const cfg=THEME_CONFIG[state.theme];
  const [mode,setMode]=useState<'shop'|'forge'>('shop');const [filter,setFilter]=useState<'all'|Rarity>('all');
  const [selectedBuyer,setSelectedBuyer]=useState('');const [buyerSearch,setBuyerSearch]=useState('');const [showDropdown,setShowDropdown]=useState(false);
  const [editingItem,setEditingItem]=useState<Item|null>(null);
  const [forgeItem,setForgeItem]=useState({name:'',emoji:'⚔️',rarity:'common' as Rarity,cost:100,stock:5,atk:0,def:0,vendettaDebuff:0,description:''});
  const filteredItems=state.items.filter(i=>i.theme===state.theme&&(filter==='all'||i.rarity===filter));
  const buyerLearner=state.learners.find(l=>l.id===selectedBuyer);
  const filteredLearners=state.learners.filter(l=>l.name.toLowerCase().includes(buyerSearch.toLowerCase()));
  const forgeNewItem=()=>{if(!forgeItem.name.trim())return;dispatch({type:'ADD_ITEM',payload:{...forgeItem,id:generateId(),theme:state.theme}});setForgeItem({name:'',emoji:'⚔️',rarity:'common',cost:100,stock:5,atk:0,def:0,vendettaDebuff:0,description:''});setMode('shop');};

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28 md:pb-8 relative">
      {/* Background — absolute to avoid covering sidebar */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <img src="./images/shop-bg.jpg" alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.05) saturate(0.3)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(5,3,2,0.93),rgba(3,2,1,0.97))' }} />
      </div>
      <div className="relative z-10 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h2 className="text-3xl font-black text-white uppercase tracking-wider">{state.theme==='mafia'?'🏪':'🪨'} Syndicate Armory</h2><p className="text-lg text-gray-500">Premium weapons, armor & artifacts</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setMode('shop')} title="Browse & buy items" className="px-4 py-2 rounded-xl text-base font-bold border-2 transition-all" style={{borderColor:mode==='shop'?cfg.neonColor:'#333',background:mode==='shop'?`${cfg.neonColor}20`:'transparent',color:mode==='shop'?cfg.neonColor:'#666'}}>🛒 Shop</button>
          <button onClick={()=>setMode('forge')} title="Manually create a new item" className="px-4 py-2 rounded-xl text-base font-bold border-2 transition-all" style={{borderColor:mode==='forge'?cfg.neonColor:'#333',background:mode==='forge'?`${cfg.neonColor}20`:'transparent',color:mode==='forge'?cfg.neonColor:'#666'}}>⚒️ Forge</button>
        </div>
      </div>

      {/* Edit item modal */}
      {editingItem&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="rounded-2xl border-2 p-6 space-y-4" style={{borderColor:'#fbbf2430',background:'rgba(20,15,5,0.95)'}}>
          <h3 className="text-xl font-black text-white">✏️ Edit: {editingItem.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Name</label><input value={editingItem.name} onChange={e=>setEditingItem({...editingItem,name:e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-base"/></div>
            <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Emoji</label><input value={editingItem.emoji} onChange={e=>setEditingItem({...editingItem,emoji:e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-2xl text-center"/></div>
            <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Cost</label><input type="number" value={editingItem.cost} onChange={e=>setEditingItem({...editingItem,cost:Number(e.target.value)})} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-base"/></div>
            <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Stock</label><input type="number" value={editingItem.stock} onChange={e=>setEditingItem({...editingItem,stock:Number(e.target.value)})} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-base"/></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">ATK</label><input type="number" value={editingItem.atk} onChange={e=>setEditingItem({...editingItem,atk:Number(e.target.value)})} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-base"/></div>
            <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">DEF</label><input type="number" value={editingItem.def} onChange={e=>setEditingItem({...editingItem,def:Number(e.target.value)})} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-base"/></div>
            <div><label className="text-xs text-gray-400 uppercase font-bold block mb-1">Rarity</label>
              <select value={editingItem.rarity} onChange={e=>setEditingItem({...editingItem,rarity:e.target.value as Rarity})} className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-base"><option value="common">Common</option><option value="rare">Rare</option><option value="epic">Epic</option><option value="legendary">Legendary</option></select></div>
          </div>
          <textarea value={editingItem.description} onChange={e=>setEditingItem({...editingItem,description:e.target.value})} rows={2} placeholder="Description" className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white text-base resize-none"/>
          <div className="flex gap-3">
            <button onClick={()=>{dispatch({type:'UPDATE_ITEM',payload:{id:editingItem.id,updates:editingItem}});setEditingItem(null);}} title="Save changes" className="flex-1 py-3 rounded-xl font-bold text-lg border-2 border-green-700/40 bg-green-900/20 text-green-300">✓ Save Changes</button>
            <button onClick={()=>setEditingItem(null)} className="px-6 py-3 rounded-xl font-bold text-lg border-2 border-gray-700 text-gray-400">Cancel</button>
          </div>
        </motion.div>
      )}

      {mode==='shop'&&(
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative w-full sm:w-72">
              <div className="text-sm text-gray-400 mb-1 font-bold uppercase">Buying For:</div>
              <button onClick={()=>setShowDropdown(!showDropdown)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all" style={{borderColor:selectedBuyer?`${cfg.neonColor}40`:'#333',background:'rgba(10,10,20,0.9)'}} title="Select buyer">
                {buyerLearner?(<><span className="text-3xl">{buyerLearner.emoji}</span><span className="text-lg text-white font-bold">{buyerLearner.name}</span><span className="ml-auto text-green-400 font-bold">{buyerLearner.coins}💰</span></>):(<span className="text-lg text-gray-500">Select a buyer…</span>)}
              </button>
              {showDropdown&&(<div className="absolute top-full left-0 right-0 mt-1 rounded-xl border-2 border-gray-700 bg-gray-900/98 z-50 max-h-60 overflow-y-auto shadow-2xl"><input value={buyerSearch} onChange={e=>setBuyerSearch(e.target.value)} placeholder="Search…" className="w-full bg-black/50 border-b border-gray-700 px-4 py-2 text-white text-base" autoFocus/><button onClick={()=>{setSelectedBuyer('');setShowDropdown(false);setBuyerSearch('');}} className="w-full px-4 py-2 text-left text-base text-gray-500 hover:bg-gray-800">Browse only</button>{filteredLearners.map(l=>(<button key={l.id} onClick={()=>{setSelectedBuyer(l.id);setShowDropdown(false);setBuyerSearch('');}} className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-800"><span className="text-2xl">{l.emoji}</span><span className="text-base text-white font-bold">{l.name}</span><span className="ml-auto text-green-400 text-sm font-bold">{l.coins}💰</span></button>))}</div>)}
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all','common','rare','epic','legendary'] as const).map(r=>(<button key={r} onClick={()=>setFilter(r)} title={`Filter: ${r}`} className="px-3 py-1.5 rounded-lg text-sm font-bold border transition-all capitalize" style={{borderColor:filter===r?(RARITY_GLOW[r as Rarity]||cfg.neonColor):'#333',background:filter===r?'rgba(255,255,255,0.08)':'transparent',color:filter===r?'#fff':'#555'}}>{r!=='all'&&RARITY_BADGE[r as Rarity]} {r}</button>))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item=>(<PremiumItemCard key={item.id} item={item} canBuy={buyerLearner?buyerLearner.coins>=item.cost:false}
              onBuy={()=>{if(selectedBuyer)dispatch({type:'PURCHASE_ITEM',payload:{learnerId:selectedBuyer,itemId:item.id}});}}
              onEdit={()=>setEditingItem({...item})}
              onDelete={()=>{if(confirm(`Delete "${item.name}"?`))dispatch({type:'REMOVE_ITEM',payload:item.id});}}
              onRestock={()=>dispatch({type:'UPDATE_ITEM',payload:{id:item.id,updates:{stock:item.stock+5}}})}
            />))}
            {filteredItems.length===0&&(<div className="col-span-full text-center py-16 text-gray-500"><p className="text-5xl mb-3">📦</p><p className="text-xl">No items. Use God Mode AI to generate items.</p></div>)}
          </div>
        </>
      )}

      {mode==='forge'&&(
        <div className="max-w-2xl rounded-2xl border-2 p-6 space-y-4" style={{borderColor:`${cfg.neonColor}25`,background:'rgba(10,10,20,0.9)'}}>
          <h3 className="text-2xl font-black text-white">⚒️ Manual Item Forge</h3>
          <p className="text-base text-gray-400">Create items manually. For bulk creation, use God Mode → AI Prompt.</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-400 uppercase font-bold block mb-1">Emoji</label><input value={forgeItem.emoji} onChange={e=>setForgeItem(p=>({...p,emoji:e.target.value}))} className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-3xl text-center"/></div>
            <div><label className="text-sm text-gray-400 uppercase font-bold block mb-1">Rarity</label><select value={forgeItem.rarity} onChange={e=>setForgeItem(p=>({...p,rarity:e.target.value as Rarity}))} className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-lg"><option value="common">⚪ Common</option><option value="rare">🔵 Rare</option><option value="epic">🟣 Epic</option><option value="legendary">🟡 Legendary</option></select></div>
          </div>
          <div><label className="text-sm text-gray-400 uppercase font-bold block mb-1">Name</label><input value={forgeItem.name} onChange={e=>setForgeItem(p=>({...p,name:e.target.value}))} placeholder="Item name" className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-lg"/></div>
          <div><label className="text-sm text-gray-400 uppercase font-bold block mb-1">Description</label><textarea value={forgeItem.description} onChange={e=>setForgeItem(p=>({...p,description:e.target.value}))} rows={2} className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-base resize-none"/></div>
          <div className="grid grid-cols-4 gap-3">
            {[{k:'atk' as const,l:'ATK'},{k:'def' as const,l:'DEF'},{k:'cost' as const,l:'Cost'},{k:'stock' as const,l:'Stock'}].map(f=>(<div key={f.k}><label className="text-sm text-gray-400 uppercase font-bold block mb-1">{f.l}</label><input type="number" value={forgeItem[f.k]} onChange={e=>setForgeItem(p=>({...p,[f.k]:Number(e.target.value)}))} className="w-full bg-black/50 border-2 border-gray-700 rounded-xl px-4 py-3 text-white text-lg"/></div>))}
          </div>
          <button onClick={forgeNewItem} title="Create and add to shop" className="w-full py-4 rounded-xl font-black text-xl border-2" style={{borderColor:cfg.neonColor,color:'#000',background:cfg.neonColor}}>⚒️ FORGE ITEM</button>
        </div>
      )}
      </div>
    </div>
  );
}
