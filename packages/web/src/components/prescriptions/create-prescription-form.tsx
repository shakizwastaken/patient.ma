"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2, Pill, User, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { DrugSearchDialog } from "./drug-search-dialog";

const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, "Patient requis"),
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

export function CreatePrescriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [drugSearchOpen, setDrugSearchOpen] = React.useState(false);
  const [prescriptionItems, setPrescriptionItems] = React.useState<
    PrescriptionItem[]
  >([]);
  const [drugs, setDrugs] = React.useState<Map<string, Drug>>(new Map());

  const form = useForm<CreatePrescriptionFormValues>({
    resolver: zodResolver(createPrescriptionSchema),
    defaultValues: {
      patientId: patientId || "",
      diagnosis: "",
      doctorName: "",
      doctorLicenseNumber: "",
      instructions: "",
      notes: "",
    },
  });

  const utils = api.useUtils();

  // Fetch patients for dropdown
  const { data: patients = [] } = api.patients.getAll.useQuery();

  // Get selected patient
  const selectedPatient = patients.find(
    (p) => p.id === form.watch("patientId"),
  );

  const createPrescription = api.prescriptions.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.prescriptions.getAll.invalidate(),
        utils.patients.getAll.invalidate(),
      ]);

      toast.success("Ordonnance créée avec succès");
      router.push("/prescriptions");
    },
    onError: (error) => {
      toast.error(error.message || "Échec de la création de l'ordonnance");
    },
  });

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

  const handleRemoveItem = (index: number) => {
    const newItems = prescriptionItems.filter((_, i) => i !== index);
    // Reorder items
    newItems.forEach((item, i) => {
      item.order = i;
    });
    setPrescriptionItems(newItems);
  };

  const handleUpdateItem = (index: number, updatedItem: PrescriptionItem) => {
    const newItems = [...prescriptionItems];
    newItems[index] = updatedItem;
    setPrescriptionItems(newItems);
  };

  const onSubmit = (values: CreatePrescriptionFormValues) => {
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
      patientId: values.patientId,
      diagnosis: values.diagnosis || undefined,
      doctorName: values.doctorName,
      doctorLicenseNumber: values.doctorLicenseNumber || undefined,
      instructions: values.instructions || undefined,
      notes: values.notes || undefined,
      items: prescriptionItems,
    });
  };

  const handleCancel = () => {
    router.push("/prescriptions");
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          id="prescription-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sélection du patient
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un patient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.firstName} {patient.lastName}
                            {patient.age && ` (${patient.age} ans)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPatient && (
                <div className="bg-muted mt-4 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </span>
                  </div>
                  {selectedPatient.phoneNumber && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {selectedPatient.phoneNumber}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Doctor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du médecin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="doctorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du médecin *</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. [Nom]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctorLicenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de licence</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnostic ou motif</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Diagnostic ou motif de la prescription..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Prescription Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Médicaments ({prescriptionItems.length})
                </CardTitle>
                <Button
                  type="button"
                  onClick={() => setDrugSearchOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {prescriptionItems.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border-2 border-dashed py-8 text-center">
                  <Pill className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">Aucun médicament ajouté</p>
                  <p className="text-sm">
                    Cliquez sur "Ajouter" pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptionItems.map((item, index) => (
                    <div
                      key={`${item.order}-${index}`}
                      className="rounded-lg border p-4"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.drugName}</h4>
                          <p className="text-muted-foreground text-sm">
                            {item.drugDci} • {item.drugStrength} {item.drugForm}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <Label className="text-sm">Dosage *</Label>
                          <Input
                            placeholder="Ex: 1 comprimé"
                            value={item.dosage}
                            onChange={(e) =>
                              handleUpdateItem(index, {
                                ...item,
                                dosage: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Fréquence *</Label>
                          <Input
                            placeholder="Ex: 3 fois par jour"
                            value={item.frequency}
                            onChange={(e) =>
                              handleUpdateItem(index, {
                                ...item,
                                frequency: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Durée *</Label>
                          <Input
                            placeholder="Ex: 7 jours"
                            value={item.duration}
                            onChange={(e) =>
                              handleUpdateItem(index, {
                                ...item,
                                duration: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions and Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions et notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions générales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Instructions générales pour le patient..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes internes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes internes (non visibles sur l'ordonnance imprimée)..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>

        {/* Drug Search Dialog */}
        <DrugSearchDialog
          open={drugSearchOpen}
          onOpenChange={setDrugSearchOpen}
          onDrugSelect={handleDrugSelect}
        />
      </Form>
    </div>
  );
}
