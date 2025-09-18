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
import { CalendarView } from "@/components/calendar/calendar-view";
import { api, HydrateClient } from "@/trpc/server";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

export default async function CalendarPage() {
  // Prefetch appointments for the current month view
  const currentDate = new Date();
  const startDate = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
  const endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });

  // Prefetch the appointments data on the server
  await api.appointments.getByDateRange.prefetch({
    startDate,
    endDate,
  });
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
                <BreadcrumbPage>Calendar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        </div>
        <div className="min-h-0 flex-1">
          <HydrateClient>
            <CalendarView />
          </HydrateClient>
        </div>
      </div>
    </>
  );
}
