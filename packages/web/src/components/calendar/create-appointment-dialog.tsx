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

const createAppointmentSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  startTime: z.string().min(1, "L'heure de début est requise"),
  endTime: z.string().min(1, "L'heure de fin est requise"),
  type: z.enum([
    "consultation",
    "follow_up",
    "emergency",
    "checkup",
    "procedure",
  ]),
  patientId: z.string().min(1, "Le patient est requis"),
  notes: z.string().optional(),
});

type CreateAppointmentFormValues = {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: "consultation" | "follow_up" | "emergency" | "checkup" | "procedure";
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
      endTime: "",
      type: "consultation",
      patientId: "",
      notes: "",
    },
  });

  // Fetch patients for the dropdown
  const { data: patients = [] } = api.patients.getAll.useQuery();

  const utils = api.useUtils();

  const createAppointment = api.appointments.create.useMutation({
    onSuccess: async () => {
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
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      form.setValue(
        "startTime",
        `${dateStr}T${startTime.toTimeString().slice(0, 5)}`,
      );
      form.setValue(
        "endTime",
        `${dateStr}T${endTime.toTimeString().slice(0, 5)}`,
      );

      if (preSelectedPatientId) {
        form.setValue("patientId", preSelectedPatientId);
      }
    }
  }, [open, selectedDate, preSelectedPatientId, form]);

  function onSubmit(values: CreateAppointmentFormValues) {
    // Manual validation
    try {
      createAppointmentSchema.parse(values);

      // Convert string times to Date objects
      const startTime = new Date(values.startTime);
      const endTime = new Date(values.endTime);

      createAppointment.mutate({
        ...values,
        startTime,
        endTime,
      });
    } catch (error) {
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
            Créer un nouveau rendez-vous pour le {selectedDate.toLocaleDateString()}.
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

            <div className="grid grid-cols-2 gap-4">
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
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de fin *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de rendez-vous</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow_up">Suivi</SelectItem>
                      <SelectItem value="checkup">Contrôle</SelectItem>
                      <SelectItem value="procedure">Procédure</SelectItem>
                      <SelectItem value="emergency">Urgence</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
