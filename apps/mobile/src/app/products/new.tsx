import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { ProductForm } from '@/features/product/product-form';
import { useCreateProduct } from '@/features/product/use-products';

export default function NewProductScreen() {
  const createProduct = useCreateProduct();

  return (
    <Screen edges={[]}>
      <ProductForm
        submitLabel="Ajouter le produit"
        error={createProduct.error}
        onSubmit={async (values) => {
          await createProduct.mutateAsync(values);
          // Back to the list: the new product shows up there.
          router.back();
        }}
      />
    </Screen>
  );
}
