import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { theme } from '@/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
};

export function SearchBar({ value, onChangeText, placeholder, autoFocus }: SearchBarProps) {
  return (
    <View style={styles.root}>
      <Search size={18} color={theme.colors.inkMuted} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkMuted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoFocus={autoFocus}
        autoCorrect={false}
        style={styles.input}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityLabel="Effacer la recherche"
          hitSlop={theme.spacing[3]}
        >
          <X size={18} color={theme.colors.inkMuted} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.sizes.tapMin,
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
  },
  input: {
    ...theme.typography.body,
    flex: 1,
    color: theme.colors.ink,
    paddingVertical: theme.spacing[2],
  },
});
