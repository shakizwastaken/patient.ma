"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Clock, Save, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

// Form schema for availability settings
const availabilityFormSchema = z
  .object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format invalide (HH:MM)"),
    endTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format invalide (HH:MM)"),
    isAvailable: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isAvailable && data.startTime && data.endTime) {
        const start = data.startTime.split(":").map(Number);
        const end = data.endTime.split(":").map(Number);
        const startMinutes = (start[0] ?? 0) * 60 + (start[1] ?? 0);
        const endMinutes = (end[0] ?? 0) * 60 + (end[1] ?? 0);
        return endMinutes > startMinutes;
      }
      return true;
    },
    {
      message: "L'heure de fin doit être après l'heure de début",
      path: ["endTime"],
    },
  );

type AvailabilityFormData = z.infer<typeof availabilityFormSchema>;

const dayNames = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export function AvailabilitySettings() {
  const [selectedDay, setSelectedDay] = useState<number>(1); // Default to Monday

  const utils = api.useUtils();

  // Fetch current availability
  const { data: availability, isLoading } =
    api.availability.getAvailability.useQuery();

  // Mutation for setting availability
  const setAvailability = api.availability.setAvailability.useMutation({
    onSuccess: async () => {
      await utils.availability.getAvailability.invalidate();
      toast.success("Disponibilité mise à jour avec succès");
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  // Get current availability for selected day
  const currentDayAvailability = availability?.find(
    (av) => av.dayOfWeek === selectedDay,
  );

  const form = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      dayOfWeek: selectedDay,
      startTime: currentDayAvailability?.startTime || "09:00",
      endTime: currentDayAvailability?.endTime || "17:00",
      isAvailable: currentDayAvailability?.isAvailable ?? true,
    },
  });

  // Update form when day selection changes
  const handleDayChange = (day: number) => {
    setSelectedDay(day);
    const dayAvailability = availability?.find((av) => av.dayOfWeek === day);
    form.reset({
      dayOfWeek: day,
      startTime: dayAvailability?.startTime || "09:00",
      endTime: dayAvailability?.endTime || "17:00",
      isAvailable: dayAvailability?.isAvailable ?? true,
    });
  };

  const onSubmit = (data: AvailabilityFormData) => {
    setAvailability.mutate({
      dayOfWeek: selectedDay,
      startTime: data.startTime,
      endTime: data.endTime,
      isAvailable: data.isAvailable,
    });
  };

  const getAvailabilityStatus = (dayOfWeek: number) => {
    const dayAv = availability?.find((av) => av.dayOfWeek === dayOfWeek);
    if (!dayAv)
      return {
        status: "unset",
        text: "Non configuré",
        variant: "secondary" as const,
      };
    if (!dayAv.isAvailable)
      return {
        status: "closed",
        text: "Fermé",
        variant: "destructive" as const,
      };
    return {
      status: "open",
      text: `${dayAv.startTime} - ${dayAv.endTime}`,
      variant: "default" as const,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Configuration des horaires
            </CardTitle>
            <CardDescription>
              Définissez les horaires d'ouverture de votre cabinet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted h-8 w-48 animate-pulse rounded" />
              <div className="bg-muted h-10 w-full animate-pulse rounded" />
              <div className="bg-muted h-10 w-full animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Aperçu des horaires hebdomadaires
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des horaires configurés pour chaque jour de la
            semaine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {dayNames.map((dayName, index) => {
              const status = getAvailabilityStatus(index);
              return (
                <div
                  key={index}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedDay === index
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleDayChange(index)}
                >
                  <div className="mb-1 text-sm font-medium">{dayName}</div>
                  <Badge variant={status.variant} className="text-xs">
                    {status.text}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration du {dayNames[selectedDay]}</CardTitle>
          <CardDescription>
            Définissez les horaires d'ouverture pour le{" "}
            {dayNames[selectedDay]?.toLowerCase() ?? "jour sélectionné"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Available Toggle */}
              <FormField
                control={form.control}
                name="isAvailable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Cabinet ouvert
                      </FormLabel>
                      <div className="text-muted-foreground text-sm">
                        Activez pour permettre les rendez-vous ce jour-là
                      </div>
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

              {/* Time Configuration - Only show if available */}
              {form.watch("isAvailable") && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heure d'ouverture</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="h-10" />
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
                          <FormLabel>Heure de fermeture</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={setAvailability.isPending}
                  className="min-w-32"
                >
                  {setAvailability.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Configurez rapidement des horaires standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Set Monday-Friday 9-17
                const weekdays = [1, 2, 3, 4, 5];
                weekdays.forEach((day) => {
                  setAvailability.mutate({
                    dayOfWeek: day,
                    startTime: "09:00",
                    endTime: "17:00",
                    isAvailable: true,
                  });
                });
                toast.success(
                  "Horaires de semaine configurés (Lun-Ven 9h-17h)",
                );
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Semaine standard (9h-17h)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Close weekends
                const weekends = [0, 6]; // Sunday, Saturday
                weekends.forEach((day) => {
                  setAvailability.mutate({
                    dayOfWeek: day,
                    startTime: "00:00",
                    endTime: "00:00",
                    isAvailable: false,
                  });
                });
                toast.success("Week-ends fermés");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Fermer week-ends
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Set all days closed
                for (let day = 0; day < 7; day++) {
                  setAvailability.mutate({
                    dayOfWeek: day,
                    startTime: "00:00",
                    endTime: "00:00",
                    isAvailable: false,
                  });
                }
                toast.success("Tous les jours fermés");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Tout fermer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
