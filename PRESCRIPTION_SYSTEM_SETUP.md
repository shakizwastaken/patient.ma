# Prescription System Setup Guide

This guide will help you set up the comprehensive prescription system for the medical application.

## Overview

The prescription system includes:

- **Moroccan Drugs Database**: Complete database of medications available in Morocco
- **Custom Drugs**: Organizations can add their own custom medications
- **Prescription Management**: Create, edit, view, and print prescriptions
- **Printable Prescriptions**: Professional prescription format for printing

## Database Setup

### 1. Run Database Migration

First, run the database migration to create the necessary tables:

```bash
# Navigate to your project root
cd packages/web

# Run the migration (adjust connection string as needed)
psql -d your_database -f ../../database-migration-prescriptions.sql
```

Or use your preferred database migration tool.

### 2. Populate Drugs Database

The system includes a script to populate the drugs database from the Moroccan drugs JSON files:

```bash
# Navigate to the web package
cd packages/web

# Install dependencies if not already done
npm install

# Run the population script
npm run tsx scripts/populate-drugs-database.ts
```

This will:

- Clear existing drug data
- Import all drugs from `data/morocco_drugs.json` and `data/search_min.json`
- Create searchable indexes for fast drug lookup
- Normalize drug names and create searchable text

## Features

### Drug Search

- Search by brand name, DCI (international name), or active substance
- Full-text search with French language support
- Popular drugs suggestions
- Custom organization drugs support

### Prescription Creation

- Intuitive drug selection with search
- Pre-filled dosage, frequency, and duration options
- Custom instructions per medication
- Doctor information and signature support
- Patient linking and appointment integration

### Prescription Management

- View all prescriptions with filtering
- Edit existing prescriptions
- Duplicate prescriptions for recurring treatments
- Status tracking (active, completed, cancelled)

### Printing

- Professional prescription format
- Print-optimized layout
- Doctor signature support
- Patient information display
- Medication details with instructions

## API Endpoints

### Drugs

- `drugs.search` - Search medications
- `drugs.getPopular` - Get popular medications
- `drugs.getById` - Get drug details
- `drugs.getCustomDrugs` - Get organization custom drugs
- `drugs.createCustom` - Create custom drug
- `drugs.updateCustom` - Update custom drug
- `drugs.deleteCustom` - Delete custom drug

### Prescriptions

- `prescriptions.getAll` - Get all prescriptions (with pagination)
- `prescriptions.getById` - Get prescription details
- `prescriptions.create` - Create new prescription
- `prescriptions.update` - Update prescription
- `prescriptions.delete` - Delete prescription
- `prescriptions.getByPatient` - Get patient prescriptions
- `prescriptions.duplicate` - Duplicate prescription

## UI Components

### Core Components

- `DrugSearchDialog` - Drug search and selection
- `PrescriptionItemForm` - Individual medication form
- `CreatePrescriptionDialog` - Prescription creation
- `PrescriptionPrintView` - Printable prescription view
- `PrescriptionsTable` - Prescriptions listing
- `PatientPrescriptions` - Patient-specific prescriptions

### Integration

The prescription system is integrated into:

- Patient details view
- Main prescriptions page (`/prescriptions`)
- Patient management workflows

## Usage Examples

### Creating a Prescription

```typescript
// Search for a drug
const searchResults = await api.drugs.search.query({
  query: "paracetamol",
  limit: 10,
  includeCustom: true,
});

// Create prescription
const prescription = await api.prescriptions.create.mutate({
  patientId: "patient-uuid",
  doctorName: "Dr. Smith",
  diagnosis: "Headache",
  items: [
    {
      drugId: "drug-uuid",
      drugName: "Doliprane",
      drugDci: "PARACETAMOL",
      drugStrength: "1000 MG",
      drugForm: "COMPRIME",
      drugPresentation: "BOITE DE 16",
      dosage: "1 comprimé",
      frequency: "3 fois par jour",
      duration: "5 jours",
    },
  ],
});
```

### Searching Drugs

```typescript
// Search with filters
const drugs = await api.drugs.search.query({
  query: "antibiotic",
  limit: 20,
  includeCustom: true,
});
```

## Data Structure

### Drug Schema

```typescript
interface Drug {
  id: string;
  brand: string; // Commercial name
  dci: string; // International name
  substanceActive: string; // Active substance
  strength: string; // Dosage strength
  form: string; // Pharmaceutical form
  route: string; // Administration route
  presentation: string; // Package presentation
  classeTherapeutique?: string; // Therapeutic class
  // ... pricing and regulatory info
}
```

### Prescription Schema

```typescript
interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  doctorName: string;
  diagnosis?: string;
  instructions?: string;
  items: PrescriptionItem[];
  // ... metadata
}
```

## Customization

### Adding Custom Drugs

Organizations can add their own medications that aren't in the Moroccan database:

```typescript
const customDrug = await api.drugs.createCustom.mutate({
  brand: "Custom Medicine",
  dci: "CUSTOM SUBSTANCE",
  substanceActive: "Custom Active Ingredient",
  strength: "500 MG",
  form: "COMPRIME",
  route: "ORALE",
  presentation: "BOITE DE 30",
  description: "Custom medication description",
});
```

### Prescription Templates

You can create prescription templates for common treatments:

```typescript
// Duplicate existing prescription
const newPrescription = await api.prescriptions.duplicate.mutate({
  id: "template-prescription-id",
});
```

## Security & Permissions

- All prescription operations are organization-scoped
- Patients can only access prescriptions from their organization
- Custom drugs are organization-specific
- Doctor information is required for all prescriptions

## Troubleshooting

### Common Issues

1. **Drug search not working**
   - Ensure the drugs database is populated
   - Check database indexes are created
   - Verify search query length (minimum 1 character)

2. **Prescription creation fails**
   - Verify patient belongs to organization
   - Check all required fields are filled
   - Ensure at least one medication is added

3. **Print functionality issues**
   - Check browser popup blockers
   - Ensure JavaScript is enabled
   - Verify prescription data is complete

### Database Issues

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('drug', 'prescription', 'prescription_item', 'organization_custom_drug');

-- Check drug count
SELECT COUNT(*) FROM drug;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'drug';
```

## Performance Optimization

- Drug search uses full-text search indexes
- Prescriptions are paginated for large datasets
- Custom drugs are cached per organization
- Database queries are optimized with proper indexes

## Future Enhancements

Potential improvements:

- PDF export with digital signatures
- Prescription templates and favorites
- Drug interaction checking
- Prescription history analytics
- Integration with pharmacy systems
- Mobile app support
- Barcode scanning for drugs

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Check database logs for errors
4. Verify all dependencies are installed

The prescription system is designed to be robust, user-friendly, and compliant with medical practice requirements in Morocco.
