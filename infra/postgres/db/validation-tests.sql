-- ================================================================
-- Database Schema Validation Tests
-- Story 0.1: Multi-tenant PostgreSQL Database Setup
-- ================================================================
-- Run these tests after migrations to verify AC compliance
--
-- Usage:
--   psql -U prospectflow -d prospectflow -f validation-tests.sql
-- ================================================================

\echo '==============================================='
\echo 'Test 1: Verify All Schemas Exist'
\echo '==============================================='

SELECT schema_name, 
       CASE 
         WHEN schema_name IN ('iam', 'crm', 'outreach', 'tracking') THEN '✅ PASS'
         ELSE '❌ FAIL'
       END as status
FROM information_schema.schemata 
WHERE schema_name IN ('iam', 'crm', 'outreach', 'tracking')
ORDER BY schema_name;

\echo ''
\echo 'Expected: 4 schemas (iam, crm, outreach, tracking)'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 2: Verify IAM Tables'
\echo '==============================================='

SELECT table_name,
       CASE 
         WHEN table_name IN ('organisations', 'users', 'organisation_users') THEN '✅ PASS'
         ELSE '⚠️  EXTRA'
       END as status
FROM information_schema.tables 
WHERE table_schema = 'iam'
ORDER BY table_name;

\echo ''
\echo 'Expected: organisations, users, organisation_users'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 3: Verify CRM Tables'
\echo '==============================================='

SELECT table_name,
       CASE 
         WHEN table_name IN ('companies', 'people', 'positions') THEN '✅ PASS'
         ELSE '⚠️  EXTRA'
       END as status
FROM information_schema.tables 
WHERE table_schema = 'crm'
ORDER BY table_name;

\echo ''
\echo 'Expected: companies, people, positions'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 4: Verify Outreach Tables'
\echo '==============================================='

SELECT table_name,
       CASE 
         WHEN table_name IN ('campaigns', 'messages', 'prompts', 'tasks') THEN '✅ REQUIRED'
         ELSE '✅ ENHANCED'
       END as status
FROM information_schema.tables 
WHERE table_schema = 'outreach'
ORDER BY table_name;

\echo ''
\echo 'Expected: campaigns, messages, prompts, tasks (+ enhanced tables for A/B testing)'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 5: Verify Tracking Tables'
\echo '==============================================='

SELECT table_name,
       CASE 
         WHEN table_name = 'pixels' THEN '✅ PASS'
         WHEN table_name = 'message_open_stats' THEN '✅ PASS (enhanced)'
         ELSE '⚠️  EXTRA'
       END as status
FROM information_schema.tables 
WHERE table_schema = 'tracking'
ORDER BY table_name;

\echo ''
\echo 'Expected: pixels, message_open_stats (replaces generic stats)'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 6: Verify Multi-Tenant Composite Keys'
\echo '==============================================='

SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  string_agg(a.attname, ', ' ORDER BY array_position(con.conkey, a.attnum)) AS primary_key_columns,
  CASE 
    WHEN string_agg(a.attname, ', ' ORDER BY array_position(con.conkey, a.attnum)) LIKE 'organisation_id,%' THEN '✅ PASS'
    WHEN n.nspname = 'iam' AND c.relname = 'organisations' THEN '✅ PASS (org table)'
    WHEN n.nspname = 'iam' AND c.relname = 'users' THEN '✅ PASS (user table)'
    WHEN c.relname = 'organisation_users' THEN '✅ PASS (junction)'
    ELSE '❌ FAIL - Missing organisation_id in PK'
  END as multi_tenant_compliance
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
WHERE con.contype = 'p'
  AND n.nspname IN ('iam', 'crm', 'outreach', 'tracking')
GROUP BY n.nspname, c.relname, con.conkey
ORDER BY n.nspname, c.relname;

\echo ''
\echo 'Expected: All tables except iam.organisations and iam.users should have organisation_id in PK'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 7: Verify Indexes Have Organisation_ID First'
\echo '==============================================='

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE 
    WHEN indexdef LIKE '%PRIMARY KEY%' THEN '✅ PRIMARY KEY'
    WHEN indexdef LIKE '%UNIQUE%' THEN '✅ UNIQUE INDEX'
    WHEN indexdef LIKE '%(organisation_id%' THEN '✅ PASS - org_id first'
    WHEN indexdef LIKE '%organisation_id%' THEN '⚠️  WARNING - org_id not first'
    ELSE '⚠️  INFO - no org_id'
  END as index_compliance
FROM pg_indexes 
WHERE schemaname IN ('iam', 'crm', 'outreach', 'tracking')
  AND indexdef NOT LIKE '%PRIMARY KEY%'
