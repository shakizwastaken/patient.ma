"use client";

import { useState, useEffect } from "react";
import { useOrganizationSettings } from "@/contexts/organization-settings-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CreditCard,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Copy,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";

// Form validation schema
const stripeSettingsSchema = z.object({
  stripeEnabled: z.boolean(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
});

type StripeSettingsValues = z.infer<typeof stripeSettingsSchema>;

export function StripeSettings() {
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // Use global settings context
  const {
    organizationData,
    isUpdating,
    saveSettings,
    registerChanges,
    clearChanges,
  } = useOrganizationSettings();

  // Form setup
  const form = useForm<StripeSettingsValues>({
    resolver: zodResolver(stripeSettingsSchema as any),
    defaultValues: {
      stripeEnabled: false,
      stripePublishableKey: "",
      stripeSecretKey: "",
      stripeWebhookSecret: "",
    },
  });

  // Initialize form data when organization is loaded
  useEffect(() => {
    if (organizationData) {
      const initialValues = {
        stripeEnabled: organizationData.stripeEnabled || false,
        stripePublishableKey: organizationData.stripePublishableKey || "",
        stripeSecretKey: organizationData.stripeSecretKey || "",
        stripeWebhookSecret: organizationData.stripeWebhookSecret || "",
      };
      form.reset(initialValues);
      // Clear any pending changes for this component
      clearChanges("stripe-settings");
    }
  }, [organizationData, form, clearChanges]);

  // Watch for specific form fields to avoid infinite loops
  const stripeEnabled = form.watch("stripeEnabled");
  const stripePublishableKey = form.watch("stripePublishableKey");
  const stripeSecretKey = form.watch("stripeSecretKey");
  const stripeWebhookSecret = form.watch("stripeWebhookSecret");

  // Webhook URL functionality
  const webhookUrl = organizationData?.id
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/stripe/webhook/${organizationData.id}`
    : "";

  const copyWebhookUrl = async () => {
    if (!webhookUrl) return;

    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy webhook URL:", error);
    }
  };

  useEffect(() => {
    if (!organizationData) return;

    const timeoutId = setTimeout(() => {
      const originalValues = {
        stripeEnabled: organizationData.stripeEnabled || false,
        stripePublishableKey: organizationData.stripePublishableKey || "",
        stripeSecretKey: organizationData.stripeSecretKey || "",
        stripeWebhookSecret: organizationData.stripeWebhookSecret || "",
      };

      // Check if values have changed
      const hasChanges =
        stripeEnabled !== originalValues.stripeEnabled ||
        stripePublishableKey !== originalValues.stripePublishableKey ||
        stripeSecretKey !== originalValues.stripeSecretKey ||
        stripeWebhookSecret !== originalValues.stripeWebhookSecret;

      if (hasChanges) {
        registerChanges("stripe-settings", {
          stripeEnabled,
          stripePublishableKey: stripePublishableKey?.trim() || null,
          stripeSecretKey: stripeSecretKey?.trim() || null,
          stripeWebhookSecret: stripeWebhookSecret?.trim() || null,
        });
      } else {
        clearChanges("stripe-settings");
      }
    }, 100); // 100ms debounce to prevent excessive updates

    return () => clearTimeout(timeoutId);
  }, [
    stripeEnabled,
    stripePublishableKey,
    stripeSecretKey,
    stripeWebhookSecret,
    organizationData,
    registerChanges,
    clearChanges,
  ]);

  if (!organizationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Paramètres Stripe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Paramètres Stripe
        </CardTitle>
        <CardDescription>
          Configurez l'intégration Stripe pour accepter les paiements en ligne
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            {/* Enable Stripe Toggle */}
            <FormField
              control={form.control}
              name="stripeEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-1">
                    <FormLabel>Activer Stripe</FormLabel>
                    <FormDescription>
                      Permettre l'acceptation des paiements par carte de crédit
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {stripeEnabled && (
              <>
                {/* Stripe Publishable Key */}
                <FormField
                  control={form.control}
                  name="stripePublishableKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clé publique Stripe *</FormLabel>
                      <FormControl>
                        <Input placeholder="pk_test_..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Votre clé publique Stripe (commence par pk_test_ ou
                        pk_live_)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stripe Secret Key */}
                <FormField
                  control={form.control}
                  name="stripeSecretKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clé secrète Stripe *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showSecretKey ? "text" : "password"}
                            placeholder="sk_test_..."
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                          >
                            {showSecretKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Votre clé secrète Stripe (commence par sk_test_ ou
                        sk_live_)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stripe Webhook Secret */}
                <FormField
                  control={form.control}
                  name="stripeWebhookSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secret webhook Stripe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showWebhookSecret ? "text" : "password"}
                            placeholder="whsec_..."
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setShowWebhookSecret(!showWebhookSecret)
                            }
                          >
                            {showWebhookSecret ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Secret pour les webhooks Stripe (optionnel, commence par
                        whsec_)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Webhook URL */}
                {webhookUrl && (
                  <div className="space-y-2">
                    <Label>URL webhook Stripe</Label>
                    <div className="flex items-center gap-2">
                      <code className="bg-background flex-1 rounded px-2 py-1 font-mono text-sm">
                        {webhookUrl}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyWebhookUrl}
                      >
                        {copiedWebhookUrl ? (
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                        ) : (
                          <Copy className="mr-1 h-4 w-4" />
                        )}
                        {copiedWebhookUrl ? "Copié !" : "Copier"}
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Utilisez cette URL dans votre tableau de bord Stripe pour
                      configurer les webhooks. Cette URL est spécifique à votre
                      organisation.
                    </p>
                  </div>
                )}

                {/* Information Alert */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important :</strong> Vos clés Stripe sont stockées
                    de manière sécurisée.
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>
                        Utilisez les clés de test pendant le développement
                      </li>
                      <li>
                        Passez aux clés de production uniquement en direct
                      </li>
                      <li>Ne partagez jamais vos clés secrètes</li>
                      <li>
                        Configurez les webhooks dans votre tableau de bord
                        Stripe
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Test Connection Section */}
                {form.watch("stripePublishableKey") &&
                  form.watch("stripeSecretKey") && (
                    <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-primary mt-0.5 h-5 w-5" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-primary font-medium">
                            Configuration Stripe
                          </h4>
                          <div className="text-primary/80 mt-2 space-y-1 text-sm">
                            <p>
                              <strong>Clé publique :</strong>{" "}
                              {form
                                .watch("stripePublishableKey")
                                ?.substring(0, 20)}
                              ...
                            </p>
                            <p>
                              <strong>Clé secrète :</strong>{" "}
                              {form.watch("stripeSecretKey")?.substring(0, 10)}
                              ...
                            </p>
                            <p>
                              <strong>Environnement :</strong>{" "}
                              {form
                                .watch("stripePublishableKey")
                                ?.startsWith("pk_live_")
                                ? "Production"
                                : "Test"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
