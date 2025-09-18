"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus } from "lucide-react";
import { api } from "@/trpc/react";
import { CreateAppointmentDialog } from "@/components/calendar/create-appointment-dialog";
import { AppointmentDetailsDialog } from "@/components/calendar/appointment-details-dialog";
import { toast } from "sonner";
import { STATUS_COLORS, TYPE_COLORS } from "@/types/appointment";

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

interface PatientAppointmentsProps {
  patientId: string;
  patientName: string;
}

export function PatientAppointments({
  patientId,
  patientName,
}: PatientAppointmentsProps) {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<Appointment | null>(null);

  // Fetch appointments for this patient
  const {
    data: appointments = [],
    isLoading,
    refetch,
  } = api.appointments.getAll.useQuery({
    patientId,
  });

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

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground text-center">
              Loading appointments...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="py-6 text-center">
              <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground mb-4">
                No upcoming appointments
              </p>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Schedule First Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments
                .sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime(),
                )
                .slice(0, 5)
                .map((appointment) => (
                  <div
                    key={appointment.id}
                    className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Calendar className="text-muted-foreground h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {appointment.title}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(appointment.startTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`text-xs ${STATUS_COLORS[appointment.status as keyof typeof STATUS_COLORS]}`}
                      >
                        {appointment.status}
                      </Badge>
                      <Badge
                        className={`text-xs ${TYPE_COLORS[appointment.type as keyof typeof TYPE_COLORS]}`}
                      >
                        {appointment.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              {upcomingAppointments.length > 5 && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" size="sm">
                    View all {upcomingAppointments.length} upcoming appointments
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Appointments */}
      {recentAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAppointments
                .sort(
                  (a, b) =>
                    new Date(b.startTime).getTime() -
                    new Date(a.startTime).getTime(),
                )
                .slice(0, 3)
                .map((appointment) => (
                  <div
                    key={appointment.id}
                    className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Clock className="text-muted-foreground h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {appointment.title}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(appointment.startTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`text-xs ${STATUS_COLORS[appointment.status as keyof typeof STATUS_COLORS]}`}
                      >
                        {appointment.status}
                      </Badge>
                      <Badge
                        className={`text-xs ${TYPE_COLORS[appointment.type as keyof typeof TYPE_COLORS]}`}
                      >
                        {appointment.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              {recentAppointments.length > 3 && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" size="sm">
                    View all recent appointments
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
