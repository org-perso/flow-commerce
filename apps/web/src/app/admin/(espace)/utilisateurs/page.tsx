"use client";

import { Users } from "lucide-react";
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
import { formatDate, UserStatusBadge } from "@/features/admin/admin-ui";
import { useAdminUsers, type UserFilters } from "@/features/admin/use-admin";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

function UsersList() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [page, setPage] = useState(0);
  const q = useDebouncedValue(search.trim(), 300);

  const filters: UserFilters = {
    search: q || undefined,
    status: status === "all" ? undefined : (status as UserFilters["status"]),
  };
  const users = useAdminUsers(filters, pageOf(page));
  const rows = users.data?.items ?? [];

  return (
    <>
      <PageHeader refresh title="Utilisateurs" />
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Email ou nom"
          aria-label="Rechercher un utilisateur"
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
            <SelectItem value="all">Tous les comptes</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="suspended">Suspendus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.isError && (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Boutiques</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Inscrit le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(users.isPlaceholderData && "opacity-60")}>
            {users.isPending && <TableSkeletonRows columns={5} />}
            {rows.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/utilisateurs/${u.id}`)}
              >
                <TableCell>
                  <Link
                    href={`/admin/utilisateurs/${u.id}`}
                    className="font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {u.name ?? "Sans nom"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.email ?? "—"}
                </TableCell>
                <TableCell className="tabular text-right">
                  {u.shopsCount}
                </TableCell>
                <TableCell>
                  <UserStatusBadge suspendedAt={u.suspendedAt} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(u.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.isSuccess && rows.length === 0 && (
          <EmptyState
            icon={Users}
            title="Aucun utilisateur"
            description="Modifiez la recherche."
          />
        )}
        {rows.length > 0 && (
          <Pagination
            page={page}
            onPageChange={setPage}
            count={rows.length}
            total={users.data?.total}
          />
        )}
      </Card>
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <UsersList />
    </Suspense>
  );
}
