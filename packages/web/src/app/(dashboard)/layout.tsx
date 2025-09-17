import { redirect } from "next/navigation";
import { auth } from "@acme/shared/server";
import { headers } from "next/headers";
import { DashboardLayoutClient } from "@/components/dashboard-layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
 