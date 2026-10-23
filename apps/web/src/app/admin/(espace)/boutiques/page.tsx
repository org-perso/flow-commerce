"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SearchInput } from "@/components/app/search-input";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, ShopStatusBadges } from "@/features/admin/admin-ui";
import { PLAN_LABELS } from "@/features/admin/labels";
import { useAdminShops, type ShopFilters } from "@/features/admin/use-admin";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatRelative } from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "Tous les états" },
  { value: "active", label: "Actives" },
  { value: "flagged", label: "Signalées" },
  { value: "suspended", label: "Suspendues" },
] as const;

const INACTIVE_OPTIONS = [
  { value: "all", label: "Toute activité" },
  { value: "30", label: "Inactives depuis 30 j" },
  { value: "90", label: "Inactives depuis 90 j" },
  { value: "180", label: "Inactives depuis 6 mois" },
] as const;

function ShopsList() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [inactive, setInactive] = useState("all");
  const [page, setPage] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);

  const filters: ShopFilters = {
    search: q || undefined,
    status: status === "all" ? undefined : (status as ShopFilters["status"]),
    inactiveDays: inactive === "all" ? undefined : Number(inactive),
  };
  const shops = useAdminShops(filters, pageOf(page));
  const rows = shops.data?.items ?? [];

  return (
    <>
      <PageHeader refresh title="Boutiques" />
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Boutique, email ou nom du propriétaire"
          aria-label="Rechercher une boutique"
          className="w-full sm:w-80"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-9 w-44" aria-label="État">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={inactive}
          onValueChange={(v) => {
            setInactive(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="h-9 w-52" aria-label="Activité">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INACTIVE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shops.isError && (
        <ErrorState error={shops.error} onRetry={() => shops.refetch()} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boutique</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Formule</TableHead>
              <TableHead className="text-right">Membres</TableHead>
              <TableHead className="text-right">Commandes (30 j)</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead>Créée le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(shops.isPlaceholderData && "opacity-60")}>
            {shops.isPending && <TableSkeletonRows columns={8} />}
            {rows.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/boutiques/${s.id}`)}
              >
                <TableCell>
                  <Link
                    href={`/admin/boutiques/${s.id}`}
                    className="font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="block">{s.owner.name ?? "—"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.owner.email ?? ""}
                  </span>
                </TableCell>
                <TableCell>
                  <ShopStatusBadges status={s.status} flaggedAt={s.flaggedAt} />
                </TableCell>
                <TableCell>{PLAN_LABELS[s.plan]}</TableCell>
                <TableCell className="tabular text-right">
                  {s.membersCount}
                </TableCell>
                <TableCell className="tabular text-right">
                  {s.orders30Days}
                  <span className="ml-1 text-xs text-muted-foreground">
                    / {s.ordersCount}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelative(s.lastActivityAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(s.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {shops.isSuccess && rows.length === 0 && (
          <EmptyState
            icon={Store}
            title="Aucune boutique"
            description="Modifiez la recherche ou les filtres."
          />
        )}
        {rows.length > 0 && (
          <Pagination
            page={page}
            onPageChange={setPage}
            count={rows.length}
            total={shops.data?.total}
          />
        )}
      </Card>
    </>
  );
}

export default function AdminShopsPage() {
  return (
    <Suspense>
      <ShopsList />
    </Suspense>
  );
}
