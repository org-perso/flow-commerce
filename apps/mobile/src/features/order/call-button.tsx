import { Phone } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { callPhone, formatPhone } from '@/features/customer/contact';
import { hitSlopFor, theme } from '@/theme';

/**
 * Calls the order's main number. "+1" / "+2": other numbers are in the order's details,
 * for when the main one does not answer.
 */
export function CallButton({ phone, others = 0 }: { phone: string; others?: number }) {
  return (
    <Pressable
      onPress={() => callPhone(phone)}
      accessibilityRole="button"
      accessibilityLabel={
        others > 0
          ? `Appeler ${formatPhone(phone)} (${others} autre${others > 1 ? 's' : ''} numéro${others > 1 ? 's' : ''} dans la commande)`
          : `Appeler ${formatPhone(phone)}`
      }
      hitSlop={hitSlopFor(theme.layout.controlHeight)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Phone size={theme.layout.iconSm} color={theme.colors.blue} strokeWidth={2} />
      {others > 0 && (
        <View style={styles.badge}>
          <AppText variant="caption" color="onNavy" style={styles.badgeText}>
            +{others}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: theme.layout.controlHeight,
    height: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
  },
  badge: {
    position: 'absolute',
    top: -theme.spacing[1],
    right: -theme.spacing[1],
    minWidth: theme.spacing[4] + 2,
    paddingHorizontal: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navy,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.typography.heading.fontFamily,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
