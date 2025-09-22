"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Mail, Phone, User, Edit, Plus } from "lucide-react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { CreateAppointmentDialog } from "@/components/calendar/create-appointment-dialog";
import { AppointmentDetailsDialog } from "@/components/calendar/appointment-details-dialog";
import { UpdatePatientDialog } from "./update-patient-dialog";
import { PatientNotes } from "./patient-notes";
import type { Patient } from "@/types/patient";

type Appointment = {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  type: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

interface PatientDetailsViewProps {
  patientId: string;
}

export function PatientDetailsView({ patientId }: PatientDetailsViewProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<Appointment | null>(null);

  // Fetch patient data
  const {
    data: patient,
    isLoading: patientLoading,
    refetch: refetchPatient,
  } = api.patients.getById.useQuery({ id: patientId });

  // Fetch patient's appointments
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = api.appointments.getAll.useQuery({ patientId });

  // Get upcoming appointments (next 30 days)
  const upcomingAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.startTime);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return (
      aptDate >= now &&
      aptDate <= thirtyDaysFromNow &&
      apt.status === "scheduled"
    );
  });

  // Get recent appointments (last 30 days)
  const recentAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.startTime);
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return aptDate >= thirtyDaysAgo && aptDate <= now;
  });

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  if (patientLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="bg-muted h-6 w-48 animate-pulse rounded" />
                <div className="bg-muted h-4 w-32 animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="bg-muted h-4 w-4 animate-pulse rounded" />
                      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <div className="bg-muted h-6 w-32 animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-muted h-16 animate-pulse rounded"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <User className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="text-lg font-medium">Patient not found</h3>
          <p className="text-muted-foreground">
            The patient you're looking for doesn't exist.
          </p>
          <Button className="mt-4" onClick={() => router.push("/patients")}>
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-muted-foreground">
            Patient ID: {patient.id.slice(0, 8)}...
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/patients")}>
            Back to Patients
          </Button>
          <Button variant="outline" onClick={() => setUpdateDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Patient
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Patient Information */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Personal and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">Name:</span>
                <span>
                  {patient.firstName} {patient.lastName}
                </span>
              </div>

              {patient.email && (
                <div className="flex items-center gap-3">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <span className="font-medium">Email:</span>
                  <a
                    href={`mailto:${patient.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {patient.email}
                  </a>
                </div>
              )}

              {patient.phoneNumber && (
                <div className="flex items-center gap-3">
                  <Phone className="text-muted-foreground h-4 w-4" />
                  <span className="font-medium">Phone:</span>
                  <a
                    href={`tel:${patient.phoneNumber}`}
                    className="text-blue-600 hover:underline"
                  >
                    {patient.phoneNumber}
                  </a>
                </div>
              )}

              {patient.age && (
                <div className="flex items-center gap-3">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span className="font-medium">Age:</span>
                  <span>{patient.age} years old</span>
                </div>
              )}

              {patient.birthDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span className="font-medium">Birth Date:</span>
                  <span>
                    {format(new Date(patient.birthDate), "MMMM do, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Appointments */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAppointments.length === 0 ? (
                <div className="py-6 text-center">
                  <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">
                    No recent appointments
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAppointments.slice(0, 5).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border p-3"
                      onClick={() => handleAppointmentClick(appointment)}
                    >
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="font-medium">{appointment.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {appointment.type.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={
                              appointment.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {appointment.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {format(
                            new Date(appointment.startTime),
                            "MMM do, yyyy 'at' h:mm a",
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentAppointments.length > 5 && (
                    <p className="text-muted-foreground text-center text-sm">
                      +{recentAppointments.length - 5} more appointments
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Notes */}
          <div className="mt-6">
            <PatientNotes patientId={patientId} />
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="py-6 text-center">
                  <Clock className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">
                    No upcoming appointments
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="hover:bg-muted/50 cursor-pointer rounded-lg border p-3"
                      onClick={() => handleAppointmentClick(appointment)}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="text-sm font-medium">
                          {appointment.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {appointment.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {format(
                          new Date(appointment.startTime),
                          "MMM do 'at' h:mm a",
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAppointmentCreated={() => {
          // Data will be automatically refreshed via TRPC invalidation
        }}
        selectedDate={new Date()}
        preSelectedPatientId={patientId}
      />

      <UpdatePatientDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        onPatientUpdated={() => {
          // Data will be automatically refreshed via TRPC invalidation
        }}
        patient={patient}
      />

      <AppointmentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        appointment={selectedAppointment}
        onAppointmentUpdated={() => {
          // Data will be automatically refreshed via TRPC invalidation
        }}
        onAppointmentDeleted={() => {
          // Data will be automatically refreshed via TRPC invalidation
        }}
      />
    </div>
  );
}
