import { useState, useEffect, useCallback, useRef } from 'react';
import * as idb from 'idb-keyval';

export function useIdbStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      try {
        // Wait for the single-flight disk restore before reading this key. This
        // prevents a stale in-flight browser read from overwriting restored
        // lesson content after the dashboard has mounted.
        const { ensureStartupDiskRestore } = await import('../utils/diskStorage');
        await ensureStartupDiskRestore();

        // Try migrating from localStorage first
        const lsItem = window.localStorage.getItem(key);
        if (lsItem !== null) {
          try {
            const parsed = JSON.parse(lsItem);
            await idb.set(key, parsed);
            window.localStorage.removeItem(key);
            if (isMounted.current) {
              setStoredValue(parsed);
              setIsLoaded(true);
            }
            return;
          } catch (e) {
            console.warn(`Failed to parse localStorage item for ${key}, falling back to idb`);
          }
        }
        
        const item = await idb.get<T>(key);
        if (isMounted.current) {
          if (item !== undefined) {
            setStoredValue(item);
          } else {
             await idb.set(key, initialValue);
          }
          setIsLoaded(true);
        }
      } catch (error) {
        console.error(`Error reading ${key} from idb:`, error);
        if (isMounted.current) setIsLoaded(true);
      }
    })();
    return () => {
      isMounted.current = false;
    };
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      // Fire and forget save
      idb.set(key, valueToStore).catch(err => {
        console.error(`Error setting ${key} to idb:`, err);
      });
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue, isLoaded];
}
