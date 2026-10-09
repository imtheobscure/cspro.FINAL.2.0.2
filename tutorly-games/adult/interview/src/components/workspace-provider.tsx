'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { defaultPreferences, type Workspace, type Profile, type Session, type SavedPack, type InterviewPack, type Scenario, type InterviewAnswer } from '@/lib/types';
import { localApi } from '@/lib/local-store';
/**
 * The workspace API, backed by this browser rather than a server.
 *
 * This used to be a `fetch` to `/api/…` with a PostgreSQL database behind it. The
 * call signature and the response envelopes are unchanged — `local-store.ts`
 * implements the same routes over `localStorage` — so every screen that talks to
 * the workspace was left exactly as it was, and the app now builds as a static
 * export with nothing to host.
 */
export async function api<T>(url: string, method = 'GET', data?: unknown): Promise<T> { try { return await localApi<T>(url, method, data); } catch (error) { throw new Error(error instanceof Error ? error.message : 'That request could not be completed. Please try again.'); } }
const emptyWorkspace: Workspace = { profile: { id: '', name: '', role: 'General', organization: '', facts: '', level: 'B1', scenario: 'job', completedLessons: [], bookmarks: [], preferences: defaultPreferences, createdAt: '' }, sessions: [], packs: [] };
type ContextValue = { workspace: Workspace; ready: boolean; error: string; refresh: () => Promise<void>; notify: (text: string, error?: boolean) => void; update: (action: unknown) => Promise<Profile>; start: (characterId: number, scenario: Scenario, packId?: string) => Promise<Session>; answer: (id: string, answer: InterviewAnswer) => Promise<Session>; importPack: (content: InterviewPack) => Promise<SavedPack>; deletePack: (id: string) => Promise<void>; deleteSession: (id: string) => Promise<void> };
const WorkspaceContext = createContext<ContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ text: string; error: boolean; id: number } | null>(null);
  const notify = useCallback((text: string, error = false) => setToast({ text, error, id: Date.now() }), []);
  const refresh = useCallback(async () => { try { const result = await api<Workspace>('/api/workspace'); setWorkspace(result); setReady(true); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load your workspace.'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5500); return () => clearTimeout(timer); }, [toast]);
  const update = useCallback(async (action: unknown) => { const { profile } = await api<{ profile: Profile }>('/api/workspace', 'PUT', action); setWorkspace(w => ({ ...w, profile })); return profile; }, []);
  const start = useCallback(async (characterId: number, scenario: Scenario, packId?: string) => { const { session } = await api<{ session: Session }>('/api/sessions', 'POST', { characterId, scenario, ...(packId ? { packId } : {}) }); setWorkspace(w => ({ ...w, sessions: [session, ...w.sessions] })); return session; }, []);
  const answer = useCallback(async (id: string, answer: InterviewAnswer) => { const { session } = await api<{ session: Session }>(`/api/sessions/${id}`, 'PATCH', answer); setWorkspace(w => ({ ...w, sessions: w.sessions.map(s => s.id === id ? session : s) })); return session; }, []);
  const importPack = useCallback(async (content: InterviewPack) => { const { pack } = await api<{ pack: SavedPack }>('/api/packs', 'POST', content); setWorkspace(w => ({ ...w, packs: [pack, ...w.packs] })); return pack; }, []);
  const deletePack = useCallback(async (id: string) => { await api('/api/packs', 'DELETE', { id }); setWorkspace(w => ({ ...w, packs: w.packs.filter(p => p.id !== id) })); }, []);
  const deleteSession = useCallback(async (id: string) => { await api(`/api/sessions/${id}`, 'DELETE', {}); setWorkspace(w => ({ ...w, sessions: w.sessions.filter(s => s.id !== id) })); }, []);
  return <WorkspaceContext.Provider value={{ workspace, ready, error, refresh, notify, update, start, answer, importPack, deletePack, deleteSession }}>{children}{toast && <div className={`toast ${toast.error ? 'toast-error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}<span>{toast.text}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}</WorkspaceContext.Provider>;
}
export function useWorkspace() { const context = useContext(WorkspaceContext); if (!context) throw new Error('WorkspaceProvider is required.'); return context; }
export function downloadFile(filename: string, content: string, type = 'application/json') { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export async function copyText(text: string) { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; } const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select(); const success = document.execCommand('copy'); textarea.remove(); if (!success) throw new Error('Clipboard access is blocked. Select and copy the text manually.'); }
