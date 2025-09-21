"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { format, addDays, startOfDay } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Video,
  CheckCircle,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PatientInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: Date;
    endTime: Date;
  } | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] =
    useState<string>("");
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });
  const [notes, setNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

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
      { slug, date: selectedDate },
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

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: { startTime: Date; endTime: Date }) => {
    setSelectedSlot(slot);
  };

  const handleBooking = () => {
    if (!selectedSlot || !selectedAppointmentType || !organization) return;

    bookAppointment.mutate({
      slug,
      appointmentTypeId: selectedAppointmentType,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      patientInfo,
      notes: notes || undefined,
    });
  };

  const isFormValid =
    selectedSlot &&
    selectedAppointmentType &&
    patientInfo.firstName &&
    patientInfo.lastName &&
    patientInfo.email;

  // Use available dates from API instead of generating all dates
  const dateOptions = availableDatesData?.availableDates || [];

  // Automatically select the first available date when data loads
  useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      setSelectedDate(dateOptions[0].date);
    }
  }, [dateOptions, selectedDate]);

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
                {format(selectedSlot!.startTime, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-gray-600">
                {format(selectedSlot!.startTime, "h:mm a")} -{" "}
                {format(selectedSlot!.endTime, "h:mm a")}
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
                Un e-mail de confirmation a été envoyé à {patientInfo.email}{" "}
                avec tous les détails.
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Booking Form */}
          <div className="space-y-6">
            {/* Appointment Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sélectionner le type de rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedAppointmentType}
                  onValueChange={setSelectedAppointmentType}
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
                            style={{ backgroundColor: type.color || "#3b82f6" }}
                          />
                          <span>{type.name}</span>
                          <span className="text-gray-500">
                            ({type.defaultDurationMinutes} min)
                          </span>
                          {organization.config.onlineConferencingEnabled &&
                            type.id ===
                              organization.config
                                .onlineConferencingAppointmentTypeId && (
                              <Badge variant="secondary" className="ml-2">
                                <Video className="mr-1 h-3 w-3" />
                                En ligne
                              </Badge>
                            )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAppointmentTypeData?.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedAppointmentTypeData.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Date Selection */}
            {selectedAppointmentType && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Sélectionner la date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedDate} onValueChange={handleDateChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          datesLoading
                            ? "Chargement des dates..."
                            : "Sélectionner une date"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {datesLoading ? (
                        <SelectItem value="" disabled>
                          Chargement des dates disponibles...
                        </SelectItem>
                      ) : dateOptions.length === 0 ? (
                        <SelectItem value="" disabled>
                          Aucune date disponible
                        </SelectItem>
                      ) : (
                        dateOptions.map((option) => (
                          <SelectItem key={option.date} value={option.date}>
                            <div className="flex w-full items-center justify-between">
                              <span>{option.label}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                {option.availableSlots} créneau
                                {option.availableSlots !== 1 ? "x" : ""}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
                          variant={
                            selectedSlot?.startTime.getTime() ===
                            slot.startTime.getTime()
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handleSlotSelect(slot)}
                          className="justify-center"
                        >
                          {format(new Date(slot.startTime), "h:mm a")}
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
            {selectedSlot && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Vos informations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        value={patientInfo.firstName}
                        onChange={(e) =>
                          setPatientInfo({
                            ...patientInfo,
                            firstName: e.target.value,
                          })
                        }
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom de famille *</Label>
                      <Input
                        id="lastName"
                        value={patientInfo.lastName}
                        onChange={(e) =>
                          setPatientInfo({
                            ...patientInfo,
                            lastName: e.target.value,
                          })
                        }
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={patientInfo.email}
                      onChange={(e) =>
                        setPatientInfo({
                          ...patientInfo,
                          email: e.target.value,
                        })
                      }
                      placeholder="jean.dupont@exemple.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                    <Input
                      id="phoneNumber"
                      value={patientInfo.phoneNumber}
                      onChange={(e) =>
                        setPatientInfo({
                          ...patientInfo,
                          phoneNumber: e.target.value,
                        })
                      }
                      placeholder="+212 6 12 34 56 78"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes supplémentaires</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Toute information supplémentaire ou demande particulière..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Summary & Confirmation */}
            {selectedSlot && isFormValid && (
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
                        {selectedAppointmentTypeData?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date :</span>
                      <span className="font-medium">
                        {format(selectedSlot.startTime, "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heure :</span>
                      <span className="font-medium">
                        {format(selectedSlot.startTime, "h:mm a")} -{" "}
                        {format(selectedSlot.endTime, "h:mm a")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée :</span>
                      <span className="font-medium">
                        {selectedAppointmentTypeData?.defaultDurationMinutes}{" "}
                        minutes
                      </span>
                    </div>
                    {isOnlineAppointment && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type de réunion :</span>
                        <Badge variant="secondary" className="ml-2">
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
                        {patientInfo.firstName} {patientInfo.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email :</span>
                      <span className="font-medium">{patientInfo.email}</span>
                    </div>
                    {patientInfo.phoneNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Téléphone :</span>
                        <span className="font-medium">
                          {patientInfo.phoneNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {isOnlineAppointment && (
                    <Alert>
                      <Video className="h-4 w-4" />
                      <AlertDescription>
                        This is an online appointment. A meeting link will be
                        sent to your email after booking.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleBooking}
                    disabled={!isFormValid || bookAppointment.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {bookAppointment.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                        Booking...
                      </div>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>

                  {bookAppointment.error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {bookAppointment.error.message ||
                          "Failed to book appointment. Please try again."}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
