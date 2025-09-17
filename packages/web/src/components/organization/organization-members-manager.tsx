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
      setSuccess("Invitation sent successfully!");

      // Add to local state instead of refetching
      if (result.data) {
        setInvitations((prev) => [...prev, result.data]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send invitation. Please try again.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = useCallback(
    async (memberIdOrEmail: string) => {
      if (!activeOrganization) return;

      const confirmed = window.confirm(
        "Are you sure you want to remove this member?",
      );
      if (!confirmed) return;

      try {
        await authClient.organization.removeMember({
          memberIdOrEmail,
          organizationId: activeOrganization.id,
        });
        setSuccess("Member removed successfully!");
        loadMembers();
      } catch (err: any) {
        setError(err?.message || "Failed to remove member. Please try again.");
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
        setSuccess("Member role updated successfully!");
        loadMembers();
      } catch (err: any) {
        setError(
          err?.message || "Failed to update member role. Please try again.",
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
      setSuccess("Invitation canceled successfully!");

      // Update local state instead of refetching
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err: any) {
      setError(
        err?.message || "Failed to cancel invitation. Please try again.",
      );
    }
  }, []);

  const handleCopyInviteLink = useCallback((invitationId: string) => {
    const inviteLink = `${window.location.origin}/accept-invitation/${invitationId}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied to clipboard!");
  }, []);

  if (!activeOrganization) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">No active organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">
          Manage members and invitations for {activeOrganization.name}
        </p>
      </div>

      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <CheckCircle />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Invite New Member */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Invite New Member</h2>
          <p className="text-muted-foreground">
            Send an invitation to join {activeOrganization.name}
          </p>
        </div>

        <form onSubmit={handleInviteMember} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@company.com"
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
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isInviting || !inviteEmail.trim()}
            className="w-full md:w-auto"
          >
            {isInviting ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </form>
      </div>

      <Separator className="my-8" />

      {/* Current Members */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Organization Members</h2>
          <p className="text-muted-foreground">
            Current members of {activeOrganization.name}
          </p>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">Loading members...</div>
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
                Pending Invitations ({invitations.length})
              </h2>
              <p className="text-muted-foreground">
                Invitations waiting for acceptance
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
                      Invited{" "}
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
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      Cancel
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
