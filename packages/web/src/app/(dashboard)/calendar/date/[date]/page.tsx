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
import { DateDetailsView } from "@/components/calendar/date-details-view";
import { api, HydrateClient } from "@/trpc/server";

interface DatePageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function DatePage({ params }: DatePageProps) {
  // Await params before using its properties (Next.js requirement)
  const { date: dateParam } = await params;

  // Parse the date from the URL parameter, avoiding timezone issues
  const dateParts = dateParam.split("-").map(Number);
  const year = dateParts[0] ?? new Date().getFullYear();
  const month = dateParts[1] ?? new Date().getMonth() + 1;
  const day = dateParts[2] ?? new Date().getDate();
  const date = new Date(year, month - 1, day);

  // Prefetch appointments for the selected date
  const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

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
                <BreadcrumbLink href="/calendar">Calendar</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {date.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-shrink-0 items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h1>
        </div>
        <div className="min-h-0 flex-1">
          <HydrateClient>
            <DateDetailsView selectedDate={date} />
          </HydrateClient>
        </div>
      </div>
    </>
  );
}
