-- Migration: Add public booking fields and fix appointment structure

-- Add public booking fields to organization table
ALTER TABLE organization 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS public_booking_enabled BOOLEAN DEFAULT FALSE;

-- Add public booking field to organization_appointment_config table
ALTER TABLE organization_appointment_config 
ADD COLUMN IF NOT EXISTS public_booking_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- Make createdById nullable in appointment table to support public bookings
ALTER TABLE appointment 
ALTER COLUMN created_by_id DROP NOT NULL;

-- Create indexes for better performance on public booking queries
CREATE INDEX IF NOT EXISTS idx_organization_slug_public_booking 
ON organization(slug) WHERE public_booking_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_organization_public_booking_enabled 
ON organization(public_booking_enabled) WHERE public_booking_enabled = TRUE;

-- Update existing organizations to have a slug based on their name if they don't have one
UPDATE organization 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Ensure slugs are unique by appending numbers if needed
WITH numbered_orgs AS (
  SELECT id, name, slug, 
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM organization 
  WHERE slug IS NOT NULL
),
duplicate_slugs AS (
  SELECT id, slug, rn
  FROM numbered_orgs
  WHERE rn > 1
)
UPDATE organization 
SET slug = CONCAT(organization.slug, '-', duplicate_slugs.rn)
FROM duplicate_slugs
WHERE organization.id = duplicate_slugs.id;
