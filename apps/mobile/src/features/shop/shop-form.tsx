import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { FormTextField } from '@/components/form-text-field';
import { AlertBanner, Button } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

import { shopSchema, toShopInput, type ShopFormValues } from './schemas';
import type { Shop, ShopInput } from './shop-api';

type ShopFormProps = {
  initialShop?: Shop;
  submitLabel: string;
  onSubmit: (input: ShopInput) => Promise<unknown>;
  error: unknown;
};

export function ShopForm({ initialShop, submitLabel, onSubmit, error }: ShopFormProps) {
  const { control, handleSubmit, formState } = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: initialShop?.name ?? '',
      description: initialShop?.description ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    // The error is surfaced through the `error` prop (mutation state).
    await onSubmit(toShopInput(values)).catch(() => {});
  });

  return (
    <View style={{ gap: theme.spacing[4] }}>
      {error != null && <AlertBanner tone="danger" message={apiErrorMessage(error)} />}
      <FormTextField
        control={control}
        name="name"
        label="Nom de la boutique"
        placeholder="Ex. Boutique Hery"
        autoCapitalize="words"
        maxLength={150}
        returnKeyType="next"
      />
      <FormTextField
        control={control}
        name="description"
        label="Description (facultatif)"
        placeholder="Ce que vous vendez, où vous livrez…"
        multiline
        maxLength={1000}
      />
      <Button
        label={submitLabel}
        variant="primary"
        fullWidth
        loading={formState.isSubmitting}
        onPress={submit}
      />
    </View>
  );
}
