"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PrescriptionsTable } from "@/components/prescriptions/prescriptions-table";
import { CreatePrescriptionDialog } from "@/components/prescriptions/create-prescription-dialog";
import { PrescriptionPrintView } from "@/components/prescriptions/prescription-print-view";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrescriptionsPage() {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = React.useState<
    string | null
  >(null);

  // Fetch prescription data when viewing
  const { data: selectedPrescription } = api.prescriptions.getById.useQuery(
    { id: selectedPrescriptionId! },
    { enabled: !!selectedPrescriptionId },
  );

  const handleViewPrescription = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setViewDialogOpen(true);
  };

  const handlePrescriptionCreated = () => {
    setCreateDialogOpen(false);
  };

  const handleCloseViewDialog = (open: boolean) => {
    setViewDialogOpen(open);
    if (!open) {
      setSelectedPrescriptionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordonnances</h1>
          <p className="text-muted-foreground">
            Gérez les ordonnances médicales de vos patients
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle ordonnance
        </Button>
      </div>

      {/* Prescriptions Table */}
      <PrescriptionsTable
        onViewPrescription={handleViewPrescription}
        onEditPrescription={(id) => console.log("Edit prescription:", id)}
        onDeletePrescription={(id) => console.log("Delete prescription:", id)}
        onDuplicatePrescription={(id) =>
          console.log("Duplicate prescription:", id)
        }
        onPrintPrescription={(id) => console.log("Print prescription:", id)}
      />

      {/* Create Prescription Dialog */}
      <CreatePrescriptionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onPrescriptionCreated={handlePrescriptionCreated}
      />

      {/* View Prescription Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={handleCloseViewDialog}>
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
    </div>
  );
}
