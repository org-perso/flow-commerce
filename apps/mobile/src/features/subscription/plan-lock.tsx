import { Crown } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';

import { PLAN_LABELS, type PaidPlan } from './subscription';

/** Gold crown with the plan that includes it: marks what the current plan does not. */
export function PlanLock({ plan }: { plan: PaidPlan }) {
  return (
    <View style={styles.lock} accessibilityLabel={`Inclus dans ${PLAN_LABELS[plan]}`}>
      <Crown size={12} color={theme.colors.goldInk} strokeWidth={2.5} />
      <AppText variant="caption" color="goldInk" style={styles.text}>
        {PLAN_LABELS[plan]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  lock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.goldSoft,
  },
  text: {
    fontFamily: theme.typography.heading.fontFamily,
  },
});
