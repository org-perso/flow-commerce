import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { Check, Copy } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, Screen, TextField } from '@/components/ui';
import {
  OPERATOR_LABELS,
  PAYMENT_STATUS_LABELS,
  PLAN_LABELS,
  useDeclarePayment,
  useSubscription,
  type Months,
  type Operator,
  type PaidPlan,
  type Plan,
  type Subscription,
} from '@/features/subscription/subscription';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';
import { formatAr, formatDateTime, formatPhone } from '@/utils/format';

const FEATURES: Record<Plan, string[]> = {
  FREE: ['1 boutique', '50 commandes par mois', 'Stock, clients, dépenses'],
  PRO: ['Commandes illimitées', '1 membre d’équipe (gérant ou CM)', 'Tout le Gratuit'],
  BUSINESS: ['3 boutiques', 'Équipe et livreurs illimités', 'Tournées et notifications'],
};

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Indian/Antananarivo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));

/** The shop's plan and its payments (owner only, docs/subscription.md). */
export default function SubscriptionScreen() {
  const subscription = useSubscription();
  // "?formule=PRO" (from an upgrade sheet or a banner): the payment opens on that plan.
  const { formule } = useLocalSearchParams<{ formule?: string }>();
  const [choice, setChoice] = useState<PaidPlan | null>(
    formule === 'PRO' || formule === 'BUSINESS' ? formule : null,
  );
  const s = subscription.data;

  if (!s) {
    return (
      <Screen>
        {subscription.isError ? (
          <AlertBanner tone="danger" message={apiErrorMessage(subscription.error)} />
        ) : (
          <ActivityIndicator color={theme.colors.ink} />
        )}
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => subscription.refetch()} refreshing={subscription.isRefetching}>
      <CurrentPlan s={s} />
      {choice ? (
        <PayForm s={s} plan={choice} onDone={() => setChoice(null)} />
      ) : (
        (['FREE', 'PRO', 'BUSINESS'] as const).map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            s={s}
            onChoose={plan === 'FREE' ? undefined : () => setChoice(plan)}
          />
        ))
      )}
      {s.payments.length > 0 && !choice && <Payments s={s} />}
    </Screen>
  );
}

