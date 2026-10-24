import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useActiveShop } from '@/features/shop/use-shop';
import { sizedImage } from '@/lib/product-image';
import { theme } from '@/theme';

import { AppText } from './app-text';
import { initials } from './avatar';

/**
 * Shop logo (or its initials on gold) and name with a chevron,
 * white on the navy header: a tap opens the switcher (other shops, or create one).
 */
export function ShopSwitcher() {
  const shop = useActiveShop();

  return (
    <Pressable
      onPress={() => router.push('/shop-switcher')}
      accessibilityRole="button"
      accessibilityLabel={`Boutique ${shop.name}. Changer de boutique`}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      {shop.logo ? (
        <Image
          source={{ uri: sizedImage(shop.logo, 96) }}
          style={styles.logo}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.logo}>
          <AppText variant="caption" color="onGold" style={styles.logoText}>
            {initials(shop.name)}
          </AppText>
        </View>
      )}
      <AppText variant="heading" color="onNavy" numberOfLines={1} style={styles.name}>
        {shop.name}
      </AppText>
      <ChevronDown size={theme.layout.iconMd} color={theme.colors.onNavyMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    minHeight: theme.sizes.tapMin,
  },
  logo: {
    width: theme.layout.shopLogo,
    height: theme.layout.shopLogo,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gold,
  },
  logoText: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  name: {
    flexShrink: 1,
    marginLeft: theme.spacing[1],
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
