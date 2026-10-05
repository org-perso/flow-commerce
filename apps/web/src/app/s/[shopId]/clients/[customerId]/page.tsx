"use client";

import {
  ArrowLeft,
  AtSign,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/app/avatar";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Pagination } from "@/components/app/pagination";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { PaymentBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCustomer,
  useDeleteCustomer,
} from "@/features/customer/use-customers";
import { parcelNumber } from "@/features/order/order-api";
import { OrderSheet } from "@/features/order/order-sheet";
import { placeOf } from "@/features/order/order-utils";
import { useOrders } from "@/features/order/use-orders";
import { useCan, useShopId } from "@/features/shop/shop-context";
import { ApiError, apiErrorMessage } from "@/lib/api-client";
import {
  formatAr,
  formatDateTime,
  formatDayLabel,
  formatPhone,
  formatRelative,
  whatsAppUrl,
} from "@/lib/format";
import { pageOf } from "@/lib/paging";

export default function CustomerPage() {
  const shopId = useShopId();
  const router = useRouter();
  const { customerId } = useParams<{ customerId: string }>();
  const canOrders = useCan("orders");
  const customer = useCustomer(customerId);
  const [page, setPage] = useState(0);
  const orders = useOrders({ customerId }, pageOf(page, 20), canOrders);
  const remove = useDeleteCustomer(customerId);
  const [deleting, setDeleting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const base = `/s/${shopId}/clients`;
  const c = customer.data;

  return (
    <>
      <Link
        href={base}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Clients
      </Link>
      {customer.isError && (
        <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
      )}
      {!c ? (
        !customer.isError && <Skeleton className="h-40 rounded-xl" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={c.name} className="size-14 text-base" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">{c.name}</h1>
              <p className="text-sm text-muted-foreground">
                Client depuis le {formatDateTime(c.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canOrders && (
                <Button variant="gold" asChild>
                  <Link href={`/s/${shopId}/commandes/nouvelle?client=${c.id}`}>
                    <Plus /> Nouvelle commande
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href={`${base}/${c.id}/modifier`}>
                  <Pencil /> Modifier
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                onClick={() => setDeleting(true)}
              >
                <Trash2 /> Supprimer
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Commandes</p>
                  <p className="tabular text-xl font-bold">{c.orderCount}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Total dépensé</p>
                  <p className="tabular text-xl font-bold">
                    {formatAr(c.totalSpent)}
                  </p>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Coordonnées</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  {c.phones.length === 0 && (
                    <p className="text-muted-foreground">Aucun numéro.</p>
                  )}
                  {c.phones.map((phone, i) => (
                    <div
                      key={phone}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>
                        {formatPhone(phone)}
                        {i === 0 && c.phones.length > 1 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            principal
                          </span>
                        )}
                      </span>
                      <span className="flex gap-1.5">
                        <Button variant="outline" size="icon-sm" asChild>
                          <a
                            href={`tel:${phone}`}
                            aria-label={`Appeler le ${formatPhone(phone)}`}
                          >
                            <Phone />
                          </a>
                        </Button>
                        <Button variant="outline" size="icon-sm" asChild>
                          <a
                            href={whatsAppUrl(phone)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle />
                          </a>
                        </Button>
                      </span>
                    </div>
                  ))}
                  {c.socialProfile && (
                    <p className="flex items-center gap-2 border-t pt-3 text-muted-foreground">
                      <AtSign className="size-4" /> {c.socialProfile}
                    </p>
                  )}
                  {c.lastOrderAt && (
                    <p className="text-xs text-muted-foreground">
                      Dernière commande : {formatRelative(c.lastOrderAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {canOrders && (
              <Card className="gap-0 overflow-hidden pb-0">
                <CardHeader className="pb-4">
                  <CardTitle>Commandes</CardTitle>
                </CardHeader>
                {orders.isError && (
                  <ErrorState
                    error={orders.error}
                    onRetry={() => orders.refetch()}
                    className="mx-5 mb-4"
                  />
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Date prévue</TableHead>
                      <TableHead>Lieu</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.isPending && (
                      <TableSkeletonRows columns={6} rows={4} />
                    )}
                    {orders.data?.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => setOpenId(o.id)}
                      >
                        <TableCell className="font-semibold text-link">
                          {parcelNumber(o)}
                        </TableCell>
                        <TableCell>{formatDayLabel(o.scheduledDate)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {placeOf(o)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={o.status} />
                        </TableCell>
                        <TableCell>
                          <PaymentBadge isPaid={o.isPaid} />
                        </TableCell>
                        <TableCell className="tabular text-right font-semibold">
                          {formatAr(o.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {orders.data?.length === 0 && page === 0 && (
                  <EmptyState
                    icon={ReceiptText}
                    title="Aucune commande pour ce client"
                  />
                )}
                {!!orders.data?.length && (
                  <Pagination
                    page={page}
                    onPageChange={setPage}
                    count={orders.data.length}
                    pageSize={20}
                  />
                )}
              </Card>
            )}
          </div>

          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title="Supprimer ce client ?"
            description="Cette action est définitive."
            confirmLabel="Supprimer"
            pending={remove.isPending}
            onConfirm={async () => {
              try {
                await remove.mutateAsync();
                toast.success("Client supprimé.");
                router.push(base);
              } catch (e) {
                setDeleting(false);
                toast.error(
                  e instanceof ApiError && e.status === 409
                    ? "Ce client a des commandes : il est conservé pour garder l’historique."
                    : apiErrorMessage(e),
                );
              }
            }}
          />
          <OrderSheet orderId={openId} onClose={() => setOpenId(null)} />
        </>
      )}
    </>
  );
}
