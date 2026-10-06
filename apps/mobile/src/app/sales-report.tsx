import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, EmptyState, FilterChips, Screen, TextField } from '@/components/ui';
import { useProductSales } from '@/features/report/report-api';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import {
  addDays,
  businessToday,
  formatAr,
  frDateToIso,
  isoToFrDate,
  monthRange,
} from '@/utils/format';

type Period = 'week' | 'month' | 'year' | 'custom';

const PERIODS = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'year', label: 'Cette année' },
  { value: 'custom', label: 'Choisir…' },
] as const;

/** Days of a preset period, today included (weeks start on Monday). */
function presetRange(period: Exclude<Period, 'custom'>): { from: string; to: string } {
  const today = businessToday();
  if (period === 'month') return { from: monthRange(today).from, to: today };
  if (period === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return { from: addDays(today, -weekday), to: today };
}

/** Recap per product: how many sold; revenue and margin for the owner and the manager. */
export default function SalesReportScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const today = businessToday();
  const [fromText, setFromText] = useState(isoToFrDate(monthRange(today).from));
  const [toText, setToText] = useState(isoToFrDate(today));

  const customFrom = frDateToIso(fromText);
  const customTo = frDateToIso(toText);
  const customValid = !!customFrom && !!customTo && customFrom <= customTo;
  const range =
    period === 'custom'
      ? customValid
        ? { from: customFrom, to: customTo }
        : null
      : presetRange(period);
  const report = useProductSales(range);
  const showsMargin = report.data?.totals.margin !== undefined;

  return (
    <Screen edges={[]} onRefresh={() => report.refetch()} refreshing={report.isRefetching}>
      <FilterChips options={PERIODS} value={period} onChange={setPeriod} />
      {period === 'custom' && (
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="Du"
              value={fromText}
              onChangeText={setFromText}
              placeholder="JJ/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              error={fromText && !customFrom ? 'Date invalide.' : undefined}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Au"
              value={toText}
              onChangeText={setToText}
              placeholder="JJ/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              error={
                toText && !customTo
                  ? 'Date invalide.'
                  : customFrom && customTo && customFrom > customTo
                    ? 'Avant la date de début.'
                    : undefined
              }
            />
          </View>
        </View>
      )}

      {report.isError && <AlertBanner tone="danger" message={apiErrorMessage(report.error)} />}
      {report.isPending && range && <ActivityIndicator color={theme.colors.ink} />}

      {report.data && (
        <>
          {/* Totals of the period. */}
          <View style={[styles.card, styles.totals]}>
            <Stat label="Articles vendus" value={`${report.data.totals.quantity}`} />
            {report.data.totals.revenue !== undefined && (
              <Stat label="Chiffre d’affaires" value={formatAr(report.data.totals.revenue)} />
            )}
            {showsMargin && <Stat label="Marge" value={formatAr(report.data.totals.margin!)} />}
          </View>

          {report.data.products.length === 0 ? (
            <EmptyState message="Aucune vente sur cette période." />
          ) : (
            <View style={[styles.card, styles.list]}>
              {report.data.products.map((p, index) => (
                <View key={p.productId} style={[styles.line, index > 0 && styles.divider]}>
                  <View style={styles.flex}>
                    <AppText style={styles.strong} numberOfLines={2}>
                      {p.productName}
                    </AppText>
                    {p.revenue !== undefined && (
                      <AppText variant="caption" color="inkMuted">
                        {formatAr(p.revenue)}
                        {p.margin !== undefined ? ` · marge ${formatAr(p.margin)}` : ''}
                      </AppText>
                    )}
                  </View>
                  <AppText style={styles.quantity}>{p.quantity}</AppText>
                  <AppText variant="caption" color="inkMuted">
                    vendu{p.quantity > 1 ? 's' : ''}
                  </AppText>
                </View>
              ))}
            </View>
          )}
          <AppText variant="caption" color="inkMuted">
            Commandes confirmées et suivantes (hors annulées et retours), comptées à leur date de
            création, comme sur l’accueil.
          </AppText>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color="inkMuted">
        {label}
      </AppText>
      <AppText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  flex: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    padding: theme.spacing[3],
  },
  totals: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  stat: {
    flex: 1,
    gap: theme.spacing[1] / 2,
  },
  statValue: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  list: {
    paddingVertical: theme.spacing[1],
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  divider: {
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  quantity: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
    fontSize: theme.typography.heading.fontSize,
  },
});
