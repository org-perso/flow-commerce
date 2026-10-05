"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { addDays, businessToday } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  parseHour,
  presetOf,
  SLOT_PRESETS,
  slotRange,
  type TimeSlot,
} from "./time-slot";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
        active
          ? "border-primary bg-primary font-semibold text-primary-foreground"
          : "bg-card font-medium hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export { Chip };

/** Planned day: today, tomorrow or another date (Madagascar calendar). */
export function DateChoice({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const today = businessToday();
  const tomorrow = addDays(today, 1);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip active={value === today} onClick={() => onChange(today)}>
        Aujourd’hui
      </Chip>
      <Chip active={value === tomorrow} onClick={() => onChange(tomorrow)}>
        Demain
      </Chip>
      <Input
        type="date"
        aria-label="Autre date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={cn(
          "h-8 w-40",
          value !== today &&
            value !== tomorrow &&
            "border-primary ring-1 ring-primary",
        )}
      />
    </div>
  );
}

/** Hours: any time, a preset (Matin, Midi…) or a custom range (one bound may be empty). */
export function TimeSlotChoice({
  value,
  onChange,
}: {
  value: TimeSlot | null;
  onChange: (slot: TimeSlot | null) => void;
}) {
  const preset = presetOf(value);
  const isCustom = !!value && (value.from || value.to) && !preset;
  const [customOpen, setCustomOpen] = useState(!!isCustom);
  const [fromText, setFromText] = useState(value?.from ?? "");
  const [toText, setToText] = useState(value?.to ?? "");
  const [error, setError] = useState<string>();

  const applyCustom = (from: string, to: string) => {
    const f = from.trim() ? parseHour(from) : null;
    const t = to.trim() ? parseHour(to) : null;
    if ((from.trim() && !f) || (to.trim() && !t))
      return setError("Heure invalide (ex. 9h, 14h30).");
    if (f && t && f >= t)
      return setError("L’heure de fin doit être après le début.");
    setError(undefined);
    onChange(f || t ? { from: f, to: t } : null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Chip
          active={!value && !customOpen}
          onClick={() => {
            setCustomOpen(false);
            onChange(null);
          }}
        >
          Toute la journée
        </Chip>
        {SLOT_PRESETS.map((p) => (
          <Chip
            key={p.key}
            active={preset === p.key && !customOpen}
            onClick={() => {
              setCustomOpen(false);
              onChange({ ...p.slot });
            }}
          >
            {p.label} <span className="opacity-70">{slotRange(p.slot)}</span>
          </Chip>
        ))}
        <Chip active={customOpen} onClick={() => setCustomOpen(true)}>
          Autre…
        </Chip>
      </div>
      {customOpen && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Entre</span>
            <Input
              aria-label="Heure de début"
              placeholder="9h"
              value={fromText}
              onChange={(e) => setFromText(e.target.value)}
              onBlur={() => applyCustom(fromText, toText)}
              className="h-8 w-20"
            />
            <span className="text-muted-foreground">et</span>
            <Input
              aria-label="Heure de fin"
              placeholder="11h"
              value={toText}
              onChange={(e) => setToText(e.target.value)}
              onBlur={() => applyCustom(fromText, toText)}
              className="h-8 w-20"
            />
          </div>
          {error ? (
            <p className="text-xs text-danger">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Laissez un côté vide pour « avant » ou « après ».
            </p>
          )}
        </div>
      )}
    </div>
  );
}
