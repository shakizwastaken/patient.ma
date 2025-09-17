"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/contexts/dashboard-context";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const { period, setPeriod } = useDashboard();
  const pathname = usePathname();

  // Get page title based on current route
  const getPageTitle = () => {
    switch (pathname) {
      case "/":
        return "Dashboard";
      case "/users":
        return "Users";
      case "/organizations":
        return "Organizations";
      case "/listings":
        return "Listings";
      case "/videos":
        return "Videos";
      default:
        return "Dashboard";
    }
  };

  // Show period selector only on dashboard
  const showPeriodSelector = pathname === "/";

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{getPageTitle()}</h1>
        </div>

        {showPeriodSelector && (
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger
                className="w-40"
                size="sm"
                aria-label="Select time range"
              >
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="today" className="rounded-lg">
                  Today
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Last 7 days
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="90d" className="rounded-lg">
                  Last 90 days
                </SelectItem>
                <SelectItem value="1y" className="rounded-lg">
                  Last year
                </SelectItem>
                <SelectItem value="all" className="rounded-lg">
                  All time
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </header>
  );
}
