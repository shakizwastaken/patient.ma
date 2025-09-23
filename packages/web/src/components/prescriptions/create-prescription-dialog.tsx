"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, User, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { DrugSearchDialog } from "./drug-search-dialog";
import { PrescriptionItemForm } from "./prescription-item-form";
import type { Patient } from "@/types/patient";

interface Drug {
  id: string;
  brand: string;
  dci: string;
  substanceActive: string;
  strength: string;
  form: string;
  route: string;
  presentation: string;
  classeTherapeutique?: string | null;
  isActive: boolean;
  source: string;
}

interface PrescriptionItem {
  id?: string;
  drugId?: string;
  customDrugId?: string;
  drugName: string;
  drugDci: string;
  drugStrength: string;
  drugForm: string;
  drugPresentation: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: string;
  instructions?: string;
  order: number;
}

const createPrescriptionSchema = z.object({
  diagnosis: z.string().max(500, "Diagnostic trop long").optional(),
  doctorName: z
    .string()
    .min(1, "Nom du médecin requis")
    .max(200, "Nom trop long"),
  doctorLicenseNumber: z
    .string()
    .max(50, "Numéro de licence trop long")
    .optional(),
  instructions: z.string().max(1000, "Instructions trop longues").optional(),
  notes: z.string().max(1000, "Notes trop longues").optional(),
});

type CreatePrescriptionFormValues = z.infer<typeof createPrescriptionSchema>;

interface CreatePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrescriptionCreated: () => void;
  patient?: Patient | null;
  appointmentId?: string;
}

