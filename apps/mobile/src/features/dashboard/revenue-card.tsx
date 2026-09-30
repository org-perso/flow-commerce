import { TrendingUp } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { textStyles, theme } from '@/theme';
import { formatAr } from '@/utils/format';

import type { Dashboard, DashboardPeriod } from './dashboard-api';

const periodLabels: Record<DashboardPeriod, string> = {
  today: "aujourd'hui",
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
};

/** Navy hero card: revenue of the period, estimated profit, sales and margin. */
export function RevenueCard({ dashboard: d }: { dashboard: Dashboard }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AppText variant="label" color="onNavyMuted" style={styles.flex}>
          Chiffre d&apos;affaires · {periodLabels[d.period]}
        </AppText>
        <TrendingUp size={theme.layout.iconMd} color={theme.colors.gold} strokeWidth={2} />
      </View>
      <AppText color="onNavy" style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
        {formatAr(d.revenue)}
      </AppText>
      <View style={styles.tiles}>
        <Tile label="Bénéfice estimé" value={formatAr(d.estimatedProfit)} />
        <Tile label="Ventes · marge" value={`${d.salesCount} · ${d.grossMarginRate} %`} />
      </View>
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <AppText variant="caption" color="onNavyMuted">
        {label}
      </AppText>
      <AppText color="onNavy" style={styles.tileValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.navy,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  flex: {
    flex: 1,
  },
  amount: {
    ...textStyles.amountXl,
  },
  tiles: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  tile: {
    flex: 1,
    gap: theme.spacing[1] / 2,
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navyRaised,
  },
  tileValue: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
});
