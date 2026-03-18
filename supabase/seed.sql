-- =============================================================================
-- Seed: ai-radar
-- Purpose: Development/staging seed data only.
-- NEVER run on production.
-- =============================================================================

-- Test admin user profile (assumes auth.users entry exists with this UUID)
INSERT INTO public.profiles (id, organisation, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Organisation', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Test viewer profile
INSERT INTO public.profiles (id, organisation, role)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test Org 2', 'viewer')
ON CONFLICT (id) DO NOTHING;
