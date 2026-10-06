import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';
import { useStateColor } from '@/theme/state-colors';

/** "Payée" or "Non payée", in the shop's colors, same look as the status badge. */
export function PaymentBadge({ isPaid }: { isPaid: boolean }) {
  const { bg, fg } = useStateColor(isPaid ? 'PAID' : 'UNPAID');
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
