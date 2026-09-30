import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { FormTextField } from '@/components/form-text-field';
import { AlertBanner, AppText, Button } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';
import { amountField, optionalTextField, quantityField, toFieldValue } from '@/lib/form-fields';
import { theme } from '@/theme';
import { formatAr } from '@/utils/format';

import { CategoryPicker } from './category-picker';
import { ImageField } from './image-field';
import type { Product, ProductInput } from './product-api';

const schema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.').max(150, '150 caractères maximum.'),
  image: z.string().nullable(),
  categoryId: z.string().nullable(),
  purchasePrice: amountField,
  sellingPrice: amountField,
  lowStockThreshold: quantityField,
  initialStock: quantityField,
  description: optionalTextField(2000),
});

type FormInput = z.input<typeof schema>;
export type ProductFormOutput = ProductInput & { initialStock: number };

type ProductFormProps = {
  /** Editing: prefill, and hide the initial stock (stock changes go through movements). */
  product?: Product;
  submitLabel: string;
  onSubmit: (values: ProductFormOutput) => Promise<unknown>;
  error: unknown;
};

function digitsToNumber(value: string | undefined) {
  const digits = (value ?? '').replace(/\s/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

export function ProductForm({ product, submitLabel, onSubmit, error }: ProductFormProps) {
  const { control, handleSubmit, formState } = useForm<FormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? '',
      image: product?.image ?? null,
      categoryId: product?.category?.id ?? null,
      purchasePrice: product ? toFieldValue(product.purchasePrice) : '',
      sellingPrice: product ? toFieldValue(product.sellingPrice) : '',
      lowStockThreshold: toFieldValue(product?.lowStockThreshold ?? 0),
      initialStock: '0',
      description: product?.description ?? '',
    },
  });

  // Live margin preview: helps spot a selling price below cost.
  const [purchase, selling] = useWatch({ control, name: ['purchasePrice', 'sellingPrice'] });
  const purchaseValue = digitsToNumber(purchase);
  const sellingValue = digitsToNumber(selling);
  const margin =
    purchaseValue !== null && sellingValue !== null ? sellingValue - purchaseValue : null;

  const submit = handleSubmit(async (values) => {
    await onSubmit(values).catch(() => {});
  });

  return (
    <View style={styles.root}>
      {error != null && <AlertBanner tone="danger" message={apiErrorMessage(error)} />}
      <Controller
        control={control}
        name="image"
        render={({ field }) => <ImageField value={field.value} onChange={field.onChange} />}
      />
      <FormTextField
        control={control}
        name="name"
        label="Nom du produit"
        placeholder="Ex. Savon coco"
        autoCapitalize="sentences"
        maxLength={150}
      />
      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => <CategoryPicker value={field.value} onChange={field.onChange} />}
      />
      <View style={styles.row}>
        <View style={styles.cell}>
          <FormTextField
            control={control}
            name="purchasePrice"
            label="Prix d'achat (Ar)"
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.cell}>
          <FormTextField
            control={control}
            name="sellingPrice"
            label="Prix de vente (Ar)"
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>
      </View>
      {margin !== null && (
        <AlertBanner
          tone={margin < 0 ? 'danger' : 'success'}
          message={
            margin < 0
              ? `Vente à perte : ${formatAr(margin)} par unité.`
              : `Marge : ${formatAr(margin)} par unité.`
          }
        />
      )}
      <View style={styles.row}>
        {!product && (
          <View style={styles.cell}>
            <FormTextField
              control={control}
              name="initialStock"
              label="Stock initial"
              keyboardType="number-pad"
            />
          </View>
        )}
        <View style={styles.cell}>
          <FormTextField
            control={control}
            name="lowStockThreshold"
            label="Alerte stock faible"
            hint="Alerte à partir de cette quantité."
            keyboardType="number-pad"
          />
        </View>
      </View>
      <FormTextField
        control={control}
        name="description"
        label="Description (facultatif)"
        multiline
        maxLength={2000}
      />
      {product && (
        <AppText variant="caption" color="inkMuted">
          Pour changer le stock, utilisez les entrées et sorties depuis la fiche produit.
        </AppText>
      )}
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
  row: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  cell: {
    flex: 1,
  },
});
