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
import { PrescriptionsTable } from "@/components/prescriptions/prescriptions-table";
import { api, HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function PrescriptionsPage() {
  // Prefetch prescriptions data
  await api.prescriptions.getAll.prefetch({});

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
                <BreadcrumbPage>Ordonnances</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Ordonnances
            </h1>
            <p className="text-muted-foreground">
              Gérez les ordonnances de vos patients
            </p>
          </div>
          <Link href="/prescriptions/create">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle ordonnance
            </Button>
          </Link>
        </div>
        <HydrateClient>
          <PrescriptionsTable />
        </HydrateClient>
      </div>
    </>
  );
}
