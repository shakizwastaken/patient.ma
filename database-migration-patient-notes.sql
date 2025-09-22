-- Migration: Add patient notes table
-- Description: Create patient_note table for storing notes about patients

CREATE TABLE IF NOT EXISTS patient_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_note_patient_id ON patient_note(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_note_organization_id ON patient_note(organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_note_author_id ON patient_note(author_id);
CREATE INDEX IF NOT EXISTS idx_patient_note_created_at ON patient_note(created_at DESC);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patient_note_updated_at 
    BEFORE UPDATE ON patient_note 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
