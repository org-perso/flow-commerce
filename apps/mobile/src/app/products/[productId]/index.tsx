import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Package,
  Pencil,
} from 'lucide-react-native';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, Screen } from '@/components/ui';
import type { ManualMovementType } from '@/features/product/product-api';
import { movementLabels } from '@/features/product/stock-movement-labels';
import { useArchiveProduct, useProduct, useStockMovements } from '@/features/product/use-products';
import { useCan } from '@/features/shop/use-shop';
import { apiErrorMessage } from '@/lib/api-client';
import { textStyles, theme } from '@/theme';
import { formatAr, formatDateTime } from '@/utils/format';

function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="caption" color="inkMuted" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </AppText>
  );
}

/** One figure of the stats card: small label, value, optional note. */
function Stat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'danger' | 'success';
}) {
  const color =
    tone === 'danger' ? 'statusCancelledFg' : tone === 'success' ? 'statusDeliveredFg' : 'ink';
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color="inkMuted">
        {label}
      </AppText>
      <AppText style={styles.statValue} color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {caption && (
        <AppText variant="caption" color={color}>
          {caption}
        </AppText>
      )}
    </View>
  );
}

export default function ProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const product = useProduct(productId);
  const movements = useStockMovements(productId);
  const archive = useArchiveProduct(productId);
  // A CM reads the stock only (no costs, no changes).
  const canEdit = useCan('catalog.write');

  if (!product.data) {
    return (
      <Screen edges={[]}>
        {product.isError ? (
          <AlertBanner tone="danger" message={apiErrorMessage(product.error)} />
        ) : (
          <ActivityIndicator color={theme.colors.ink} />
        )}
      </Screen>
    );
  }

  const p = product.data;
  const archived = p.archivedAt !== null;
  const openMovement = (type: ManualMovementType) =>
    router.push({ pathname: '/products/[productId]/movement', params: { productId, type } });

  const confirmArchive = () =>
    Alert.alert(
      'Archiver ce produit ?',
      "Il n'apparaîtra plus dans la liste ni dans les nouvelles commandes. Vous pourrez le restaurer.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Archiver', style: 'destructive', onPress: () => archive.mutate(true) },
      ],
    );

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          title: p.name,
          headerRight: () =>
            canEdit && (
              <Button
                label="Modifier"
                icon={Pencil}
                compact
                onPress={() =>
                  router.push({ pathname: '/products/[productId]/edit', params: { productId } })
                }
              />
            ),
        }}
      />

      {archived && <AlertBanner message="Ce produit est archivé." />}
      {archive.isError && <AlertBanner tone="danger" message={apiErrorMessage(archive.error)} />}

      {/* Identity: photo, name, category, description. */}
      <View style={[styles.card, styles.identity]}>
        {p.image ? (
          <Image source={{ uri: p.image }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Package size={theme.layout.iconLg} color={theme.colors.inkMuted} strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.cell}>
          <AppText style={styles.strong} numberOfLines={2}>
            {p.name}
          </AppText>
          {p.category && (
            <AppText variant="caption" color="inkMuted">
              {p.category.name}
            </AppText>
          )}
          {p.description && (
            <AppText variant="caption" numberOfLines={3}>
              {p.description}
            </AppText>
          )}
        </View>
      </View>

      {/* Figures at a glance: stock, then prices (costs hidden from the CM, RG-60). */}
      <View style={[styles.card, styles.stats]}>
        <Stat
          label="En stock"
          value={String(p.stockQuantity)}
          tone={!archived && p.isLowStock ? 'danger' : undefined}
          caption={!archived && p.isLowStock ? `Alerte à ${p.lowStockThreshold}` : undefined}
        />
        <Stat label="Vente" value={formatAr(p.sellingPrice)} />
        {p.purchasePrice !== undefined && (
          <>
            <Stat label="Achat" value={formatAr(p.purchasePrice)} />
            <Stat
              label="Marge"
              value={formatAr(p.sellingPrice - p.purchasePrice)}
              tone={p.sellingPrice < p.purchasePrice ? 'danger' : 'success'}
            />
          </>
        )}
      </View>

      {!archived && canEdit && (
        <View style={styles.row}>
          <View style={styles.cell}>
            <Button
              label="Entrée"
              icon={ArrowDownToLine}
              compact
              fullWidth
              onPress={() => openMovement('AJOUT')}
            />
          </View>
          <View style={styles.cell}>
            <Button
              label="Sortie"
              icon={ArrowUpFromLine}
              compact
              fullWidth
              onPress={() => openMovement('RETRAIT')}
            />
          </View>
          <View style={styles.cell}>
            <Button
              label="Inventaire"
              icon={ClipboardCheck}
              compact
              fullWidth
              onPress={() => openMovement('AJUSTEMENT')}
            />
          </View>
        </View>
      )}

      <View style={styles.group}>
        <SectionLabel>Historique du stock</SectionLabel>
        {movements.isSuccess && movements.items.length === 0 && (
          <AppText variant="caption" color="inkMuted">
            {"Aucun mouvement pour l'instant."}
          </AppText>
        )}
        {movements.items.length > 0 && (
          <View style={[styles.card, styles.list]}>
            {movements.items.map((m, index) => (
              <View key={m.id} style={[styles.movement, index > 0 && styles.movementBorder]}>
                <View style={styles.cell}>
                  <AppText variant="label" style={styles.strong}>
                    {movementLabels[m.type]}
                  </AppText>
                  <AppText variant="caption" color="inkMuted" numberOfLines={2}>
                    {formatDateTime(m.createdAt)}
                    {m.reason ? ` · ${m.reason}` : ''}
                  </AppText>
                </View>
                <AppText
                  style={styles.quantity}
                  color={m.quantity > 0 ? 'statusDeliveredFg' : 'statusCancelledFg'}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </AppText>
              </View>
            ))}
          </View>
        )}
        {movements.hasNextPage && (
          <Button
            label="Voir plus de mouvements"
            variant="ghost"
            compact
            loading={movements.isFetchingNextPage}
            onPress={movements.loadMore}
          />
        )}
      </View>

      {/* Editing is in the header; archiving stays apart, at the bottom. */}
      {canEdit &&
        (archived ? (
          <Button
            label="Restaurer le produit"
            variant="ghost"
            compact
            loading={archive.isPending}
            onPress={() => archive.mutate(false)}
          />
        ) : (
          <Button
            label="Archiver le produit"
            icon={Archive}
            variant="ghost"
            compact
            loading={archive.isPending}
            onPress={confirmArchive}
          />
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: theme.spacing[2],
  },
  sectionLabel: {
    fontFamily: theme.typography.heading.fontFamily,
    paddingHorizontal: theme.spacing[1],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  cell: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: theme.layout.border,
    borderColor: theme.colors.line,
    padding: theme.spacing[3],
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  thumb: {
    width: theme.spacing[8] * 2,
    height: theme.spacing[8] * 2,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navySoft,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: theme.spacing[3],
  },
  stat: {
    flexBasis: '50%',
    gap: theme.spacing[1] / 2,
    paddingRight: theme.spacing[2],
  },
  statValue: {
    ...textStyles.amountMd,
  },
  list: {
    paddingVertical: theme.spacing[1],
  },
  movement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  movementBorder: {
    borderTopWidth: theme.layout.border,
    borderTopColor: theme.colors.line,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  quantity: {
    fontFamily: theme.typography.heading.fontFamily,
    fontVariant: ['tabular-nums'],
  },
});
