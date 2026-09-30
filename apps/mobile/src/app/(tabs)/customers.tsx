import { router } from 'expo-router';
import { Phone, Plus } from 'lucide-react-native';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import {
  Avatar,
  EmptyState,
  InlineBanner,
  ListRow,
  Screen,
  PageTitle,
  ScreenHeader,
  SearchBar,
} from '@/components/ui';
import type { Customer } from '@/features/customer/customer-api';
import { callPhone } from '@/features/customer/contact';
import { useCustomers } from '@/features/customer/use-customers';
import { apiErrorMessage } from '@/lib/api-client';
import { hitSlopFor, theme } from '@/theme';
import { formatPhone } from '@/utils/format';

function subtitle(customer: Customer): string | undefined {
  const [main, ...others] = customer.phones;
  const phone = main ? formatPhone(main) + (others.length ? ` +${others.length}` : '') : null;
  return [phone, customer.socialProfile].filter(Boolean).join(' · ') || undefined;
}

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const customers = useCustomers(q || undefined);
  const openNew = () => router.push('/customers/new');

  return (
    <Screen scroll={false} header={<ScreenHeader />}>
      <PageTitle title="Clients" action={{ label: 'Ajouter', icon: Plus, onPress: openNew }} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, téléphone ou profil" />

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
        renderItem={({ item, index }) => (
          <ListRow
            divider={index > 0}
            onPress={() => router.push(`/customers/${item.id}`)}
            leading={<Avatar name={item.name} />}
            title={item.name}
            subtitle={subtitle(item)}
            trailing={
              item.phones[0] ? (
                <Pressable
                  onPress={() => callPhone(item.phones[0]!)}
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler ${item.name}`}
                  hitSlop={hitSlopFor(theme.layout.controlHeight)}
                  style={styles.call}
                >
                  <Phone size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
                </Pressable>
              ) : undefined
            }
          />
        )}
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

const styles = StyleSheet.create({
  list: {
    flex: 1,
    marginTop: -theme.spacing[3],
  },
  listContent: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  call: {
    width: theme.layout.controlHeight,
    height: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.navySoft,
  },
  loader: {
    marginTop: theme.spacing[8],
  },
});
