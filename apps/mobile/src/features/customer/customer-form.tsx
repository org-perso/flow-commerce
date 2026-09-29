import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { FormTextField } from '@/components/form-text-field';
import { AlertBanner, Button } from '@/components/ui';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { optionalTextField } from '@/lib/form-fields';
import { theme } from '@/theme';

import type { Customer, CustomerInput } from './customer-api';
import { formatPhone } from './contact';

const schema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.').max(150, '150 caractères maximum.'),
  phone: optionalTextField(30).refine(
    (v) => v === null || v.replace(/\D/g, '').length >= 6,
    'Numéro invalide.',
  ),
  address: optionalTextField(1000),
});

type CustomerFormProps = {
  customer?: Customer;
  submitLabel: string;
  onSubmit: (values: CustomerInput) => Promise<unknown>;
  error: unknown;
};

export function CustomerForm({ customer, submitLabel, onSubmit, error }: CustomerFormProps) {
  const { control, handleSubmit, formState } = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ? formatPhone(customer.phone) : '',
      address: customer?.address ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values).catch(() => {});
  });

  // The API refuses a phone already used by another customer of the shop.
  const duplicateOf =
    error instanceof ApiError && error.title === 'Duplicate Phone'
      ? (error.body.customerId as string | undefined)
      : undefined;

  return (
    <View style={{ gap: theme.spacing[4] }}>
      {duplicateOf ? (
        <View style={{ gap: theme.spacing[2] }}>
          <AlertBanner message="Un client a déjà ce numéro de téléphone." />
          <Button
            label="Voir ce client"
            variant="ghost"
            onPress={() => router.replace(`/customers/${duplicateOf}`)}
          />
        </View>
      ) : (
        error != null && <AlertBanner tone="danger" message={apiErrorMessage(error)} />
      )}
      <FormTextField
        control={control}
        name="name"
        label="Nom"
        placeholder="Ex. Rakoto Jean"
        autoCapitalize="words"
        maxLength={150}
      />
      <FormTextField
        control={control}
        name="phone"
        label="Téléphone (facultatif)"
        placeholder="034 12 345 67"
        keyboardType="phone-pad"
        maxLength={30}
      />
      <FormTextField
        control={control}
        name="address"
        label="Adresse de livraison (facultatif)"
        placeholder="Quartier, repère…"
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
