import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, ListRow } from '@/components/ui';
import { textStyles, theme } from '@/theme';
import { formatAr } from '@/utils/format';

import type { Product } from './product-api';

type ProductRowProps = { product: Product; onPress: () => void; divider?: boolean };

export function ProductRow({ product, onPress, divider }: ProductRowProps) {
  const archived = product.archivedAt !== null;
  const outOfStock = !archived && product.stockQuantity === 0;
  const low = !archived && !outOfStock && product.isLowStock;

  return (
    <ListRow
      divider={divider}
      onPress={onPress}
      leading={<Avatar name={product.name} imageUri={product.image} />}
      title={product.name}
      subtitle={[formatAr(product.sellingPrice), product.category?.name]
        .filter(Boolean)
        .join(' · ')}
      trailing={
        <View style={styles.stock}>
          <AppText style={styles.quantity}>{product.stockQuantity}</AppText>
          {archived ? (
            <AppText variant="caption" color="inkMuted">
              Archivé
            </AppText>
          ) : outOfStock ? (
            <View style={[styles.pill, styles.outPill]}>
              <AppText variant="caption" color="statusCancelledFg">
                Rupture
              </AppText>
            </View>
          ) : low ? (
            <View style={[styles.pill, styles.lowPill]}>
              <AppText variant="caption" color="goldInk">
                Stock faible
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" color="inkMuted">
              en stock
            </AppText>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stock: {
    alignItems: 'flex-end',
    gap: theme.spacing[1] / 2,
  },
  quantity: {
    ...textStyles.amountMd,
  },
  pill: {
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.sm,
  },
  lowPill: {
    backgroundColor: theme.colors.goldSoft,
  },
  outPill: {
    backgroundColor: theme.colors.statusCancelledBg,
  },
});
