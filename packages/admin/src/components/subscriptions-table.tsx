"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { trpc } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Package,
  Edit,
} from "lucide-react";
import { toast } from "sonner";

// Form schema for subscription updates
const subscriptionUpdateSchema = z.object({
  productId: z.string().min(1, "Product selection is required"),
});

type SubscriptionUpdateData = z.infer<typeof subscriptionUpdateSchema>;

interface Subscription {
  id: string;
  stripeSubId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: string;
  amount: number;
  interval: string;
  nextBillingDate?: string | null;
  planName: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
  product?: {
    id: string;
    key: string;
    credits: number;
    type: string;
  } | null;
}

export function SubscriptionsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  // Update subscription state
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);

  // Form for updating subscriptions
  const updateForm = useForm<SubscriptionUpdateData>({
    resolver: zodResolver(subscriptionUpdateSchema),
    defaultValues: {
      productId: "",
    },
  });

  // Get organization filter from URL params
  const organizationId = searchParams.get("organizationId");
  const organizationName = searchParams.get("organizationName");

  // Get product filter from URL params
  const productId = searchParams.get("productId");
  const productName = searchParams.get("productName");

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = trpc.subscriptions.getSubscriptions.useQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    organizationId: organizationId || undefined,
  });

  // Get all products for the update subscription dropdown
  const { data: productsData } = trpc.subscriptions.getProducts.useQuery({
    page: 1,
    limit: 100, // Get all products
  });

  // Update subscription mutation
  const updateSubscriptionMutation =
    trpc.subscriptions.updateSubscription.useMutation({
      onSuccess: () => {
        // Refetch subscriptions data
        window.location.reload();
        setIsUpdateSheetOpen(false);
        updateForm.reset();
      },
      onError: (error) => {
        console.error("Failed to update subscription:", error);
        toast.error("Failed to update subscription");
      },
    });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, organizationId, productId]);

  const handleClearFilters = () => {
    setSearch("");
    setPage(1);
    router.push("/subscriptions");
  };

  const handleViewOrganization = (orgName: string) =>
    router.push(`/organizations?search=${encodeURIComponent(orgName)}`);

  const handleViewProduct = (productKey: string) =>
    router.push(`/products?search=${encodeURIComponent(productKey)}`);

  const handleUpdateSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    updateForm.reset({
      productId: subscription.product?.id || "",
    });
    setIsUpdateSheetOpen(true);
  };

  const onUpdateSubmit = (data: SubscriptionUpdateData) => {
    if (!selectedSubscription) return;

    updateSubscriptionMutation.mutate({
      subscriptionId: selectedSubscription.id,
      data: { productId: data.productId },
    });
  };

  const subscriptions = data?.subscriptions || [];
  const pagination = {
    page: page,
    limit: limit,
    total: data?.total || 0,
    pages: data?.totalPages || 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "canceled":
        return "destructive";
      case "past_due":
        return "destructive";
      case "unpaid":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search subscriptions by user or plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {(organizationId || productId || search) && (
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
        {productName && (
          <div className="text-muted-foreground flex items-center space-x-2 text-sm">
            <Package className="h-4 w-4" />
            <span>Filtered by product: {productName}</span>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Product / Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Billing Period</TableHead>
              <TableHead>Subscription ID</TableHead>
              <TableHead>Created</TableHead>
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-8 text-center"
                >
                  {debouncedSearch
                    ? "No subscriptions found matching your search."
                    : "No subscriptions found."}
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription: any) => (
                <TableRow key={subscription.id || Math.random()}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={subscription.user?.image || undefined}
                        />
                        <AvatarFallback>
                          {subscription.user?.name?.charAt(0)?.toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {subscription.user?.name || "Unknown User"}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {subscription.user?.email || "N/A"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Package className="text-muted-foreground h-4 w-4" />
                      <div>
                        <div className="font-medium">
                          {subscription.planName || "Unknown Plan"}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {subscription.product?.credits
                            ? `${subscription.product.credits} credits`
                            : "N/A"}{" "}
                          •{" "}
                          <span className="capitalize">
                            {subscription.product?.type || "recurring"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      $
                      {subscription.amount
                        ? (subscription.amount / 100).toFixed(2)
                        : "0.00"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">
                      {subscription.interval || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {subscription.stripeSubId ? (
                        <span
                          onClick={() => {
                            navigator.clipboard.writeText(
                              subscription.stripeSubId!,
                            );
                            toast.success(
                              "Subscription ID copied to clipboard",
                            );
                          }}
                          className="text-muted-foreground max-w-[100px] truncate"
                        >
                          {subscription.stripeSubId}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {subscription.createdAt
                      ? new Date(subscription.createdAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {subscription.organization && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleViewOrganization(
                              subscription.organization!.name || "",
                            )
                          }
                          className="h-8 px-2"
                        >
                          <Building2 className="mr-1 h-4 w-4" />
                          View Organization
                        </Button>
                      )}
                      {subscription.product && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleViewProduct(subscription.product!.key)
                          }
                          className="h-8 px-2"
                        >
                          <Package className="mr-1 h-4 w-4" />
                          View Product
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateSubscription(subscription)}
                        className="h-8 px-2"
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Update
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
          subscriptions
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

      {/* Update Subscription Sheet */}
      <Sheet open={isUpdateSheetOpen} onOpenChange={setIsUpdateSheetOpen}>
        <SheetContent className="w-full p-6 sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Update Subscription</SheetTitle>
            <SheetDescription>
              Change the product associated with this subscription.
            </SheetDescription>
          </SheetHeader>

          {selectedSubscription && (
            <div className="flex h-full flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div className="space-y-3">
                  <Label className="mb-2 text-base font-semibold">
                    Current Subscription
                  </Label>
                  <div className="bg-muted/50 rounded-lg border p-4">
                    <div className="font-medium">
                      {selectedSubscription.user?.name || "Unknown User"}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {selectedSubscription.user?.email}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Organization: {selectedSubscription.organization?.name}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="mb-2 text-base font-semibold">
                    Current Product
                  </Label>
                  <div className="bg-muted/50 rounded-lg border p-4">
                    <div className="font-medium">
                      {selectedSubscription.planName || "Unknown Plan"}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {selectedSubscription.product?.credits} credits •{" "}
                      {selectedSubscription.product?.type}
                    </div>
                  </div>
                </div>

                <Form {...updateForm}>
                  <form
                    id="update-subscription-form"
                    onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
                    className="w-full space-y-6"
                  >
                    <FormField
                      control={updateForm.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-base font-semibold">
                            Select New Product
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {productsData?.products?.map((product: any) => (
                                <SelectItem
                                  key={product.id || Math.random()}
                                  value={product.id || ""}
                                >
                                  <div>
                                    <span className="font-medium">
                                      {product.name || "Unknown Product"}
                                    </span>{" "}
                                    <span className="text-muted-foreground text-sm">
                                      ({product.credits || 0} credits)
                                    </span>
                                  </div>
                                </SelectItem>
                              )) || []}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the new product for this subscription
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>

              <SheetFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="update-subscription-form"
                  disabled={updateSubscriptionMutation.isPending}
                >
                  {updateSubscriptionMutation.isPending
                    ? "Updating..."
                    : "Update Subscription"}
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
