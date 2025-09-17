"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/trpc/react";
import { CreateAppointmentDialog } from "./create-appointment-dialog";
import { AppointmentDetailsDialog } from "./appointment-details-dialog";
import { toast } from "sonner";
import {
  Calendar,
  CalendarCurrentDate,
  CalendarDayView,
  CalendarMonthView,
  CalendarNextTrigger,
  CalendarPrevTrigger,
  CalendarTodayTrigger,
  CalendarViewTrigger,
  CalendarWeekView,
  CalendarYearView,
  type CalendarEvent,
} from "@/components/ui/full-calendar";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

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

// Helper function to determine event color based on appointment type and status
function getEventColor(type: string, status: string): CalendarEvent["color"] {
  if (status === "cancelled" || status === "no_show") {
    return "default"; // Gray for cancelled/no-show
  }

  switch (type) {
    case "emergency":
      return "pink"; // Red for emergency
    case "consultation":
      return "blue";
    case "follow_up":
      return "purple";
    case "checkup":
      return "green";
    case "procedure":
      return "purple";
    default:
      return "blue";
  }
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [currentView, setCurrentView] = React.useState<
    "day" | "week" | "month" | "year"
  >("month");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<Appointment | null>(null);

  // Calculate date range based on current view
  const { startDate, endDate } = React.useMemo(() => {
    let start: Date, end: Date;

    switch (currentView) {
      case "day":
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
        break;
      case "month":
        start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
        end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
        break;
      case "year":
        start = new Date(currentDate.getFullYear(), 0, 1);
        end = new Date(currentDate.getFullYear(), 11, 31);
        break;
      default:
        start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
        end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    }

    return { startDate: start, endDate: end };
  }, [currentDate, currentView]);

  // Fetch appointments for the current view
  const {
    data: appointments = [],
    isLoading,
    refetch,
  } = api.appointments.getByDateRange.useQuery({
    startDate,
    endDate,
  });

  // Convert appointments to calendar events
  const calendarEvents: CalendarEvent[] = React.useMemo(() => {
    return appointments.map((appointment) => ({
      id: appointment.id,
      start: new Date(appointment.startTime),
      end: new Date(appointment.endTime),
      title: `${appointment.patient.firstName} ${appointment.patient.lastName} - ${appointment.title}`,
      color: getEventColor(appointment.type, appointment.status),
    }));
  }, [appointments]);

  const handleEventClick = (event: CalendarEvent) => {
    const appointment = appointments.find((apt) => apt.id === event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setDetailsDialogOpen(true);
    }
  };

  return (
    <Calendar
      view={currentView}
      defaultDate={currentDate}
      events={calendarEvents}
      onEventClick={handleEventClick}
      onChangeView={setCurrentView}
      enableHotkeys={true}
    >
      <div className="flex h-dvh flex-col py-6">
        {/* Calendar Header */}
        <div className="mb-6 flex items-center gap-2">
          <CalendarViewTrigger
            className="aria-[current=true]:bg-accent"
            view="day"
          >
            Day
          </CalendarViewTrigger>
          <CalendarViewTrigger
            view="week"
            className="aria-[current=true]:bg-accent"
          >
            Week
          </CalendarViewTrigger>
          <CalendarViewTrigger
            view="month"
            className="aria-[current=true]:bg-accent"
          >
            Month
          </CalendarViewTrigger>
          <CalendarViewTrigger
            view="year"
            className="aria-[current=true]:bg-accent"
          >
            Year
          </CalendarViewTrigger>

          <span className="flex-1" />

          <CalendarCurrentDate />

          <CalendarPrevTrigger>
            <ChevronLeft size={20} />
            <span className="sr-only">Previous</span>
          </CalendarPrevTrigger>

          <CalendarTodayTrigger>Today</CalendarTodayTrigger>

          <CalendarNextTrigger>
            <ChevronRight size={20} />
            <span className="sr-only">Next</span>
          </CalendarNextTrigger>

          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>

        {/* Calendar Views */}
        <div className="relative flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="text-muted-foreground">Loading calendar...</div>
            </div>
          ) : (
            <>
              <CalendarDayView />
              <CalendarWeekView />
              <CalendarMonthView />
              <CalendarYearView />
            </>
          )}
        </div>

        {/* Dialogs */}
        <CreateAppointmentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onAppointmentCreated={() => {
            refetch();
            toast.success("Appointment created successfully");
          }}
          selectedDate={currentDate}
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
    </Calendar>
  );
}
