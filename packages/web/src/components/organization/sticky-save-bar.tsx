"use client";

import { useOrganizationSettings } from "@/contexts/organization-settings-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function StickySaveBar() {
  const { hasUnsavedChanges, isUpdating, saveAllChanges, clearChanges } =
    useOrganizationSettings();

  if (!hasUnsavedChanges) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
      <Card className="border-orange-200 bg-orange-50 shadow-lg">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
            <span className="text-sm font-medium text-orange-900">
              Vous avez des modifications non sauvegardées
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearChanges()}
              disabled={isUpdating}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <X className="mr-1 h-4 w-4" />
              Annuler
            </Button>

            <Button
              size="sm"
              onClick={saveAllChanges}
              disabled={isUpdating}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" />
                  Sauvegarder tout
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
