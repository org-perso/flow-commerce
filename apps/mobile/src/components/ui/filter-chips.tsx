import { Keyboard, Pressable, ScrollView, StyleSheet } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './app-text';

type FilterChipsProps<T extends string> = {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              Keyboard.dismiss();
              onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="label" color={selected ? 'onNavy' : 'ink'}>
              {option.label}
              {option.count !== undefined && (
                <AppText variant="label" color={selected ? 'onNavyMuted' : 'inkMuted'}>
                  {` ${option.count}`}
                </AppText>
              )}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    gap: theme.spacing[2],
  },
  chip: {
    minHeight: theme.layout.controlHeight,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.radius.pill,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surfaceRaised,
  },
  selected: {
    backgroundColor: theme.colors.navy,
    borderColor: theme.colors.navy,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
