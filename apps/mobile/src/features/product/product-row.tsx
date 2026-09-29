import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { textStyles, theme } from '@/theme';
import { formatAr } from '@/utils/format';

import type { Product } from './product-api';

type ProductRowProps = { product: Product; onPress: () => void };

export function ProductRow({ product, onPress }: ProductRowProps) {
  const archived = product.archivedAt !== null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <AppText style={styles.name} numberOfLines={1}>
          {product.name}
        </AppText>
        <AppText variant="caption" color="inkMuted" numberOfLines={1}>
          {formatAr(product.sellingPrice)}
          {product.category ? ` · ${product.category}` : ''}
        </AppText>
      </View>
      <View style={styles.stock}>
        <AppText
          style={styles.quantity}
          color={product.isLowStock && !archived ? 'goldInk' : 'ink'}
        >
          {product.stockQuantity}
        </AppText>
        <AppText variant="caption" color={product.isLowStock && !archived ? 'goldInk' : 'inkMuted'}>
          {archived ? 'Archivé' : product.isLowStock ? 'Stock faible' : 'en stock'}
        </AppText>
      </View>
      <ChevronRight size={18} color={theme.colors.inkMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.sizes.tapMin + theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  stock: {
    alignItems: 'flex-end',
  },
  quantity: {
    ...textStyles.amountMd,
  },
  pressed: {
    opacity: 0.85,
  },
});
