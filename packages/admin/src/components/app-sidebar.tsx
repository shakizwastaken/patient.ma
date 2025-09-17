"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@acme/shared/client";
import { trpc } from "@/trpc/react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();
  // Mock analytics data for now
  const analytics = {
    summary: {
      totalUsers: 1250,
      totalOrganizations: 45,
      totalSubscribers: 320,
    },
  };

  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
    },
    {
      title: "Organizations",
      url: "/organizations",
      icon: Building2,
    },
    {
      title: "Subscriptions",
      url: "/subscriptions",
      icon: CreditCard,
    },
  ];

  const user = session?.user
    ? {
        name: session.user.name || "Admin User",
        email: session.user.email || "admin@acme.com",
        avatar: session.user.image || "/avatars/admin.jpg",
      }
    : {
        name: "Admin User",
        email: "admin@acme.com",
        avatar: "/avatars/admin.jpg",
      };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="p-1.5">
            <span className="text-base font-semibold">Reelty Admin</span>
            {analytics && (
              <div className="text-xs text-muted-foreground mt-1">
                {analytics.summary.totalUsers.toLocaleString()} users •{" "}
                {analytics.summary.totalSubscribers.toLocaleString()}{" "}
                subscribers
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
