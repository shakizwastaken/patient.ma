/**
 * Utility functions for prescription management
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function generatePrescriptionNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = String(now.getTime()).slice(-6);

  return `RX${year}${month}${day}${time}`;
}

export function formatPrescriptionDate(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: fr });
}

export function formatPrescriptionDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy à HH:mm", { locale: fr });
}

export function getPrescriptionStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-green-600 bg-green-100";
    case "completed":
      return "text-blue-600 bg-blue-100";
    case "cancelled":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

export function getPrescriptionStatusLabel(status: string): string {
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
}

export function validatePrescriptionItem(item: any): string[] {
  const errors: string[] = [];

  if (!item.drugName?.trim()) {
    errors.push("Le nom du médicament est requis");
  }

  if (!item.dosage?.trim()) {
    errors.push("La posologie est requise");
  }

  if (!item.frequency?.trim()) {
    errors.push("La fréquence est requise");
  }

  if (!item.duration?.trim()) {
    errors.push("La durée est requise");
  }

  return errors;
}

export function validatePrescription(prescription: any): string[] {
  const errors: string[] = [];

  if (!prescription.doctorName?.trim()) {
    errors.push("Le nom du médecin est requis");
  }

  if (!prescription.patientId) {
    errors.push("Le patient est requis");
  }

  if (!prescription.items || prescription.items.length === 0) {
    errors.push("Au moins un médicament est requis");
  } else {
    prescription.items.forEach((item: any, index: number) => {
      const itemErrors = validatePrescriptionItem(item);
      itemErrors.forEach((error) => {
        errors.push(`Médicament ${index + 1}: ${error}`);
      });
    });
  }

  return errors;
}

export function exportPrescriptionToPDF(prescription: any): void {
  // This would integrate with a PDF library like jsPDF or react-pdf
  // For now, we'll use the browser's print functionality
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
          .prescription-info {
            margin-bottom: 20px;
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
          }
          .drug-item h4 {
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ORDONNANCE MÉDICALE</h1>
          <p>Cabinet Médical</p>
        </div>
        
        <div class="prescription-info">
          <p><strong>Numéro d'ordonnance:</strong> ${prescription.prescriptionNumber}</p>
          <p><strong>Date:</strong> ${formatPrescriptionDate(new Date(prescription.date))}</p>
        </div>
        
        <div class="patient-info">
          <h3>PATIENT</h3>
          <p><strong>Nom:</strong> ${prescription.patient.lastName}</p>
          <p><strong>Prénom:</strong> ${prescription.patient.firstName}</p>
          ${prescription.patient.age ? `<p><strong>Âge:</strong> ${prescription.patient.age} ans</p>` : ""}
        </div>
        
        ${
          prescription.diagnosis
            ? `
          <div class="patient-info">
            <h3>DIAGNOSTIC</h3>
            <p>${prescription.diagnosis}</p>
          </div>
        `
            : ""
        }
        
        <div>
          <h3>PRESCRIPTION</h3>
          ${prescription.items
            .map(
              (item: any, index: number) => `
            <div class="drug-item">
              <h4>${index + 1}. ${item.drugName}</h4>
              <p><strong>DCI:</strong> ${item.drugDci}</p>
              <p><strong>Dosage:</strong> ${item.drugStrength} ${item.drugForm}</p>
              <p><strong>Posologie:</strong> ${item.dosage}</p>
              <p><strong>Fréquence:</strong> ${item.frequency}</p>
              <p><strong>Durée:</strong> ${item.duration}</p>
              ${item.instructions ? `<p><strong>Instructions:</strong> ${item.instructions}</p>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
        
        ${
          prescription.instructions
            ? `
          <div class="patient-info">
            <h3>INSTRUCTIONS GÉNÉRALES</h3>
            <p>${prescription.instructions}</p>
          </div>
        `
            : ""
        }
        
        <div class="signature-area">
          <div>
            <p>Fait le ${formatPrescriptionDate(new Date(prescription.date))}</p>
          </div>
          <div>
            <div class="signature-line"></div>
            <p><strong>${prescription.doctorName}</strong></p>
            <p>Médecin</p>
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

export function calculatePrescriptionDuration(items: any[]): string {
  const durations = items.map((item) => {
    const match = item.duration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });

  const maxDuration = Math.max(...durations);
  return maxDuration > 0 ? `${maxDuration} jours` : "Non spécifié";
}

export function getPrescriptionSummary(prescription: any): string {
  const itemCount = prescription.items?.length || 0;
  const duration = calculatePrescriptionDuration(prescription.items || []);

  return `${itemCount} médicament(s) • Durée: ${duration}`;
}
