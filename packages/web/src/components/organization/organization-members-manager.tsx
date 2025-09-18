"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@acme/shared/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MembersDataTable, type Member } from "./members-data-table";

export function OrganizationMembersManager() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviting, setIsInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!activeOrganization?.id) return;

    setIsLoading(true);
    try {
      const result = await authClient.organization.listMembers({
        query: {
          organizationId: activeOrganization.id,
        },
      });
      setMembers(result.data?.members || []);
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganization?.id]);

  const loadInvitations = useCallback(async () => {
    if (!activeOrganization?.id) return;

    try {
      const result = await authClient.organization.listInvitations({
        query: {
          organizationId: activeOrganization.id,
        },
      });
      setInvitations(result.data || []);
    } catch (error) {
      console.error("Failed to load invitations:", error);
      setInvitations([]);
    }
  }, [activeOrganization?.id]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!activeOrganization?.id || !mounted) return;

      await Promise.all([loadMembers(), loadInvitations()]);
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [activeOrganization?.id]); // Only depend on the ID, not the whole object

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeOrganization) return;

    setIsInviting(true);
    setError("");
    setSuccess("");

    try {
      const result = await authClient.organization.inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole as "member" | "admin",
        organizationId: activeOrganization.id,
      });
      setInviteEmail("");
      setSuccess("Invitation envoyée avec succès !");

      // Add to local state instead of refetching
      if (result.data) {
        setInvitations((prev) => [...prev, result.data]);
      }
    } catch (err: any) {
      setError(err?.message || "Échec de l'envoi de l'invitation. Veuillez réessayer.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = useCallback(
    async (memberIdOrEmail: string) => {
      if (!activeOrganization) return;

      const confirmed = window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce membre ?",
      );
      if (!confirmed) return;

      try {
        await authClient.organization.removeMember({
          memberIdOrEmail,
          organizationId: activeOrganization.id,
        });
        setSuccess("Membre supprimé avec succès !");
        loadMembers();
      } catch (err: any) {
        setError(err?.message || "Échec de la suppression du membre. Veuillez réessayer.");
      }
    },
    [activeOrganization, loadMembers],
  );

  const handleUpdateMemberRole = useCallback(
    async (memberId: string, newRole: string) => {
      if (!activeOrganization) return;

      try {
        await authClient.organization.updateMemberRole({
          memberId,
          role: newRole,
          organizationId: activeOrganization.id,
        });
        setSuccess("Rôle du membre mis à jour avec succès !");
        loadMembers();
      } catch (err: any) {
        setError(
          err?.message || "Échec de la mise à jour du rôle du membre. Veuillez réessayer.",
        );
      }
    },
    [activeOrganization, loadMembers],
  );

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    try {
      await authClient.organization.cancelInvitation({
        invitationId,
      });
      setSuccess("Invitation annulée avec succès !");

      // Update local state instead of refetching
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err: any) {
      setError(
        err?.message || "Échec de l'annulation de l'invitation. Veuillez réessayer.",
      );
    }
  }, []);

  const handleCopyInviteLink = useCallback((invitationId: string) => {
    const inviteLink = `${window.location.origin}/accept-invitation/${invitationId}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Lien d'invitation copié dans le presse-papiers !");
  }, []);

  if (!activeOrganization) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Gestion de l'équipe</h1>
        <p className="text-muted-foreground">Aucun cabinet actif sélectionné</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion de l'équipe</h1>
        <p className="text-muted-foreground">
          Gérer les membres et invitations pour {activeOrganization.name}
        </p>
      </div>

      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <CheckCircle />
              <AlertTitle>Succès</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Invite New Member */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Inviter un nouveau membre</h2>
          <p className="text-muted-foreground">
            Envoyer une invitation pour rejoindre {activeOrganization.name}
          </p>
        </div>

        <form onSubmit={handleInviteMember} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail">Adresse e-mail</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="collegue@cabinet.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={isInviting}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inviteRole">Rôle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membre</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isInviting || !inviteEmail.trim()}
            className="w-full md:w-auto"
          >
            {isInviting ? "Envoi de l'invitation..." : "Envoyer l'invitation"}
          </Button>
        </form>
      </div>

      <Separator className="my-8" />

      {/* Current Members */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Membres du cabinet</h2>
          <p className="text-muted-foreground">
            Membres actuels de {activeOrganization.name}
          </p>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">Chargement des membres...</div>
        ) : (
          <MembersDataTable
            data={members}
            onRemoveMember={handleRemoveMember}
            onUpdateRole={handleUpdateMemberRole}
          />
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <>
          <Separator className="my-8" />

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">
                Invitations en attente ({invitations.length})
              </h2>
              <p className="text-muted-foreground">
                Invitations en attente d'acceptation
              </p>
            </div>

            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{invitation.email}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{invitation.role}</Badge>
                      <Badge variant="secondary">{invitation.status}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Invité{" "}
                      {invitation.createdAt
                        ? new Date(invitation.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInviteLink(invitation.id)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copier le lien
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
