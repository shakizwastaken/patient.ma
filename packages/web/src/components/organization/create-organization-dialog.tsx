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
        err?.message || "Failed to create organization. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Create New Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to manage projects and team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="dialogOrgName">Organization Name</Label>
            <Input
              id="dialogOrgName"
              type="text"
              placeholder="Enter organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              disabled={isCreating}
              autoCapitalize="words"
              autoComplete="organization"
              autoCorrect="off"
            />
            <p className="text-muted-foreground text-xs">
              This will be the name displayed to your team members
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Error</AlertTitle>
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isCreating || !orgName.trim()}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
