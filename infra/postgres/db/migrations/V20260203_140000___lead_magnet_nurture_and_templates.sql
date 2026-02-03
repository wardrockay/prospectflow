-- V20260203_140000___lead_magnet_nurture_and_templates.sql
-- Domain: B2C Lead Generation - Admin Dashboard
-- Purpose: Create schema for nurture sequences and email templates management
--
-- Tables:
--   - lm_email_templates: Reusable email templates with variable substitution
--   - lm_nurture_sequences: Sequence definitions (manual planning, no automation yet)
--   - lm_nurture_emails: Ordered emails within a nurture sequence
--
-- Design Decisions:
--   - Uses 'public' schema with 'lm_' prefix (consistent with existing tables)
--   - NO organisation_id (B2C system, not multi-tenant)
--   - ON DELETE CASCADE for referential integrity
--   - Nurture sequences are for MANUAL planning only (Phase 1)
--   - Email automation will be added in Phase 2

-- ============================================================================
-- TABLE 1: lm_email_templates
-- ============================================================================
-- Purpose: Reusable email templates for confirmation, nurture, etc.
-- Variables: {{email}}, {{download_url}}, {{subscriber_name}} (future)

CREATE TABLE IF NOT EXISTS public.lm_email_templates (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Fields
  name TEXT NOT NULL,           -- e.g., "Confirmation Double Opt-in", "Welcome Email"
  subject TEXT NOT NULL,        -- Subject line with optional variables
  html_body TEXT NOT NULL,      -- HTML email body with {{variables}}
  
  -- Metadata
  description TEXT,             -- Optional description for admin UI
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing templates in admin UI (sorted by name)
CREATE INDEX idx_lm_email_templates_name 
  ON public.lm_email_templates(name);

-- Index for ordering by update date
CREATE INDEX idx_lm_email_templates_updated_at 
  ON public.lm_email_templates(updated_at DESC);

COMMENT ON TABLE public.lm_email_templates IS 'Reusable email templates with variable substitution';
COMMENT ON COLUMN public.lm_email_templates.html_body IS 'HTML body with variables: {{email}}, {{download_url}}, {{subscriber_name}}';

-- ============================================================================
-- TABLE 2: lm_nurture_sequences
-- ============================================================================
-- Purpose: Nurture sequence definitions (manual planning in Phase 1)
-- Status: draft = planning | active = ready to use (manual send)

CREATE TABLE IF NOT EXISTS public.lm_nurture_sequences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Fields
  name TEXT NOT NULL,           -- e.g., "Post-Download Follow-up", "Engagement Series"
  description TEXT,             -- Purpose and strategy
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing sequences in admin UI
CREATE INDEX idx_lm_nurture_sequences_status 
  ON public.lm_nurture_sequences(status);

CREATE INDEX idx_lm_nurture_sequences_name 
  ON public.lm_nurture_sequences(name);

COMMENT ON TABLE public.lm_nurture_sequences IS 'Nurture sequence definitions for manual planning (Phase 1: no automation)';
COMMENT ON COLUMN public.lm_nurture_sequences.status IS 'draft: planning stage | active: ready to use | archived: no longer in use';

-- ============================================================================
-- TABLE 3: lm_nurture_emails
-- ============================================================================
-- Purpose: Ordered list of emails within a nurture sequence
-- Delay: Days after previous email (or confirmation for first email)

CREATE TABLE IF NOT EXISTS public.lm_nurture_emails (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  sequence_id UUID NOT NULL REFERENCES public.lm_nurture_sequences(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.lm_email_templates(id) ON DELETE SET NULL,
  
  -- Core Fields
  order_index INT NOT NULL,      -- Position in sequence: 1, 2, 3...
  subject TEXT NOT NULL,         -- Subject line (can override template)
  delay_days INT NOT NULL DEFAULT 0 CHECK (delay_days >= 0),  -- Days after previous
  
  -- Metadata
  notes TEXT,                    -- Admin notes about this email
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering emails within a sequence
CREATE INDEX idx_lm_nurture_emails_sequence 
  ON public.lm_nurture_emails(sequence_id, order_index);

-- Unique constraint: one order_index per sequence
CREATE UNIQUE INDEX idx_lm_nurture_emails_sequence_order 
  ON public.lm_nurture_emails(sequence_id, order_index);

COMMENT ON TABLE public.lm_nurture_emails IS 'Ordered emails within a nurture sequence (manual planning only)';
COMMENT ON COLUMN public.lm_nurture_emails.order_index IS 'Position in sequence: 1 = first email, 2 = second, etc.';
COMMENT ON COLUMN public.lm_nurture_emails.delay_days IS 'Days after previous email (or confirmation for first email)';
COMMENT ON COLUMN public.lm_nurture_emails.template_id IS 'Reference to email template (nullable if template is deleted)';

-- ============================================================================
-- SEED DATA: Confirmation Email Template
-- ============================================================================
-- Pre-populate the confirmation email template used in LM-002

INSERT INTO public.lm_email_templates (name, subject, html_body, description) VALUES (
  'Confirmation Double Opt-in',
  'Confirmez votre téléchargement - Guide Mariée Sereine',
  '<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmez votre téléchargement</title>
</head>
<body style="font-family: ''Lato'', -apple-system, BlinkMacSystemFont, ''Segoe UI'', sans-serif; color: #213E60; background: #F4F2EF; padding: 0; margin: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #213E60 0%, #2D5173 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; font-family: ''Cormorant Garamond'', serif; font-size: 32px; margin: 0; font-weight: 600;">
        Confirmez votre téléchargement
      </h1>
    </div>
    
    <!-- Body -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Bonjour,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Merci de votre intérêt pour le <strong>Guide de la Mariée Sereine</strong> !
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
        Pour confirmer votre adresse email et accéder à votre guide, cliquez sur le bouton ci-dessous :
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="{{download_url}}" 
           style="display: inline-block; background: #FFCC2B; color: #213E60; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(255, 204, 43, 0.3); transition: all 0.3s;">
          Confirmer et Télécharger
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #E0E0E0;">
        ⏱️ Ce lien est valide pendant <strong>48 heures</strong>.
      </p>
      
      <p style="color: #999; font-size: 13px; line-height: 1.6; margin: 20px 0 0;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <span style="color: #666; word-break: break-all;">{{download_url}}</span>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #F4F2EF; padding: 30px; text-align: center; border-top: 1px solid #E0E0E0;">
      <p style="color: #213E60; font-size: 16px; margin: 0 0 10px; font-weight: 600;">
        Light & Shutter Photography
      </p>
      <p style="color: #666; font-size: 14px; margin: 0 0 15px;">
        Photographe de mariage à Toulouse
      </p>
      <p style="color: #999; font-size: 12px; margin: 0;">
        <a href="https://lightandshutter.fr" style="color: #94B6EF; text-decoration: none;">lightandshutter.fr</a> | 
        <a href="mailto:etienne.maillot@lightandshutter.fr" style="color: #94B6EF; text-decoration: none;">Contact</a>
      </p>
    </div>
    
  </div>
</body>
</html>',
  'Template de confirmation email pour le système de double opt-in (LM-002)'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================
-- Verify tables were created successfully

DO $$
BEGIN
  -- Check lm_email_templates exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_email_templates') THEN
    RAISE EXCEPTION 'Migration failed: lm_email_templates table not created';
  END IF;
  
  -- Check lm_nurture_sequences exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_nurture_sequences') THEN
    RAISE EXCEPTION 'Migration failed: lm_nurture_sequences table not created';
  END IF;
  
  -- Check lm_nurture_emails exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_nurture_emails') THEN
    RAISE EXCEPTION 'Migration failed: lm_nurture_emails table not created';
  END IF;
  
  -- Check seed data was inserted
  IF NOT EXISTS (SELECT 1 FROM public.lm_email_templates WHERE name = 'Confirmation Double Opt-in') THEN
    RAISE WARNING 'Seed data not found: Confirmation Double Opt-in template';
  END IF;
  
  RAISE NOTICE 'Migration V20260203_140000 completed successfully';
END $$;
