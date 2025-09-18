"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, User, Calendar, ArrowLeft } from "lucide-react";
import { api } from "@/trpc/react";
import { CreateAppointmentDialog } from "./create-appointment-dialog";
import { AppointmentDetailsDialog } from "./appointment-details-dialog";
import { toast } from "sonner";
import { format, isToday, isYesterday, isTomorrow } from "date-fns";
import { useRouter } from "next/navigation";

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

interface DateDetailsViewProps {
  selectedDate: Date;
}

// Helper function to determine event color based on appointment type and status
function getEventColor(type: string, status: string): string {
  if (status === "cancelled" || status === "no_show") {
    return "bg-gray-100 text-gray-600 border-gray-300"; // Gray for cancelled/no-show
  }

  switch (type) {
    case "emergency":
      return "bg-red-100 text-red-600 border-red-300"; // Red for emergency
    case "consultation":
      return "bg-blue-100 text-blue-600 border-blue-300";
    case "follow_up":
      return "bg-purple-100 text-purple-600 border-purple-300";
    case "checkup":
      return "bg-green-100 text-green-600 border-green-300";
    case "procedure":
      return "bg-purple-100 text-purple-600 border-purple-300";
    default:
      return "bg-blue-100 text-blue-600 border-blue-300";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "no_show":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function DateDetailsView({ selectedDate }: DateDetailsViewProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<Appointment | null>(null);

  // Calculate start and end of the selected date
  const startDate = React.useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [selectedDate]);

  const endDate = React.useMemo(() => {
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [selectedDate]);

  // Fetch appointments for the selected date
  const {
    data: appointments = [],
    isLoading,
    refetch,
  } = api.appointments.getByDateRange.useQuery({
    startDate,
    endDate,
  });

  // Sort appointments by start time
  const sortedAppointments = React.useMemo(() => {
    return [...appointments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [appointments]);

  const handleEventClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMMM do, yyyy");
  };

  return (
    <div className="space-y-6">
      {/* Back to Calendar Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calendar
        </Button>
      </div>

      {/* Date Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {getDateLabel(selectedDate)}
              </CardTitle>
              <CardDescription>
                {sortedAppointments.length} appointment
                {sortedAppointments.length !== 1 ? "s" : ""} scheduled
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Appointments List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-muted-foreground">Loading appointments...</div>
          </CardContent>
        </Card>
      ) : sortedAppointments.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-center">
              <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">
                No appointments scheduled
              </h3>
              <p className="text-muted-foreground mb-4">
                This day is free. You can schedule a new appointment.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {appointment.title}
                      </h3>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getEventColor(
                          appointment.type,
                          appointment.status,
                        )}
                      >
                        {appointment.type.replace("_", " ")}
                      </Badge>
                    </div>

                    <div className="text-muted-foreground mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {appointment.patient.firstName}{" "}
                        {appointment.patient.lastName}
                      </span>
                    </div>

                    <div className="text-muted-foreground mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(appointment.startTime), "h:mm a")} -{" "}
                        {format(new Date(appointment.endTime), "h:mm a")}
                      </span>
                    </div>

                    {appointment.description && (
                      <p className="text-muted-foreground text-sm">
                        {appointment.description}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEventClick(appointment)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAppointmentCreated={() => {
          refetch();
          toast.success("Appointment created successfully");
        }}
        selectedDate={selectedDate}
      />

      <AppointmentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        appointment={selectedAppointment}
        onAppointmentUpdated={() => {
          refetch();
          toast.success("Appointment updated successfully");
        }}
        onAppointmentDeleted={() => {
          refetch();
          toast.success("Appointment deleted successfully");
        }}
      />
    </div>
  );
}
