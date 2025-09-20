"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  User,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  UserX,
  Video,
  ExternalLink,
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type Appointment = {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  type: string;
  appointmentType?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  notes?: string | null;
  meetingLink?: string | null;
  meetingId?: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

interface AppointmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onAppointmentUpdated: () => void;
  onAppointmentDeleted: () => void;
}

export function AppointmentDetailsDialog({
  open,
  onOpenChange,
  appointment,
  onAppointmentUpdated,
  onAppointmentDeleted,
}: AppointmentDetailsDialogProps) {
  const utils = api.useUtils();

  const updateAppointment = api.appointments.update.useMutation({
    onSuccess: async () => {
      // Invalidate all appointment-related queries to refresh the UI
      await Promise.all([
        utils.appointments.getAll.invalidate(),
        utils.appointments.getByDateRange.invalidate(),
        utils.appointments.getUpcoming.invalidate(),
        utils.appointments.getById.invalidate({ id: appointment?.id || "" }),
      ]);

      onAppointmentUpdated();
      toast.success("Appointment updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update appointment:", error);
      toast.error(error.message || "Failed to update appointment");
    },
  });

  const deleteAppointment = api.appointments.delete.useMutation({
    onSuccess: async () => {
      // Invalidate all appointment-related queries to refresh the UI
      await Promise.all([
        utils.appointments.getAll.invalidate(),
        utils.appointments.getByDateRange.invalidate(),
        utils.appointments.getUpcoming.invalidate(),
      ]);

      onAppointmentDeleted();
      onOpenChange(false);
      toast.success("Appointment deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete appointment:", error);
      toast.error(error.message || "Failed to delete appointment");
    },
  });

  if (!appointment) {
    return null;
  }

  const handleStatusUpdate = (newStatus: string) => {
    updateAppointment.mutate({
      id: appointment.id,
      status: newStatus as "scheduled" | "completed" | "cancelled" | "no_show",
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this appointment?")) {
      deleteAppointment.mutate({ id: appointment.id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (appointment: Appointment) => {
    // Use custom appointment type color if available
    if (appointment.appointmentType?.color) {
      // Convert hex color to a lighter background color
      const hex = appointment.appointmentType.color;
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const bgColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
      const textColor = `rgb(${r}, ${g}, ${b})`;
      return `text-[${textColor}]`;
    }

    // Fallback to default type colors
    switch (appointment.type) {
      case "consultation":
        return "bg-purple-100 text-purple-800";
      case "follow_up":
        return "bg-orange-100 text-orange-800";
      case "emergency":
        return "bg-red-100 text-red-800";
      case "checkup":
        return "bg-green-100 text-green-800";
      case "procedure":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDuration = (startTime: Date, endTime: Date) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins} minutes`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      return `${hours} hour${hours > 1 ? "s" : ""}${minutes > 0 ? ` ${minutes} minutes` : ""}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{appointment.title}</DialogTitle>
              <DialogDescription>
                Appointment details and management
              </DialogDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Appointment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("completed")}
                  disabled={appointment.status === "completed"}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Mark Completed
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("cancelled")}
                  disabled={appointment.status === "cancelled"}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate("no_show")}
                  disabled={appointment.status === "no_show"}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Mark No Show
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Appointment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type */}
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status.replace("_", " ")}
            </Badge>
            <Badge
              className={getTypeColor(appointment)}
              style={
                appointment.appointmentType?.color
                  ? {
                      backgroundColor: `${appointment.appointmentType.color}20`,
                      color: appointment.appointmentType.color,
                    }
                  : undefined
              }
            >
              {appointment.appointmentType?.name ||
                appointment.type.replace("_", " ")}
            </Badge>
          </div>

          {/* Patient Information */}
          <div className="flex items-center gap-3">
            <User className="text-muted-foreground h-5 w-5" />
            <div>
              <p className="font-medium">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </p>
              <p className="text-muted-foreground text-sm">Patient</p>
            </div>
          </div>

          <Separator />

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="font-medium">
                  {formatDateTime(appointment.startTime)}
                </p>
                <p className="text-muted-foreground text-sm">Start time</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="text-muted-foreground h-5 w-5" />
              <div>
                <p className="font-medium">
                  {formatTime(appointment.startTime)} -{" "}
                  {formatTime(appointment.endTime)}
                </p>
                <p className="text-muted-foreground text-sm">
                  Duration:{" "}
                  {getDuration(appointment.startTime, appointment.endTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Meeting Link */}
          {appointment.meetingLink && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <Video className="text-muted-foreground h-5 w-5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Lien de visioconférence</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        window.open(appointment.meetingLink!, "_blank")
                      }
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Rejoindre
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Google Meet - Cliquez pour rejoindre la réunion
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Description */}
          {appointment.description && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 font-medium">Description</h4>
                <p className="text-muted-foreground text-sm">
                  {appointment.description}
                </p>
              </div>
            </>
          )}

          {/* Notes */}
          {appointment.notes && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <FileText className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div className="flex-1">
                  <h4 className="mb-2 font-medium">Notes</h4>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {appointment.notes}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
