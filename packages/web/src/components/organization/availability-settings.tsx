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
import { Label } from "@/components/ui/label";
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
import { authClient } from "@acme/shared/client";
import {
  getTimezoneInfo,
  formatInTimezone,
  COMMON_TIMEZONES,
} from "@/lib/timezone";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

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
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  const utils = api.useUtils();
  const { data: activeOrganization } = authClient.useActiveOrganization();

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

  // Function for updating organization timezone
  const handleUpdateTimezone = async (newTimezone: string) => {
    try {
      // Store timezone in metadata until API supports timezone field directly
      const currentMetadata = activeOrganization?.metadata || {};
      await authClient.organization.update({
        organizationId: activeOrganization?.id || "",
        data: {
          metadata: {
            ...currentMetadata,
            timezone: newTimezone,
          },
        },
      });
      toast.success("Fuseau horaire mis à jour avec succès");
    } catch (error: any) {
      toast.error(
        error.message || "Erreur lors de la mise à jour du fuseau horaire",
      );
    }
  };

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

  // Get timezone info - check both timezone field and metadata
  const organizationTimezone =
    (activeOrganization as any)?.timezone || 
    activeOrganization?.metadata?.timezone || 
    "Africa/Casablanca";
  const timezoneInfo = getTimezoneInfo(organizationTimezone);

  return (
    <div className="space-y-6">
      {/* Timezone Information */}
      {activeOrganization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Fuseau horaire du cabinet
            </CardTitle>
            <CardDescription>
              Les horaires sont configurés dans le fuseau horaire de votre
              cabinet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Timezone Display */}
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {organizationTimezone}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {timezoneInfo.offset} • {timezoneInfo.abbreviation}
              </span>
              <span className="text-muted-foreground text-sm">
                Heure actuelle:{" "}
                {formatInTimezone(new Date(), organizationTimezone, "HH:mm")}
              </span>
            </div>

            {/* Timezone Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Modifier le fuseau horaire
              </Label>
              <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={timezoneOpen}
                    className="w-full justify-between"
                  >
                    {organizationTimezone
                      ? COMMON_TIMEZONES.find(
                          (tz) => tz.value === organizationTimezone,
                        )?.label
                      : "Sélectionnez un fuseau horaire..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un fuseau horaire..." />
                    <CommandList>
                      <CommandEmpty>Aucun fuseau horaire trouvé.</CommandEmpty>
                      <CommandGroup>
                        {COMMON_TIMEZONES.map((tz) => {
                          const tzInfo = getTimezoneInfo(tz.value);
                          return (
                            <CommandItem
                              key={tz.value}
                              value={tz.value}
                              onSelect={(currentValue) => {
                                if (currentValue !== organizationTimezone) {
                                  handleUpdateTimezone(currentValue);
                                }
                                setTimezoneOpen(false);
                              }}
                            >
                              <div className="flex w-full flex-col">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {tz.label}
                                  </span>
                                  <Check
                                    className={`ml-auto h-4 w-4 ${
                                      organizationTimezone === tz.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                </div>
                                <span className="text-muted-foreground text-xs">
                                  {tz.country} • {tzInfo.offset} •{" "}
                                  {tzInfo.abbreviation}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-muted-foreground text-xs">
                Le fuseau horaire utilisé pour les horaires d'ouverture et les
                rendez-vous
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