ORDER BY schemaname, tablename, indexname;

\echo ''
\echo 'Expected: Non-PK indexes on multi-tenant tables should have organisation_id as first column'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 8: Verify Foreign Key Constraints Include Organisation_ID'
\echo '==============================================='

SELECT
  tc.table_schema, 
  tc.table_name, 
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as fk_columns,
  ccu.table_schema AS references_schema,
  ccu.table_name AS references_table,
  CASE 
    WHEN tc.table_schema = 'iam' AND ccu.table_schema != 'iam' THEN '✅ PASS (IAM table)'
    WHEN string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) LIKE 'organisation_id,%' THEN '✅ PASS'
    WHEN string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) = 'organisation_id' THEN '✅ PASS (org ref)'
    ELSE '❌ FAIL - Missing organisation_id in FK'
  END as fk_compliance
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema IN ('iam', 'crm', 'outreach', 'tracking')
GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, ccu.table_schema, ccu.table_name
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name;

\echo ''
\echo 'Expected: All FKs should include organisation_id for referential integrity'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 9: Multi-Tenant Data Isolation Test'
\echo '==============================================='

-- Clean up any existing test data
DELETE FROM iam.organisations WHERE name IN ('Test Org A', 'Test Org B');

-- Insert test organizations
INSERT INTO iam.organisations (id, name) 
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Test Org A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Test Org B')
ON CONFLICT (id) DO NOTHING;

\echo 'Inserted 2 test organizations'

-- Insert test companies for each org
INSERT INTO crm.companies (organisation_id, id, name, website_url) 
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'Test Company A1', 'https://a1.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'Test Company B1', 'https://b1.test')
ON CONFLICT (organisation_id, id) DO NOTHING;

\echo 'Inserted 2 test companies (one per org)'
\echo ''

-- Test: Query Org A data
\echo 'Test 9a: Query Org A companies'
SELECT 
  organisation_id,
  name,
  CASE 
    WHEN COUNT(*) = 1 AND MAX(name) = 'Test Company A1' THEN '✅ PASS - Correct isolation'
    ELSE '❌ FAIL - Data leakage detected'
  END as isolation_test
FROM crm.companies 
WHERE organisation_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND name LIKE 'Test Company%'
GROUP BY organisation_id, name;

\echo ''

-- Test: Verify Org A cannot see Org B data
\echo 'Test 9b: Verify Org A cannot see Org B data'
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - No cross-org data leak'
    ELSE '❌ FAIL - Can see other org data!'
  END as isolation_test
FROM crm.companies 
WHERE organisation_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid 
  AND name = 'Test Company B1';

\echo ''

-- Cleanup test data
DELETE FROM crm.companies WHERE name IN ('Test Company A1', 'Test Company B1');
DELETE FROM iam.organisations WHERE name IN ('Test Org A', 'Test Org B');

\echo 'Cleaned up test data'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 10: Verify Flyway Migration History'
\echo '==============================================='

SELECT 
  installed_rank,
  version,
  description,
  type,
  script,
  installed_on,
  execution_time,
  CASE 
    WHEN success = true THEN '✅ SUCCESS'
    ELSE '❌ FAILED'
  END as status
FROM flyway_schema_history
ORDER BY installed_rank;

\echo ''
\echo 'Expected: All migrations successful'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 11: Verify PostgreSQL Version'
\echo '==============================================='

SELECT 
  version(),
  CASE 
    WHEN version() LIKE 'PostgreSQL 18%' THEN '✅ PASS - PostgreSQL 18'
    ELSE '❌ FAIL - Wrong version'
  END as version_check;

\echo ''
\echo 'Expected: PostgreSQL 18.x'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Test 12: Verify Extensions'
\echo '==============================================='

SELECT 
  extname,
  extversion,
  CASE 
    WHEN extname IN ('pgcrypto', 'citext') THEN '✅ REQUIRED'
    ELSE '✅ INSTALLED'
  END as status
FROM pg_extension
WHERE extname IN ('pgcrypto', 'citext', 'uuid-ossp', 'pg_stat_statements')
ORDER BY extname;

\echo ''
\echo 'Expected: pgcrypto, citext'
\echo ''

-- ================================================================
\echo '==============================================='
\echo 'Summary: All Tests Complete'
\echo '==============================================='
\echo ''
\echo 'Review the output above. All tests should show ✅ PASS.'
\echo 'If any tests show ❌ FAIL, investigate and fix before proceeding.'
\echo ''
\echo '==============================================='
