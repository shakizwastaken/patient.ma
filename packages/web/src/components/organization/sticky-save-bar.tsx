"use client";

import { useOrganizationSettings } from "@/contexts/organization-settings-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, X, AlertCircle } from "lucide-react";

export function StickySaveBar() {
  const { hasUnsavedChanges, isUpdating, saveAllChanges, clearChanges } =
    useOrganizationSettings();

  if (!hasUnsavedChanges) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
      <Card className="bg-background shadow-lg">
        <CardContent className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">
              Vous avez des modifications non sauvegardées
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearChanges()}
              disabled={isUpdating}
            >
              <X className="mr-1 h-4 w-4" />
              Annuler
            </Button>

            <Button size="sm" onClick={saveAllChanges} disabled={isUpdating}>
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
        </CardContent>
      </Card>
    </div>
  );
}
