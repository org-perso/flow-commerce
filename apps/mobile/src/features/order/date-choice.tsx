import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, FilterChips, TextField } from '@/components/ui';
import { theme } from '@/theme';
import { addDays, businessToday, formatDayLabel, frDateToIso, isoToFrDate } from '@/utils/format';

type Mode = 'today' | 'tomorrow' | 'other';

type DateChoiceProps = {
  /** YYYY-MM-DD, or null while the typed date is invalid. */
  value: string | null;
  onChange: (iso: string | null) => void;
};

/** Planned day: one tap for today / tomorrow, or type another date. */
export function DateChoice({ value, onChange }: DateChoiceProps) {
  const today = businessToday();
  const tomorrow = addDays(today, 1);
  const [mode, setMode] = useState<Mode>(
    value === today ? 'today' : value === tomorrow ? 'tomorrow' : 'other',
  );
  const [typed, setTyped] = useState(value && mode === 'other' ? isoToFrDate(value) : '');

  const choose = (next: Mode) => {
    setMode(next);
    if (next === 'today') onChange(today);
    else if (next === 'tomorrow') onChange(tomorrow);
    else onChange(frDateToIso(typed));
  };

  const iso = mode === 'other' ? frDateToIso(typed) : value;

  return (
    <View style={styles.root}>
      <FilterChips
        options={[
          { value: 'today', label: "Aujourd'hui" },
          { value: 'tomorrow', label: 'Demain' },
          { value: 'other', label: 'Autre date' },
        ]}
        value={mode}
        onChange={choose}
      />
      {mode === 'other' && (
        <TextField
          label="Date"
          value={typed}
          onChangeText={(text) => {
            setTyped(text);
            onChange(frDateToIso(text));
          }}
          placeholder="JJ/MM/AAAA"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          error={typed.length >= 8 && !iso ? 'Date au format JJ/MM/AAAA.' : undefined}
        />
      )}
      {iso && mode === 'other' && (
        <AppText variant="caption" color="inkMuted">
          {formatDayLabel(iso, today)}
          {iso < today ? ' · date passée' : ''}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[2],
  },
});
