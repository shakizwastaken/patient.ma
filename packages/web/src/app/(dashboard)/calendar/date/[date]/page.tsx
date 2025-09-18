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

interface DatePageProps {
  params: {
    date: string;
  };
}

export default function DatePage({ params }: DatePageProps) {
  // Parse the date from the URL parameter, avoiding timezone issues
  const dateParts = params.date.split("-").map(Number);
  const year = dateParts[0] ?? new Date().getFullYear();
  const month = dateParts[1] ?? new Date().getMonth() + 1;
  const day = dateParts[2] ?? new Date().getDate();
  const date = new Date(year, month - 1, day);

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
          <DateDetailsView selectedDate={date} />
        </div>
      </div>
    </>
  );
}
