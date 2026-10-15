import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, FormScreen } from '@/components/ui';
import { useActiveShop, useUpdateStatusColors } from '@/features/shop/use-shop';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import {
  PALETTE,
  STATE_COLOR_CHOICES,
  type ColorKey,
  type ColoredState,
  type StatusColors,
} from '@/theme/state-colors';

const STATES = Object.keys(STATE_COLOR_CHOICES) as ColoredState[];

/**
 * Colors of the order states and of the payment, for the whole team: the cards take the
 * status color as background and the payment color as their left stripe. Owner only.
 */
export default function StatusColorsScreen() {
  const shop = useActiveShop();
  const save = useUpdateStatusColors(shop.id);
  const [draft, setDraft] = useState<StatusColors>(shop.statusColors ?? {});

  const colorOf = (state: ColoredState): ColorKey =>
    draft[state] ?? STATE_COLOR_CHOICES[state].colors[0]!;

  const pick = (state: ColoredState, key: ColorKey) =>
    setDraft((current) => {
      const next = { ...current };
      // The default color is not stored: the shop follows future defaults.
      if (key === STATE_COLOR_CHOICES[state].colors[0]) delete next[state];
      else next[state] = key;
      return next;
    });

  return (
    <FormScreen
      submitLabel="Enregistrer"
      submitting={save.isPending}
      error={save.error ? apiErrorMessage(save.error) : undefined}
      onSubmit={() => save.mutate(draft, { onSuccess: () => router.back() })}
      extra={
        <Button
          label="Revenir aux couleurs par défaut"
          variant="ghost"
          onPress={() => setDraft({})}
        />
      }
    >
      <AppText color="inkMuted">
        Le fond des commandes prend la couleur de leur état ; la bande à gauche, celle du paiement.
        Les couleurs sont les mêmes pour toute l’équipe.
      </AppText>
      {STATES.map((state) => {
        const current = PALETTE[colorOf(state)];
        return (
          <View key={state} style={styles.row}>
            <View style={[styles.preview, { backgroundColor: current.bg }]}>
              <View style={[styles.dot, { backgroundColor: current.fg }]} />
              <AppText variant="label" style={[styles.strong, { color: current.fg }]}>
                {STATE_COLOR_CHOICES[state].label}
              </AppText>
            </View>
            <View style={styles.swatches}>
              {STATE_COLOR_CHOICES[state].colors.map((key) => {
                const selected = colorOf(state) === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => pick(state, key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${STATE_COLOR_CHOICES[state].label} : ${PALETTE[key].label}`}
                    style={[
                      styles.swatch,
                      { backgroundColor: PALETTE[key].fg },
                      selected && styles.swatchSelected,
                    ]}
                  >
                    {selected && (
                      <Check
                        size={theme.layout.iconSm}
                        color={theme.colors.onNavy}
                        strokeWidth={3}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  preview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.layout.controlHeight,
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radius.md,
  },
  dot: {
    width: theme.layout.dot,
    height: theme.layout.dot,
    borderRadius: theme.radius.pill,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  swatches: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  swatch: {
    width: theme.layout.controlHeight,
    height: theme.layout.controlHeight,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: theme.layout.border * 6,
    borderColor: theme.colors.ink,
  },
});
