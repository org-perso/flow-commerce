import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui';
import { ProductForm } from '@/features/product/product-form';
import { useProduct, useUpdateProduct } from '@/features/product/use-products';
import { theme } from '@/theme';

export default function EditProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const product = useProduct(productId);
  const updateProduct = useUpdateProduct(productId);

  return (
    <Screen edges={[]}>
      {product.data ? (
        <ProductForm
          product={product.data}
          submitLabel="Enregistrer"
          error={updateProduct.error}
          onSubmit={async ({ initialStock: _, ...values }) => {
            await updateProduct.mutateAsync(values);
            router.back();
          }}
        />
      ) : (
        <ActivityIndicator color={theme.colors.ink} />
      )}
    </Screen>
  );
}
