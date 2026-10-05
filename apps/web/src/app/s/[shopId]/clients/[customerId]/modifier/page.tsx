"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerForm } from "@/features/customer/customer-form";
import {
  useCustomer,
  useUpdateCustomer,
} from "@/features/customer/use-customers";
import { useShopId } from "@/features/shop/shop-context";

export default function EditCustomerPage() {
  const shopId = useShopId();
  const router = useRouter();
  const { customerId } = useParams<{ customerId: string }>();
  const customer = useCustomer(customerId);
  const update = useUpdateCustomer(customerId);
  const back = `/s/${shopId}/clients/${customerId}`;
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={back}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {customer.data?.name ?? "Client"}
        </Link>
        <PageHeader title="Modifier le client" />
      </div>
      {customer.isError && (
        <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
      )}
      {!customer.data && !customer.isError && (
        <Skeleton className="h-72 max-w-2xl rounded-xl" />
      )}
      {customer.data && (
        <CustomerForm
          key={customer.data.id}
          customer={customer.data}
          submitLabel="Enregistrer"
          error={update.error}
          onSubmit={async (values) => {
            await update.mutateAsync(values);
            toast.success("Client enregistré.");
            router.push(back);
          }}
        />
      )}
    </>
  );
}
