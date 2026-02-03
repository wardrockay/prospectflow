-- Test file for V20260203_140000 migration
-- Purpose: Validate that nurture sequences and email templates tables were created correctly

\echo '=== Testing Migration V20260203_140000 ==='

-- Test 1: Check lm_email_templates table exists
\echo '\nTest 1: lm_email_templates table exists'
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_email_templates')
    THEN '✅ PASS: lm_email_templates exists'
    ELSE '❌ FAIL: lm_email_templates not found'
  END as result;

-- Test 2: Check lm_nurture_sequences table exists
\echo '\nTest 2: lm_nurture_sequences table exists'
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_nurture_sequences')
    THEN '✅ PASS: lm_nurture_sequences exists'
    ELSE '❌ FAIL: lm_nurture_sequences not found'
  END as result;

-- Test 3: Check lm_nurture_emails table exists
\echo '\nTest 3: lm_nurture_emails table exists'
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_nurture_emails')
    THEN '✅ PASS: lm_nurture_emails exists'
    ELSE '❌ FAIL: lm_nurture_emails not found'
  END as result;

-- Test 4: Check seed data - confirmation email template
\echo '\nTest 4: Seed data - Confirmation email template'
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.lm_email_templates WHERE name = 'Confirmation Double Opt-in')
    THEN '✅ PASS: Confirmation template exists'
    ELSE '❌ FAIL: Confirmation template not found'
  END as result;

-- Test 5: Check lm_email_templates columns
\echo '\nTest 5: lm_email_templates columns'
SELECT 
  CASE 
    WHEN COUNT(*) = 6
    THEN '✅ PASS: All columns exist (id, name, subject, html_body, description, created_at, updated_at)'
    ELSE '❌ FAIL: Expected 6 columns, found ' || COUNT(*)
  END as result
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lm_email_templates';

-- Test 6: Check lm_nurture_sequences columns
\echo '\nTest 6: lm_nurture_sequences columns'
SELECT 
  CASE 
    WHEN COUNT(*) = 5
    THEN '✅ PASS: All columns exist (id, name, description, status, created_at, updated_at)'
    ELSE '❌ FAIL: Expected 5 columns, found ' || COUNT(*)
  END as result
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lm_nurture_sequences';

-- Test 7: Check lm_nurture_emails columns
\echo '\nTest 7: lm_nurture_emails columns'
SELECT 
  CASE 
    WHEN COUNT(*) = 7
    THEN '✅ PASS: All columns exist (id, sequence_id, template_id, order_index, subject, delay_days, notes, created_at)'
    ELSE '❌ FAIL: Expected 7 columns, found ' || COUNT(*)
  END as result
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lm_nurture_emails';

-- Test 8: Check foreign key constraint (nurture_emails -> nurture_sequences)
\echo '\nTest 8: Foreign key constraint (nurture_emails.sequence_id -> nurture_sequences.id)'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'lm_nurture_emails'
        AND constraint_name LIKE '%sequence_id%'
    )
    THEN '✅ PASS: Foreign key exists'
    ELSE '❌ FAIL: Foreign key not found'
  END as result;

-- Test 9: Check foreign key constraint (nurture_emails -> email_templates)
\echo '\nTest 9: Foreign key constraint (nurture_emails.template_id -> email_templates.id)'
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'lm_nurture_emails'
        AND constraint_name LIKE '%template_id%'
    )
    THEN '✅ PASS: Foreign key exists'
    ELSE '❌ FAIL: Foreign key not found'
  END as result;

-- Test 10: Check indexes
\echo '\nTest 10: Required indexes exist'
SELECT 
  CASE 
    WHEN COUNT(*) >= 6
    THEN '✅ PASS: All required indexes exist'
    ELSE '❌ FAIL: Expected at least 6 indexes, found ' || COUNT(*)
  END as result
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('lm_email_templates', 'lm_nurture_sequences', 'lm_nurture_emails');

-- Test 11: Insert and select test data
\echo '\nTest 11: CRUD operations work'
BEGIN;

-- Create test template
INSERT INTO public.lm_email_templates (name, subject, html_body, description)
VALUES ('Test Template', 'Test Subject', '<p>Test body {{email}}</p>', 'Test description')
RETURNING id \gset test_template_

-- Create test sequence
INSERT INTO public.lm_nurture_sequences (name, description, status)
VALUES ('Test Sequence', 'Test description', 'draft')
RETURNING id \gset test_sequence_

-- Create test email in sequence
INSERT INTO public.lm_nurture_emails (sequence_id, template_id, order_index, subject, delay_days)
VALUES (:'test_sequence_id', :'test_template_id', 1, 'First email', 0)
RETURNING id \gset test_email_

-- Verify cascade delete (delete sequence should delete emails)
DELETE FROM public.lm_nurture_sequences WHERE id = :'test_sequence_id';

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM public.lm_nurture_emails WHERE id = :'test_email_id')
    THEN '✅ PASS: CASCADE delete works'
    ELSE '❌ FAIL: CASCADE delete failed'
  END as result;

ROLLBACK;

\echo '\n=== All Tests Completed ==='
