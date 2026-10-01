import { router } from 'expo-router';
import { ShoppingCartPlus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { useActiveShop } from '@/features/shop/use-shop';
import { theme } from '@/theme';

/**
 * CM only: their tab bar has 3 tabs, so the gold "new order" button cannot sit in its
 * middle. It floats bottom right instead, where the thumb is, on the CM's tabs.
 */
export function NewOrderFab() {
  const { role } = useActiveShop();
  if (role !== 'CM') return null;
  return (
    <Pressable
      onPress={() => router.push('/orders/new')}
      accessibilityRole="button"
      accessibilityLabel="Nouvelle commande"
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <ShoppingCartPlus size={theme.layout.iconLg} color={theme.colors.onGold} strokeWidth={2.25} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: theme.spacing[4],
    bottom: theme.spacing[4],
    width: theme.layout.tabAction,
    height: theme.layout.tabAction,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gold,
    elevation: 4,
    shadowColor: theme.colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
