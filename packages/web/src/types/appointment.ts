// Appointment-related TypeScript interfaces and types

export interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  type: "consultation" | "follow_up" | "emergency" | "checkup" | "procedure";
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phoneNumber?: string | null;
    age?: number | null;
    birthDate?: Date | null;
  };
}

export interface CreateAppointmentInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: "consultation" | "follow_up" | "emergency" | "checkup" | "procedure";
  patientId: string;
  notes?: string;
}

export interface UpdateAppointmentInput {
  id: string;
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  type?: "consultation" | "follow_up" | "emergency" | "checkup" | "procedure";
  status?: "scheduled" | "completed" | "cancelled" | "no_show";
  notes?: string;
}

export interface AppointmentFilters {
  startDate?: Date;
  endDate?: Date;
  patientId?: string;
  status?: "scheduled" | "completed" | "cancelled" | "no_show";
}

// Frontend component prop types
export interface CalendarViewProps {
  initialDate?: Date;
}

export interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppointmentCreated: () => void;
  selectedDate: Date;
}

export interface AppointmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onAppointmentUpdated: () => void;
  onAppointmentDeleted: () => void;
}

// Calendar specific types
export interface CalendarDay {
  date: Date;
  appointments: Appointment[];
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
}

export interface AppointmentsByDate {
  [dateString: string]: Appointment[];
}

// Status and type mappings
export const APPOINTMENT_STATUSES = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
} as const;

export const APPOINTMENT_TYPES = {
  consultation: "Consultation",
  follow_up: "Follow-up",
  emergency: "Emergency",
  checkup: "Checkup",
  procedure: "Procedure",
} as const;

// Color mappings for UI
export const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
} as const;

export const TYPE_COLORS = {
  consultation: "bg-purple-100 text-purple-800",
  follow_up: "bg-orange-100 text-orange-800",
  emergency: "bg-red-100 text-red-800",
  checkup: "bg-green-100 text-green-800",
  procedure: "bg-indigo-100 text-indigo-800",
} as const;
