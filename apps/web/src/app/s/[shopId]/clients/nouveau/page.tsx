"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { CustomerForm } from "@/features/customer/customer-form";
import { useCreateCustomer } from "@/features/customer/use-customers";
import { useShopId } from "@/features/shop/shop-context";

export default function NewCustomerPage() {
  const shopId = useShopId();
  const router = useRouter();
  const create = useCreateCustomer();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={`/s/${shopId}/clients`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Clients
        </Link>
        <PageHeader title="Nouveau client" />
      </div>
      <CustomerForm
        submitLabel="Créer le client"
        error={create.error}
        onSubmit={async (values) => {
          const customer = await create.mutateAsync(values);
          toast.success(`${customer.name} ajouté.`);
          router.push(`/s/${shopId}/clients/${customer.id}`);
        }}
      />
    </>
  );
}
