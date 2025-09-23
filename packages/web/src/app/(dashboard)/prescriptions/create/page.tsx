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
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { CreatePrescriptionForm } from "@/components/prescriptions/create-prescription-form";
import { CancelButton } from "@/components/prescriptions/cancel-button";
import { api, HydrateClient } from "@/trpc/server";

export default async function CreatePrescriptionPage() {
  // Prefetch patients data
  await api.patients.getAll.prefetch();

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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/prescriptions">
                  Ordonnances
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Nouvelle ordonnance</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Nouvelle ordonnance
            </h1>
            <p className="text-muted-foreground">
              Créez une nouvelle ordonnance pour un patient
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CancelButton />
            <Button form="prescription-form" type="submit">
              <FileText className="mr-2 h-4 w-4" />
              Créer l'ordonnance
            </Button>
          </div>
        </div>
        <HydrateClient>
          <CreatePrescriptionForm />
        </HydrateClient>
      </div>
    </>
  );
}
