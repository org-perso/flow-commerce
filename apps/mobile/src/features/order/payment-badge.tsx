import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';

/** "Payée" (green) or "Non payée" (orange), same look as the status badge. */
export function PaymentBadge({ isPaid }: { isPaid: boolean }) {
  const { bg, fg } = theme.statusColors[isPaid ? 'LIVREE' : 'EN_ATTENTE'];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="caption" style={[styles.text, { color: fg }]}>
        {isPaid ? 'Payée' : 'Non payée'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.sm,
  },
  text: {
    fontFamily: theme.typography.label.fontFamily,
  },
});
