import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { api, HydrateClient } from "@/trpc/server";

export default async function DashboardPage() {
  // Prefetch dashboard data
  await Promise.all([
    api.patients.getAll.prefetch(),
    api.appointments.getUpcoming.prefetch(),
  ]);
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">
                  Tableau de bord
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Aperçu</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            Tableau de bord
          </h1>
        </div>
        <div className="min-h-0 flex-1">
          <HydrateClient>
            <DashboardOverview />
          </HydrateClient>
        </div>
      </div>
    </>
  );
}
