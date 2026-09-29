import { AuthScaffold } from '@/features/auth/auth-scaffold';
import { Button } from '@/components/ui';
import { signOut } from '@/features/auth/auth-service';
import { ShopForm } from '@/features/shop/shop-form';
import { useSaveShop } from '@/features/shop/use-shop';

export default function CreateShopScreen() {
  const createShop = useSaveShop('create');

  // Once the shop exists, the root layout's guard switches to the app.
  return (
    <AuthScaffold
      title="Créez votre boutique"
      subtitle="Dernière étape : donnez un nom à votre boutique. Vous pourrez le modifier plus tard."
    >
      <ShopForm
        submitLabel="Créer ma boutique"
        onSubmit={createShop.mutateAsync}
        error={createShop.error}
      />
      <Button label="Se déconnecter" variant="ghost" onPress={signOut} />
    </AuthScaffold>
  );
}
