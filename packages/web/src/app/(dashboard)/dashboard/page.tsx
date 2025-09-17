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

export default function DashboardPage() {
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
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 flex aspect-video items-center justify-center rounded-xl">
            <p className="text-muted-foreground">Organization Overview</p>
          </div>
          <div className="bg-muted/50 flex aspect-video items-center justify-center rounded-xl">
            <p className="text-muted-foreground">Recent Projects</p>
          </div>
          <div className="bg-muted/50 flex aspect-video items-center justify-center rounded-xl">
            <p className="text-muted-foreground">Team Activity</p>
          </div>
        </div>
        <div className="bg-muted/50 flex min-h-[100vh] flex-1 items-center justify-center rounded-xl md:min-h-min">
          <p className="text-muted-foreground">Main Dashboard Content</p>
        </div>
      </div>
    </>
  );
}
