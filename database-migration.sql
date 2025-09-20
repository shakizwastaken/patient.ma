-- Migration script for Google Calendar integration
-- Run this SQL against your database to add the required fields

-- Add Google integration fields to organization table
ALTER TABLE organization ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS google_integration_enabled BOOLEAN DEFAULT FALSE;

-- Add meeting link fields to appointment table
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS meeting_id TEXT;

-- Create index for better performance on Google integration queries
CREATE INDEX IF NOT EXISTS idx_organization_google_integration ON organization(google_integration_enabled) WHERE google_integration_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_appointment_meeting ON appointment(meeting_id) WHERE meeting_id IS NOT NULL;
