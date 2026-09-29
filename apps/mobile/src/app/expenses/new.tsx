import { router } from 'expo-router';

import { Screen } from '@/components/ui';
import { ExpenseForm } from '@/features/expense/expense-form';
import { useCreateExpense } from '@/features/expense/use-expenses';

export default function NewExpenseScreen() {
  const createExpense = useCreateExpense();

  return (
    <Screen edges={[]}>
      <ExpenseForm
        submitLabel="Ajouter la dépense"
        error={createExpense.error}
        onSubmit={async (values) => {
          await createExpense.mutateAsync(values);
          router.back();
        }}
      />
    </Screen>
  );
}
