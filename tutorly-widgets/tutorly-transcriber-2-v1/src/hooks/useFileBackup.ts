import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { TranscriptEntry } from '../types';

const BACKUP_DIR_KEY = 'tutorly_backup_dir';

export function useFileBackup() {
  const [isReady, setIsReady] = useState(false);
  const [backupDir, setBackupDir] = useState<FileSystemDirectoryHandle | null>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const sessionFileNameRef = useRef<string>('');
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const backupDirRef = useRef<FileSystemDirectoryHandle | null>(null);
  backupDirRef.current = backupDir;

  useEffect(() => {
    (async () => {
      try {
        const { get } = await import('idb-keyval');
        const dir = await get<FileSystemDirectoryHandle>(BACKUP_DIR_KEY);
        if (!dir) return;
        let perm = 'granted';
        if ((dir as any).queryPermission) {
          perm = await (dir as any).queryPermission({ mode: 'readwrite' });
        }
        if (perm === 'granted') {
          setBackupDir(dir);
          setIsReady(true);
        } else if (perm === 'prompt' && (dir as any).requestPermission) {
          // Browser didn't auto-grant permission (common after page reload).
          // requestPermission shows a small permission prompt to the user.
          perm = await (dir as any).requestPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            setBackupDir(dir);
            setIsReady(true);
          }
        }
      } catch { /* no saved dir */ }
    })();
  }, []);

  const pickBackupDirectory = useCallback(async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        return { ok: false, error: 'Directory picker not supported in this browser.' } as const;
      }
      const dir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      const { set } = await import('idb-keyval');
      await set(BACKUP_DIR_KEY, dir);
      setBackupDir(dir);
      setIsReady(true);
      return { ok: true } as const;
    } catch (e: any) {
      if (e.name === 'AbortError') return { ok: false } as const;
      return { ok: false, error: e.message } as const;
    }
  }, []);

  /** Re-request permission if the browser revoked it (common after page reload). */
  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const dir = backupDirRef.current;
    if (!dir) return false;
    try {
      let perm = 'granted';
      if ((dir as any).queryPermission) {
        perm = await (dir as any).queryPermission({ mode: 'readwrite' });
      }
      if (perm === 'granted') return true;
      if ((dir as any).requestPermission) {
        perm = await (dir as any).requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') { setIsReady(true); return true; }
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const createSessionDocument = useCallback(async (sessionName: string) => {
    const dir = backupDirRef.current;
    if (!dir) return { ok: false, error: 'No backup directory selected.' } as const;
    try {
      const fileName = `${sessionName.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      fileHandleRef.current = fileHandle;
      sessionFileNameRef.current = fileName;
      const writable = await fileHandle.createWritable({ keepExistingData: false });
      await writable.write(`=== ${sessionName} ===\nStarted: ${new Date().toLocaleString()}\n\n`);
      await writable.close();
      return { ok: true } as const;
    } catch (e: any) {
      return { ok: false, error: e.message } as const;
    }
  }, []);

  const appendToFile = useCallback(async (entry: TranscriptEntry, speakerLabel: string) => {
    // If no document file has been created yet, auto-create one using the
    // first transcript entry. This covers the case where the user starts
    // transcribing without first running "New Session".
    if (!fileHandleRef.current) {
      const dir = backupDirRef.current;
      if (!dir) return;
      const ok = await ensurePermission();
      if (!ok) return;
      const ts = new Date(entry.timestamp);
      const fallbackName = `Session-${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}-${String(ts.getDate()).padStart(2,'0')}`;
      const r = await createSessionDocument(fallbackName);
      if (!r.ok) return;
    }

    const fh = fileHandleRef.current;
    if (!fh) return;

    // Serialise writes through a promise chain so two concurrent calls never
    // open a Writable on the same file handle simultaneously (the File System
    // Access API throws if you attempt that).
    const doWrite = async () => {
      try {
        const writable = await fh.createWritable({ keepExistingData: true });
        const time = new Date(entry.timestamp).toLocaleTimeString();
        let text = `[${time}] ${speakerLabel}: ${entry.text}\n`;
        if (entry.translation) text += `  -> ${entry.translation}\n`;
        const file = await fh.getFile();
        await writable.write({ type: 'write', position: file.size, data: text });
        await writable.close();
      } catch (err) {
        console.warn('[useFileBackup] appendToFile failed:', err);
      }
    };

    writeQueueRef.current = writeQueueRef.current.then(doWrite, doWrite);
    return writeQueueRef.current;
  }, [createSessionDocument, ensurePermission]);

  const clearBackup = useCallback(async () => {
    fileHandleRef.current = null;
    sessionFileNameRef.current = '';
    setBackupDir(null);
    setIsReady(false);
    const { del } = await import('idb-keyval');
    await del(BACKUP_DIR_KEY);
  }, []);

  return useMemo(() => ({
    requestFile: pickBackupDirectory,
    createSessionDocument,
    appendToFile,
    clearBackup,
    pickBackupDirectory,
    isFileBackupReady: isReady,
    backupDir,
  }), [pickBackupDirectory, createSessionDocument, appendToFile, clearBackup, isReady, backupDir]);
}
