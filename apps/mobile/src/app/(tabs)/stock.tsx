import { router, useLocalSearchParams } from 'expo-router';
import { Package, Plus } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  AlertBanner,
  AppText,
  Button,
  EmptyState,
  FilterChips,
  Screen,
  SearchBar,
} from '@/components/ui';
import { ProductRow } from '@/features/product/product-row';
import { useProducts } from '@/features/product/use-products';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

type Filter = 'all' | 'low' | 'archived';

const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'low', label: 'Stock faible' },
  { value: 'archived', label: 'Archivés' },
] as const;

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

  const openNew = () => router.push('/products/new');
  const isFiltered = q !== '' || filter !== 'all';

  return (
    <Screen
      scroll={false}
      footer={
        <Button
          label="Ajouter un produit"
          icon={Plus}
          variant="primary"
          fullWidth
          onPress={openNew}
        />
      }
    >
      <View style={styles.header}>
        <AppText variant="title">Stock</AppText>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit" />
        <FilterChips options={filters} value={filter} onChange={setFilter} />
      </View>

      {products.isError && (
        <AlertBanner
          tone="danger"
          message={apiErrorMessage(products.error)}
          onPress={() => products.refetch()}
        />
      )}

      <FlatList
        data={products.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProductRow product={item} onPress={() => router.push(`/products/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={products.isRefetching} onRefresh={() => products.refetch()} />
        }
        ListEmptyComponent={
          products.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : isFiltered ? (
            <EmptyState icon={Package} title="Aucun produit trouvé" />
          ) : (
            <EmptyState
              icon={Package}
              title="Aucun produit pour l'instant"
              message="Ajoutez vos produits pour suivre votre stock et créer des commandes."
            />
          )
        }
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing[3],
  },
  list: {
    flex: 1,
    marginTop: -theme.spacing[3],
  },
  separator: {
    height: theme.spacing[2],
  },
  loader: {
    marginTop: theme.spacing[8],
  },
});
