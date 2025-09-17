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
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  type: z.enum([
    "consultation",
    "follow_up",
    "emergency",
    "checkup",
    "procedure",
  ]),
  patientId: z.string().min(1, "Patient is required"),
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

  const createAppointment = api.appointments.create.useMutation({
    onSuccess: () => {
      onAppointmentCreated();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Failed to create appointment:", error);
      toast.error(error.message || "Failed to create appointment");
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
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for {selectedDate.toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Consultation with Dr. Smith"
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
                        <SelectValue placeholder="Select a patient" />
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
                    <FormLabel>Start Time *</FormLabel>
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
                    <FormLabel>End Time *</FormLabel>
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
                  <FormLabel>Appointment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="checkup">Checkup</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
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
                      placeholder="Brief description of the appointment"
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
                      placeholder="Additional notes or instructions"
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
                Cancel
              </Button>
              <Button type="submit" disabled={createAppointment.isPending}>
                {createAppointment.isPending
                  ? "Creating..."
                  : "Create Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
