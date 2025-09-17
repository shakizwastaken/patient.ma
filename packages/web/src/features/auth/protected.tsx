"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@acme/shared/client";

interface ProtectedProps {
  children: React.ReactNode;
}

export function Protected({ children }: ProtectedProps) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authClient.getSession();
      if (!session.data || session.error) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  return <>{children}</>;
}
