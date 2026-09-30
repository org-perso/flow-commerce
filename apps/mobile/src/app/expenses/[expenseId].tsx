import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert } from 'react-native';

import { AlertBanner, Button, Screen } from '@/components/ui';
import { ExpenseForm } from '@/features/expense/expense-form';
import { useDeleteExpense, useExpense, useUpdateExpense } from '@/features/expense/use-expenses';
import { apiErrorMessage } from '@/lib/api-client';
import { theme } from '@/theme';

export default function EditExpenseScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const expense = useExpense(expenseId);
  const updateExpense = useUpdateExpense(expenseId);
  const deleteExpense = useDeleteExpense(expenseId);

  const confirmDelete = () =>
    Alert.alert('Supprimer cette dépense ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteExpense.mutate(undefined, { onSuccess: () => router.back() }),
      },
    ]);

  if (!expense.data) {
    return (
      <Screen edges={[]}>
        {expense.isError ? (
          <AlertBanner tone="danger" message={apiErrorMessage(expense.error)} />
        ) : (
          <ActivityIndicator color={theme.colors.ink} />
        )}
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <ExpenseForm
        expense={expense.data}
        submitLabel="Enregistrer"
        error={updateExpense.error ?? deleteExpense.error}
        onSubmit={async (values) => {
          await updateExpense.mutateAsync(values);
          router.back();
        }}
      />
      <Button
        label="Supprimer la dépense"
        variant="danger"
        fullWidth
        loading={deleteExpense.isPending}
        onPress={confirmDelete}
      />
    </Screen>
  );
}
