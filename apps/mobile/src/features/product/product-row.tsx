import { Minus, Plus, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button } from '@/components/ui';
import { hitSlopFor, textStyles, theme } from '@/theme';
import { formatAr } from '@/utils/format';

import type { Product } from './product-api';
import { useCreateStockMovement } from './use-products';

type ProductRowProps = {
  product: Product;
  onPress: () => void;
  /** Quick restock on low stock; off for roles that only read the stock (CM). */
  canRestock?: boolean;
};

/** Product card; low or empty stock gets a quick restock stepper. */
export function ProductRow({ product, onPress, canRestock = true }: ProductRowProps) {
  const archived = product.archivedAt !== null;
  const outOfStock = !archived && product.stockQuantity === 0;
  const low = !archived && !outOfStock && product.isLowStock;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Avatar name={product.name} imageUri={product.image} />
        <View style={styles.info}>
          <AppText style={styles.name} numberOfLines={1}>
            {product.name}
          </AppText>
          <AppText variant="caption" color="inkMuted" numberOfLines={1}>
            {[formatAr(product.sellingPrice), product.category?.name].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <View style={styles.stock}>
          <AppText
            style={styles.quantity}
            color={outOfStock ? 'statusCancelledFg' : low ? 'goldInk' : 'ink'}
          >
            {product.stockQuantity}
          </AppText>
          {archived ? (
            <AppText variant="caption" color="inkMuted">
              Archivé
            </AppText>
          ) : outOfStock ? (
            <Pill tone="out" label="Rupture" />
          ) : low ? (
            <Pill tone="low" label="Stock faible" />
          ) : (
            <AppText variant="caption" color="inkMuted">
              en stock
            </AppText>
          )}
        </View>
      </Pressable>
      {canRestock && (low || outOfStock) && <Restock productId={product.id} />}
    </View>
  );
}

function Pill({ tone, label }: { tone: 'low' | 'out'; label: string }) {
  const fg = tone === 'low' ? theme.colors.goldInk : theme.colors.statusCancelledFg;
  return (
    <View style={[styles.pill, tone === 'low' ? styles.lowPill : styles.outPill]}>
      <TriangleAlert size={theme.layout.iconSm} color={fg} strokeWidth={2.5} />
      <AppText variant="caption" color={tone === 'low' ? 'goldInk' : 'statusCancelledFg'}>
        {label}
      </AppText>
    </View>
  );
}

/** − n + stepper and "Réapprovisionner": adds n units (AJOUT movement). */
function Restock({ productId }: { productId: string }) {
  const [quantity, setQuantity] = useState(1);
  const movement = useCreateStockMovement(productId);

  return (
    <View style={styles.restock}>
      <View style={styles.stepper}>
        <StepButton
          icon={Minus}
          label="Moins"
          disabled={quantity <= 1}
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
        />
        <AppText style={styles.stepValue} color="goldInk">
          {quantity}
        </AppText>
        <StepButton icon={Plus} label="Plus" onPress={() => setQuantity((q) => q + 1)} />
      </View>
      <Button
        label="Réapprovisionner"
        icon={Plus}
        compact
        loading={movement.isPending}
        onPress={() =>
          movement.mutate(
            { type: 'AJOUT', quantity, reason: 'Réapprovisionnement' },
            { onSuccess: () => setQuantity(1) },
          )
        }
      />
    </View>
  );
}

function StepButton({
  icon: Icon,
  label,
  disabled,
  onPress,
}: {
  icon: typeof Plus;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlopFor(theme.layout.controlHeight)}
      style={({ pressed }) => [styles.step, (pressed || disabled) && styles.pressed]}
    >
      <Icon
        size={theme.layout.iconSm}
        color={disabled ? theme.colors.inkMuted : theme.colors.ink}
        strokeWidth={2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: theme.layout.rowMinHeight,
    padding: theme.spacing[3],
  },
  info: {
    flex: 1,
    gap: theme.spacing[1] / 2,
  },
  name: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  stock: {
    alignItems: 'flex-end',
    gap: theme.spacing[1] / 2,
  },
  quantity: {
    ...textStyles.amountMd,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.radius.sm,
  },
  lowPill: {
    backgroundColor: theme.colors.goldSoft,
  },
  outPill: {
    backgroundColor: theme.colors.statusCancelledBg,
  },
  restock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    marginHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.layout.controlHeight,
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
  },
  step: {
    width: theme.layout.controlHeight,
    height: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: theme.spacing[8],
    textAlign: 'center',
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
