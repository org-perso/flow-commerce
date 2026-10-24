import { router } from 'expo-router';

import { ShopForm } from '@/features/shop/shop-form';
import { planLimitOf } from '@/features/subscription/plan-gate';
import { UpgradeSheet } from '@/features/subscription/upgrade-sheet';
import { useCreateShop } from '@/features/shop/use-shop';

/** Creates an additional shop and switches to it. */
export default function NewShopScreen() {
  const createShop = useCreateShop();
  // Plan limit: the upgrade sheet instead of an error.
  const limit = planLimitOf(createShop.error);

  return (
    <>
      <UpgradeSheet limit={limit} onClose={() => createShop.reset()} isOwner />
      <ShopForm
        submitLabel="Créer la boutique"
        onSubmit={async (input) => {
          await createShop.mutateAsync(input);
          router.dismissTo('/');
        }}
        error={limit ? null : createShop.error}
      />
    </>
  );
}
