import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { ShopForm } from '@/features/shop/shop-form';
import { useCreateShop } from '@/features/shop/use-shop';

/** Creates an additional shop and switches to it. */
export default function NewShopScreen() {
  const createShop = useCreateShop();

  return (
    <Screen edges={[]}>
      <ShopForm
        submitLabel="Créer la boutique"
        onSubmit={async (input) => {
          await createShop.mutateAsync(input);
          router.dismissTo('/');
        }}
        error={createShop.error}
      />
    </Screen>
  );
}
