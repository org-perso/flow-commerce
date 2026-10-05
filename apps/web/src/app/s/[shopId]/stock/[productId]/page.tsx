"use client";

import {
  Archive,
  ArrowLeft,
  ArchiveRestore,
  ClipboardCheck,
  History,
  Minus,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Pagination } from "@/components/app/pagination";
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  TableSkeletonRows,
} from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
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
import { MovementDialog } from "@/features/product/movement-dialog";
import type { ManualMovementType } from "@/features/product/product-api";
import { ProductThumb } from "@/features/product/product-thumb";
import { movementLabels } from "@/features/product/stock-movement-labels";
import {
  useArchiveProduct,
  useProduct,
  useRestoreProduct,
  useStockMovements,
} from "@/features/product/use-products";
import { useCan, useShopId } from "@/features/shop/shop-context";
import { apiErrorMessage } from "@/lib/api-client";
import { formatAr, formatDateTime } from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

export default function ProductPage() {
  const shopId = useShopId();
  const { productId } = useParams<{ productId: string }>();
  const canWrite = useCan("catalog.write");
  const canCosts = useCan("costs");
  const canOrders = useCan("orders");
  const product = useProduct(productId);
  const [page, setPage] = useState(0);
  const movements = useStockMovements(productId, pageOf(page, 20));
  const archive = useArchiveProduct(productId);
  const restore = useRestoreProduct(productId);
  const [movement, setMovement] = useState<ManualMovementType | null>(null);
  const [archiving, setArchiving] = useState(false);
  const base = `/s/${shopId}/stock`;

  const p = product.data;
  const margin =
    p && p.purchasePrice !== undefined
      ? p.sellingPrice - p.purchasePrice
      : null;

  return (
    <>
      <Link
        href={base}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Stock
      </Link>
      {product.isError && (
        <ErrorState error={product.error} onRetry={() => product.refetch()} />
      )}
      {!p ? (
        !product.isError && <Skeleton className="h-48 rounded-xl" />
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-5">
            <ProductThumb
              src={p.image}
              name={p.name}
              className="size-24 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{p.name}</h1>
                {p.archivedAt && (
                  <Badge variant="outline">
                    <Archive /> Archivé
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.category?.name ?? "Sans catégorie"}
                {p.description ? ` · ${p.description}` : ""}
              </p>
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`${base}/${p.id}/modifier`}>
                    <Pencil /> Modifier
                  </Link>
                </Button>
                {p.archivedAt ? (
                  <Button
                    variant="outline"
                    disabled={restore.isPending}
                    onClick={async () => {
                      try {
                        await restore.mutateAsync();
                        toast.success("Produit restauré.");
                      } catch (e) {
                        toast.error(apiErrorMessage(e));
                      }
                    }}
                  >
                    <ArchiveRestore /> Restaurer
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                    onClick={() => setArchiving(true)}
                  >
                    <Archive /> Archiver
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock</CardTitle>
                  {p.stockQuantity === 0 ? (
                    <Badge variant="danger">Rupture</Badge>
                  ) : (
                    p.isLowStock && (
                      <Badge variant="warning">Stock faible</Badge>
                    )
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div>
                    <span
                      className={cn(
                        "tabular text-4xl font-bold",
                        p.stockQuantity === 0 && "text-danger",
                        p.isLowStock && p.stockQuantity > 0 && "text-gold-ink",
                      )}
                    >
                      {p.stockQuantity}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      en stock · alerte à {p.lowStockThreshold}
                    </span>
                  </div>
                  {canWrite && !p.archivedAt && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setMovement("AJOUT")}
                      >
                        <Plus /> Entrée
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMovement("RETRAIT")}
                      >
                        <Minus /> Sortie
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setMovement("AJUSTEMENT")}
                      >
                        <ClipboardCheck /> Inventaire
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Prix</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix de vente</span>
                    <span className="tabular font-semibold">
                      {formatAr(p.sellingPrice)}
                    </span>
                  </div>
                  {canCosts && p.purchasePrice !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Prix d’achat
                        </span>
                        <span className="tabular">
                          {formatAr(p.purchasePrice)}
                        </span>
                      </div>
                      {margin !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Marge par unité
                          </span>
                          <span
                            className={cn(
                              "tabular font-semibold",
                              margin > 0 ? "text-success" : "text-danger",
                            )}
                          >
                            {formatAr(margin)}
                            {p.sellingPrice > 0
                              ? ` (${Math.round((margin / p.sellingPrice) * 100)} %)`
                              : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">
                          Valeur du stock (achat)
                        </span>
                        <span className="tabular">
                          {formatAr(p.purchasePrice * p.stockQuantity)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              {p.archivedAt && (
                <InlineAlert tone="info">
                  Produit archivé : il n’apparaît plus dans les nouvelles
                  commandes.
                </InlineAlert>
              )}
            </div>

            <Card className="gap-0 overflow-hidden pb-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="size-4" /> Historique du stock
                </CardTitle>
              </CardHeader>
              {movements.isError && (
                <ErrorState
                  error={movements.error}
                  onRetry={() => movements.refetch()}
                  className="mx-5 mb-4"
                />
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mouvement</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.isPending && (
                    <TableSkeletonRows columns={4} rows={5} />
                  )}
                  {movements.data?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.type === "VENTE"
                              ? "secondary"
                              : m.type === "RETOUR"
                                ? "warning"
                                : "outline"
                          }
                        >
                          {movementLabels[m.type]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "tabular text-right font-semibold",
                          m.quantity > 0 ? "text-success" : "text-danger",
                        )}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </TableCell>
                      <TableCell className="max-w-72 truncate text-muted-foreground">
                        {m.orderId && canOrders ? (
                          <Link
                            href={`/s/${shopId}/commandes?commande=${m.orderId}&quand=toutes`}
                            className="text-link hover:underline"
                          >
                            Voir la commande
                          </Link>
                        ) : (
                          (m.reason ?? "—")
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {movements.data?.length === 0 && page === 0 && (
                <EmptyState icon={History} title="Aucun mouvement" />
              )}
              {!!movements.data?.length && (
                <Pagination
                  page={page}
                  onPageChange={setPage}
                  count={movements.data.length}
                  pageSize={20}
                />
              )}
            </Card>
          </div>

          {movement && (
            <MovementDialog
              product={p}
              type={movement}
              onClose={() => setMovement(null)}
            />
          )}
          <ConfirmDialog
            open={archiving}
            onOpenChange={setArchiving}
            title={`Archiver « ${p.name} » ?`}
            description="Le produit ne sera plus proposé dans les commandes. L’historique est conservé et vous pourrez le restaurer."
            confirmLabel="Archiver"
            pending={archive.isPending}
            onConfirm={async () => {
              try {
                await archive.mutateAsync();
                setArchiving(false);
                toast.success("Produit archivé.");
              } catch (e) {
                toast.error(apiErrorMessage(e));
              }
            }}
          />
        </>
      )}
    </>
  );
}
