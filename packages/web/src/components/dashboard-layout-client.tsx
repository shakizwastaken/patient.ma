"use client";

import * as React from "react";
import { authClient } from "@acme/shared/client";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NoOrganization } from "@/components/organization/no-organization";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: organizations, isPending: isLoadingOrgs } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: isLoadingActive } =
    authClient.useActiveOrganization();

  // Auto-select first organization if user has organizations but none is active
  React.useEffect(() => {
    if (
      !isLoadingOrgs &&
      !isLoadingActive &&
      organizations &&
      organizations.length > 0 &&
      organizations[0] &&
      !activeOrganization
    ) {
      // Automatically set the first organization as active
      authClient.organization
        .setActive({
          organizationId: organizations[0].id,
        })
        .catch(console.error);
    }
  }, [organizations, activeOrganization, isLoadingOrgs, isLoadingActive]);

  // Show loading state while checking organizations
  if (isLoadingOrgs || isLoadingActive) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
          <Skeleton className="mx-auto h-10 w-40" />
        </div>
      </div>
    );
  }

  // Show no organization flow if user has no organizations
  if (!organizations || organizations.length === 0) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <NoOrganization />
      </div>
    );
  }

  // Show loading state while auto-selecting organization
  if (organizations && organizations.length > 0 && !activeOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-lg">Setting up your workspace...</div>
          <div className="text-muted-foreground text-sm">
            Activating {organizations[0]?.name || "organization"}
          </div>
        </div>
      </div>
    );
  }

  // Normal dashboard with sidebar
  return (
    <SidebarProvider key={activeOrganization?.id}>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
