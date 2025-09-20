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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Loader2, Video } from "lucide-react";

const createAppointmentSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  startTime: z.string().min(1, "L'heure de début est requise"),
  type: z.enum([
    "consultation",
    "follow_up",
    "emergency",
    "checkup",
    "procedure",
  ]),
  appointmentTypeId: z.string().uuid().optional(),
  patientId: z.string().min(1, "Le patient est requis"),
  notes: z.string().optional(),
});

type CreateAppointmentFormValues = {
  title: string;
  description?: string;
  startTime: string;
  type: "consultation" | "follow_up" | "emergency" | "checkup" | "procedure";
  appointmentTypeId?: string;
  patientId: string;
  notes?: string;
};

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppointmentCreated: () => void;
  selectedDate: Date;
  preSelectedPatientId?: string;
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  onAppointmentCreated,
  selectedDate,
  preSelectedPatientId,
}: CreateAppointmentDialogProps) {
  const form = useForm<CreateAppointmentFormValues>({
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      type: "consultation",
      appointmentTypeId: "",
      patientId: "",
      notes: "",
    },
  });

  // Fetch patients for the dropdown
  const { data: patients = [] } = api.patients.getAll.useQuery();

  // Fetch appointment types for the dropdown
  const { data: appointmentTypes = [] } =
    api.appointmentTypes.getAppointmentTypes.useQuery();

  // Fetch online conferencing config to show online meeting indicator
  const { data: appointmentConfig } =
    api.availability.getAppointmentConfig.useQuery();

  const utils = api.useUtils();

  // Handle appointment type selection
  const handleAppointmentTypeChange = (appointmentTypeId: string) => {
    form.setValue("appointmentTypeId", appointmentTypeId);
  };

  const createAppointment = api.appointments.create.useMutation({
    onSuccess: async (data) => {
      console.log("Appointment created successfully:", data);
      // Invalidate all appointment-related queries to refresh the UI
      await Promise.all([
        utils.appointments.getAll.invalidate(),
        utils.appointments.getByDateRange.invalidate(),
        utils.appointments.getUpcoming.invalidate(),
      ]);

      onAppointmentCreated();
      onOpenChange(false);
      form.reset();
      toast.success("Rendez-vous créé avec succès");
    },
    onError: (error) => {
      console.error("Failed to create appointment:", error);
      toast.error(error.message || "Échec de la création du rendez-vous");
    },
  });

  // Set default date and patient when dialog opens
  React.useEffect(() => {
    if (open && selectedDate) {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const currentTime = new Date();
      const startTime = new Date(selectedDate);
      startTime.setHours(currentTime.getHours() + 1, 0, 0, 0);

      form.setValue(
        "startTime",
        `${dateStr}T${startTime.toTimeString().slice(0, 5)}`,
      );

      if (preSelectedPatientId) {
        form.setValue("patientId", preSelectedPatientId);
      }
    }
  }, [open, selectedDate, preSelectedPatientId, form]);

  function onSubmit(values: CreateAppointmentFormValues) {
    // Prevent multiple submissions
    if (createAppointment.isPending) {
      return;
    }

    // Manual validation
    try {
      createAppointmentSchema.parse(values);

      // Convert string times to Date objects
      const startTime = new Date(values.startTime);

      // Calculate end time based on appointment type duration
      let durationMinutes = 30; // Default duration
      if (values.appointmentTypeId) {
        const selectedType = appointmentTypes.find(
          (type) => type.id === values.appointmentTypeId,
        );
        if (selectedType) {
          durationMinutes = selectedType.defaultDurationMinutes;
        }
      }

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      console.log("Submitting appointment:", {
        ...values,
        startTime,
        endTime,
        durationMinutes,
      });

      createAppointment.mutate({
        ...values,
        startTime,
        endTime,
      });
    } catch (error) {
      console.error("Form validation error:", error);
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            form.setError(err.path[0] as keyof CreateAppointmentFormValues, {
              type: "manual",
              message: err.message,
            });
          }
        });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Programmer un nouveau rendez-vous</DialogTitle>
          <DialogDescription>
            Créer un nouveau rendez-vous pour le{" "}
            {selectedDate.toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Consultation avec Dr. Smith"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heure de début *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de rendez-vous</FormLabel>
                  <Select
                    onValueChange={handleAppointmentTypeChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type de rendez-vous" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appointmentTypes
                        .filter((type) => type.isActive)
                        .map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center">
                              <div
                                className="mr-2 h-3 w-3 rounded"
                                style={{
                                  backgroundColor: type.color || "#3b82f6",
                                }}
                              />
                              <span>{type.name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                ({type.defaultDurationMinutes} min)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {field.value && form.getValues("startTime") && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-sm">
                        Durée:{" "}
                        {appointmentTypes.find((t) => t.id === field.value)
                          ?.defaultDurationMinutes || 30}{" "}
                        minutes
                      </p>
                      {appointmentConfig?.onlineConferencingEnabled &&
                        field.value ===
                          appointmentConfig?.onlineConferencingAppointmentTypeId && (
                          <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-green-800">
                            <Video className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Rendez-vous en ligne - Un lien Google Meet sera
                              créé
                            </span>
                          </div>
                        )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brève description du rendez-vous"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes ou instructions supplémentaires"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createAppointment.isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createAppointment.isPending}>
                {createAppointment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createAppointment.isPending
                  ? "Création..."
                  : "Créer le rendez-vous"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
