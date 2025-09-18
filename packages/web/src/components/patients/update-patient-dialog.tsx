"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";

// Helper function to calculate age from birth date
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

const updatePatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  birthDate: z.date().optional(),
});

type UpdatePatientFormValues = {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  age?: number;
  birthDate?: Date;
};

interface UpdatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated: () => void;
  patient: Patient | null;
}

export function UpdatePatientDialog({
  open,
  onOpenChange,
  onPatientUpdated,
  patient,
}: UpdatePatientDialogProps) {
  const form = useForm<UpdatePatientFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      age: undefined,
      birthDate: undefined,
    },
  });

  // Update form values when patient changes
  React.useEffect(() => {
    if (patient) {
      form.reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        phoneNumber: patient.phoneNumber || "",
        email: patient.email || "",
        age: patient.age || undefined,
        birthDate: patient.birthDate ? new Date(patient.birthDate) : undefined,
      });
    }
  }, [patient, form]);

  const utils = api.useUtils();

  const updatePatient = api.patients.update.useMutation({
    onSuccess: async () => {
      // Invalidate all patient-related queries to refresh the UI
      await Promise.all([
        utils.patients.getAll.invalidate(),
        utils.patients.getById.invalidate({ id: patient?.id || "" }),
      ]);

      toast.success("Patient updated successfully");
      onPatientUpdated();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to update patient:", error);
      toast.error(error.message || "Failed to update patient");
    },
  });

  function onSubmit(values: UpdatePatientFormValues) {
    if (!patient) {
      toast.error("No patient selected");
      return;
    }

    // Manual validation
    try {
      updatePatientSchema.parse(values);
      updatePatient.mutate({
        id: patient.id,
        ...values,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            form.setError(err.path[0] as keyof UpdatePatientFormValues, {
              type: "manual",
              message: err.message,
            });
          }
        });
      }
    }
  }

  if (!patient) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
          <DialogDescription>
            Update patient information. Enter the birth date and age will be
            calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.doe@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const newDate = e.target.value
                            ? new Date(e.target.value)
                            : undefined;
                          field.onChange(newDate);

                          // Automatically calculate and set age
                          if (newDate) {
                            const calculatedAge = calculateAge(newDate);
                            form.setValue("age", calculatedAge);
                          } else {
                            form.setValue("age", undefined);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age (calculated)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Calculated from birth date"
                        {...field}
                        value={field.value || ""}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updatePatient.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatePatient.isPending}>
                {updatePatient.isPending ? "Updating..." : "Update Patient"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
