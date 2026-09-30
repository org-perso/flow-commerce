import { router } from 'expo-router';
import { ChevronRight, UserPlus, Users } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppText,
  EmptyState,
  InlineBanner,
  PageTitle,
  Screen,
  ScreenHeader,
  SearchBar,
} from '@/components/ui';
import { CustomerRow } from '@/features/customer/customer-row';
import { useCustomers, useUnlinkedOrdersCount } from '@/features/customer/use-customers';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const customers = useCustomers(q || undefined);
  const unlinked = useUnlinkedOrdersCount().data?.count ?? 0;
  const openNew = () => router.push('/customers/new');

  return (
    <Screen scroll={false} header={<ScreenHeader />}>
      <PageTitle title="Clients" action={{ label: 'Ajouter', icon: UserPlus, onPress: openNew }} />
      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, téléphone ou profil" />
        {unlinked > 0 && !q && <UnlinkedBanner count={unlinked} />}
      </View>

      {customers.isError && (
        <InlineBanner
          tone="danger"
          message={apiErrorMessage(customers.error)}
          action={{ label: 'Réessayer', onPress: () => customers.refetch() }}
        />
      )}

      <FlatList
        data={customers.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CustomerRow customer={item} onPress={() => router.push(`/customers/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={customers.isRefetching}
            onRefresh={() => customers.refetch()}
          />
        }
        ListEmptyComponent={
          customers.isPending ? (
            <ActivityIndicator color={theme.colors.ink} style={styles.loader} />
          ) : q ? (
            <EmptyState message="Aucun client trouvé." />
          ) : (
            <EmptyState
              message="Aucun client pour l'instant."
              action={{ label: 'Ajouter un client', onPress: openNew }}
            />
          )
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

/** Orders taken without a customer file: an invitation to link them. */
function UnlinkedBanner({ count }: { count: number }) {
  return (
    <Pressable
      onPress={() => router.navigate({ pathname: '/orders', params: { when: 'all' } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <Users size={theme.layout.iconMd} color={theme.colors.goldInk} strokeWidth={2} />
      <AppText color="goldInk" style={styles.flex}>
        <AppText color="goldInk" style={styles.strong}>
          {count} commande{count > 1 ? 's' : ''}
        </AppText>{' '}
        sans fiche client. Associez-les pour suivre vos habitués.
      </AppText>
      <ChevronRight size={theme.layout.iconMd} color={theme.colors.goldInk} strokeWidth={2} />
    </Pressable>
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
    paddingBottom: theme.spacing[4],
  },
  separator: {
    height: theme.spacing[3],
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldSoft,
  },
  flex: {
    flex: 1,
  },
  strong: {
    fontFamily: theme.typography.heading.fontFamily,
  },
  loader: {
    marginTop: theme.spacing[8],
  },
  pressed: {
    opacity: theme.layout.pressedOpacity,
  },
});
