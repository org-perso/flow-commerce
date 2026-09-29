import { router } from 'expo-router';
import { ChevronRight, UserPlus } from 'lucide-react-native';
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
  AlertBanner,
  AppText,
  Button,
  EmptyState,
  Screen,
  ScreenHeader,
  SearchBar,
} from '@/components/ui';
import { formatPhone } from '@/features/customer/contact';
import { useCustomers } from '@/features/customer/use-customers';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const customers = useCustomers(q || undefined);

  return (
    <Screen
      header={<ScreenHeader title="Clients" />}
      scroll={false}
      footer={
        <Button
          label="Ajouter un client"
          icon={UserPlus}
          variant="primary"
          fullWidth
          onPress={() => router.push('/customers/new')}
        />
      }
    >
      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom ou téléphone" />
      </View>

      {customers.isError && (
        <AlertBanner
          tone="danger"
          message={apiErrorMessage(customers.error)}
          onPress={() => customers.refetch()}
        />
      )}

      <FlatList
        data={customers.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/customers/${item.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.info}>
              <AppText style={styles.name} numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                {item.phone ? formatPhone(item.phone) : 'Pas de téléphone'}
                {item.address ? ` · ${item.address}` : ''}
              </AppText>
            </View>
            <ChevronRight size={18} color={theme.colors.inkMuted} strokeWidth={2} />
          </Pressable>
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
              action={{ label: 'Ajouter un client', onPress: () => router.push('/customers/new') }}
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
  separator: {
    height: theme.spacing[2],
  },
  loader: {
    marginTop: theme.spacing[8],
  },
  pressed: {
    opacity: 0.85,
  },
});
