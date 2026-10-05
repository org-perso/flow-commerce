"use client";

import { useEffect, useRef } from "react";

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
  );
};

/**
 * Single-key shortcut ("n", "/", "?") ignored while typing in a field or with a modifier.
 * The handler is kept in a ref so callers can pass inline functions.
 */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  enabled = true,
) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target)
      )
        return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      event.preventDefault();
      ref.current(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}
