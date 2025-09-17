// Patient-related TypeScript interfaces and types

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  email?: string | null;
  age?: number | null;
  birthDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  age?: number;
  birthDate?: Date;
}

export interface UpdatePatientInput {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  age?: number;
  birthDate?: Date;
}

export interface PatientOrganizationRelation {
  id: string;
  patientId: string;
  organizationId: string;
  createdAt: Date;
}

// Frontend component prop types
export interface PatientsTableProps {
  organizationId?: string;
}

export interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated: () => void;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Error types
export interface PatientError {
  code: string;
  message: string;
  field?: string;
}
