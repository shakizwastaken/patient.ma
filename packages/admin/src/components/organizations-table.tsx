"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Edit,
  Check,
  X,
  List,
} from "lucide-react";

export function OrganizationsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [editCreditsValue, setEditCreditsValue] = useState<number>(0);
  const limit = 10;

  // Set initial search from URL params if coming from users table
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = trpc.organizations.getOrganizations.useQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const utils = trpc.useUtils();

  const updateCreditsMutation =
    trpc.organizations.updateOrganizationCredits.useMutation({
      onSuccess: () => {
        // Refetch the organizations data
        utils.organizations.getOrganizations.invalidate();
        setEditingCredits(null);
      },
    });

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleViewUsers = (
    organizationId: string,
    organizationName: string,
  ) => {
    router.push(
      `/users?organizationId=${organizationId}&organizationName=${encodeURIComponent(organizationName)}`,
    );
  };

  const handleViewListings = (orgId: string, orgName: string) => {
    router.push(`/listings?search=${encodeURIComponent(orgName)}`);
  };

  const handleEditCredits = (orgId: string, currentCredits: number) => {
    setEditingCredits(orgId);
    setEditCreditsValue(currentCredits);
  };

  const handleSaveCredits = async (orgId: string) => {
    await updateCreditsMutation.mutateAsync({
      organizationId: orgId,
      credits: editCreditsValue,
    });
  };

  const handleCancelEdit = () => {
    setEditingCredits(null);
    setEditCreditsValue(0);
  };

  const organizations = data?.organizations || [];
  const pagination = {
    page: page,
    limit: limit,
    total: data?.total || 0,
    pages: data?.totalPages || 1,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
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
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
                  {debouncedSearch
                    ? "No organizations found matching your search."
                    : "No organizations found."}
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.id} className="group">
                  <TableCell>
                    <div className="font-medium">{org.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Users className="text-muted-foreground h-4 w-4" />
                      <span>{/* TODO: Count members */}0</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingCredits === org.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={editCreditsValue}
                          onChange={(e) =>
                            setEditCreditsValue(Number(e.target.value))
                          }
                          className="h-8 w-20"
                          min="0"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveCredits(org.id)}
                          disabled={updateCreditsMutation.isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{/* TODO: Implement credits */}0</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleEditCredits(org.id, 0)
                          }
                          className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {/* TODO: Get organization plan */}"Free"
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {org.createdAt
                      ? new Date(org.createdAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUsers(org.id, org.name)}
                        className="h-8 px-2"
                      >
                        <Users className="mr-1 h-4 w-4" />
                        View Users
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewListings(org.id, org.name)}
                        className="h-8 px-2"
                      >
                        <List className="mr-1 h-4 w-4" />
                        Show Listings
                      </Button>
                    </div>
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
          {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
          organizations
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
