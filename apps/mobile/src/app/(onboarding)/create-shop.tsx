import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { Button } from '@/components/ui';
import { router } from 'expo-router';
import { ShopForm } from '@/features/shop/shop-form';
import { useCreateShop } from '@/features/shop/use-shop';

const DEFAULT_SHOP_NAME = 'Ma boutique';

export default function CreateShopScreen() {
  const createShop = useCreateShop();

  // Once the shop exists, the root layout's guard switches to the app.
  return (
    <AuthScaffold
      title="Créez votre boutique"
      subtitle="Dernière étape : donnez un nom à votre boutique, ou passez cette étape. Vous pourrez le modifier plus tard."
    >
      <ShopForm
        submitLabel="Créer ma boutique"
        onSubmit={createShop.mutateAsync}
        error={createShop.error}
        inline
      />
      {/* Skip: a default shop, renamed later from « Compte et boutique ». */}
      <Button
        label="Passer cette étape"
        variant="ghost"
        loading={createShop.isPending && createShop.variables?.name === DEFAULT_SHOP_NAME}
        onPress={() => createShop.mutate({ name: DEFAULT_SHOP_NAME, description: null })}
      />
      <Button label="Retour" variant="ghost" onPress={() => router.back()} />
    </AuthScaffold>
  );
}
