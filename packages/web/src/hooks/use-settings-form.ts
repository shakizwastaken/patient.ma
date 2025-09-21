import { useCallback } from "react";
import { useForm, UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useOrganizationSettings } from "@/contexts/organization-settings-context";

interface UseSettingsFormOptions<T extends Record<string, any>> {
  schema: z.ZodType<T>;
  defaultValues: T;
  successMessage?: string;
  errorMessage?: string;
  validate?: (values: T) => string | null;
  transform?: (values: T) => Record<string, any>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Reusable hook for organization settings forms
 * Provides form management, validation, and saving with global state
 */
export function useSettingsForm<T extends Record<string, any>>(
  options: UseSettingsFormOptions<T>,
) {
  const { saveSettings, isUpdating, organizationData } =
    useOrganizationSettings();

  const {
    schema,
    defaultValues,
    successMessage = "Paramètres mis à jour avec succès",
    errorMessage = "Échec de la mise à jour des paramètres",
    validate,
    transform,
    onSuccess,
    onError,
  } = options;

  // Form setup with zod validation
  const form = useForm<T>({
    resolver: zodResolver(schema as any),
    mode: "onChange",
    defaultValues,
  });

  // Save handler
  const handleSave = useCallback(
    async (values: T) => {
      // Custom validation
      if (validate) {
        const validationError = validate(values);
        if (validationError) {
          toast.error(validationError);
          return;
        }
      }

      // Transform values if needed
      const settingsToSave = transform ? transform(values) : values;

      await saveSettings(settingsToSave, {
        successMessage,
        errorMessage,
        onSuccess,
        onError,
      });
    },
    [
      saveSettings,
      validate,
      transform,
      successMessage,
      errorMessage,
      onSuccess,
      onError,
    ],
  );

  return {
    form,
    handleSave,
    isUpdating,
    organizationData,
    // Convenience methods
    onSubmit: form.handleSubmit(handleSave),
    reset: form.reset,
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
  };
}

/**
 * Common validation functions for settings
 */
export const settingsValidators = {
  requireSlugIfEnabled: (values: { enabled: boolean; slug?: string }) => {
    if (values.enabled && !values.slug?.trim()) {
      return "Le slug est requis quand cette fonctionnalité est activée";
    }
    return null;
  },

  requireKeysIfEnabled: (values: { enabled: boolean; keys: string[] }) => {
    if (values.enabled) {
      for (const key of values.keys) {
        if (!key?.trim()) {
          return "Toutes les clés sont requises quand cette fonctionnalité est activée";
        }
      }
    }
    return null;
  },

  validateStripeKeys: (values: {
    stripeEnabled: boolean;
    stripePublishableKey?: string;
    stripeSecretKey?: string;
  }) => {
    if (values.stripeEnabled) {
      if (!values.stripePublishableKey?.trim()) {
        return "La clé publique Stripe est requise";
      }
      if (!values.stripeSecretKey?.trim()) {
        return "La clé secrète Stripe est requise";
      }
      if (!values.stripePublishableKey.startsWith("pk_")) {
        return "La clé publique Stripe doit commencer par 'pk_'";
      }
      if (!values.stripeSecretKey.startsWith("sk_")) {
        return "La clé secrète Stripe doit commencer par 'sk_'";
      }
    }
    return null;
  },
};

/**
 * Common transformers for settings data
 */
export const settingsTransformers = {
  trimStrings: <T extends Record<string, any>>(values: T): T => {
    const result = { ...values };
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "string") {
        result[key] = value.trim() || null;
      }
    }
    return result;
  },

  booleanToggles: <T extends Record<string, any>>(values: T): T => {
    const result = { ...values };
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "boolean") {
        result[key] = value;
      }
    }
    return result;
  },
};
