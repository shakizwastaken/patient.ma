"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { MoreHorizontal, Plus, UserPlus, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { authClient } from "@acme/shared/client";
import { useRouter } from "next/navigation";
import { CreatePatientDialog } from "./create-patient-dialog";
import { UpdatePatientDialog } from "./update-patient-dialog";
import { CreateAppointmentDialog } from "../calendar/create-appointment-dialog";
import { toast } from "sonner";
import type { Patient, PatientsTableProps } from "@/types/patient";

export function PatientsTable({ organizationId }: PatientsTableProps) {
  const router = useRouter();
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] =
    React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(
    null,
  );

  // Fetch patients data (automatically scoped to active organization)
  const {
    data: patients = [],
    isLoading,
    refetch,
  } = api.patients.getAll.useQuery();

  const utils = api.useUtils();

  const deletePatient = api.patients.delete.useMutation({
    onSuccess: async () => {
      // Invalidate all patient-related queries to refresh the UI
      await Promise.all([utils.patients.getAll.invalidate()]);

      toast.success("Patient deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete patient");
    },
  });

  const columns: ColumnDef<Patient>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const patient = row.original;
          return (
            <div className="font-medium">
              {patient.firstName} {patient.lastName}
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.getValue("email") as string | null;
          return email ? (
            <div className="text-sm">{email}</div>
          ) : (
            <div className="text-muted-foreground text-sm">No email</div>
          );
        },
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone",
        cell: ({ row }) => {
          const phone = row.getValue("phoneNumber") as string | null;
          return phone ? (
            <div className="text-sm">{phone}</div>
          ) : (
            <div className="text-muted-foreground text-sm">No phone</div>
          );
        },
      },
      {
        accessorKey: "age",
        header: "Age",
        cell: ({ row }) => {
          const age = row.getValue("age") as number | null;
          return age ? (
            <Badge variant="secondary">{age}</Badge>
          ) : (
            <div className="text-muted-foreground text-sm">-</div>
          );
        },
      },
      {
        accessorKey: "birthDate",
        header: "Birth Date",
        cell: ({ row }) => {
          const birthDate = row.getValue("birthDate") as Date | null;
          return birthDate ? (
            <div className="text-sm">
              {new Date(birthDate).toLocaleDateString()}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">-</div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as Date;
          return <div className="text-sm">{date.toLocaleDateString()}</div>;
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const patient = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(patient.id)}
                >
                  Copy patient ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(`/patients/${patient.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedPatient(patient);
                    setUpdateDialogOpen(true);
                  }}
                >
                  Edit patient
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedPatient(patient);
                    setAppointmentDialogOpen(true);
                  }}
                >
                  Schedule appointment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to delete this patient?")
                    ) {
                      deletePatient.mutate({ id: patient.id });
                    }
                  }}
                >
                  Delete patient
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [deletePatient],
  );

  const table = useReactTable({
    data: patients,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnFilters,
      columnVisibility,
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="text-muted-foreground">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const patient = row.original;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="text-muted-foreground">
                      No patients found.
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add your first patient
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredRowModel().rows.length} patient(s) total.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <CreatePatientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onPatientCreated={() => refetch()}
      />

      <UpdatePatientDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        onPatientUpdated={() => refetch()}
        patient={selectedPatient}
      />

      <CreateAppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        onAppointmentCreated={() => {
          toast.success("Appointment scheduled successfully");
        }}
        selectedDate={new Date()}
        preSelectedPatientId={selectedPatient?.id}
      />
    </div>
  );
}
