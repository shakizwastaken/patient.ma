"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { format, addDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  Video,
  CheckCircle,
} from "lucide-react";
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  FormDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Form validation schema
const bookingFormSchema = z.object({
  appointmentType: z.string().min(1, {
    message: "Veuillez sélectionner un type de rendez-vous.",
  }),
  date: z.date({
    required_error: "Veuillez sélectionner une date.",
  }),
  firstName: z.string().min(2, {
    message: "Le prénom doit contenir au moins 2 caractères.",
  }),
  lastName: z.string().min(2, {
    message: "Le nom de famille doit contenir au moins 2 caractères.",
  }),
  email: z.string().email({
    message: "Veuillez entrer une adresse e-mail valide.",
  }),
  phoneNumber: z.string().optional(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  // Form setup with zod validation
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onChange",
    defaultValues: {
      appointmentType: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      notes: "",
    },
  });

  const selectedDate = form.watch("date");
  const selectedAppointmentType = form.watch("appointmentType");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    startTime: Date;
    endTime: Date;
  } | null>(null);

  // Fetch organization details
  const {
    data: organization,
    isLoading: orgLoading,
    error: orgError,
  } = api.publicBooking.getOrganizationBySlug.useQuery({ slug });

  // Fetch available dates
  const { data: availableDatesData, isLoading: datesLoading } =
    api.publicBooking.getAvailableDates.useQuery(
      { slug },
      { enabled: !!organization },
    );

  // Fetch available slots for selected date
  const { data: slotsData, isLoading: slotsLoading } =
    api.publicBooking.getAvailableSlots.useQuery(
      {
        slug,
        date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
      },
      { enabled: !!organization && !!selectedDate },
    );

  // Book appointment mutation
  const bookAppointment = api.publicBooking.bookAppointment.useMutation({
    onSuccess: (result) => {
      setBookingSuccess(true);
      setMeetingLink(result.meetingLink);
    },
    onError: (error) => {
      console.error("Booking error:", error);
    },
  });

  const handleSlotSelect = (slot: { startTime: Date; endTime: Date }) => {
    setSelectedTimeSlot(slot);
  };

  const onSubmit = (values: BookingFormValues) => {
    if (!selectedTimeSlot || !organization) return;

    bookAppointment.mutate({
      slug,
      appointmentTypeId: values.appointmentType,
      startTime: selectedTimeSlot.startTime,
      endTime: selectedTimeSlot.endTime,
      patientInfo: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber || "",
      },
      notes: values.notes || undefined,
    });
  };

  // Filter available dates for calendar
  const availableDates =
    availableDatesData?.availableDates?.map((d) => new Date(d.date)) || [];

  const isDateAvailable = (date: Date) => {
    return availableDates.some(
      (availableDate) =>
        format(availableDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
    );
  };

  if (orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (orgError || !organization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">
              Organisation introuvable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              L'organisation que vous recherchez n'existe pas ou la réservation
              publique n'est pas activée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">
              Réservation confirmée !
            </CardTitle>
            <CardDescription>
              Votre rendez-vous a été réservé avec succès.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="font-medium">
                {selectedTimeSlot &&
                  format(selectedTimeSlot.startTime, "EEEE, MMMM d, yyyy", {
                    locale: fr,
                  })}
              </p>
              <p className="text-gray-600">
                {selectedTimeSlot && (
                  <>
                    {format(selectedTimeSlot.startTime, "HH:mm")} -{" "}
                    {format(selectedTimeSlot.endTime, "HH:mm")}
                  </>
                )}
              </p>
              {meetingLink && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      Réunion en ligne
                    </span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <a
                      href={meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Rejoindre la réunion
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <Alert>
              <AlertDescription>
                {meetingLink ? (
                  <>
                    Une invitation Google Calendar et un e-mail de confirmation
                    ont été envoyés à {form.getValues("email")}. Vérifiez
                    également votre dossier spam si vous ne recevez pas les
                    notifications.
                  </>
                ) : (
                  <>
                    Un e-mail de confirmation a été envoyé à{" "}
                    {form.getValues("email")} avec tous les détails. Vérifiez
                    également votre dossier spam si vous ne recevez pas
                    l'e-mail.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedAppointmentTypeData = organization.appointmentTypes.find(
    (type) => type.id === selectedAppointmentType,
  );

  const isOnlineAppointment =
    organization.config.onlineConferencingEnabled &&
    selectedAppointmentTypeData?.id ===
      organization.config.onlineConferencingAppointmentTypeId;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          {organization.logo && (
            <img
              src={organization.logo}
              alt={organization.name}
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900">
            {organization.title}
          </h1>
          {organization.description && (
            <p className="mt-2 text-gray-600">{organization.description}</p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Booking Form */}
              <div className="space-y-6">
                {/* Appointment Type Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Sélectionner le type de rendez-vous
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="appointmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir le type de rendez-vous" />
                              </SelectTrigger>
                              <SelectContent>
                                {organization.appointmentTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-3 w-3 rounded-full"
                                        style={{
                                          backgroundColor:
                                            type.color || "#3b82f6",
                                        }}
                                      />
                                      <span>{type.name}</span>
                                      <span className="text-gray-500">
                                        ({type.defaultDurationMinutes} min)
                                      </span>
                                      {organization.config
                                        .onlineConferencingEnabled &&
                                        type.id ===
                                          organization.config
                                            .onlineConferencingAppointmentTypeId && (
                                          <Badge
                                            variant="secondary"
                                            className="ml-2"
                                          >
                                            <Video className="mr-1 h-3 w-3" />
                                            En ligne
                                          </Badge>
                                        )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedAppointmentType && (
                      <FormDescription className="mt-2">
                        {
                          organization.appointmentTypes.find(
                            (t) => t.id === selectedAppointmentType,
                          )?.description
                        }
                      </FormDescription>
                    )}
                  </CardContent>
                </Card>

                {/* Date Selection */}
                {selectedAppointmentType && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Sélectionner la date
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: fr })
                                    ) : (
                                      <span>Sélectionner une date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    // Reset time slot when date changes
                                    setSelectedTimeSlot(null);
                                  }}
                                  disabled={(date) =>
                                    date < new Date() || !isDateAvailable(date)
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              Sélectionnez une date disponible pour votre
                              rendez-vous.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Time Slot Selection */}
                {selectedDate && selectedAppointmentType && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Sélectionner l'heure
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {slotsLoading ? (
                        <div className="py-4 text-center">
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        </div>
                      ) : slotsData?.slots.length === 0 ? (
                        <p className="py-4 text-center text-gray-500">
                          Aucun créneau disponible pour cette date. Veuillez
                          sélectionner une autre date.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {slotsData?.slots.map((slot, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant={
                                selectedTimeSlot?.startTime.getTime() ===
                                slot.startTime.getTime()
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => handleSlotSelect(slot)}
                              className="justify-center"
                            >
                              {format(new Date(slot.startTime), "HH:mm")}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Patient Information */}
              <div className="space-y-6">
                {selectedTimeSlot && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Vos informations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prénom *</FormLabel>
                              <FormControl>
                                <Input placeholder="Jean" {...field} />
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
                              <FormLabel>Nom de famille *</FormLabel>
                              <FormControl>
                                <Input placeholder="Dupont" {...field} />
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
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="jean.dupont@exemple.com"
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
                            <FormLabel>Numéro de téléphone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+212 6 12 34 56 78"
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
                            <FormLabel>Notes supplémentaires</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Toute information supplémentaire ou demande particulière..."
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Booking Summary & Confirmation */}
                {selectedTimeSlot && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Récapitulatif de la réservation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Type de rendez-vous :
                          </span>
                          <span className="font-medium">
                            {
                              organization.appointmentTypes.find(
                                (t) => t.id === selectedAppointmentType,
                              )?.name
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date :</span>
                          <span className="font-medium">
                            {selectedDate &&
                              format(selectedDate, "EEEE, MMMM d, yyyy", {
                                locale: fr,
                              })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Heure :</span>
                          <span className="font-medium">
                            {format(selectedTimeSlot.startTime, "HH:mm")} -{" "}
                            {format(selectedTimeSlot.endTime, "HH:mm")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Durée :</span>
                          <span className="font-medium">
                            {
                              organization.appointmentTypes.find(
                                (t) => t.id === selectedAppointmentType,
                              )?.defaultDurationMinutes
                            }{" "}
                            minutes
                          </span>
                        </div>
                        {organization.config.onlineConferencingEnabled &&
                          organization.appointmentTypes.find(
                            (t) => t.id === selectedAppointmentType,
                          )?.id ===
                            organization.config
                              .onlineConferencingAppointmentTypeId && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Type de réunion :
                              </span>
                              <Badge variant="secondary">
                                <Video className="mr-1 h-3 w-3" />
                                Réunion en ligne
                              </Badge>
                            </div>
                          )}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Patient :</span>
                          <span className="font-medium">
                            {form.watch("firstName")} {form.watch("lastName")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email :</span>
                          <span className="font-medium">
                            {form.watch("email")}
                          </span>
                        </div>
                        {form.watch("phoneNumber") && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Téléphone :</span>
                            <span className="font-medium">
                              {form.watch("phoneNumber")}
                            </span>
                          </div>
                        )}
                      </div>

                      {organization.config.onlineConferencingEnabled &&
                        organization.appointmentTypes.find(
                          (t) => t.id === selectedAppointmentType,
                        )?.id ===
                          organization.config
                            .onlineConferencingAppointmentTypeId && (
                          <Alert>
                            <Video className="h-4 w-4" />
                            <AlertDescription>
                              Il s'agit d'un rendez-vous en ligne. Un lien de
                              réunion sera envoyé à votre e-mail après la
                              réservation.
                            </AlertDescription>
                          </Alert>
                        )}

                      <Button
                        type="submit"
                        disabled={bookAppointment.isPending}
                        className="w-full"
                        size="lg"
                      >
                        {bookAppointment.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                            Réservation...
                          </div>
                        ) : (
                          "Confirmer la réservation"
                        )}
                      </Button>

                      {bookAppointment.error && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            {bookAppointment.error.message ||
                              "Échec de la réservation. Veuillez réessayer."}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
