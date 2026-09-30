import { router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, ListGroup, ListRow } from '@/components/ui';
import { theme } from '@/theme';

type Step = {
  title: string;
  subtitle: string;
  done: boolean;
  /** Not startable yet (e.g. an order needs products first). */
  locked?: boolean;
  onPress: () => void;
};

type GettingStartedProps = {
  hasProducts: boolean;
  hasOrders: boolean;
  hasExpenses: boolean;
};

/** First steps for a new shop, shown on the home screen until the first order. */
export function GettingStarted({ hasProducts, hasOrders, hasExpenses }: GettingStartedProps) {
  const steps: Step[] = [
    {
      title: 'Ajoutez vos produits',
      subtitle: 'Nom, prix et stock : quelques secondes par produit.',
      done: hasProducts,
      onPress: () => router.push('/products/new'),
    },
    {
      title: 'Créez votre première commande',
      subtitle: hasProducts
        ? 'Le stock et votre bénéfice se calculent tout seuls.'
        : "Ajoutez d'abord un produit.",
      done: hasOrders,
      locked: !hasProducts,
      onPress: () => router.push('/orders/new'),
    },
    {
      title: 'Notez vos dépenses',
      subtitle: 'Publicité, emballage… pour connaître votre vrai bénéfice.',
      done: hasExpenses,
      onPress: () => router.push('/expenses/new'),
    },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.intro}>
        <AppText variant="heading">Pour bien démarrer</AppText>
        <AppText color="inkMuted">
          De la commande au bénéfice, directement depuis votre téléphone.
        </AppText>
      </View>
      <ListGroup>
        {steps.map((step, index) => (
          <ListRow
            key={step.title}
            leading={
              <View style={[styles.badge, step.done && styles.badgeDone]}>
                {step.done ? (
                  <Check size={theme.layout.iconSm} color={theme.colors.onNavy} strokeWidth={3} />
                ) : (
                  <AppText variant="label" style={styles.badgeText}>
                    {index + 1}
                  </AppText>
                )}
              </View>
            }
            title={step.title}
            titleColor={step.done || step.locked ? 'inkMuted' : 'ink'}
            subtitle={step.subtitle}
            trailing={
              step.done || step.locked ? undefined : (
                <ChevronRight
                  size={theme.layout.iconMd}
                  color={theme.colors.inkMuted}
                  strokeWidth={2}
                />
              )
            }
            onPress={step.done || step.locked ? undefined : step.onPress}
          />
        ))}
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[3],
  },
  intro: {
    gap: theme.spacing[1],
  },
  badge: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.navySoft,
  },
  badgeDone: {
    backgroundColor: theme.colors.statusDeliveredFg,
  },
  badgeText: {
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.ink,
  },
});
