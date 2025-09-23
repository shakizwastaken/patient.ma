"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Edit3, Pill } from "lucide-react";

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

interface PrescriptionItemFormProps {
  item: PrescriptionItem;
  drug?: Drug;
  onUpdate: (item: PrescriptionItem) => void;
  onRemove: () => void;
  onEditDrug: () => void;
  isEditing?: boolean;
}

export function PrescriptionItemForm({
  item,
  drug,
  onUpdate,
  onRemove,
  onEditDrug,
  isEditing = false,
}: PrescriptionItemFormProps) {
  const [localItem, setLocalItem] = React.useState<PrescriptionItem>(item);

  React.useEffect(() => {
    setLocalItem(item);
  }, [item]);

  const handleFieldChange = (
    field: keyof PrescriptionItem,
    value: string | number,
  ) => {
    const updatedItem = { ...localItem, [field]: value };
    setLocalItem(updatedItem);
    onUpdate(updatedItem);
  };

  const commonDosages = [
    "1 comprimé",
    "1/2 comprimé",
    "2 comprimés",
    "1 cuillère à café",
    "1 cuillère à soupe",
    "1 cuillère doseuse",
    "5 ml",
    "10 ml",
    "1 goutte",
    "2 gouttes",
    "3 gouttes",
    "1 application",
    "2 applications",
  ];

  const commonFrequencies = [
    "1 fois par jour",
    "2 fois par jour",
    "3 fois par jour",
    "4 fois par jour",
    "6 fois par jour",
    "8 fois par jour",
    "Toutes les 4 heures",
    "Toutes les 6 heures",
    "Toutes les 8 heures",
    "Toutes les 12 heures",
    "Au coucher",
    "À jeun",
    "Avant les repas",
    "Après les repas",
    "Au besoin",
  ];

  const commonDurations = [
    "3 jours",
    "5 jours",
    "7 jours",
    "10 jours",
    "14 jours",
    "21 jours",
    "1 mois",
    "2 mois",
    "3 mois",
    "6 mois",
    "En continu",
    "Jusqu'à amélioration",
    "Selon prescription",
  ];

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="text-primary h-4 w-4" />
            <CardTitle className="text-lg">{localItem.drugName}</CardTitle>
            {drug && (
              <Badge
                variant={drug.source === "custom" ? "secondary" : "default"}
              >
                {drug.source === "custom" ? "Personnalisé" : "Système"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditDrug}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {drug && (
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>
              <span className="font-medium">DCI:</span> {drug.dci}
            </p>
            <p>
              <span className="font-medium">Dosage:</span> {drug.strength} •{" "}
              <span className="font-medium">Forme:</span> {drug.form}
            </p>
            <p>
              <span className="font-medium">Voie:</span> {drug.route} •{" "}
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
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        {/* Dosage */}
        <div className="space-y-2">
          <Label htmlFor={`dosage-${localItem.order}`}>Dosage *</Label>
          <div className="flex gap-2">
            <Input
              id={`dosage-${localItem.order}`}
              value={localItem.dosage}
              onChange={(e) => handleFieldChange("dosage", e.target.value)}
              placeholder="Ex: 1 comprimé"
              className="flex-1"
            />
            <div className="flex flex-wrap gap-1">
              {commonDosages.slice(0, 4).map((dosage) => (
                <Button
                  key={dosage}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFieldChange("dosage", dosage)}
                  className="h-7 px-2 text-xs"
                >
                  {dosage}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label htmlFor={`frequency-${localItem.order}`}>Fréquence *</Label>
          <div className="flex gap-2">
            <Input
              id={`frequency-${localItem.order}`}
              value={localItem.frequency}
              onChange={(e) => handleFieldChange("frequency", e.target.value)}
              placeholder="Ex: 3 fois par jour"
              className="flex-1"
            />
            <div className="flex flex-wrap gap-1">
              {commonFrequencies.slice(0, 4).map((frequency) => (
                <Button
                  key={frequency}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFieldChange("frequency", frequency)}
                  className="h-7 px-2 text-xs"
                >
                  {frequency}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor={`duration-${localItem.order}`}>Durée *</Label>
          <div className="flex gap-2">
            <Input
              id={`duration-${localItem.order}`}
              value={localItem.duration}
              onChange={(e) => handleFieldChange("duration", e.target.value)}
              placeholder="Ex: 7 jours"
              className="flex-1"
            />
            <div className="flex flex-wrap gap-1">
              {commonDurations.slice(0, 4).map((duration) => (
                <Button
                  key={duration}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFieldChange("duration", duration)}
                  className="h-7 px-2 text-xs"
                >
                  {duration}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Quantity (optional) */}
        <div className="space-y-2">
          <Label htmlFor={`quantity-${localItem.order}`}>
            Quantité à délivrer
          </Label>
          <Input
            id={`quantity-${localItem.order}`}
            value={localItem.quantity || ""}
            onChange={(e) => handleFieldChange("quantity", e.target.value)}
            placeholder="Ex: 1 boîte, 30 comprimés"
          />
        </div>

        {/* Instructions (optional) */}
        <div className="space-y-2">
          <Label htmlFor={`instructions-${localItem.order}`}>
            Instructions particulières
          </Label>
          <Textarea
            id={`instructions-${localItem.order}`}
            value={localItem.instructions || ""}
            onChange={(e) => handleFieldChange("instructions", e.target.value)}
            placeholder="Ex: À prendre avec un verre d'eau, éviter l'exposition au soleil..."
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
