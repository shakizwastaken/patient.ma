"use client";

import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@acme/shared/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import AuthSocials from "./socials";

const signupSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState<string>("");
  const invitationId = searchParams.get("invitation");

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema as any),
    defaultValues: {
      name: "",
      email: invitationEmail,
      password: "",
    },
  });

  // Fetch invitation details if invitation ID is present
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!invitationId) return;

      setIsLoadingInvitation(true);
      try {
        const response = await fetch(`/api/invitations/${invitationId}`);
        const result = await response.json();

        if (response.ok && result.data) {
          setInvitationEmail(result.data.email);
          form.setValue("email", result.data.email);
        }
      } catch (error) {
        console.error("Failed to fetch invitation details:", error);
      } finally {
        setIsLoadingInvitation(false);
      }
    };

    fetchInvitationDetails();
  }, [invitationId, form]);

  // Update form when invitationEmail changes
  useEffect(() => {
    if (invitationEmail) {
      form.setValue("email", invitationEmail);
    }
  }, [invitationEmail, form]);

  const acceptInvitation = async (invitationId: string) => {
    try {
      await authClient.organization.acceptInvitation({
        invitationId: invitationId,
      });
      return true;
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      return false;
    }
  };

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      setIsLoading(true);
      setError("");

      const result = await authClient.signUp.email(data);

      if (result.error) {
        setError(result.error.message || "");
        return;
      }

      // Auto login after signup
      const loginResult = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (loginResult.error) {
        setError(
          "Account created but couldn't log in automatically. Please try logging in.",
        );
        router.push("/login");
        return;
      }

      // If there's an invitation, try to accept it
      if (invitationId) {
        const invitationAccepted = await acceptInvitation(invitationId);
        if (invitationAccepted) {
          router.refresh();
          router.push("/dashboard");
          return;
        } else {
          setError(
            "Account created and logged in, but failed to accept invitation. Please try again from the invitation link.",
          );
          return;
        }
      }

      router.refresh();
      router.push("/");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {invitationEmail ? "Complete Your Invitation" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {invitationEmail
              ? "Fill in your details to join the organization"
              : "Enter your details below to create your account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    type="text"
                    autoCapitalize="words"
                    autoComplete="name"
                    autoCorrect="off"
                    disabled={isLoading}
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-sm">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="m@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={
                      isLoading || isLoadingInvitation || !!invitationEmail
                    }
                    {...form.register("email")}
                  />
                  {invitationEmail && (
                    <p className="text-muted-foreground text-xs">
                      Email pre-filled from invitation
                    </p>
                  )}
                  {form.formState.errors.email && (
                    <p className="text-destructive text-sm">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect="off"
                    disabled={isLoading}
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-destructive text-sm">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isLoadingInvitation}
                  >
                    {isLoading
                      ? invitationEmail
                        ? "Creating account & joining..."
                        : "Creating account..."
                      : invitationEmail
                        ? "Create Account & Join"
                        : "Sign Up"}
                  </Button>
                  <AuthSocials />
                </div>
              </div>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <a
                  href={
                    invitationId
                      ? `/login?invitation=${invitationId}`
                      : "/login"
                  }
                  className="underline underline-offset-4"
                >
                  Login
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
