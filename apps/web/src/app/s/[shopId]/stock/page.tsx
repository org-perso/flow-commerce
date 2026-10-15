"use client";

import { AlertTriangle, Archive, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SearchInput } from "@/components/app/search-input";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductFilters } from "@/features/product/product-api";
import { ProductThumb } from "@/features/product/product-thumb";
import { useProducts, useStockSummary } from "@/features/product/use-products";
import { useCan, useShop } from "@/features/shop/shop-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatAr } from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

type Tab = "all" | "low" | "out" | "archived";
const TAB_FILTERS: Record<Tab, ProductFilters> = {
  all: {},
  low: { lowStock: true },
  out: { outOfStock: true },
  archived: { archived: true },
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | undefined;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      {value === undefined ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <span
          className={cn(
            "tabular text-xl font-bold",
            tone === "warning" && "text-gold-ink",
            tone === "danger" && "text-danger",
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export default function StockPage() {
  const shop = useShop();
  const router = useRouter();
  const canWrite = useCan("catalog.write");
  const canCosts = useCan("costs");
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);
  const filters = { ...TAB_FILTERS[tab], q: q || undefined };
  const products = useProducts(filters, pageOf(page));
  const summary = useStockSummary();
  const s = summary.data;
  const base = `/s/${shop.id}/stock`;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "Tous", count: s?.productCount },
    { key: "low", label: "Stock faible", count: s?.lowStockCount },
    { key: "out", label: "Rupture", count: s?.outOfStockCount },
    { key: "archived", label: "Archivés", count: s?.archivedCount },
  ];
  const tabTotal = q ? undefined : tabs.find((t) => t.key === tab)?.count;
  const rows = products.data ?? [];
  // Cost columns only when the API sends purchase prices (never for a CM).
  const showCosts = canCosts && rows.some((p) => p.purchasePrice !== undefined);
  const columns = showCosts ? 8 : 6;

  return (
    <>
      <PageHeader
        refresh
        title="Produits"
        description="Le stock ne change que par les commandes, les entrées, les sorties et les inventaires."
        actions={
          canWrite && (
            <Button asChild>
              <Link href={`${base}/nouveau`}>
                <Plus /> Ajouter un produit
              </Link>
            </Button>
          )
        }
      />

      <div
        className={cn(
          "grid gap-3",
          s?.stockValue !== undefined
            ? "grid-cols-2 lg:grid-cols-5"
            : "grid-cols-2 lg:grid-cols-3",
        )}
      >
        <Stat
          label="Produits actifs"
          value={s ? String(s.productCount) : undefined}
        />
        <Stat
          label="Articles en stock"
          value={s ? String(s.units) : undefined}
        />
        {s?.stockValue !== undefined && (
          <Stat
            label="Valeur d’achat du stock"
            value={formatAr(s.stockValue)}
          />
        )}
        {s?.stockSaleValue !== undefined && (
          <Stat
            label="Valeur de vente du stock"
            value={formatAr(s.stockSaleValue)}
          />
        )}
        <Stat
          label="Stock faible · rupture"
          value={s ? `${s.lowStockCount} · ${s.outOfStockCount}` : undefined}
          tone={
            s && s.outOfStockCount > 0
              ? "danger"
              : s && s.lowStockCount > 0
                ? "warning"
                : undefined
          }
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b">
        <nav aria-label="Filtrer" className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setPage(0);
              }}
              aria-current={tab === t.key ? "true" : undefined}
              className={cn(
                "-mb-px flex h-10 items-center gap-2 border-b-2 px-2.5 text-sm whitespace-nowrap",
                tab === t.key
                  ? "border-navy font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="tabular text-muted-foreground">
                  ({t.count})
                </span>
              )}
            </button>
          ))}
        </nav>
        <SearchInput
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Rechercher un produit"
          aria-label="Rechercher un produit"
          className="mb-2 w-full sm:w-64"
        />
      </div>

      {products.isError && (
        <ErrorState error={products.error} onRetry={() => products.refetch()} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Photo</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Alerte</TableHead>
              <TableHead className="text-right">Prix de vente</TableHead>
              {showCosts && (
                <TableHead className="text-right">Prix d’achat</TableHead>
              )}
              {showCosts && <TableHead className="text-right">Marge</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className={cn(products.isPlaceholderData && "opacity-60")}>
            {products.isPending && <TableSkeletonRows columns={columns} />}
            {rows.map((p) => {
              const margin =
                p.purchasePrice !== undefined
                  ? p.sellingPrice - p.purchasePrice
                  : null;
              return (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`${base}/${p.id}`)}
                >
                  <TableCell>
                    <ProductThumb src={p.image} name={p.name} />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`${base}/${p.id}`}
                      className="font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.name}
                    </Link>
                    {p.archivedAt && (
                      <Badge variant="outline" className="ml-2">
                        <Archive /> Archivé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.category?.name ?? "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right font-semibold",
                      p.stockQuantity === 0
                        ? "text-danger"
                        : p.isLowStock && "text-gold-ink",
                    )}
                  >
                    {p.stockQuantity}
                  </TableCell>
                  <TableCell>
                    {p.stockQuantity === 0 ? (
                      <Badge variant="danger">Rupture</Badge>
                    ) : p.isLowStock ? (
                      <Badge variant="warning">
                        <AlertTriangle /> Stock faible
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Seuil {p.lowStockThreshold}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatAr(p.sellingPrice)}
                  </TableCell>
                  {showCosts && (
                    <TableCell className="tabular text-right text-muted-foreground">
                      {p.purchasePrice !== undefined
                        ? formatAr(p.purchasePrice)
                        : "—"}
                    </TableCell>
                  )}
                  {showCosts && (
                    <TableCell
                      className={cn(
                        "tabular text-right",
                        margin !== null && margin <= 0 && "text-danger",
                      )}
                    >
                      {margin !== null ? (
                        <>
                          {formatAr(margin)}
                          {p.sellingPrice > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {Math.round((margin / p.sellingPrice) * 100)} %
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {products.isSuccess && rows.length === 0 && (
          <EmptyState
            icon={Package}
            title={
              q
                ? "Aucun produit trouvé"
                : tab === "all"
                  ? "Aucun produit pour l’instant"
                  : "Rien dans cette liste"
            }
            description={
              q
                ? "Essayez un autre nom."
                : tab === "all"
                  ? "Ajoutez vos produits pour suivre le stock et les marges."
                  : undefined
            }
            action={
              canWrite && tab === "all" && !q ? (
                <Button asChild>
                  <Link href={`${base}/nouveau`}>
                    <Plus /> Ajouter un produit
                  </Link>
                </Button>
              ) : undefined
            }
          />
        )}
        {rows.length > 0 && (
          <Pagination
            page={page}
            onPageChange={setPage}
            count={rows.length}
            total={tabTotal}
          />
        )}
      </Card>
    </>
  );
}
