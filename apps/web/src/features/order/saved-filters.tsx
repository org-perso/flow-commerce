"use client";

import { Bookmark, BookmarkPlus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorage } from "@/hooks/use-local-storage";

type SavedFilter = { name: string; query: string };

/** URL parameters that make a filter (not the page, nor the open order). */
const FILTER_KEYS = ["q", "statut", "livreur", "du", "au", "quand"];

export function filterQuery(params: URLSearchParams): string {
  const kept = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) kept.set(key, value);
  }
  return kept.toString();
}

function parse(raw: string): SavedFilter[] {
  try {
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? (list as SavedFilter[]) : [];
  } catch {
    return [];
  }
}

/**
 * Filters kept in this browser, per shop ("Livraisons de demain non payées"): one click
 * applies them again. Shown under the filters of the orders page.
 */
export function SavedFilters({
  shopId,
  current,
  onApply,
}: {
  shopId: string;
  /** The filters in use now (query string), "" when none. */
  current: string;
  onApply: (query: string) => void;
}) {
  const [raw, setRaw] = useLocalStorage(`flowco:order-filters:${shopId}`, "[]");
  const saved = parse(raw);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const save = () => {
    const label = name.trim();
    if (!label) return;
    setRaw(
      JSON.stringify([
        ...saved.filter((f) => f.name !== label),
        { name: label, query: current },
      ]),
    );
    setNaming(false);
    setName("");
  };
  const remove = (label: string) =>
    setRaw(JSON.stringify(saved.filter((f) => f.name !== label)));

  if (saved.length === 0 && !current) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {saved.map((f) => (
        <span
          key={f.name}
          className={
            f.query === current
              ? "inline-flex h-8 items-center gap-1 rounded-full border border-navy bg-navy-soft pr-1 pl-3 font-medium"
              : "inline-flex h-8 items-center gap-1 rounded-full border bg-card pr-1 pl-3"
          }
        >
          <button
            type="button"
            className="inline-flex items-center gap-1.5"
            onClick={() => onApply(f.query)}
          >
            <Bookmark className="size-3.5 text-muted-foreground" />
            {f.name}
          </button>
          <button
            type="button"
            onClick={() => remove(f.name)}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Supprimer le filtre ${f.name}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {current &&
        !saved.some((f) => f.query === current) &&
        (naming ? (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du filtre, ex. Demain non payées"
              className="h-8 w-64"
              maxLength={40}
            />
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Enregistrer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setNaming(false)}
            >
              Annuler
            </Button>
          </form>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => setNaming(true)}
          >
            <BookmarkPlus /> Enregistrer ce filtre
          </Button>
        ))}
    </div>
  );
}
