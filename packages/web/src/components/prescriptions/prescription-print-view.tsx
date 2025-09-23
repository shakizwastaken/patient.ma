"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Printer,
  Download,
  Calendar,
  User,
  Pill,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PrescriptionData {
  id: string;
  prescriptionNumber: string;
  date: Date;
  diagnosis?: string | null;
  doctorName: string;
  doctorSignature?: string | null;
  doctorLicenseNumber?: string | null;
  instructions?: string | null;
  notes?: string | null;
  status: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phoneNumber?: string | null;
    age?: number | null;
    birthDate?: Date | null;
  };
  author: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    drugName: string;
    drugDci: string;
    drugStrength: string;
    drugForm: string;
    drugPresentation: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity?: string | null;
    instructions?: string | null;
    order: number;
  }>;
}

interface PrescriptionPrintViewProps {
  prescription: PrescriptionData;
  onPrint?: () => void;
  onDownload?: () => void;
  showActions?: boolean;
}

export function PrescriptionPrintView({
  prescription,
  onPrint,
  onDownload,
  showActions = true,
}: PrescriptionPrintViewProps) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }

    // Default print behavior
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordonnance ${prescription.prescriptionNumber}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.4;
              margin: 20px;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 18pt;
              font-weight: bold;
              margin: 0 0 10px 0;
            }
            .header .subtitle {
              font-size: 14pt;
              margin: 0;
            }
            .prescription-info {
              margin-bottom: 20px;
            }
            .prescription-info .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .prescription-info .label {
              font-weight: bold;
            }
            .patient-info {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #000;
            }
            .patient-info h3 {
              font-size: 14pt;
              font-weight: bold;
              margin: 0 0 10px 0;
              text-decoration: underline;
            }
            .drug-item {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #000;
              page-break-inside: avoid;
            }
            .drug-item h4 {
              font-size: 14pt;
              font-weight: bold;
              margin: 0 0 10px 0;
              text-decoration: underline;
            }
            .drug-details {
              margin-bottom: 10px;
            }
            .prescription-details {
              margin-top: 15px;
            }
            .prescription-details .row {
              display: flex;
              margin-bottom: 5px;
            }
            .prescription-details .label {
              font-weight: bold;
              min-width: 80px;
            }
            .instructions {
              margin-top: 20px;
              padding: 15px;
              border: 1px solid #000;
            }
            .instructions h3 {
              font-size: 14pt;
              font-weight: bold;
              margin: 0 0 10px 0;
              text-decoration: underline;
            }
            .signature-area {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              align-items: end;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              width: 200px;
              margin-top: 20px;
            }
            .signature-label {
              font-size: 10pt;
              text-align: center;
              margin-top: 5px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // Default download as PDF (this would require a PDF library in a real implementation)
    const element = document.createElement("a");
    const file = new Blob([printRef.current?.innerHTML || ""], {
      type: "text/html",
    });
    element.href = URL.createObjectURL(file);
    element.download = `ordonnance-${prescription.prescriptionNumber}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="flex justify-end gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </Button>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        </div>
      )}

      <div ref={printRef} className="bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 border-b-2 border-black pb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">ORDONNANCE MÉDICALE</h1>
          <p className="text-lg">Cabinet Médical</p>
        </div>

        {/* Prescription Info */}
        <div className="mb-6">
          <div className="mb-2 flex justify-between">
            <span className="font-semibold">Numéro d'ordonnance:</span>
            <span>{prescription.prescriptionNumber}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>
              {format(new Date(prescription.date), "dd/MM/yyyy", {
                locale: fr,
              })}
            </span>
          </div>
          {prescription.doctorLicenseNumber && (
            <div className="flex justify-between">
              <span className="font-semibold">N° Licence:</span>
              <span>{prescription.doctorLicenseNumber}</span>
            </div>
          )}
        </div>

        {/* Patient Info */}
        <div className="mb-6 border border-black p-4">
          <h3 className="mb-3 text-lg font-bold underline">PATIENT</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <span className="font-semibold">Nom:</span>{" "}
                {prescription.patient.lastName}
              </p>
              <p>
                <span className="font-semibold">Prénom:</span>{" "}
                {prescription.patient.firstName}
              </p>
            </div>
            <div>
              {prescription.patient.age && (
                <p>
                  <span className="font-semibold">Âge:</span>{" "}
                  {prescription.patient.age} ans
                </p>
              )}
              {prescription.patient.phoneNumber && (
                <p>
                  <span className="font-semibold">Téléphone:</span>{" "}
                  {prescription.patient.phoneNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        {prescription.diagnosis && (
          <div className="mb-6 border border-black p-4">
            <h3 className="mb-3 text-lg font-bold underline">DIAGNOSTIC</h3>
            <p>{prescription.diagnosis}</p>
          </div>
        )}

        {/* Prescription Items */}
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-bold underline">PRESCRIPTION</h3>
          <div className="space-y-4">
            {prescription.items
              .sort((a, b) => a.order - b.order)
              .map((item, index) => (
                <div key={item.id} className="border border-black p-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary text-primary-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-2 text-lg font-bold underline">
                        {item.drugName}
                      </h4>
                      <div className="mb-3 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold">DCI:</span>{" "}
                          {item.drugDci}
                        </p>
                        <p>
                          <span className="font-semibold">Dosage:</span>{" "}
                          {item.drugStrength} •{" "}
                          <span className="font-semibold">Forme:</span>{" "}
                          {item.drugForm}
                        </p>
                        <p>
                          <span className="font-semibold">Présentation:</span>{" "}
                          {item.drugPresentation}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">Posologie:</span>
                          <p>{item.dosage}</p>
                        </div>
                        <div>
                          <span className="font-semibold">Fréquence:</span>
                          <p>{item.frequency}</p>
                        </div>
                        <div>
                          <span className="font-semibold">Durée:</span>
                          <p>{item.duration}</p>
                        </div>
                      </div>

                      {item.quantity && (
                        <div className="mt-2">
                          <span className="font-semibold">
                            Quantité à délivrer:
                          </span>
                          <p>{item.quantity}</p>
                        </div>
                      )}

                      {item.instructions && (
                        <div className="mt-2">
                          <span className="font-semibold">
                            Instructions particulières:
                          </span>
                          <p className="text-sm">{item.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* General Instructions */}
        {prescription.instructions && (
          <div className="mb-6 border border-black p-4">
            <h3 className="mb-3 text-lg font-bold underline">
              INSTRUCTIONS GÉNÉRALES
            </h3>
            <p>{prescription.instructions}</p>
          </div>
        )}

        {/* Signature Area */}
        <div className="mt-12 flex items-end justify-between">
          <div>
            <p className="text-sm">
              Fait le{" "}
              {format(new Date(prescription.date), "dd/MM/yyyy", {
                locale: fr,
              })}
            </p>
          </div>
          <div className="text-center">
            {prescription.doctorSignature ? (
              <div className="mb-2">
                <img
                  src={prescription.doctorSignature}
                  alt="Signature du médecin"
                  className="h-16 w-auto"
                />
              </div>
            ) : (
              <div className="mb-2 w-48 border-b border-black"></div>
            )}
            <p className="text-sm font-semibold">{prescription.doctorName}</p>
            <p className="text-xs">Médecin</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
          <p>
            Ordonnance générée le{" "}
            {format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}
          </p>
          <p>
            Cette ordonnance est valide 3 mois à partir de la date d'émission
          </p>
        </div>
      </div>
    </div>
  );
}
