import type { BrandingSettings as BrandingType } from '../types';
import { Palette, Type, Monitor, Eye } from 'lucide-react';

interface Props {
  branding: BrandingType;
  onChange: (b: BrandingType) => void;
}

const FONTS = ['Inter', 'Georgia', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'OpenDyslexic'];

export const BrandingSettings = ({ branding, onChange }: Props) => {
  const set = (key: keyof BrandingType, value: string | boolean) => onChange({ ...branding, [key]: value });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
        <Palette className="w-5 h-5 text-purple-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Institution Branding & Appearance</h2>
          <p className="text-xs text-slate-500">Custom colors, fonts, and accessibility settings embedded in the generated standalone exam HTML file.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2"><Monitor className="w-3.5 h-3.5" />Identity</h3>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Institution / Organisation Name</label>
            <input value={branding.institutionName} onChange={e => set('institutionName', e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-purple-500" placeholder="ExamCraft Academy" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Logo URL (optional, embedded in standalone HTML)</label>
            <input value={branding.logoUrl} onChange={e => set('logoUrl', e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-purple-500" placeholder="https://example.org/logo.png" />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2"><Palette className="w-3.5 h-3.5" />Color Palette</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'primaryColor' as const, label: 'Primary', sample: branding.primaryColor },
              { key: 'secondaryColor' as const, label: 'Secondary', sample: branding.secondaryColor },
              { key: 'accentColor' as const, label: 'Accent', sample: branding.accentColor },
            ].map(c => (
              <label key={c.key} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-semibold text-slate-500">{c.label}</span>
                <input type="color" value={c.sample} onChange={e => set(c.key, e.target.value)} className="w-12 h-12 rounded-lg border-2 border-slate-300 cursor-pointer" />
                <input value={c.sample} onChange={e => set(c.key, e.target.value)} className="w-full text-[10px] font-mono text-center rounded border border-slate-300 px-1 py-0.5" />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2"><Type className="w-3.5 h-3.5" />Typography & Accessibility</h3>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Default Font Family</label>
            <select value={branding.customFont} onChange={e => set('customFont', e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-purple-500">
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Default Font Size</label>
            <select value={branding.defaultFontSize} onChange={e => set('defaultFontSize', e.target.value)} className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-purple-500">
              <option value="0.85rem">Small (13.6px)</option>
              <option value="1rem">Normal (16px)</option>
              <option value="1.1rem">Large (17.6px)</option>
              <option value="1.25rem">Extra Large (20px)</option>
            </select>
          </div>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={branding.dyslexicFriendly} onChange={e => set('dyslexicFriendly', e.target.checked)} className="mt-0.5 rounded text-purple-600" />
            <div>
              <span className="text-xs font-semibold text-slate-800 block flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-blue-500" />Dyslexic-Friendly Mode</span>
              <span className="text-[11px] text-slate-500 block leading-tight">Applies OpenDyslexic font and increases line spacing for improved readability.</span>
            </div>
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Preview</h3>
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner" style={{ backgroundColor: '#f8fafc' }}>
            <div className="p-4 flex items-center gap-3" style={{ backgroundColor: branding.primaryColor, color: '#fff' }}>
              {branding.logoUrl ? <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 rounded" /> : <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-xs font-bold">🎓</div>}
              <span className="text-sm font-bold">{branding.institutionName}</span>
            </div>
            <div className="p-4" style={{ fontFamily: branding.customFont, fontSize: branding.defaultFontSize, lineHeight: branding.dyslexicFriendly ? '2' : '1.6' }}>
              <p style={{ color: branding.secondaryColor, fontWeight: 700, marginBottom: 4 }}>Sample Exam Header</p>
              <p className="text-xs text-slate-600">This preview demonstrates how your branding will appear on the generated standalone HTML exam file.</p>
              <button className="mt-3 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: branding.accentColor }}>Begin Exam</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
