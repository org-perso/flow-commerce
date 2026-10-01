import { startTransition, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { AppText, FilterChips, TextField } from '@/components/ui';
import { theme } from '@/theme';
import { formatHour } from '@/utils/format';

import { parseHour, presetOf, SLOT_PRESETS, type SlotPresetKey, type TimeSlot } from './time-slot';

type Kind = 'before' | 'after' | 'between';

function kindOf(slot: TimeSlot | null): Kind {
  if (slot?.from && !slot.to) return 'after';
  if (slot?.to && !slot.from) return 'before';
  return 'between';
}

/**
 * Free hour field: typed as people say it ("11h", "14h30", "14:30"). Reports the parsed
 * "HH:MM", or null while the text is empty or not an hour.
 */
function HourField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string | null;
  onChange: (hhmm: string | null) => void;
  error?: string;
}) {
  const [text, setText] = useState(value ? formatHour(value) : '');
  const invalid = text.trim() !== '' && parseHour(text) === null;
  return (
    <View style={styles.field}>
      <TextField
        label={label}
        value={text}
        onChangeText={(next) => {
          setText(next);
          onChange(parseHour(next));
        }}
        placeholder="Ex. 14h30"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        error={invalid ? 'Heure attendue, ex. 11h ou 14h30.' : error}
      />
    </View>
  );
}

type Choice = 'any' | SlotPresetKey | 'custom';

const CHOICES: { value: Choice; label: string; hours?: string }[] = [
  { value: 'any', label: 'Toute la journée' },
  ...SLOT_PRESETS.map((p) => ({
    value: p.key,
    label: p.label,
    hours: `${formatHour(p.slot.from)}–${formatHour(p.slot.to)}`,
  })),
  { value: 'custom', label: 'Autre…', hours: 'avant, après, entre' },
];

const KIND_OPTIONS = [
  { value: 'before', label: 'Avant' },
  { value: 'after', label: 'Après' },
  { value: 'between', label: 'Entre' },
] as const;

/** A slot tile: name and its hours, laid out in a wrapping grid (all visible, no scroll). */
function SlotTile({
  label,
  hours,
  selected,
  onPress,
}: {
  label: string;
  hours?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="label" color={selected ? 'onNavy' : 'ink'} style={styles.strong}>
        {label}
      </AppText>
      {hours && (
        <AppText variant="caption" color={selected ? 'onNavyMuted' : 'inkMuted'}>
          {hours}
        </AppText>
      )}
    </Pressable>
  );
}

/**
 * Time slot of the planned day: any time, a one-tap slot (Matin, Midi…), or "Autre…" to type
 * "avant 11h", "après 17h" or "entre 14h et 16h". The tile lights up at once; the order form
 * around (large) is updated in a transition, so the tap never feels slow.
 */
export function TimeSlotChoice({
  value,
  onChange,
}: {
  value: TimeSlot | null;
  onChange: (slot: TimeSlot | null) => void;
}) {
  const [choice, setChoice] = useState<Choice>(!value ? 'any' : (presetOf(value) ?? 'custom'));
  const [kind, setKind] = useState<Kind>(kindOf(value));
  const report = (slot: TimeSlot | null) => startTransition(() => onChange(slot));
  // "Entre": both hours are kept here while typed; the slot is set once they make sense.
  const [between, setBetweenState] = useState({
    from: value?.from && value.to ? value.from : null,
    to: value?.from && value.to ? value.to : null,
  });
  const setBetween = (update: (b: typeof between) => typeof between) => {
    const next = update(between);
    setBetweenState(next);
    report(next.from && next.to && next.from < next.to ? { from: next.from, to: next.to } : null);
  };

  const pick = (next: Choice) => {
    setChoice(next);
    if (next === 'custom') return report(null);
    const chosen = SLOT_PRESETS.find((p) => p.key === next);
    report(chosen ? { ...chosen.slot } : null);
  };

  const pickKind = (next: Kind) => {
    setKind(next);
    // A new kind starts empty: the fields below are typed again.
    report(null);
    setBetweenState({ from: null, to: null });
  };

  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        {CHOICES.map((c) => (
          <SlotTile
            key={c.value}
            label={c.label}
            hours={c.hours}
            selected={choice === c.value}
            onPress={() => pick(c.value)}
          />
        ))}
      </View>

      {choice === 'custom' && (
        <View style={styles.custom}>
          <FilterChips options={KIND_OPTIONS} value={kind} onChange={pickKind} />
          {kind === 'before' && (
            <HourField
              key="before"
              label="Avant"
              value={value?.to ?? null}
              onChange={(to) => report(to ? { from: null, to } : null)}
            />
          )}
          {kind === 'after' && (
            <HourField
              key="after"
              label="Après"
              value={value?.from ?? null}
              onChange={(from) => report(from ? { from, to: null } : null)}
            />
          )}
          {kind === 'between' && (
            <View style={styles.row}>
              <HourField
                label="De"
                value={between.from}
                onChange={(from) => setBetween((b) => ({ ...b, from }))}
              />
              <HourField
                label="À"
                value={between.to}
                onChange={(to) => setBetween((b) => ({ ...b, to }))}
                error={
                  between.from && between.to && between.to <= between.from
                    ? 'Après l’heure de début.'
                    : undefined
                }
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: theme.sizes.tapMin,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  tileSelected: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  field: {
    flex: 1,
  },
  root: {
    gap: theme.spacing[2],
  },
  custom: {
    gap: theme.spacing[2],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
});
