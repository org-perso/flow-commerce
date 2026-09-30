import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { FormTextField } from '@/components/form-text-field';
import { AlertBanner, AppText, Button, TextField } from '@/components/ui';
import { ApiError, apiErrorMessage } from '@/lib/api-client';
import { optionalTextField } from '@/lib/form-fields';
import { hitSlopFor, theme } from '@/theme';
import { formatPhone } from '@/utils/format';

import type { Customer, CustomerInput } from './customer-api';

const MAX_PHONES = 5;

const schema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.').max(150, '150 caractères maximum.'),
  phones: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .refine((v) => v === '' || v.replace(/\D/g, '').length >= 6, 'Numéro invalide.'),
      }),
    )
    .transform((list) => list.map((p) => p.value).filter(Boolean)),
  socialProfile: optionalTextField(255),
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
    CustomerInput
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name ?? '',
      phones: customer?.phones.length
        ? customer.phones.map((p) => ({ value: formatPhone(p) }))
        : [{ value: '' }],
      socialProfile: customer?.socialProfile ?? '',
    },
  });
  const phones = useFieldArray({ control, name: 'phones' });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values).catch(() => {});
  });

  // The API refuses a phone already used by another customer of the shop.
  const duplicateOf =
    error instanceof ApiError && error.title === 'Duplicate Phone'
      ? (error.body.customerId as string | undefined)
      : undefined;

  return (
    <View style={styles.root}>
      {duplicateOf ? (
        <View style={styles.group}>
          <AlertBanner
            message={`Le ${formatPhone(String(error instanceof ApiError ? error.body.phone : ''))} appartient déjà à un autre client.`}
          />
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

      <View style={styles.group}>
        {phones.fields.map((field, index) => (
          <View key={field.id} style={styles.phoneRow}>
            <View style={styles.flex}>
              <Controller
                control={control}
                name={`phones.${index}.value`}
                render={({ field: input, fieldState }) => (
                  <TextField
                    label={index === 0 ? 'Téléphone principal' : `Téléphone ${index + 1}`}
                    value={input.value}
                    onChangeText={input.onChange}
                    onBlur={input.onBlur}
                    error={fieldState.error?.message}
                    placeholder="034 12 345 67"
                    keyboardType="phone-pad"
                    maxLength={30}
                  />
                )}
              />
            </View>
            {phones.fields.length > 1 && (
              <Pressable
                onPress={() => phones.remove(index)}
                accessibilityRole="button"
                accessibilityLabel="Retirer ce numéro"
                hitSlop={hitSlopFor(theme.layout.controlHeight)}
                style={styles.remove}
              >
                <X size={theme.layout.iconMd} color={theme.colors.inkMuted} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        ))}
        {phones.fields.length < MAX_PHONES && (
          <Button
            label="Ajouter un numéro"
            icon={Plus}
            variant="ghost"
            compact
            onPress={() => phones.append({ value: '' })}
          />
        )}
      </View>

      <FormTextField
        control={control}
        name="socialProfile"
        label="Profil Facebook / réseau (facultatif)"
        hint="Nom sur Facebook, lien du profil, @compte Instagram…"
        placeholder="Ex. Rakoto Jean ou fb.com/rakoto"
        autoCapitalize="none"
        maxLength={255}
      />

      <AppText variant="caption" color="inkMuted">
        L’adresse de livraison se saisit avec chaque commande.
      </AppText>

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

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing[4],
  },
  group: {
    gap: theme.spacing[2],
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing[2],
  },
  remove: {
    minHeight: theme.sizes.tapMin,
    minWidth: theme.layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
});
