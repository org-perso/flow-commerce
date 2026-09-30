import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { hitSlopFor, theme } from '@/theme';

import { AppText } from './app-text';

type SegmentedControlProps<K extends string> = {
  options: readonly { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
};

/** Mutually exclusive filters; scrolls horizontally when they do not fit. */
export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<K>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <View style={styles.track} accessibilityRole="tablist">
        {options.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(option.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              hitSlop={hitSlopFor(theme.layout.controlHeight)}
              style={[styles.segment, selected && styles.selected]}
            >
              <AppText
                variant="label"
                color={selected ? 'ink' : 'inkMuted'}
                style={selected && styles.selectedText}
                numberOfLines={1}
              >
                {option.label}
                {option.count !== undefined ? ` ${option.count}` : ''}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    flexGrow: 1,
  },
  track: {
    flexGrow: 1,
    flexDirection: 'row',
    padding: theme.spacing[1],
    gap: theme.spacing[1],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navySoft,
  },
  segment: {
    flexGrow: 1,
    minHeight: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.sm,
  },
  selected: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  selectedText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
});
