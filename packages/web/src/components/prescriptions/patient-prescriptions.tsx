"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Plus,
  Calendar,
  User,
  Eye,
  Printer,
  Copy,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatePrescriptionDialog } from "./create-prescription-dialog";
import { PrescriptionPrintView } from "./prescription-print-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Patient } from "@/types/patient";

interface PatientPrescriptionsProps {
  patientId: string;
  patientName: string;
  onPrescriptionCreated?: () => void;
}

export function PatientPrescriptions({
  patientId,
  patientName,
  onPrescriptionCreated,
}: PatientPrescriptionsProps) {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedPrescription, setSelectedPrescription] =
    React.useState<any>(null);

  // Fetch prescriptions for this patient
  const {
    data: prescriptions = [],
    isLoading,
    refetch,
  } = api.prescriptions.getByPatient.useQuery({
    patientId,
    limit: 10,
  });

  const deletePrescription = api.prescriptions.delete.useMutation({
    onSuccess: () => {
      toast.success("Ordonnance supprimée avec succès");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Échec de la suppression de l'ordonnance");
    },
  });

  const duplicatePrescription = api.prescriptions.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Ordonnance dupliquée avec succès");
      refetch();
      onPrescriptionCreated?.();
    },
    onError: (error) => {
      toast.error(error.message || "Échec de la duplication de l'ordonnance");
    },
  });

  const handleViewPrescription = async (prescriptionId: string) => {
    try {
      const prescription = await api.prescriptions.getById.query({
        id: prescriptionId,
      });
      setSelectedPrescription(prescription);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error("Erreur lors du chargement de l'ordonnance");
    }
  };

  const handleDelete = (prescriptionId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette ordonnance ?")) {
      deletePrescription.mutate({ id: prescriptionId });
    }
  };

  const handleDuplicate = (prescriptionId: string) => {
    duplicatePrescription.mutate({ id: prescriptionId });
  };

  const handlePrescriptionCreated = () => {
    refetch();
    onPrescriptionCreated?.();
    setCreateDialogOpen(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "completed":
        return "Terminée";
      case "cancelled":
        return "Annulée";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ordonnances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ordonnances
              </CardTitle>
              <CardDescription>
                {prescriptions.length} ordonnance(s) pour {patientName}
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouvelle ordonnance
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {prescriptions.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Aucune ordonnance trouvée</p>
              <p className="text-sm">
                Créez la première ordonnance pour ce patient
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {prescription.prescriptionNumber}
                          </h4>
                          <Badge
                            variant={getStatusBadgeVariant(prescription.status)}
                          >
                            {getStatusLabel(prescription.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="text-muted-foreground h-4 w-4" />
                            <span>
                              {format(
                                new Date(prescription.date),
                                "dd/MM/yyyy",
                                { locale: fr },
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="text-muted-foreground h-4 w-4" />
                            <span>{prescription.doctorName}</span>
                          </div>
                        </div>

                        {prescription.diagnosis && (
                          <p className="text-muted-foreground text-sm">
                            <span className="font-medium">Diagnostic:</span>{" "}
                            {prescription.diagnosis}
                          </p>
                        )}

                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <span>Créée par {prescription.author.name}</span>
                          <span>•</span>
                          <span>
                            {format(
                              new Date(prescription.createdAt),
                              "dd/MM/yyyy à HH:mm",
                              { locale: fr },
                            )}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewPrescription(prescription.id)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir l'ordonnance
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(prescription.id)}
                            disabled={duplicatePrescription.isPending}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(prescription.id)}
                            className="text-destructive"
                            disabled={deletePrescription.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Prescription Dialog */}
      <CreatePrescriptionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onPrescriptionCreated={handlePrescriptionCreated}
        patient={{ id: patientId } as Patient}
      />

      {/* View Prescription Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Ordonnance {selectedPrescription?.prescriptionNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <PrescriptionPrintView
                prescription={selectedPrescription}
                showActions={true}
              />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
