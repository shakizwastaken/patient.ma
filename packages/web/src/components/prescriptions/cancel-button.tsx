"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function CancelButton() {
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

  return (
    <Button variant="outline" onClick={handleCancel}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Annuler
    </Button>
  );
}

CancelButton.displayName = "CancelButton";
