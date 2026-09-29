import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { ShopForm } from '@/features/shop/shop-form';
import { useMyShop, useSaveShop } from '@/features/shop/use-shop';

export default function ShopSettingsScreen() {
  const { data: shop } = useMyShop();
  const updateShop = useSaveShop('update');

  // The root guard only shows this screen once the shop is loaded.
  if (!shop) return null;

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
