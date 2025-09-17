"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@acme/shared/client";

interface UnauthenticatedProps {
  children: React.ReactNode;
}

export function Unauthenticated({ children }: UnauthenticatedProps) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authClient.getSession();
      if (session.data && !session.error) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  return <>{children}</>;
}
