"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "flowco-local-storage";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A string kept in localStorage, shared by every component that reads the same key. */
export function useLocalStorage(
  key: string,
  fallback: string,
): [string, (value: string) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
  const setValue = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Private mode: the value only lasts until reload.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, setValue];
}

/** Last shop opened, to come back to it. */
export const LAST_SHOP_KEY = "flowco:last-shop";

export function rememberShop(shopId: string) {
  try {
    window.localStorage.setItem(LAST_SHOP_KEY, shopId);
  } catch {
    // ignore
  }
}

export function lastShop(): string | null {
  return typeof window === "undefined" ? null : read(LAST_SHOP_KEY);
}
