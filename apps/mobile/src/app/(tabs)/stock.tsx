import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  EmptyState,
  InlineBanner,
  Screen,
  PageTitle,
  ScreenHeader,
  SearchBar,
  SegmentedControl,
} from '@/components/ui';
import { ProductRow } from '@/features/product/product-row';
import { useProducts } from '@/features/product/use-products';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

type Filter = 'all' | 'low' | 'archived';

export default function StockScreen() {
  const [search, setSearch] = useState('');
  // The filter lives in the URL, so the dashboard alert can open this tab pre-filtered.
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const filter = params.filter ?? 'all';
  const setFilter = (value: Filter) =>
    router.setParams({ filter: value === 'all' ? undefined : value });
  const q = useDeferredValue(search.trim());

  const products = useProducts({
    q: q || undefined,
    lowStock: filter === 'low',
    archived: filter === 'archived',
  });
  // Count shown on the "Stock faible" segment.
  const lowStock = useProducts({ lowStock: true });

  const openNew = () => router.push('/products/new');
  const isFiltered = q !== '' || filter !== 'all';

  return (
    <Screen scroll={false} header={<ScreenHeader />}>
      <PageTitle title="Stock" action={{ label: 'Ajouter', icon: Plus, onPress: openNew }} />
      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit" />
        <SegmentedControl
          options={[
            { key: 'all', label: 'Tous' },
            { key: 'low', label: 'Stock faible', count: lowStock.data?.length },
            { key: 'archived', label: 'Archivés' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {products.isError && (
        <InlineBanner
          tone="danger"
          message={apiErrorMessage(products.error)}
          action={{ label: 'Réessayer', onPress: () => products.refetch() }}
        />
      )}

      <FlatList
        data={products.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item, index }) => (
          <ProductRow
            product={item}
            divider={index > 0}
            onPress={() => router.push(`/products/${item.id}`)}
          />
        )}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={products.isRefetching} onRefresh={() => products.refetch()} />
        }
        ListEmptyComponent={
          products.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : isFiltered ? (
            <EmptyState message="Aucun produit trouvé." />
          ) : (
            <EmptyState
              message="Aucun produit pour l'instant."
              action={{ label: 'Ajouter un produit', onPress: openNew }}
            />
          )
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: theme.spacing[3],
  },
  list: {
    flex: 1,
    marginTop: -theme.spacing[3],
  },
  listContent: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  loader: {
    marginTop: theme.spacing[8],
  },
});
