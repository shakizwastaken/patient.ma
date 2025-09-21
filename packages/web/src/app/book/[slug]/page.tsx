"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { format, addDays, startOfDay } from "date-fns";
import { Calendar, Clock, User, Mail, Phone, Video, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: Date;
    endTime: Date;
  } | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<string>("");
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
  const { data: organization, isLoading: orgLoading, error: orgError } =
    api.publicBooking.getOrganizationBySlug.useQuery({ slug });

  // Fetch available slots for selected date
  const { data: slotsData, isLoading: slotsLoading } =
    api.publicBooking.getAvailableSlots.useQuery(
      { slug, date: selectedDate },
      { enabled: !!organization }
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

  // Generate date options for the next 30 days
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE, MMMM d"),
    };
  });

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (orgError || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Organization Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              The organization you're looking for doesn't exist or public booking is not enabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Booking Confirmed!</CardTitle>
            <CardDescription>
              Your appointment has been successfully booked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="font-medium">
                {format(selectedSlot!.startTime, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-gray-600">
                {format(selectedSlot!.startTime, "h:mm a")} - {format(selectedSlot!.endTime, "h:mm a")}
              </p>
              {meetingLink && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Online Meeting</span>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <a href={meetingLink} target="_blank" rel="noopener noreferrer">
                      Join Meeting
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <Alert>
              <AlertDescription>
                A confirmation email has been sent to {patientInfo.email} with all the details.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedAppointmentTypeData = organization.appointmentTypes.find(
    (type) => type.id === selectedAppointmentType
  );

  const isOnlineAppointment = 
    organization.config.onlineConferencingEnabled &&
    selectedAppointmentTypeData?.id === organization.config.onlineConferencingAppointmentTypeId;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          {organization.logo && (
            <img
              src={organization.logo}
              alt={organization.name}
              className="w-16 h-16 mx-auto mb-4 rounded-full object-cover"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900">{organization.title}</h1>
          {organization.description && (
            <p className="text-gray-600 mt-2">{organization.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <div className="space-y-6">
            {/* Appointment Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Select Appointment Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedAppointmentType} onValueChange={setSelectedAppointmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {organization.appointmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color || "#3b82f6" }}
                          />
                          <span>{type.name}</span>
                          <span className="text-gray-500">({type.defaultDurationMinutes} min)</span>
                          {organization.config.onlineConferencingEnabled &&
                            type.id === organization.config.onlineConferencingAppointmentTypeId && (
                              <Badge variant="secondary" className="ml-2">
                                <Video className="w-3 h-3 mr-1" />
                                Online
                              </Badge>
                            )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAppointmentTypeData?.description && (
                  <p className="text-sm text-gray-600 mt-2">
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
                    <Calendar className="w-5 h-5" />
                    Select Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedDate} onValueChange={handleDateChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                    <Clock className="w-5 h-5" />
                    Select Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {slotsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : slotsData?.slots.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No available slots for this date. Please select another date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {slotsData?.slots.map((slot, index) => (
                        <Button
                          key={index}
                          variant={
                            selectedSlot?.startTime.getTime() === slot.startTime.getTime()
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
                    <User className="w-5 h-5" />
                    Your Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={patientInfo.firstName}
                        onChange={(e) =>
                          setPatientInfo({ ...patientInfo, firstName: e.target.value })
                        }
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={patientInfo.lastName}
                        onChange={(e) =>
                          setPatientInfo({ ...patientInfo, lastName: e.target.value })
                        }
                        placeholder="Doe"
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
                        setPatientInfo({ ...patientInfo, email: e.target.value })
                      }
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={patientInfo.phoneNumber}
                      onChange={(e) =>
                        setPatientInfo({ ...patientInfo, phoneNumber: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional information or special requests..."
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
                  <CardTitle>Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Appointment Type:</span>
                      <span className="font-medium">{selectedAppointmentTypeData?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {format(selectedSlot.startTime, "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">
                        {format(selectedSlot.startTime, "h:mm a")} - {format(selectedSlot.endTime, "h:mm a")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedAppointmentTypeData?.defaultDurationMinutes} minutes</span>
                    </div>
                    {isOnlineAppointment && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Meeting Type:</span>
                        <Badge variant="secondary" className="ml-2">
                          <Video className="w-3 h-3 mr-1" />
                          Online Meeting
                        </Badge>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Patient:</span>
                      <span className="font-medium">
                        {patientInfo.firstName} {patientInfo.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{patientInfo.email}</span>
                    </div>
                    {patientInfo.phoneNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{patientInfo.phoneNumber}</span>
                      </div>
                    )}
                  </div>

                  {isOnlineAppointment && (
                    <Alert>
                      <Video className="w-4 h-4" />
                      <AlertDescription>
                        This is an online appointment. A meeting link will be sent to your email after booking.
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Booking...
                      </div>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>

                  {bookAppointment.error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {bookAppointment.error.message || "Failed to book appointment. Please try again."}
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
