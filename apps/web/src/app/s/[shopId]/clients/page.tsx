"use client";

import { Link2Off, MessageCircle, Phone, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/app/avatar";
import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SearchInput } from "@/components/app/search-input";
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  TableSkeletonRows,
} from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCustomers,
  useUnlinkedOrdersCount,
} from "@/features/customer/use-customers";
import { useShop } from "@/features/shop/shop-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  formatAr,
  formatPhone,
  formatRelative,
  plural,
  whatsAppUrl,
} from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const shop = useShop();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);
  const customers = useCustomers(q, pageOf(page));
  const unlinked = useUnlinkedOrdersCount().data?.count ?? 0;
  const base = `/s/${shop.id}/clients`;
  const rows = customers.data ?? [];

  return (
    <>
      <PageHeader
        refresh
        title="Clients"
        actions={
          <Button asChild>
            <Link href={`${base}/nouveau`}>
              <Plus /> Ajouter un client
            </Link>
          </Button>
        }
      />
      {unlinked > 0 && !q && (
        <InlineAlert icon={Link2Off}>
          <strong>
            {plural(unlinked, "commande en cours", "commandes en cours")}
          </strong>{" "}
          sans fiche client (clients de passage). Ajoutez le client à la
          commande pour suivre qui achète quoi.
        </InlineAlert>
      )}
      <SearchInput
        value={search}
        onValueChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        placeholder="Nom, téléphone ou profil"
        aria-label="Rechercher un client"
        className="w-full sm:w-80"
      />
      {customers.isError && (
        <ErrorState
          error={customers.error}
          onRetry={() => customers.refetch()}
        />
      )}
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead className="text-right">Commandes</TableHead>
              <TableHead className="text-right">Total dépensé</TableHead>
              <TableHead>Dernière commande</TableHead>
              <TableHead className="text-right">Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            className={cn(customers.isPlaceholderData && "opacity-60")}
          >
            {customers.isPending && <TableSkeletonRows columns={7} />}
            {rows.map((c) => {
              const phone = c.phones[0];
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`${base}/${c.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <Link
                        href={`${base}/${c.id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    {phone ? (
                      formatPhone(phone)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {c.phones.length > 1 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        +{c.phones.length - 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {c.socialProfile ?? "—"}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {c.orderCount}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {formatAr(c.totalSpent)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.lastOrderAt ? formatRelative(c.lastOrderAt) : "—"}
                  </TableCell>
                  <TableCell>
                    {phone && (
                      <div
                        className="flex justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="icon-sm" asChild>
                          <a
                            href={`tel:${phone}`}
                            aria-label={`Appeler ${c.name}`}
                          >
                            <Phone />
                          </a>
                        </Button>
                        <Button variant="outline" size="icon-sm" asChild>
                          <a
                            href={whatsAppUrl(phone)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`WhatsApp ${c.name}`}
                          >
                            <MessageCircle />
                          </a>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {customers.isSuccess && rows.length === 0 && (
          <EmptyState
            icon={Users}
            title={q ? "Aucun client trouvé" : "Aucun client pour l’instant"}
            description={
              q
                ? "Essayez un autre nom ou numéro."
                : "Les clients créés avec une commande apparaissent aussi ici."
            }
          />
        )}
        {rows.length > 0 && (
          <Pagination page={page} onPageChange={setPage} count={rows.length} />
        )}
      </Card>
    </>
  );
}
