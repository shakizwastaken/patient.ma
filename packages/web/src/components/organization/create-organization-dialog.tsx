"use client";

import { useState } from "react";
import { authClient } from "@acme/shared/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: CreateOrganizationDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setIsCreating(true);
    setError("");

    try {
      const slug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await authClient.organization.create({
        name: orgName.trim(),
        slug: `${slug}-${Date.now()}`,
      });

      // Reset form and close dialog
      setOrgName("");
      setError("");
      onOpenChange(false);

      // Refresh to update organization list
      window.location.reload();
    } catch (err: any) {
      setError(
        err?.message || "Échec de la création du cabinet. Veuillez réessayer.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Créer un nouveau cabinet</DialogTitle>
          <DialogDescription>
            Créer un nouveau cabinet pour gérer les projets et les membres de l'équipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="dialogOrgName">Nom du cabinet</Label>
            <Input
              id="dialogOrgName"
              type="text"
              placeholder="Entrez le nom du cabinet"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              disabled={isCreating}
              autoCapitalize="words"
              autoComplete="organization"
              autoCorrect="off"
            />
            <p className="text-muted-foreground text-xs">
              Ce sera le nom affiché à vos membres d'équipe
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isCreating}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isCreating || !orgName.trim()}
            >
              {isCreating ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
