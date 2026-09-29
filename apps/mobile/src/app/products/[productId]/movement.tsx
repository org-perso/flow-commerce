import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { FormTextField } from '@/components/form-text-field';
import { AlertBanner, AppText, Button, Screen } from '@/components/ui';
import type { ManualMovementType } from '@/features/product/product-api';
import { useCreateStockMovement, useProduct } from '@/features/product/use-products';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { optionalTextField, quantityField } from '@/lib/form-fields';
import { theme } from '@/theme';

const copy: Record<
  ManualMovementType,
  { title: string; field: string; hint: string; submit: string }
> = {
  AJOUT: {
    title: 'Entrée de stock',
    field: 'Quantité reçue',
    hint: 'Ex. réception de marchandise.',
    submit: 'Ajouter au stock',
  },
  RETRAIT: {
    title: 'Sortie de stock',
    field: 'Quantité retirée',
    hint: 'Ex. produit cassé, perdu, offert.',
    submit: 'Retirer du stock',
  },
  AJUSTEMENT: {
    title: 'Inventaire',
    field: 'Quantité comptée',
    hint: 'Le stock sera corrigé pour correspondre à ce que vous avez compté.',
    submit: 'Corriger le stock',
  },
};

const schema = z.object({ quantity: quantityField, reason: optionalTextField(500) });

export default function StockMovementScreen() {
  const { productId, type = 'AJOUT' } = useLocalSearchParams<{
    productId: string;
    type?: ManualMovementType;
  }>();
  const product = useProduct(productId);
  const createMovement = useCreateStockMovement(productId);
  const text = copy[type];
  const current = product.data?.stockQuantity ?? 0;

  const { control, handleSubmit, formState, setError } = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: { quantity: '', reason: '' },
  });

  const submit = handleSubmit(async ({ quantity, reason }) => {
    // Inventory: the user types the counted stock, the API wants the correction.
    const delta = type === 'AJUSTEMENT' ? quantity - current : quantity;
    if (delta === 0) {
      const message =
        type === 'AJUSTEMENT' ? 'Le stock est déjà à cette valeur.' : 'Doit être supérieur à 0.';
      setError('quantity', { message });
      return;
    }
    try {
      await createMovement.mutateAsync({ type, quantity: delta, reason });
      router.back();
    } catch {
      // Shown through createMovement.error.
    }
  });

  const error = createMovement.error;
  const errorMessage =
    error instanceof ApiError && error.status === 409
      ? `Stock insuffisant : il reste ${String(error.body.available ?? current)} unité(s).`
      : error
        ? apiErrorMessage(error)
        : null;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: text.title }} />
      <View style={styles.summary}>
        <AppText variant="caption" color="inkMuted">
          {product.data?.name}
        </AppText>
        <AppText variant="heading">Stock actuel : {current}</AppText>
      </View>
      {errorMessage && <AlertBanner tone="danger" message={errorMessage} />}
      <FormTextField
        control={control}
        name="quantity"
        label={text.field}
        hint={text.hint}
        keyboardType="number-pad"
        autoFocus
      />
      <FormTextField
        control={control}
        name="reason"
        label="Motif (facultatif)"
        placeholder={type === 'AJOUT' ? 'Ex. livraison fournisseur' : 'Ex. produit abîmé'}
        maxLength={500}
      />
      <Button
        label={text.submit}
        variant="primary"
        fullWidth
        loading={formState.isSubmitting}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: theme.spacing[1],
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    padding: theme.spacing[4],
  },
});
