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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Pill, Plus, Clock } from "lucide-react";
import { api } from "@/trpc/react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

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

interface DrugSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDrugSelect: (drug: Drug) => void;
}

export function DrugSearchDialog({
  open,
  onOpenChange,
  onDrugSelect,
}: DrugSearchDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDrug, setSelectedDrug] = React.useState<Drug | null>(null);

  const { data: searchResults = [], isLoading } = api.drugs.search.useQuery(
    {
      query: debouncedSearchQuery,
      limit: 20,
      includeCustom: true,
    },
    {
      enabled: debouncedSearchQuery.length > 0,
    },
  );

  const { data: popularDrugs = [] } = api.drugs.getPopular.useQuery(
    { limit: 10 },
    {
      enabled: debouncedSearchQuery.length === 0,
    },
  );

  const handleDrugSelect = (drug: Drug) => {
    setSelectedDrug(drug);
  };

  const handleConfirmSelection = () => {
    if (selectedDrug) {
      onDrugSelect(selectedDrug);
      setSelectedDrug(null);
      setSearchQuery("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedDrug(null);
    setSearchQuery("");
    onOpenChange(false);
  };

  const displayDrugs =
    debouncedSearchQuery.length > 0 ? searchResults : popularDrugs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Rechercher un médicament
          </DialogTitle>
          <DialogDescription>
            Recherchez dans la base de données des médicaments marocains ou vos
            médicaments personnalisés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Tapez le nom du médicament, DCI, ou substance active..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                </div>
              )}

              {!isLoading &&
                displayDrugs.length === 0 &&
                debouncedSearchQuery.length > 0 && (
                  <div className="text-muted-foreground py-8 text-center">
                    <Pill className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Aucun médicament trouvé pour "{debouncedSearchQuery}"</p>
                  </div>
                )}

              {!isLoading &&
                displayDrugs.length === 0 &&
                debouncedSearchQuery.length === 0 && (
                  <div className="text-muted-foreground py-8 text-center">
                    <Pill className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Tapez pour rechercher un médicament</p>
                  </div>
                )}

              {displayDrugs.map((drug) => (
                <div
                  key={`${drug.id}-${drug.source}`}
                  className={cn(
                    "hover:bg-muted/50 cursor-pointer rounded-lg border p-4 transition-colors",
                    selectedDrug?.id === drug.id &&
                      selectedDrug?.source === drug.source
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                  onClick={() => handleDrugSelect(drug)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold">{drug.brand}</h4>
                        <Badge
                          variant={
                            drug.source === "custom" ? "secondary" : "default"
                          }
                        >
                          {drug.source === "custom"
                            ? "Personnalisé"
                            : "Système"}
                        </Badge>
                      </div>

                      <div className="text-muted-foreground space-y-1 text-sm">
                        <p>
                          <span className="font-medium">DCI:</span> {drug.dci}
                        </p>
                        <p>
                          <span className="font-medium">Dosage:</span>{" "}
                          {drug.strength}
                        </p>
                        <p>
                          <span className="font-medium">Forme:</span>{" "}
                          {drug.form}
                        </p>
                        <p>
                          <span className="font-medium">Voie:</span>{" "}
                          {drug.route}
                        </p>
                        <p>
                          <span className="font-medium">Présentation:</span>{" "}
                          {drug.presentation}
                        </p>
                        {drug.classeTherapeutique && (
                          <p>
                            <span className="font-medium">Classe:</span>{" "}
                            {drug.classeTherapeutique}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      {drug.source === "custom" ? (
                        <Plus className="text-muted-foreground h-5 w-5" />
                      ) : (
                        <Pill className="text-muted-foreground h-5 w-5" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Selected Drug Summary */}
          {selectedDrug && (
            <div className="border-t pt-4">
              <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
                <h4 className="text-primary mb-2 font-semibold">
                  Médicament sélectionné:
                </h4>
                <p className="text-sm">
                  <span className="font-medium">{selectedDrug.brand}</span> -{" "}
                  {selectedDrug.strength} {selectedDrug.form}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {selectedDrug.dci} • {selectedDrug.route}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleConfirmSelection} disabled={!selectedDrug}>
            Sélectionner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
