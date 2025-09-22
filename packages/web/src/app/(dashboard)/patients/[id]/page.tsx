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
import { PatientDetailsView } from "@/components/patients/patient-details-view";
import { api, HydrateClient } from "@/trpc/server";
import { notFound } from "next/navigation";

interface PatientPageProps {
  params: {
    id: string;
  };
}

export default async function PatientPage({ params }: PatientPageProps) {
  const { id: patientId } = await params;

  // Prefetch patient data and their appointments
  await Promise.all([
    api.patients.getById.prefetch({ id: patientId }),
    api.appointments.getAll.prefetch({ patientId }),
  ]);

  // Try to get the patient to check if it exists
  try {
    await api.patients.getById({ id: patientId });
  } catch {
    notFound();
  }

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
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink href="/patients">Patients</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Patient Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
        <div className="min-h-0 flex-1">
          <HydrateClient>
            <PatientDetailsView patientId={patientId} />
          </HydrateClient>
        </div>
      </div>
    </>
  );
}
