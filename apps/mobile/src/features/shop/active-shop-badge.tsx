import { Store } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { theme } from '@/theme';

import { useActiveShop } from './use-shop';

/**
 * Read-only reminder of the active shop, in the header of inner screens.
 * Switching is only offered from the tabs, never in the middle of a form.
 */
export function ActiveShopBadge() {
  const shop = useActiveShop();
  return (
    <View style={styles.badge} accessibilityLabel={`Boutique ${shop.name}`}>
      <Store size={14} color={theme.colors.inkMuted} strokeWidth={2} />
      <AppText variant="caption" color="inkMuted" numberOfLines={1} style={styles.name}>
        {shop.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
    maxWidth: 140,
  },
  name: {
    flexShrink: 1,
  },
});