function CurrentPlan({ s }: { s: Subscription }) {
  const limit = s.limits.ordersPerMonth;
  const used = s.usage.ordersThisMonth;
  return (
    <View style={styles.card}>
      <AppText variant="caption" color="inkMuted">
        Votre formule
      </AppText>
      <AppText variant="heading">{PLAN_LABELS[s.plan]}</AppText>
      {s.endsAt && s.paidPlan !== 'FREE' && (
        <AppText color="inkMuted">
          {s.inGrace ? 'Terminé le ' : 'Jusqu’au '}
          {longDate(s.endsAt)}
        </AppText>
      )}
      {s.inGrace && (
        <AlertBanner
          message={`Abonnement terminé : encore ${s.graceDays} jours avant le retour en Gratuit.`}
        />
      )}
      {s.pendingPlan && (
        <AlertBanner
          tone="success"
          message={`Paiement reçu : ${PLAN_LABELS[s.pendingPlan]} est actif en attendant la validation.`}
        />
      )}
      {!s.enforced && (
        <AlertBanner
          tone="success"
          message="Offre de lancement : toutes les fonctionnalités sont offertes pour le moment."
        />
      )}
      {limit !== null && (
        <View style={styles.meter}>
          <View style={styles.row}>
            <AppText style={styles.flex}>Commandes ce mois-ci</AppText>
            <AppText style={styles.strong}>
              {used} / {limit}
            </AppText>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, (used / limit) * 100)}%`,
                  backgroundColor:
                    used >= limit
                      ? theme.colors.statusCancelledFg
                      : used >= limit * 0.8
                        ? theme.colors.gold
                        : theme.colors.navy,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function PlanCard({ plan, s, onChoose }: { plan: Plan; s: Subscription; onChoose?: () => void }) {
  const price = s.plans[plan].price;
  return (
    <View style={[styles.card, plan === 'PRO' && styles.featured]}>
      <View style={styles.row}>
        <AppText variant="heading" style={styles.flex}>
          {PLAN_LABELS[plan]}
        </AppText>
        {s.plan === plan && (
          <AppText variant="caption" color="statusDeliveredFg" style={styles.strong}>
            Actuelle
          </AppText>
        )}
        {s.plan !== plan && plan === 'PRO' && (
          <View style={styles.popular}>
            <AppText variant="caption" color="goldInk" style={styles.strong}>
              Le plus utilisé
            </AppText>
          </View>
        )}
      </View>
      <AppText style={styles.price}>
        {formatAr(price)}
        {price > 0 && (
          <AppText variant="caption" color="inkMuted">
            {' '}
            / mois
          </AppText>
        )}
      </AppText>
      {FEATURES[plan].map((f) => (
        <View key={f} style={styles.row}>
          <Check
            size={theme.layout.iconSm}
            color={theme.colors.statusDeliveredFg}
            strokeWidth={2.5}
          />
          <AppText style={styles.flex}>{f}</AppText>
        </View>
      ))}
      {onChoose && !s.pendingPlan && (
        <Button
          label={s.plan === plan ? 'Prolonger' : `Passer à ${PLAN_LABELS[plan]}`}
          variant={plan === 'PRO' ? 'primary' : 'dark'}
          onPress={onChoose}
        />
      )}
    </View>
  );
}

function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === o.value }}
          style={[styles.choice, value === o.value && styles.choiceOn]}
        >
          <AppText style={styles.strong}>{o.label}</AppText>
          {o.hint && (
            <AppText variant="caption" color="inkMuted">
              {o.hint}
            </AppText>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function PayForm({ s, plan, onDone }: { s: Subscription; plan: PaidPlan; onDone: () => void }) {
  const [months, setMonths] = useState<Months>(1);
  const [operator, setOperator] = useState<Operator>('MVOLA');
  const [reference, setReference] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const declare = useDeclarePayment();
  const amount = s.prices[plan][months];
  const payTo = s.payTo[operator];

  const submit = () => {
    if (reference.trim().length < 4) {
      Alert.alert('Référence manquante', 'Saisissez la référence reçue par SMS après le paiement.');
      return;
    }
    declare.mutate(
      {
        plan,
        months,
        operator,
        reference: reference.trim(),
        payerPhone: payerPhone.trim() || null,
      },
      {
        onSuccess: () => {
          Alert.alert(
            'Paiement envoyé',
            `La formule ${PLAN_LABELS[plan]} est active en attendant la validation par Flow.Co.`,
          );
          onDone();
        },
      },
    );
  };

  return (
    <View style={styles.card}>
      <AppText variant="heading">Passer à {PLAN_LABELS[plan]}</AppText>
      <AppText variant="label">Durée</AppText>
      <Choice
        options={s.durations.map((m) => ({
          value: m,
          label: m === 12 ? '12 mois' : `${m} mois`,
          hint:
            m === 12 ? `${formatAr(s.prices[plan][m])} · 2 offerts` : formatAr(s.prices[plan][m]),
        }))}
        value={months}
        onChange={setMonths}
      />
      <AppText variant="label">Opérateur</AppText>
      <Choice
        options={(Object.keys(OPERATOR_LABELS) as Operator[]).map((o) => ({
          value: o,
          label: OPERATOR_LABELS[o],
        }))}
        value={operator}
        onChange={setOperator}
      />
      <View style={styles.instructions}>
        <AppText>
          Envoyez <AppText style={styles.strong}>{formatAr(amount)}</AppText> au{' '}
          <AppText style={styles.strong}>
            {payTo ? formatPhone(payTo) : 'numéro communiqué par Flow.Co'}
          </AppText>{' '}
          ({OPERATOR_LABELS[operator]})
        </AppText>
        <AppText>
          Motif : <AppText style={styles.strong}>{s.paymentReference}</AppText>
        </AppText>
        <View style={styles.copies}>
          {payTo && <CopyButton text={payTo} label="Copier le numéro" />}
          <CopyButton text={s.paymentReference} label="Copier le motif" />
        </View>
      </View>
      <TextField
        label="Référence de la transaction (SMS)"
        value={reference}
        onChangeText={setReference}
        placeholder="Ex. MP241024.1530.A12345"
        autoCapitalize="characters"
      />
      <TextField
        label="Numéro qui a payé (facultatif)"
        value={payerPhone}
        onChangeText={setPayerPhone}
        placeholder="034 00 000 00"
        keyboardType="phone-pad"
      />
      {declare.error != null && (
        <AlertBanner tone="danger" message={apiErrorMessage(declare.error)} />
      )}
      <Button
        label="J’ai payé"
        variant="primary"
        fullWidth
        loading={declare.isPending}
        onPress={submit}
      />
      <Button label="Retour" variant="ghost" fullWidth onPress={onDone} />
    </View>
  );
}

function Payments({ s }: { s: Subscription }) {
  return (
    <View style={styles.card}>
      <AppText variant="heading">Paiements</AppText>
      {s.payments.map((p) => (
        <View key={p.id} style={styles.payment}>
          <AppText style={styles.strong}>
            {PLAN_LABELS[p.plan]} · {p.months} mois · {formatAr(p.amount)}
          </AppText>
          <AppText variant="caption" color="inkMuted">
            {OPERATOR_LABELS[p.operator]} · réf. {p.reference} · {formatDateTime(p.createdAt)}
          </AppText>
          <AppText
            variant="caption"
            color={
              p.status === 'VALIDATED'
                ? 'statusDeliveredFg'
                : p.status === 'REJECTED'
                  ? 'statusCancelledFg'
                  : 'inkMuted'
            }
            style={styles.strong}
          >
            {PAYMENT_STATUS_LABELS[p.status]}
            {p.rejectReason ? ` : ${p.rejectReason}` : ''}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  popular: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.goldSoft,
  },
  copies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  card: {
    gap: theme.spacing[2],
    padding: theme.spacing[4],
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  featured: {
    borderWidth: 2,
    borderColor: theme.colors.gold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  price: {
    fontFamily: theme.typography.heading.fontFamily,
    fontSize: 24,
  },
  meter: {
    gap: theme.spacing[1],
    marginTop: theme.spacing[1],
  },
  track: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.pill,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  choice: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  choiceOn: {
    borderColor: theme.colors.navy,
    backgroundColor: theme.colors.navySoft,
  },
  instructions: {
    gap: theme.spacing[1],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldSoft,
  },
  payment: {
    gap: 2,
    paddingTop: theme.spacing[2],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
});

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      label={copied ? 'Copié' : label}
      icon={copied ? Check : Copy}
      variant="secondary"
      compact
      onPress={async () => {
        await Clipboard.setStringAsync(text);
        setCopied(true);
      }}
    />
  );
}
