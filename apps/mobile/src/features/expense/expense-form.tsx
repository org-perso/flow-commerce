import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { FormTextField } from '@/components/form-text-field';
import { AlertBanner, AppText, Button, FilterChips } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api-client';
import { amountField, optionalTextField } from '@/lib/form-fields';
import { theme } from '@/theme';
import { businessToday, frDateToIso, isoToFrDate } from '@/utils/format';

import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
} from './expense-api';

const categories = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((value) => ({
  value,
  label: EXPENSE_CATEGORIES[value],
}));

const schema = z.object({
  category: z.enum(Object.keys(EXPENSE_CATEGORIES) as [ExpenseCategory, ...ExpenseCategory[]]),
  amount: amountField.refine((a) => a > 0, 'Le montant doit être supérieur à 0.'),
  date: z
    .string()
    .transform((v) => frDateToIso(v))
    .refine((v): v is string => v !== null, 'Date au format JJ/MM/AAAA.'),
  description: optionalTextField(1000),
});

type ExpenseFormProps = {
  expense?: Expense;
  submitLabel: string;
  onSubmit: (values: ExpenseInput) => Promise<unknown>;
  error: unknown;
};

export function ExpenseForm({ expense, submitLabel, onSubmit, error }: ExpenseFormProps) {
  const { control, handleSubmit, formState } = useForm<
    z.input<typeof schema>,
    unknown,
    ExpenseInput
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      category: expense?.category ?? 'PUBLICITE',
      amount: expense ? String(expense.amount) : '',
      date: isoToFrDate(expense?.date ?? businessToday()),
      description: expense?.description ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values).catch(() => {});
  });

  return (
    <View style={{ gap: theme.spacing[4] }}>
      {error != null && <AlertBanner tone="danger" message={apiErrorMessage(error)} />}
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label">Catégorie</AppText>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <FilterChips options={categories} value={field.value} onChange={field.onChange} />
          )}
        />
      </View>
      <FormTextField
        control={control}
        name="amount"
        label="Montant (Ar)"
        placeholder="0"
        keyboardType="number-pad"
      />
      <FormTextField
        control={control}
        name="date"
        label="Date"
        placeholder="JJ/MM/AAAA"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <FormTextField
        control={control}
        name="description"
        label="Description (facultatif)"
        placeholder="Ex. Boost Facebook 3 jours"
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
