"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useAdminUsers,
  useSetUserRole,
  useSetUserStatus,
} from "@/hooks/use-admin";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api-client";
import type { User } from "@/types/api";
import { toast } from "sonner";

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const { data, isPending, isError, error, refetch, isFetching } =
    useAdminUsers({
      page,
      pageSize: 10,
      search: submittedSearch || undefined,
    });
  const setStatus = useSetUserStatus();
  const setRole = useSetUserRole();
  const { user: me } = useAuth();
  // Only the row being changed shows a spinner / is disabled.
  const busyId =
    (setStatus.isPending && setStatus.variables?.id) ||
    (setRole.isPending && setRole.variables?.id) ||
    null;

  function errorText(mutationError: unknown): string {
    return mutationError instanceof ApiClientError
      ? mutationError.message
      : "Хэрэглэгчийг шинэчилж чадсангүй";
  }

  function onToggleRole(user: User): void {
    const role = user.role === "ADMIN" ? "USER" : "ADMIN";
    const question =
      role === "ADMIN"
        ? `${user.email} хэрэглэгчид админ эрх олгох уу? Админ сайтын бүх агуулгыг засах боломжтой.`
        : `${user.email} хэрэглэгчийн админ эрхийг хасах уу?`;
    if (!window.confirm(question)) return;
    setRole.mutate(
      { id: user.id, role },
      {
        onSuccess: ({ user: updated }) =>
          toast.success(
            updated.role === "ADMIN"
              ? `${updated.email} одоо админ`
              : `${updated.email} админ эрхгүй боллоо`,
          ),
        onError: (mutationError) => toast.error(errorText(mutationError)),
      },
    );
  }

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  function onToggleStatus(user: User): void {
    setStatus.mutate(
      { id: user.id, isActive: !user.isActive },
      {
        onSuccess: ({ user: updated }) => {
          toast.success(
            `${updated.email} ${updated.isActive ? "идэвхжлээ" : "идэвхгүй боллоо"}`,
          );
        },
        onError: (mutationError) => toast.error(errorText(mutationError)),
      },
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Хэрэглэгчид"
        description="Хайх, админ эрх олгох/хасах, идэвхжүүлэх. Өөрчлөлт шууд хэрэгжинэ."
      />

      <form
        onSubmit={onSearchSubmit}
        className="flex max-w-sm gap-2"
        role="search"
      >
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Имэйл эсвэл нэрээр хайх…"
            aria-label="Хэрэглэгч хайх"
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline" disabled={isFetching}>
          Хайх
        </Button>
      </form>

      {isPending ? (
        <div
          className="space-y-2"
          aria-busy="true"
          aria-label="Хэрэглэгчид ачааллаж байна"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div
          className="text-destructive flex flex-col gap-2 text-sm"
          role="alert"
        >
          <p>
            {error instanceof ApiClientError
              ? error.message
              : "Хэрэглэгчдийг ачаалж чадсангүй."}
          </p>
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => void refetch()}
          >
            Дахин оролдох
          </Button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <p
          className="text-muted-foreground py-12 text-center text-sm"
          role="status"
        >
          Хайлтад тохирох хэрэглэгч алга.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Нэр</TableHead>
                  <TableHead>Имэйл</TableHead>
                  <TableHead>Эрх</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead>Бүртгүүлсэн</TableHead>
                  <TableHead className="text-right">Үйлдэл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name ?? "—"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "ADMIN" ? "default" : "outline"}
                      >
                        {user.role === "ADMIN" ? "Админ" : "Хэрэглэгч"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge user={user} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.id === me?.id ? (
                        <span className="text-muted-foreground text-sm">
                          Та өөрөө
                        </span>
                      ) : (
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === user.id}
                            onClick={() => onToggleRole(user)}
                          >
                            {user.role === "ADMIN"
                              ? "Админ эрх хасах"
                              : "Админ болгох"}
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isActive ? "destructive" : "default"}
                            disabled={busyId === user.id}
                            onClick={() => onToggleStatus(user)}
                          >
                            {busyId === user.id ? (
                              <Loader2
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : null}
                            {user.isActive ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div
            className="flex items-center justify-between gap-2"
            aria-label="Хуудаслалт"
          >
            <p className="text-muted-foreground text-sm">
              {data.meta.page}/{data.meta.totalPages} хуудас · {data.meta.total}{" "}
              хэрэглэгч
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!data.meta.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                Өмнөх
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Дараах
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserStatusBadge({ user }: { user: User }) {
  return user.isActive ? (
    <Badge variant="outline">Идэвхтэй</Badge>
  ) : (
    <Badge variant="secondary">Идэвхгүй</Badge>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
