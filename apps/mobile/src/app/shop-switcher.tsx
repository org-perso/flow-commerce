import { router } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Avatar, ListGroup, ListRow, Screen } from '@/components/ui';
import { useActiveShop, useSetActiveShop, useShops } from '@/features/shop/use-shop';
import { theme } from '@/theme';

/** Modal: pick the active shop, or create one. */
export default function ShopSwitcherScreen() {
  const { data: shops = [] } = useShops();
  const activeShop = useActiveShop();
  const setActiveShop = useSetActiveShop();

  return (
    <Screen edges={[]}>
      <ListGroup>
        {shops.map((shop) => (
          <ListRow
            key={shop.id}
            leading={<Avatar name={shop.name} />}
            title={shop.name}
            subtitle={shop.description ?? undefined}
            trailing={
              shop.id === activeShop.id ? (
                <Check size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
              ) : undefined
            }
            accessibilityLabel={
              shop.id === activeShop.id ? `${shop.name}, boutique active` : shop.name
            }
            onPress={() => {
              setActiveShop(shop.id);
              router.back();
            }}
          />
        ))}
        <ListRow
          leading={
            <View style={styles.plus}>
              <Plus size={theme.layout.iconMd} color={theme.colors.blue} strokeWidth={2} />
            </View>
          }
          title="Créer une boutique"
          titleColor="blue"
          onPress={() => router.replace('/new-shop')}
        />
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plus: {
    width: theme.layout.avatar,
    height: theme.layout.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
