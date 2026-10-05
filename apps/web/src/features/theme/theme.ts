"use client";

import { useEffect } from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "flowco:theme";

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "Clair",
  dark: "Sombre",
  system: "Comme le système",
};

/**
 * Runs in <head> before the first paint, so a dark page never flashes white.
 * Kept as a string: it must not wait for React.
 */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_KEY}")||"system";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

function apply(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** The chosen theme, remembered in this browser; "system" follows the computer's setting. */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [stored, setStored] = useLocalStorage(THEME_KEY, "system");
  const choice: ThemeChoice =
    stored === "light" || stored === "dark" ? stored : "system";

  useEffect(() => {
    apply(choice);
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  return [choice, setStored];
}
