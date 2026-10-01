import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  AppText,
  EmptyState,
  FilterChips,
  InlineBanner,
  Screen,
  PageTitle,
  ScreenHeader,
  SearchBar,
} from '@/components/ui';
import { ProductRow } from '@/features/product/product-row';
import { useCan } from '@/features/shop/use-shop';
import { usePagedProducts, useStockSummary } from '@/features/product/use-products';
import { apiErrorMessage } from '@/lib/api-client';
import { NewOrderFab } from '@/features/order/new-order-fab';
import { theme } from '@/theme';
import { formatAr } from '@/utils/format';

type Filter = 'all' | 'low' | 'out' | 'archived';

export default function StockScreen() {
  const [search, setSearch] = useState('');
  // The filter lives in the URL, so the dashboard alert can open this tab pre-filtered.
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const filter = params.filter ?? 'all';
  const setFilter = (value: Filter) =>
    router.setParams({ filter: value === 'all' ? undefined : value });
  const q = useDeferredValue(search.trim());

  const products = usePagedProducts({
    q: q || undefined,
    lowStock: filter === 'low',
    outOfStock: filter === 'out',
    archived: filter === 'archived',
  });
  // Counts on the chips and the header line.
  const { data: summary, refetch: refetchSummary } = useStockSummary();

  const canEdit = useCan('catalog.write');
  const openNew = () => router.push('/products/new');
  const isFiltered = q !== '' || filter !== 'all';

  return (
    <Screen scroll={false} header={<ScreenHeader />}>
      <PageTitle
        title="Stock"
        action={canEdit ? { label: 'Ajouter', icon: Plus, onPress: openNew } : undefined}
      />
      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit" />
        <FilterChips
          options={[
            { value: 'all', label: 'Tous', count: summary?.productCount },
            { value: 'low', label: 'Stock faible', count: summary?.lowStockCount },
            { value: 'out', label: 'Rupture', count: summary?.outOfStockCount },
            { value: 'archived', label: 'Archivés' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        {summary && summary.productCount > 0 && (
          <View style={styles.summary}>
            <AppText variant="caption" color="inkMuted">
              {summary.productCount} produit{summary.productCount > 1 ? 's' : ''} · {summary.units}{' '}
              article{summary.units > 1 ? 's' : ''}
            </AppText>
            {summary.stockSaleValue !== undefined && (
              <AppText variant="caption" color="inkMuted">
                Valeur :{' '}
                <AppText variant="caption" style={styles.strong}>
                  {formatAr(summary.stockSaleValue)}
                </AppText>
              </AppText>
            )}
          </View>
        )}
      </View>

      {products.isError && (
        <InlineBanner
          tone="danger"
          message={apiErrorMessage(products.error)}
          action={{ label: 'Réessayer', onPress: () => products.refetch() }}
        />
      )}

      <FlatList
        data={products.items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            canRestock={canEdit}
            onPress={() => router.push(`/products/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={products.loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          products.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.more} />
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={products.isRefetching}
            onRefresh={() => {
              products.refetch();
              refetchSummary();
            }}
          />
        }
        ListEmptyComponent={
          products.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : (
            <EmptyState
              message={isFiltered ? 'Aucun produit trouvé.' : "Aucun produit pour l'instant."}
            />
          )
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
      <NewOrderFab />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: theme.spacing[3],
  },
  list: {
    flex: 1,
    marginTop: -theme.spacing[1],
  },
  listContent: {
    paddingBottom: theme.spacing[4],
  },
  separator: {
    height: theme.spacing[3],
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
    color: theme.colors.ink,
  },
  loader: {
    marginTop: theme.spacing[8],
  },
  more: {
    marginVertical: theme.spacing[4],
  },
});
