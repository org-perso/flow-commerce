"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Field } from "@/components/app/field";
import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiErrorMessage } from "@/lib/api-client";
import { amountField, optionalTextField } from "@/lib/form-fields";
import { businessToday } from "@/lib/format";

import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
} from "./expense-api";
import {
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from "./use-expenses";

const schema = z.object({
  category: z.enum(
    Object.keys(EXPENSE_CATEGORIES) as [ExpenseCategory, ...ExpenseCategory[]],
  ),
  amount: amountField.refine(
    (a) => a > 0,
    "Le montant doit être supérieur à 0.",
  ),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  description: optionalTextField(500),
});

/** Create (no expense) or edit / delete an expense. */
export function ExpenseDialog({
  expense,
  onClose,
}: {
  expense?: Expense;
  onClose: () => void;
}) {
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const remove = useDeleteExpense();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { register, control, handleSubmit, formState } = useForm<
    z.input<typeof schema>,
    unknown,
    ExpenseInput
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      category: expense?.category ?? "PUBLICITE",
      amount: expense ? String(expense.amount) : "",
      date: expense?.date ?? businessToday(),
      description: expense?.description ?? "",
    },
  });
  const error = expense ? update.error : create.error;

  const submit = handleSubmit(async (values) => {
    try {
      if (expense) await update.mutateAsync({ id: expense.id, input: values });
      else await create.mutateAsync(values);
      toast.success(expense ? "Dépense enregistrée." : "Dépense ajoutée.");
      onClose();
    } catch {
      // Shown below.
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {expense ? "Modifier la dépense" : "Nouvelle dépense"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error != null && <ErrorState error={error} />}
          <Field label="Catégorie">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Catégorie">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map(
                      (key) => (
                        <SelectItem key={key} value={key}>
                          {EXPENSE_CATEGORIES[key]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Montant (Ar)"
              htmlFor="amount"
              error={formState.errors.amount?.message}
            >
              <Input
                id="amount"
                inputMode="numeric"
                placeholder="0"
                autoFocus
                {...register("amount")}
                aria-invalid={!!formState.errors.amount}
              />
            </Field>
            <Field
              label="Date"
              htmlFor="date"
              error={formState.errors.date?.message}
            >
              <Input id="date" type="date" {...register("date")} />
            </Field>
          </div>
          <Field
            label="Description (facultatif)"
            htmlFor="description"
            error={formState.errors.description?.message}
          >
            <Input
              id="description"
              placeholder="Ex. Boost Facebook 3 jours"
              {...register("description")}
            />
          </Field>
          <DialogFooter className="sm:justify-between">
            {expense ? (
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 /> Supprimer
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting && <Loader2 className="animate-spin" />}
                {expense ? "Enregistrer" : "Ajouter la dépense"}
              </Button>
            </div>
          </DialogFooter>
        </form>
        {expense && (
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Supprimer cette dépense ?"
            description="Cette action est définitive."
            confirmLabel="Supprimer"
            pending={remove.isPending}
            onConfirm={async () => {
              try {
                await remove.mutateAsync(expense.id);
                toast.success("Dépense supprimée.");
                onClose();
              } catch (e) {
                toast.error(apiErrorMessage(e));
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
