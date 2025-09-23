"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrescriptionPrintView } from "./prescription-print-view";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Eye,
  Edit,
  Trash2,
  Copy,
  Printer,
  MoreHorizontal,
  Calendar,
  User,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PrescriptionsTableProps {
  patientId?: string;
}

export function PrescriptionsTable({ patientId }: PrescriptionsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = React.useState<
    string | null
  >(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    data: prescriptionsData,
    isLoading,
    refetch,
  } = api.prescriptions.getAll.useQuery({
    page: currentPage,
    limit: 20,
    patientId,
    status:
      statusFilter === "all"
        ? undefined
        : (statusFilter as "active" | "completed" | "cancelled"),
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
    },
    onError: (error) => {
      toast.error(error.message || "Échec de la duplication de l'ordonnance");
    },
  });

  const handleDelete = (prescriptionId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette ordonnance ?")) {
      deletePrescription.mutate({ id: prescriptionId });
    }
  };

  const handleDuplicate = (prescriptionId: string) => {
    duplicatePrescription.mutate({ id: prescriptionId });
  };

  // Fetch prescription data when viewing
  const { data: selectedPrescription } = api.prescriptions.getById.useQuery(
    { id: selectedPrescriptionId! },
    { enabled: !!selectedPrescriptionId },
  );

  const handleViewPrescription = (prescriptionId: string) => {
    setSelectedPrescriptionId(prescriptionId);
    setViewDialogOpen(true);
  };

  const handleCloseViewDialog = (open: boolean) => {
    setViewDialogOpen(open);
    if (!open) {
      setSelectedPrescriptionId(null);
    }
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

  // Filter prescriptions locally for search
  const filteredPrescriptions = React.useMemo(() => {
    if (!prescriptionsData?.prescriptions) return [];

    if (!debouncedSearchQuery) return prescriptionsData.prescriptions;

    const query = debouncedSearchQuery.toLowerCase();
    return prescriptionsData.prescriptions.filter(
      (prescription) =>
        prescription.prescriptionNumber.toLowerCase().includes(query) ||
        prescription.patient.firstName.toLowerCase().includes(query) ||
        prescription.patient.lastName.toLowerCase().includes(query) ||
        prescription.doctorName.toLowerCase().includes(query) ||
        (prescription.diagnosis &&
          prescription.diagnosis.toLowerCase().includes(query)),
    );
  }, [prescriptionsData?.prescriptions, debouncedSearchQuery]);

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
                Liste des ordonnances
              </CardTitle>
              <CardDescription>
                {filteredPrescriptions.length} ordonnance(s) trouvée(s)
              </CardDescription>
            </div>
            {!patientId && (
              <Button onClick={() => router.push("/prescriptions/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle ordonnance
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Rechercher par numéro, patient, médecin ou diagnostic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Terminée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredPrescriptions.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Aucune ordonnance trouvée</p>
              {searchQuery && (
                <p className="text-sm">
                  Essayez de modifier vos critères de recherche
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Ordonnance</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Médecin</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Diagnostic</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrescriptions.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell className="font-medium">
                          {prescription.prescriptionNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="text-muted-foreground h-4 w-4" />
                            <div>
                              <p className="font-medium">
                                {prescription.patient.firstName}{" "}
                                {prescription.patient.lastName}
                              </p>
                              {prescription.patient.phoneNumber && (
                                <p className="text-muted-foreground text-sm">
                                  {prescription.patient.phoneNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">
                            {prescription.doctorName}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Par {prescription.author.name}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="text-muted-foreground h-4 w-4" />
                            <span className="text-sm">
                              {format(
                                new Date(prescription.date),
                                "dd/MM/yyyy",
                                {
                                  locale: fr,
                                },
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate">
                            {prescription.diagnosis || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(prescription.status)}
                          >
                            {getStatusLabel(prescription.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                                Voir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleViewPrescription(prescription.id)
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleViewPrescription(prescription.id)
                                }
                              >
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimer
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {prescriptionsData && prescriptionsData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-muted-foreground text-sm">
                    Page {prescriptionsData.currentPage} sur{" "}
                    {prescriptionsData.totalPages} ({prescriptionsData.total}{" "}
                    ordonnance(s))
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === prescriptionsData.totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
