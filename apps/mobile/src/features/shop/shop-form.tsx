import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';

import { FormTextField } from '@/components/form-text-field';
import { FormScreen } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';

import { shopSchema, toShopInput, type ShopFormValues } from './schemas';
import type { Shop, ShopInput } from './shop-api';

type ShopFormProps = {
  initialShop?: Shop;
  submitLabel: string;
  onSubmit: (input: ShopInput) => Promise<unknown>;
  error: unknown;
  /** Under the fields (e.g. a delete button). */
  extra?: ReactNode;
  /** Inside another layout (sign-up flow) instead of its own screen. */
  inline?: boolean;
};

export function ShopForm({
  initialShop,
  submitLabel,
  onSubmit,
  error,
  extra,
  inline,
}: ShopFormProps) {
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
    <FormScreen
      submitLabel={submitLabel}
      onSubmit={submit}
      submitting={formState.isSubmitting}
      error={error != null ? apiErrorMessage(error) : undefined}
      extra={extra}
      inline={inline}
    >
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
    </FormScreen>
  );
}
