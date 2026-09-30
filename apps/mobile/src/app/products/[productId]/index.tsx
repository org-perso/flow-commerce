import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Pencil } from 'lucide-react-native';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AlertBanner, AppText, Button, KpiCard, Screen } from '@/components/ui';
import type { ManualMovementType } from '@/features/product/product-api';
import { movementLabels } from '@/features/product/stock-movement-labels';
import { useArchiveProduct, useProduct, useStockMovements } from '@/features/product/use-products';
import { apiErrorMessage } from '@/lib/api-client';
import { textStyles, theme } from '@/theme';
import { formatAr, formatDateTime } from '@/utils/format';

export default function ProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const product = useProduct(productId);
  const movements = useStockMovements(productId);
  const archive = useArchiveProduct(productId);

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
          headerRight: () => (
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
      {!archived && p.isLowStock && (
        <AlertBanner message={`Stock faible : seuil d'alerte à ${p.lowStockThreshold}.`} />
      )}
      {archive.isError && <AlertBanner tone="danger" message={apiErrorMessage(archive.error)} />}

      <View style={styles.section}>
        <KpiCard variant="hero" label="En stock" value={String(p.stockQuantity)} />
        <View style={styles.row}>
          <KpiCard label="Prix de vente" value={formatAr(p.sellingPrice)} />
          <KpiCard label="Prix d'achat" value={formatAr(p.purchasePrice)} />
        </View>
        <KpiCard label="Marge par unité" value={formatAr(p.sellingPrice - p.purchasePrice)} />
        {p.image && <Image source={{ uri: p.image }} style={styles.photo} contentFit="cover" />}
        {p.category || p.description ? (
          <View style={styles.card}>
            {p.category && (
              <AppText variant="caption" color="inkMuted">
                {p.category.name}
              </AppText>
            )}
            {p.description && <AppText>{p.description}</AppText>}
          </View>
        ) : null}
      </View>

      {!archived && (
        <View style={styles.section}>
          <AppText variant="heading">Mouvement de stock</AppText>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Button
                label="Entrée"
                icon={ArrowDownToLine}
                fullWidth
                onPress={() => openMovement('AJOUT')}
              />
            </View>
            <View style={styles.cell}>
              <Button
                label="Sortie"
                icon={ArrowUpFromLine}
                fullWidth
                onPress={() => openMovement('RETRAIT')}
              />
            </View>
          </View>
          <Button
            label="Faire l'inventaire"
            icon={ClipboardCheck}
            fullWidth
            onPress={() => openMovement('AJUSTEMENT')}
          />
        </View>
      )}

      <View style={styles.section}>
        <AppText variant="heading">Historique</AppText>
        {movements.data?.length === 0 && (
          <AppText color="inkMuted">{"Aucun mouvement pour l'instant."}</AppText>
        )}
        {movements.data && movements.data.length > 0 && (
          <View style={styles.card}>
            {movements.data.map((m, index) => (
              <View key={m.id} style={[styles.movement, index > 0 && styles.movementBorder]}>
                <View style={styles.cell}>
                  <AppText style={styles.strong}>{movementLabels[m.type]}</AppText>
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
      </View>

      <View style={styles.section}>
        <Button
          label="Modifier le produit"
          icon={Pencil}
          fullWidth
          onPress={() =>
            router.push({ pathname: '/products/[productId]/edit', params: { productId } })
          }
        />
        {archived ? (
          <Button
            label="Restaurer le produit"
            variant="ghost"
            loading={archive.isPending}
            onPress={() => archive.mutate(false)}
          />
        ) : (
          <Button
            label="Archiver le produit"
            variant="danger"
            fullWidth
            loading={archive.isPending}
            onPress={confirmArchive}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  cell: {
    flex: 1,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.navySoft,
  },
  card: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[4],
    gap: theme.spacing[1],
  },
  movement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  movementBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.line,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  quantity: {
    ...textStyles.amountMd,
  },
});
