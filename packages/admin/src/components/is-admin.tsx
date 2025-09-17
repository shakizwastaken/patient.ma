import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@acme/shared/server";

export default async function IsAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get the main app URL from environment or default to localhost:3000
  const mainAppUrl =
    process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:3000";

  if (!session?.user) {
    // Redirect to main app login page
    redirect(`${mainAppUrl}/login`);
  }

  // For now, we'll check if user has admin role or is part of an admin organization
  // This should be replaced with your actual admin logic
  const isUserAdmin = session.user.role === "admin";

  if (!isUserAdmin) {
    // Redirect to main app dashboard for non-admin users
    redirect(`${mainAppUrl}/`);
  }

  return <>{children}</>;
}
