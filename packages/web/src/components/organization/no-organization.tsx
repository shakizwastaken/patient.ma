"use client";

import { useState } from "react";
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
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function NoOrganizationForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isCreating, setIsCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"create" | "invite">("create");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

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
      const result = await authClient.organization.create({
        name: orgName.trim(),
        slug: `${slug}-${Date.now()}`,
      });

      if (result.data) {
        setCreatedOrgId(result.data.id);
        setStep("invite");
      }
    } catch (err: any) {
      setError(
        err?.message || "Failed to create organization. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = currentEmail.trim().toLowerCase();
    if (email && !inviteEmails.includes(email) && email.includes("@")) {
      setInviteEmails([...inviteEmails, email]);
      setCurrentEmail("");
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  };

  const handleSendInvites = async () => {
    if (!createdOrgId) return;

    setIsCreating(true);
    setError("");

    try {
      for (const email of inviteEmails) {
        await authClient.organization.inviteMember({
          email,
          role: "member",
          organizationId: createdOrgId,
        });
      }
      // Reload the page to refresh the organization state
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || "Failed to send invitations. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkipInvites = () => {
    // Reload the page to refresh the organization state
    window.location.reload();
  };

  // Step 1: Create Organization
  if (step === "create") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Create Your Organization</CardTitle>
            <CardDescription>
              Get started by creating your organization to manage projects and
              team members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrganization}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Enter your organization name"
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isCreating || !orgName.trim()}
                >
                  {isCreating ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Invite Members
  if (step === "invite") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invite Team Members</CardTitle>
            <CardDescription>
              Invite your team to collaborate in "{orgName}" (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <form onSubmit={handleAddEmail} className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={currentEmail}
                      onChange={(e) => setCurrentEmail(e.target.value)}
                      disabled={isCreating}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={
                        !currentEmail.trim() || !currentEmail.includes("@")
                      }
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </form>

              {inviteEmails.length > 0 && (
                <div className="space-y-3">
                  <Label>Team Members to Invite ({inviteEmails.length})</Label>
                  <div className="bg-muted/30 max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {inviteEmails.map((email) => (
                      <div
                        key={email}
                        className="bg-background flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="text-sm font-medium">{email}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveEmail(email)}
                          className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-3">
                {inviteEmails.length > 0 && (
                  <Button
                    onClick={handleSendInvites}
                    disabled={isCreating}
                    className="w-full"
                  >
                    {isCreating
                      ? "Sending Invites..."
                      : `Send ${inviteEmails.length} Invitation${inviteEmails.length !== 1 ? "s" : ""}`}
                  </Button>
                )}

                <Button
                  onClick={handleSkipInvites}
                  variant="outline"
                  className="w-full"
                  disabled={isCreating}
                >
                  {inviteEmails.length > 0
                    ? "Skip for Now"
                    : "Continue to Dashboard"}
                </Button>
              </div>

              <div className="text-muted-foreground text-center text-sm">
                You can invite more team members later from your organization
                settings.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should not be reached since we reload the page
  return null;
}

export function NoOrganization() {
  return <NoOrganizationForm />;
}
