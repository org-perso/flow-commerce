import { router } from 'expo-router';
import { ChevronDown, Store } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useActiveShop } from '@/features/shop/use-shop';
import { theme } from '@/theme';

import { AppText } from './app-text';

/**
 * Active shop name, large, white (drawn on the navy header), with a chevron: a tap opens the switcher
 * (other shops, or create one). The round slot on the right will hold the shop logo.
 */
export function ShopSwitcher() {
  const shop = useActiveShop();

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => router.push('/shop-switcher')}
        accessibilityRole="button"
        accessibilityLabel={`Boutique ${shop.name}. Changer de boutique`}
        style={({ pressed }) => [styles.nameButton, pressed && styles.pressed]}
      >
        <AppText variant="title" color="onNavy" numberOfLines={1} style={styles.name}>
          {shop.name}
        </AppText>
        <ChevronDown size={theme.layout.iconLg} color={theme.colors.onNavy} strokeWidth={2} />
      </Pressable>
      {/* Placeholder for the shop logo. */}
      <View style={styles.logo} accessible={false}>
        <Store size={theme.layout.iconMd} color={theme.colors.onGold} strokeWidth={2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  nameButton: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    minHeight: theme.sizes.tapMin,
  },
  name: {
    flexShrink: 1,
  },
  logo: {
    marginLeft: 'auto',
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gold,
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