export function CreatePrescriptionDialog({
  open,
  onOpenChange,
  onPrescriptionCreated,
  patient,
  appointmentId,
}: CreatePrescriptionDialogProps) {
  const [drugSearchOpen, setDrugSearchOpen] = React.useState(false);
  const [editingItemIndex, setEditingItemIndex] = React.useState<number | null>(
    null,
  );
  const [prescriptionItems, setPrescriptionItems] = React.useState<
    PrescriptionItem[]
  >([]);
  const [drugs, setDrugs] = React.useState<Map<string, Drug>>(new Map());

  const form = useForm<CreatePrescriptionFormValues>({
    resolver: zodResolver(createPrescriptionSchema),
    defaultValues: {
      diagnosis: "",
      doctorName: "",
      doctorLicenseNumber: "",
      instructions: "",
      notes: "",
    },
  });

  const utils = api.useUtils();

  const createPrescription = api.prescriptions.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.prescriptions.getAll.invalidate(),
        utils.prescriptions.getByPatient.invalidate({
          patientId: patient?.id || "",
        }),
      ]);

      toast.success("Ordonnance créée avec succès");
      onPrescriptionCreated();
      handleClose();
    },
    onError: (error) => {
      console.error("Failed to create prescription:", error);
      toast.error(error.message || "Échec de la création de l'ordonnance");
    },
  });

  const handleClose = () => {
    form.reset();
    setPrescriptionItems([]);
    setDrugs(new Map());
    setEditingItemIndex(null);
    onOpenChange(false);
  };

  const handleDrugSelect = (drug: Drug) => {
    const newItem: PrescriptionItem = {
      drugName: drug.brand,
      drugDci: drug.dci,
      drugStrength: drug.strength,
      drugForm: drug.form,
      drugPresentation: drug.presentation,
      dosage: "",
      frequency: "",
      duration: "",
      quantity: "",
      instructions: "",
      order: prescriptionItems.length,
      ...(drug.source === "custom"
        ? { customDrugId: drug.id }
        : { drugId: drug.id }),
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    setDrugs(new Map([...drugs, [drug.id, drug]]));
  };

  const handleEditDrug = (index: number) => {
    setEditingItemIndex(index);
    setDrugSearchOpen(true);
  };

  const handleUpdateItem = (index: number, updatedItem: PrescriptionItem) => {
    const newItems = [...prescriptionItems];
    newItems[index] = updatedItem;
    setPrescriptionItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = prescriptionItems.filter((_, i) => i !== index);
    // Reorder items
    newItems.forEach((item, i) => {
      item.order = i;
    });
    setPrescriptionItems(newItems);
  };

  const onSubmit = (values: CreatePrescriptionFormValues) => {
    if (!patient) {
      toast.error("Aucun patient sélectionné");
      return;
    }

    if (prescriptionItems.length === 0) {
      toast.error("Veuillez ajouter au moins un médicament");
      return;
    }

    // Validate all items have required fields
    const invalidItems = prescriptionItems.filter(
      (item) => !item.dosage || !item.frequency || !item.duration,
    );

    if (invalidItems.length > 0) {
      toast.error(
        "Veuillez remplir tous les champs obligatoires pour chaque médicament",
      );
      return;
    }

    createPrescription.mutate({
      patientId: patient.id,
      diagnosis: values.diagnosis || undefined,
      doctorName: values.doctorName,
      doctorLicenseNumber: values.doctorLicenseNumber || undefined,
      instructions: values.instructions || undefined,
      notes: values.notes || undefined,
      appointmentId: appointmentId || undefined,
      items: prescriptionItems,
    });
  };

  const handleDrugSelectForEdit = (drug: Drug) => {
    if (editingItemIndex !== null) {
      const updatedItem = prescriptionItems[editingItemIndex];
      if (updatedItem) {
        const newItem: PrescriptionItem = {
          ...updatedItem,
          drugName: drug.brand,
          drugDci: drug.dci,
          drugStrength: drug.strength,
          drugForm: drug.form,
          drugPresentation: drug.presentation,
          drugId: drug.source === "custom" ? undefined : drug.id,
          customDrugId: drug.source === "custom" ? drug.id : undefined,
        };

        handleUpdateItem(editingItemIndex, newItem);
        setDrugs(new Map([...drugs, [drug.id, drug]]));
      }
    }
    setEditingItemIndex(null);
    setDrugSearchOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nouvelle ordonnance
            </DialogTitle>
            <DialogDescription>
              Créer une nouvelle ordonnance pour {patient?.firstName}{" "}
              {patient?.lastName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Patient Info */}
              {patient && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="mb-2 flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4" />
                    Patient
                  </h3>
                  <p className="text-sm">
                    {patient.firstName} {patient.lastName}
                    {patient.age && ` • ${patient.age} ans`}
                    {patient.phoneNumber && ` • ${patient.phoneNumber}`}
                  </p>
                </div>
              )}

              {/* Doctor Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Informations du médecin</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctorName">Nom du médecin *</Label>
                    <Input
                      id="doctorName"
                      {...form.register("doctorName")}
                      placeholder="Dr. [Nom]"
                    />
                    {form.formState.errors.doctorName && (
                      <p className="text-destructive text-sm">
                        {form.formState.errors.doctorName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doctorLicenseNumber">
                      Numéro de licence
                    </Label>
                    <Input
                      id="doctorLicenseNumber"
                      {...form.register("doctorLicenseNumber")}
                      placeholder="Ex: 12345"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Diagnosis */}
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnostic</Label>
                <Textarea
                  id="diagnosis"
                  {...form.register("diagnosis")}
                  placeholder="Diagnostic ou motif de la prescription..."
                  rows={2}
                />
              </div>

              {/* Prescription Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Médicaments</h3>
                  <Button
                    type="button"
                    onClick={() => setDrugSearchOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un médicament
                  </Button>
                </div>

                {prescriptionItems.length === 0 ? (
                  <div className="text-muted-foreground rounded-lg border-2 border-dashed py-8 text-center">
                    <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Aucun médicament ajouté</p>
                    <p className="text-sm">
                      Cliquez sur "Ajouter un médicament" pour commencer
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptionItems.map((item, index) => (
                      <PrescriptionItemForm
                        key={`${item.order}-${index}`}
                        item={item}
                        drug={
                          item.drugId
                            ? drugs.get(item.drugId)
                            : item.customDrugId
                              ? drugs.get(item.customDrugId)
                              : undefined
                        }
                        onUpdate={(updatedItem) =>
                          handleUpdateItem(index, updatedItem)
                        }
                        onRemove={() => handleRemoveItem(index)}
                        onEditDrug={() => handleEditDrug(index)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Instructions and Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold">Instructions et notes</h3>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions générales</Label>
                  <Textarea
                    id="instructions"
                    {...form.register("instructions")}
                    placeholder="Instructions générales pour le patient..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes internes</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Notes internes (non visibles sur l'ordonnance imprimée)..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createPrescription.isPending}
                  className="flex items-center gap-2"
                >
                  {createPrescription.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Créer l'ordonnance
                    </>
                  )}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <DrugSearchDialog
        open={drugSearchOpen}
        onOpenChange={setDrugSearchOpen}
        onDrugSelect={
          editingItemIndex !== null ? handleDrugSelectForEdit : handleDrugSelect
        }
      />
    </>
  );
}
