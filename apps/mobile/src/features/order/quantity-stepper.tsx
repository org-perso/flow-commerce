import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { textStyles, theme } from '@/theme';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
};

/** − / + buttons; going below 1 calls onChange(0) so the caller can remove the line. */
export function QuantityStepper({ value, onChange }: QuantityStepperProps) {
  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => onChange(value - 1)}
        accessibilityLabel="Diminuer la quantité"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Minus size={18} color={theme.colors.ink} strokeWidth={2} />
      </Pressable>
      <AppText style={styles.value} accessibilityLabel={`Quantité ${value}`}>
        {value}
      </AppText>
      <Pressable
        onPress={() => onChange(value + 1)}
        accessibilityLabel="Augmenter la quantité"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Plus size={18} color={theme.colors.ink} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...textStyles.amountMd,
    minWidth: 32,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
