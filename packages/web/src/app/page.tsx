import { redirect } from "next/navigation";
import { auth } from "@acme/shared/server";
import { headers } from "next/headers";

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) redirect("/dashboard");
  else return redirect("/login");
}
