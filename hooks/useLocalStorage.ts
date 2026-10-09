import React, { useState, useEffect } from 'react';
import LZString from 'lz-string';
import * as idb from 'idb-keyval';

export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      // Backward compatibility: check if the string is uncompressed JSON
      try {
        const trimmed = item.trim();
        if (
          trimmed.startsWith('{') ||
          trimmed.startsWith('[') ||
          trimmed.startsWith('"') ||
          trimmed === 'true' ||
          trimmed === 'false' ||
          trimmed === 'null' ||
          /^-?\d/.test(trimmed)
        ) {
          return JSON.parse(item);
        }
      } catch (e) {
        // Fallback to decompression if parsing fails
      }

      // Attempt to decompress using lz-string UTF-16 compression
      const decompressed = LZString.decompressFromUTF16(item);
      if (decompressed !== null && decompressed !== '') {
        return JSON.parse(decompressed);
      }

      // If decompression failed but item was retrieved, attempt raw JSON parse as absolute fallback
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Error reading/decompressing key "${key}" in useLocalStorage:`, error);
      return initialValue;
    }
  });

  // Secondary effect to check IndexedDB if local storage had nothing
  useEffect(() => {
    if (storedValue === initialValue) {
      idb.get<T>(`fallback_storage_${key}`).then((idbVal) => {
        if (idbVal !== undefined && idbVal !== null) {
          setStoredValue(idbVal);
        }
      }).catch(() => {});
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          const jsonString = JSON.stringify(valueToStore);
          const compressed = LZString.compressToUTF16(jsonString);
          window.localStorage.setItem(key, compressed);
        } catch (innerError) {
          // If quota exceeded or error occurred, seamlessly store in IndexedDB
          try {
            idb.set(`fallback_storage_${key}`, valueToStore).catch(() => {});
          } catch (idbErr) {}
        }
        return valueToStore;
      });
    } catch (error) {
      console.warn(`Safe handling of useLocalStorage setValue for key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

