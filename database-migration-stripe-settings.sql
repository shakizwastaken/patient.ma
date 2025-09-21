-- Add Stripe integration fields to organization table
-- Migration: Add Stripe settings to organizations

-- Add Stripe configuration columns
ALTER TABLE organization 
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS stripe_enabled BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN organization.stripe_publishable_key IS 'Stripe publishable key for client-side payment processing';
COMMENT ON COLUMN organization.stripe_secret_key IS 'Stripe secret key for server-side payment processing';
COMMENT ON COLUMN organization.stripe_webhook_secret IS 'Stripe webhook secret for validating webhook events';
COMMENT ON COLUMN organization.stripe_enabled IS 'Whether Stripe payment processing is enabled for this organization';

-- Create index for organizations with Stripe enabled
CREATE INDEX IF NOT EXISTS idx_organization_stripe_enabled ON organization(stripe_enabled) WHERE stripe_enabled = TRUE;
