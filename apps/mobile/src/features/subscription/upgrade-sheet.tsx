import { router } from 'expo-router';
import { Crown } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { theme } from '@/theme';
import { formatAr } from '@/utils/format';

import { requiredPlan, type Limit } from './plan-gate';
import { PLAN_LABELS, type PaidPlan } from './subscription';

const PRICES: Record<PaidPlan, number> = { PRO: 20_000, BUSINESS: 30_000 };

const COPY: Record<Limit, { title: string; text: (plan: PaidPlan) => string }> = {
  orders: {
    title: 'Vous avez atteint 50 commandes ce mois-ci 🎉',
    text: () =>
      'Bravo, votre boutique grandit ! Avec Pro, vos commandes sont illimitées. Sinon, le compteur repart le 1er du mois.',
  },
  members: {
    title: 'Travaillez à plusieurs',
    text: (plan) =>
      plan === 'PRO'
        ? 'Pro inclut un membre d’équipe (gérant ou community manager). Business : une équipe illimitée.'
        : 'Business inclut une équipe illimitée : gérants, community managers et livreurs.',
  },
  drivers: {
    title: 'Gérez vos livreurs',
    text: () => 'Tournées, notifications et encaissements des livreurs sont inclus dans Business.',
  },
  shops: {
    title: 'Plusieurs boutiques ?',
    text: () => 'Business vous permet de gérer jusqu’à 3 boutiques avec le même compte.',
  },
};

/**
 * Bottom sheet shown instead of an error when a plan limit is reached: why, what the next plan
 * brings, its price, one button to pay it. Members who are not the owner are told to ask them.
 */
export function UpgradeSheet({
  limit,
  onClose,
  currentPlan = 'FREE',
  isOwner,
}: {
  limit: Limit | null;
  onClose: () => void;
  currentPlan?: 'FREE' | PaidPlan;
  isOwner: boolean;
}) {
  const { bottom } = useSafeAreaInsets();
  if (!limit) return null;
  const plan = requiredPlan(limit, currentPlan);
  const copy = COPY[limit];
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { paddingBottom: theme.spacing[4] + bottom }]}>
        <View style={styles.crown}>
          <Crown size={theme.layout.iconLg} color={theme.colors.goldInk} strokeWidth={2} />
        </View>
        <AppText variant="heading">{copy.title}</AppText>
        <AppText color="inkMuted">{copy.text(plan)}</AppText>
        <AppText>
          {isOwner
            ? `${PLAN_LABELS[plan]} : ${formatAr(PRICES[plan])} par mois, sans engagement. MVola, Orange Money ou Airtel Money.`
            : 'Votre boutique a atteint la limite de sa formule : prévenez le propriétaire.'}
        </AppText>
        {isOwner && (
          <Button
            label={`Passer à ${PLAN_LABELS[plan]}`}
            icon={Crown}
            variant="primary"
            fullWidth
            onPress={() => {
              onClose();
              router.push({ pathname: '/subscription', params: { formule: plan } });
            }}
          />
        )}
        <Button label="Plus tard" variant="ghost" fullWidth onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 32, 0.45)',
  },
  sheet: {
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
  },
  crown: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
