"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

/** A selectable card: the whole card is the radio item. */
function RadioCard({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-card p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=checked]:border-primary data-[state=checked]:bg-navy-soft data-[state=checked]:ring-1 data-[state=checked]:ring-primary disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card group-data-[state=checked]:border-[5px] group-data-[state=checked]:border-primary" />
      <span className="min-w-0 flex-1">{children}</span>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioCard };
