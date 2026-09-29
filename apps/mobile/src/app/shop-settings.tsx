import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { ShopForm } from '@/features/shop/shop-form';
import { useActiveShop, useUpdateShop } from '@/features/shop/use-shop';

export default function ShopSettingsScreen() {
  const shop = useActiveShop();
  const updateShop = useUpdateShop(shop.id);

  return (
    <Screen edges={[]}>
      <ShopForm
        initialShop={shop}
        submitLabel="Enregistrer"
        onSubmit={async (input) => {
          await updateShop.mutateAsync(input);
          router.back();
        }}
        error={updateShop.error}
      />
    </Screen>
  );
}
