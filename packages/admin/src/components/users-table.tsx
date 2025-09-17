"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { authClient } from "@acme/shared/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  UserCheck,
} from "lucide-react";

export function UsersTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  // Get organization filter from URL params
  const organizationId = searchParams.get("organizationId");
  const organizationName = searchParams.get("organizationName");

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = trpc.users.getUsers.useQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    organizationId: organizationId || undefined,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, organizationId]);

  const handleClearFilters = () => {
    setSearch("");
    setPage(1);
    router.push("/users");
  };

  const handleViewOrganization = (orgName: string) =>
    router.push(`/organizations?search=${encodeURIComponent(orgName)}`);

  const handleImpersonateUser = async (userId: string) => {
    try {
      // TODO: Implement impersonation with proper admin API
      const data = null;
      const error = "Not implemented";

      console.log(data);

      if (error) {
        console.error("Impersonation failed:", error);
        // You could add a toast notification here
        return;
      }

      // Redirect to main app as the impersonated user
      window.open("/", "_blank");
    } catch (error) {
      console.error("Impersonation error:", error);
    }
  };

  const users = data?.users || [];
  const pagination = {
    page: page,
    limit: limit,
    total: data?.total || 0,
    pages: data?.totalPages || 1,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {(organizationId || search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
        {organizationName && (
          <div className="text-muted-foreground flex items-center space-x-2 text-sm">
            <Building2 className="h-4 w-4" />
            <span>Filtered by: {organizationName}</span>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-8 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  {debouncedSearch
                    ? "No users found matching your search."
                    : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {/* TODO: Query user's organization memberships */}
                      No Organization
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "default"}>
                      {user.banned ? "Banned" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImpersonateUser(user.id)}
                      className="h-8 px-2"
                    >
                      <UserCheck className="mr-1 h-4 w-4" />
                      Impersonate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {(page - 1) * limit + 1} to{" "}
          {Math.min(page * limit, pagination.total)} of {pagination.total} users
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.pages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
