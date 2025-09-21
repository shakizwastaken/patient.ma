"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface OrganizationSettingsContextType {
  // Global loading state
  isUpdating: boolean;

  // Save function that can be used by any settings component
  saveSettings: (
    settings: Record<string, any>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    },
  ) => Promise<void>;

  // Organization data
  organizationData: any;
  isLoading: boolean;

  // Change tracking
  hasUnsavedChanges: boolean;
  pendingChanges: Record<string, any>;
  registerChanges: (componentId: string, changes: Record<string, any>) => void;
  clearChanges: (componentId?: string) => void;
  saveAllChanges: () => Promise<void>;

  // Utility functions
  invalidateData: () => Promise<void>;
}

const OrganizationSettingsContext =
  createContext<OrganizationSettingsContextType | null>(null);

export function OrganizationSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, Record<string, any>>
  >({});

  const utils = api.useUtils();

  // Get current organization data
  const { data: organizationData, isLoading } =
    api.organizations.getCurrent.useQuery();

  // Update organization mutation
  const updateOrganization = api.organizations.update.useMutation();

  // Global save function
  const saveSettings = useCallback(
    async (
      settings: Record<string, any>,
      options: {
        successMessage?: string;
        errorMessage?: string;
        onSuccess?: () => void;
        onError?: (error: Error) => void;
      } = {},
    ) => {
      if (!organizationData) {
        toast.error("Organisation non trouvée");
        return;
      }

      const {
        successMessage = "Paramètres mis à jour avec succès",
        errorMessage = "Échec de la mise à jour des paramètres",
        onSuccess,
        onError,
      } = options;

      setIsUpdating(true);

      try {
        await updateOrganization.mutateAsync({
          id: organizationData.id,
          ...settings,
        });

        // Invalidate and refetch organization data
        await utils.organizations.getCurrent.invalidate();

        toast.success(successMessage);
        onSuccess?.();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : errorMessage;
        toast.error(errorMsg);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      } finally {
        setIsUpdating(false);
      }
    },
    [organizationData, updateOrganization, utils],
  );

  // Change tracking functions
  const registerChanges = useCallback(
    (componentId: string, changes: Record<string, any>) => {
      setPendingChanges((prev) => ({
        ...prev,
        [componentId]: changes,
      }));
    },
    [],
  );

  const clearChanges = useCallback((componentId?: string) => {
    if (componentId) {
      setPendingChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[componentId];
        return newChanges;
      });
    } else {
      setPendingChanges({});
    }
  }, []);

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;
  const allPendingChanges = Object.values(pendingChanges).reduce(
    (acc, changes) => ({ ...acc, ...changes }),
    {},
  );

  // Save all pending changes
  const saveAllChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    await saveSettings(allPendingChanges, {
      successMessage: "Tous les paramètres ont été sauvegardés avec succès",
      errorMessage: "Échec de la sauvegarde des paramètres",
      onSuccess: () => clearChanges(),
    });
  }, [hasUnsavedChanges, allPendingChanges, saveSettings, clearChanges]);

  // Invalidate data function
  const invalidateData = useCallback(async () => {
    await utils.organizations.getCurrent.invalidate();
  }, [utils]);

  const value: OrganizationSettingsContextType = {
    isUpdating,
    saveSettings,
    organizationData,
    isLoading,
    hasUnsavedChanges,
    pendingChanges: allPendingChanges,
    registerChanges,
    clearChanges,
    saveAllChanges,
    invalidateData,
  };

  return (
    <OrganizationSettingsContext.Provider value={value}>
      {children}
    </OrganizationSettingsContext.Provider>
  );
}

// Hook to use the settings context
export function useOrganizationSettings() {
  const context = useContext(OrganizationSettingsContext);

  if (!context) {
    throw new Error(
      "useOrganizationSettings must be used within OrganizationSettingsProvider",
    );
  }

  return context;
}

// Reusable hook for settings forms
export function useSettingsForm<T extends Record<string, any>>(
  defaultValues: T,
  options: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    validate?: (values: T) => string | null; // Return error message or null
  } = {},
) {
  const { saveSettings, isUpdating, organizationData } =
    useOrganizationSettings();

  const handleSave = useCallback(
    async (values: T) => {
      // Custom validation
      if (options.validate) {
        const validationError = options.validate(values);
        if (validationError) {
          toast.error(validationError);
          return;
        }
      }

      await saveSettings(values, {
        successMessage: options.successMessage,
        errorMessage: options.errorMessage,
        onSuccess: options.onSuccess,
        onError: options.onError,
      });
    },
    [saveSettings, options],
  );

  return {
    handleSave,
    isUpdating,
    organizationData,
    saveSettings,
  };
}
