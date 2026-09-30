import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import type { ComponentProps } from 'react';

import { TextField } from '@/components/ui';

type FormTextFieldProps<T extends FieldValues, TContext, TOutput extends FieldValues> = Omit<
  ComponentProps<typeof TextField>,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  /** Also accepts forms whose resolver transforms the values (e.g. text → number). */
  control: Control<T, TContext, TOutput>;
  name: Path<T>;
};

export function FormTextField<T extends FieldValues, TContext, TOutput extends FieldValues>({
  control,
  name,
  ...rest
}: FormTextFieldProps<T, TContext, TOutput>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          ref={field.ref}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
