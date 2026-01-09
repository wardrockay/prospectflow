---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - '/home/tolliam/starlightcoder/LightAndShutter/prospectflow/doc/MULTI_SOURCE_DATA_ARCHITECTURE.md'
---

# ProspectFlow Multi-Source Data Architecture - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for implementing the Multi-Source Data Architecture in ProspectFlow, decomposing the requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR1**: Le système doit supporter l'import de données depuis plusieurs sources (Pharow, LinkedIn Sales Navigator, CSV)

**FR2**: Le système doit maintenir un registre de toutes les sources de données avec leur configuration et métadonnées

**FR3**: Le système doit créer et maintenir des mappings entre entités internes et identifiants externes pour chaque source

**FR4**: Le système doit tracer l'historique complet de tous les imports avec audit trail (jobs, records, actions)

**FR5**: Le système doit détecter et gérer les doublons lors de l'import depuis multiples sources

**FR6**: Le système doit stocker les données source-spécifiques dans des structures JSONB extensibles

**FR7**: Le système doit supporter les imports manuels (CSV/Excel uploads)

**FR8**: Le système doit permettre de réconcilier les conflits de données provenant de sources différentes

**FR9**: Le système doit maintenir des scores de confiance pour les données importées

**FR10**: Le système doit permettre de consulter l'historique et la provenance de toutes les données importées

### Non-Functional Requirements

**NFR1**: Les tables core (companies, people, positions) ne doivent contenir AUCUN champ source-spécifique (source-agnostic design)

**NFR2**: L'architecture doit être extensible pour supporter de nouvelles sources sans changements de schéma

**NFR3**: Toutes les opérations d'import doivent être traçables avec audit complet

**NFR4**: Le système doit maintenir l'intégrité référentielle via RLS (Row Level Security) multi-tenant

**NFR5**: Les données doivent être organisées par organisation_id pour isolation multi-tenant

**NFR6**: Les contraintes d'unicité doivent supporter plusieurs sources (composite keys)

**NFR7**: Les performances des queries de deduplication doivent être optimisées via indexes appropriés

### Additional Requirements

**Technical Architecture:**

- Schema Design: Créer 4 nouvelles tables (data_sources, external_entity_mappings, import_jobs, import_records)
- Data Migration: SKIP - database vide (pas de migration Pharow nécessaire)
- Core Tables Cleanup: Retirer pharow_company_id et pharow_list_name des tables existantes
- Deduplication Strategy: Implémenter matching sur SIREN, LinkedIn URL, email domain avec scoring de confiance
- Conflict Resolution: Implémenter logique basée sur confidence score, recency, et completeness
- Import Adapters: Créer adaptateurs pour Pharow, LinkedIn, et CSV avec field mappings
- Query Patterns: Implémenter patterns pour lookup par external_id, get all mappings, job statistics
- Indexes: Créer indexes sur (entity_type, entity_id), (data_source_id, external_id)
- JSONB Storage: Utiliser external_data pour attributs source-spécifiques
- RLS Constraints: Implémenter composite foreign keys avec organisation_id

**Priority Sources:**

1. Pharow (existing integration)
2. LinkedIn Sales Navigator
3. CSV/Excel manual uploads

### FR Coverage Map

**FR1** → Epic 3, 4, 5 (Support multi-sources: Pharow, LinkedIn, CSV)  
**FR2** → Epic 1 (Registre sources de données)  
**FR3** → Epic 2 (Mappings entités externes)  
**FR4** → Epic 1 (Audit trail complet)  
**FR5** → Epic 3, 4, 5 (Deduplication)  
**FR6** → Epic 2 (JSONB extensible)  
**FR7** → Epic 5 (Imports manuels CSV)  
**FR8** → Epic 3, 4 (Conflict resolution)  
**FR9** → Epic 2, 4 (Confidence scores)  
**FR10** → Epic 1, 3, 5 (Consultation historique)

**NFR1** → Epic 1, 6 (Source-agnostic design)  
**NFR2** → Epic 1, 2, 6 (Extensibilité)  
**NFR3** → Epic 1 (Traçabilité complète)  
**NFR4** → Epic 1 (RLS multi-tenant)  
**NFR5** → Epic 1 (Isolation par organisation)  
**NFR6** → Epic 2 (Composite keys)  
**NFR7** → Epic 2 (Indexes optimisés)

## Epic List

### Epic 1: Fondations Multi-Source

Établir l'infrastructure de base pour supporter plusieurs sources de données avec traçabilité complète.
**FRs covered:** FR2, FR4, NFR1, NFR2, NFR3, NFR4, NFR5

### Epic 2: Système de Mapping Entités Externes

Créer le système de liaison entre entités internes et identifiants externes pour toutes les sources.
**FRs covered:** FR3, FR6, FR9, NFR6, NFR7

### Epic 3: Import Pharow avec Deduplication

Implémenter l'import complet depuis Pharow avec détection et gestion intelligente des doublons.
**FRs covered:** FR1, FR5, FR8, FR10

### Epic 4: Import LinkedIn Sales Navigator

Supporter l'import de données depuis LinkedIn Sales Navigator avec enrichissement des profils.
**FRs covered:** FR1, FR5, FR8, FR9

### Epic 5: Import Manuel CSV/Excel

Permettre aux utilisateurs d'importer manuellement des données via fichiers CSV ou Excel.
**FRs covered:** FR1, FR7, FR5, FR10

### Epic 6: Nettoyage Schema Core

Retirer tous les champs source-spécifiques des tables core pour finaliser l'architecture source-agnostic.
**FRs covered:** NFR1, NFR2

---

## Epic 1: Fondations Multi-Source

Établir l'infrastructure de base pour supporter plusieurs sources de données avec traçabilité complète.

**User Outcome**: Les développeurs peuvent créer et configurer des sources de données multiples avec audit trail complet.

**FRs covered:** FR2, FR4, NFR1, NFR2, NFR3, NFR4, NFR5

**Implementation**: Tables data_sources, import_jobs, import_records + RLS policies

### Story 1.1: Data Sources Registry

**As a** system administrator  
**I want** to register and configure multiple data sources  
**So that** the system can track which sources are available and their settings

**Acceptance Criteria:**

**Given** the system has no data sources registered  
**When** I create a new data source with type "pharow", name "Pharow Main", and config JSON  
**Then** the data source is created with a unique ID  
**And** the data source has default_confidence_score of 0.70  
**And** the data source is marked as active by default  
**And** created_at and updated_at timestamps are set to current time

**Given** a data source already exists for an organisation  
**When** I attempt to create a duplicate with same source_type and source_name for that organisation  
**Then** the system rejects the creation with UNIQUE constraint error  
**And** returns appropriate error message indicating duplicate source

**Given** a data source exists  
**When** I query data sources for my organisation_id  
**Then** I receive only data sources belonging to my organisation  
**And** other organisations' sources are not visible (RLS enforced)

**Given** multiple data sources exist  
**When** I update a data source's configuration or confidence score  
**Then** the changes are persisted  
**And** updated_at timestamp is updated to current time  
**And** last_sync_at can be set when sync occurs

**Given** a data source exists  
**When** I deactivate it by setting is_active to false  
**Then** the source remains in database but marked inactive  
**And** can be reactivated later if needed

**Technical Requirements:**

- Table: crm.data_sources with all specified columns
- Composite UNIQUE constraint on (organisation_id, source_type, source_name)
- Foreign key to iam.organisations with CASCADE delete
- Default values: is_active=true, default_confidence_score=0.70, config='{}'

### Story 1.2: Import Jobs Tracking

**As a** data import manager  
**I want** to track all import job executions with their status and statistics  
**So that** I can monitor imports and troubleshoot failures

**Acceptance Criteria:**

**Given** a data source exists in the system  
**When** I create a new import job for that source  
**Then** the job is created with status 'pending'  
**And** job_type is specified (e.g., 'full_sync', 'incremental', 'manual_upload')  
**And** all counter fields default to 0 (records_processed, created, updated, skipped, failed)  
**And** started_at and completed_at are NULL  
**And** created_at and updated_at are set to current time

**Given** an import job is pending  
**When** the import process starts  
**Then** status changes to 'running'  
**And** started_at is set to current timestamp  
**And** updated_at is updated

**Given** an import job is running  
**When** records are processed  
**Then** records_processed counter increments  
**And** records_created, records_updated, records_skipped counters update based on actions  
**And** updated_at is refreshed periodically

**Given** an import job is running  
**When** the import completes successfully  
**Then** status changes to 'completed'  
**And** completed_at is set to current timestamp  
**And** all final statistics are persisted  
**And** error_message and error_details remain NULL

**Given** an import job is running  
**When** the import fails with an error  
**Then** status changes to 'failed'  
**And** completed_at is set to current timestamp  
**And** error_message contains failure description  
**And** error_details JSONB contains stack trace or additional context

**Given** an import job exists  
**When** I query jobs filtered by data_source_id and organisation_id  
**Then** I see only jobs for my organisation (RLS enforced)  
**And** jobs are correctly linked to their data source

**Given** I am a user  
**When** I trigger an import job manually  
**Then** triggered_by_user_id is set to my user ID  
**And** config JSONB can store job-specific parameters

**Technical Requirements:**

- Table: crm.import_jobs with all specified columns
- Foreign key: (organisation_id, data_source_id) REFERENCES crm.data_sources with CASCADE delete
- Status enum: 'pending', 'running', 'completed', 'failed', 'cancelled'
- Index: idx_import_jobs_source_status on (organisation_id, data_source_id, status)

### Story 1.3: Import Records Audit Trail

**As a** compliance officer  
**I want** complete audit history of every imported record  
**So that** I can trace data provenance and changes

**Acceptance Criteria:**

**Given** an import job is processing records  
**When** a record is created from external data  
**Then** an import_record entry is created with action='created'  
**And** entity_type is set (e.g., 'company', 'person', 'position')  
**And** entity_id references the created entity  
**And** external_id stores the source system identifier  
**And** after_data JSONB contains the created entity data  
**And** external_data JSONB contains raw source data  
**And** before_data is NULL

**Given** an import job is processing records  
**When** an existing record is updated  
**Then** an import_record entry is created with action='updated'  
**And** before_data JSONB contains the previous entity state  
**And** after_data JSONB contains the new entity state  
**And** external_data JSONB contains the source data that triggered update

**Given** an import job encounters a duplicate  
**When** the record is skipped  
**Then** an import_record entry is created with action='skipped'  
**And** entity_id references the existing entity (not NULL)  
**And** external_data shows what would have been imported

**Given** an import job encounters an error  
**When** record creation/update fails  
**Then** an import_record entry is created with action='failed'  
**And** entity_id is NULL (creation failed)  
**And** error_message contains the failure reason  
**And** external_data preserves the problematic source data

**Given** import records exist  
**When** I query by entity_type and entity_id  
**Then** I see complete history for that entity across all imports  
**And** only records from my organisation are visible (RLS enforced)

**Given** import records exist  
**When** I query by import_job_id  
**Then** I see all records processed in that specific job  
**And** can analyze what was created/updated/skipped/failed

**Technical Requirements:**

- Table: crm.import_records with all specified columns
- Foreign key: (organisation_id, import_job_id) REFERENCES crm.import_jobs with CASCADE delete
- Index: idx_import_records_job on (organisation_id, import_job_id)
- Index: idx_import_records_entity on (organisation_id, entity_type, entity_id)
- Action values: 'created', 'updated', 'skipped', 'failed'

### Story 1.4: Multi-Tenant Row-Level Security

**As a** platform operator  
**I want** RLS policies enforcing organisation_id isolation  
**So that** each tenant's data is completely isolated

**Acceptance Criteria:**

**Given** RLS is enabled on crm.data_sources  
**When** a user queries data_sources  
**Then** they see only records where organisation_id matches their tenant context  
**And** other tenants' sources are completely invisible  
**And** direct SQL queries respect RLS policies

**Given** RLS is enabled on crm.import_jobs  
**When** a user queries import_jobs  
**Then** they see only jobs for their organisation_id  
**And** jobs from other tenants are hidden  
**And** FK joins to data_sources still enforce isolation

**Given** RLS is enabled on crm.import_records  
**When** a user queries import_records  
**Then** they see only records for their organisation_id  
**And** cannot access audit trail of other tenants

**Given** RLS policies are active  
**When** a user attempts to INSERT a record with wrong organisation_id  
**Then** the insert is blocked or forced to their organisation_id  
**And** data integrity is maintained

**Given** RLS policies are active  
**When** a user attempts to UPDATE a record from another tenant  
**Then** the update fails or finds zero rows  
**And** cross-tenant data modification is prevented

**Given** RLS policies are active  
**When** a superuser or system process needs full access  
**Then** they can bypass RLS using appropriate role/privileges  
**And** normal users remain restricted

**Technical Requirements:**

- Enable RLS: ALTER TABLE crm.data_sources ENABLE ROW LEVEL SECURITY;
- Enable RLS: ALTER TABLE crm.import_jobs ENABLE ROW LEVEL SECURITY;
- Enable RLS: ALTER TABLE crm.import_records ENABLE ROW LEVEL SECURITY;
- CREATE POLICY for SELECT/INSERT/UPDATE/DELETE on each table
- Policy uses: organisation_id = current_setting('app.current_organisation_id')::uuid
- Test with multiple tenant contexts

### Story 1.5: Composite Foreign Key Constraints

**As a** database architect  
**I want** composite FKs with organisation_id on all relationships  
**So that** referential integrity respects tenant boundaries

**Acceptance Criteria:**

**Given** crm.import_jobs references crm.data_sources  
**When** the composite FK is defined  
**Then** constraint fk_import_jobs_source_same_org exists  
**And** it enforces (organisation_id, data_source_id) REFERENCES (organisation_id, id) on data_sources  
**And** ON DELETE CASCADE is configured

**Given** crm.import_records references crm.import_jobs  
**When** the composite FK is defined  
**Then** constraint fk_import_records_job_same_org exists  
**And** it enforces (organisation_id, import_job_id) REFERENCES (organisation_id, id) on import_jobs  
**And** ON DELETE CASCADE is configured

**Given** a data_source exists for organisation A  
**When** I try to create an import_job with organisation B referencing source A  
**Then** the FK constraint violation is raised  
**And** cross-tenant reference is prevented

**Given** an import_job is deleted  
**When** CASCADE delete triggers  
**Then** all related import_records are automatically deleted  
**And** orphaned records don't remain

**Given** a data_source is deleted  
**When** CASCADE delete triggers  
**Then** all related import_jobs are deleted  
**And** all their import_records are also deleted (cascading)

**Technical Requirements:**

- Add composite FK on import_jobs: FOREIGN KEY (organisation_id, data_source_id) REFERENCES crm.data_sources(organisation_id, id) ON DELETE CASCADE
- Add composite FK on import_records: FOREIGN KEY (organisation_id, import_job_id) REFERENCES crm.import_jobs(organisation_id, id) ON DELETE CASCADE
- Ensure indexes support FK lookups efficiently
- Test cross-tenant violation prevention
- Test cascade deletion behavior

### Story 1.6: Source Configuration Management API

**As a** backend developer  
**I want** API endpoints to manage data sources  
**So that** applications can create/update/query source configurations

**Acceptance Criteria:**

**Given** I am an authenticated admin user  
**When** I POST /api/data-sources with source_type, source_name, and config  
**Then** a new data_source is created for my organisation  
**And** response includes the created source with ID and timestamps  
**And** default values are applied (is_active=true, default_confidence_score=0.70)

**Given** data sources exist  
**When** I GET /api/data-sources  
**Then** I receive all data sources for my organisation (RLS applied)  
**And** response includes source metadata: id, type, name, config, status, last_sync_at

**Given** data sources exist  
**When** I GET /api/data-sources?source_type=pharow  
**Then** I receive only Pharow sources filtered for my organisation  
**And** other source types are excluded

**Given** a data source exists  
**When** I GET /api/data-sources/:id  
**Then** I receive the specific source details if it belongs to my organisation  
**And** 404 error if source doesn't exist or belongs to another organisation

**Given** a data source exists  
**When** I PATCH /api/data-sources/:id with updated config or confidence score  
**Then** the source is updated  
**And** updated_at timestamp is refreshed  
**And** response includes updated source data

**Given** a data source exists with import jobs  
**When** I DELETE /api/data-sources/:id  
**Then** the source and all related jobs/records are deleted (CASCADE)  
**And** response confirms deletion with 204 status

**Given** I provide invalid data  
**When** I create or update a source  
**Then** validation errors are returned with 400 status  
**And** appropriate error messages indicate what's invalid (e.g., missing source_type, invalid confidence_score range)

**Technical Requirements:**

- REST endpoints: POST, GET (list), GET (detail), PATCH, DELETE /api/data-sources
- Request/response schemas with validation
- Apply organisation_id from authenticated user context
- Use RLS-aware queries (set app.current_organisation_id)
- Return appropriate HTTP status codes
- Validate: source_type not empty, confidence_score 0.00-1.00, config is valid JSON

### Story 1.7: Import Job Status Queries

**As a** data operations user  
**I want** to query import job history and statistics  
**So that** I can monitor system health and debug issues

**Acceptance Criteria:**

**Given** import jobs exist  
**When** I query GET /api/import-jobs  
**Then** I receive all jobs for my organisation ordered by started_at DESC  
**And** each job includes: id, data_source details, status, statistics, timestamps

**Given** import jobs exist  
**When** I filter GET /api/import-jobs?status=failed  
**Then** I receive only failed jobs  
**And** can quickly identify problems

**Given** import jobs exist  
**When** I filter GET /api/import-jobs?data_source_id={id}  
**Then** I receive only jobs for that specific source  
**And** can trace source-specific import history

**Given** import jobs exist  
**When** I query GET /api/import-jobs/:id  
**Then** I receive detailed job info including error_message and error_details if failed  
**And** can see exact failure reason for debugging

**Given** import jobs with records exist  
**When** I query GET /api/import-jobs/:id/records  
**Then** I receive paginated import_records for that job  
**And** can drill into what was created/updated/skipped/failed

**Given** many import jobs exist  
**When** queries are executed  
**Then** idx_import_jobs_source_status index is used for fast filtering  
**And** performance is acceptable even with thousands of jobs

**Given** I want aggregate statistics  
**When** I query GET /api/import-jobs/stats  
**Then** I receive summary: total jobs, success rate, average records_processed  
**And** can monitor overall system health

**Technical Requirements:**

- REST endpoints: GET /api/import-jobs (list with filters), GET /api/import-jobs/:id (detail), GET /api/import-jobs/:id/records (audit)
- Query filters: status, data_source_id, date ranges
- Pagination support for large result sets
- Use idx_import_jobs_source_status for efficient queries
- Aggregate queries for statistics endpoint
- Response includes joined data_source info (name, type)

---

## Epic 2: Système de Mapping Entités Externes

Créer le système de liaison entre entités internes et identifiants externes pour toutes les sources.

**User Outcome:** Le système peut maintenir des références bidirectionnelles entre les entités CRM internes et les IDs externes de n'importe quelle source.

**FRs covered:** FR3, FR6, FR9, NFR6, NFR7

**Implementation:** Table external_entity_mappings + indexes + queries patterns

### Story 2.1: External Entity Mappings Table

**As a** database architect  
**I want** a table to store mappings between internal entities and external source identifiers  
**So that** the system can link any CRM entity to its external system IDs

**Acceptance Criteria:**

**Given** the system needs to track external entity mappings  
**When** I create the crm.external_entity_mappings table  
**Then** the table has all required columns: id, organisation_id, data_source_id, entity_type, entity_id, external_id, external_data, confidence_score, last_verified_at, first_imported_at, last_synced_at, import_job_id, created_at, updated_at  
**And** id is UUID primary key with default gen_random_uuid()  
**And** organisation_id references iam.organisations with CASCADE delete  
**And** entity_type is TEXT for 'company', 'person', or 'position'  
**And** entity_id is UUID for polymorphic reference  
**And** external_data is JSONB for source-specific attributes

**Given** the mappings table exists  
**When** I define uniqueness constraints  
**Then** UNIQUE constraint exists on (organisation_id, data_source_id, entity_type, external_id)  
**And** UNIQUE constraint exists on (organisation_id, data_source_id, entity_type, entity_id)  
**And** these prevent duplicate mappings per source

**Given** the mappings table exists  
**When** I define composite foreign key to data_sources  
**Then** constraint fk_external_mappings_source_same_org exists  
**And** it enforces (organisation_id, data_source_id) REFERENCES crm.data_sources(organisation_id, id)  
**And** ON DELETE CASCADE is configured  
**And** cross-tenant references are prevented

**Given** the mappings table exists  
**When** I create performance indexes  
**Then** idx_external_mappings_entity exists on (organisation_id, entity_type, entity_id)  
**And** idx_external_mappings_external_id exists on (organisation_id, data_source_id, external_id)  
**And** both indexes support fast lookups for deduplication

**Given** the mappings table exists  
**When** I set default values  
**Then** confidence_score defaults to 0.70  
**And** first_imported_at defaults to now()  
**And** last_synced_at defaults to now()  
**And** created_at and updated_at default to now()

**Technical Requirements:**

- Table: crm.external_entity_mappings with all columns
- Composite UNIQUE constraints for deduplication
- Composite FK with organisation_id to data_sources
- Two indexes for entity and external_id lookups
- Default confidence_score = 0.70

### Story 2.2: Entity Mapping Creation and Lookup

**As a** import service developer  
**I want** to create and lookup entity mappings between internal and external IDs  
**So that** I can link imported data to existing entities or create new mappings

**Acceptance Criteria:**

**Given** I import a company from Pharow with external_id "pharow_123"  
**When** I create a mapping for this company  
**Then** a new external_entity_mapping record is created  
**And** entity_type is 'company'  
**And** entity_id references the crm.companies.id  
**And** external_id is 'pharow_123'  
**And** data_source_id references the Pharow source  
**And** confidence_score is set based on data quality

**Given** a mapping exists for external_id "pharow_123"  
**When** I lookup by external_id and data_source_id  
**Then** I retrieve the existing mapping  
**And** can access the internal entity_id  
**And** can determine this is a duplicate without querying core tables

**Given** a mapping exists for a company entity  
**When** I lookup by entity_id and entity_type  
**Then** I retrieve all mappings for that entity across all sources  
**And** can see which external systems reference this entity  
**And** can access source-specific data from external_data JSONB

**Given** I import data with both SIREN and external_id  
**When** I lookup potential matches  
**Then** I can find existing entities via multiple strategies  
**And** external_entity_mappings provides the primary deduplication layer  
**And** reduces load on core entity tables

**Given** a mapping exists  
**When** I update the mapping's confidence_score or external_data  
**Then** the mapping is updated  
**And** last_synced_at is refreshed to current time  
**And** updated_at is updated

**Given** multiple sources reference the same entity  
**When** I create mappings for each source  
**Then** multiple mapping records exist for one entity_id  
**And** each has different data_source_id and external_id  
**And** UNIQUE constraints prevent duplicates within each source

**Technical Requirements:**

- INSERT operation for creating new mappings
- SELECT by (organisation_id, data_source_id, external_id) for lookup
- SELECT by (organisation_id, entity_type, entity_id) for reverse lookup
- UPDATE operations for confidence_score and external_data
- Leverage indexes for fast lookups

### Story 2.3: Confidence Scoring System

**As a** data quality engineer  
**I want** to assign and track confidence scores for entity mappings  
**So that** the system can prioritize high-quality data and flag uncertain matches

**Acceptance Criteria:**

**Given** I create a mapping from a verified source  
**When** the source has high data quality (e.g., LinkedIn verified profile)  
**Then** confidence_score is set to 0.90 or higher  
**And** represents high confidence in the mapping

**Given** I create a mapping from uncertain data  
**When** the match is fuzzy or based on incomplete information  
**Then** confidence_score is set to 0.50-0.69  
**And** represents medium confidence requiring review

**Given** a mapping has low confidence  
**When** confidence_score is below 0.50  
**Then** the mapping is flagged as uncertain  
**And** may require manual verification  
**And** should not be used for automatic conflict resolution

**Given** a mapping is verified manually  
**When** a user confirms the mapping is correct  
**Then** confidence_score is updated to 0.95  
**And** last_verified_at is set to current timestamp  
**And** represents human-verified accuracy

**Given** multiple mappings exist for an entity  
**When** querying for the "best" data source  
**Then** mappings can be ordered by confidence_score DESC  
**And** highest confidence source is preferred for conflict resolution  
**And** enables data quality prioritization

**Given** confidence scores are stored  
**When** generating reports or analytics  
**Then** aggregate statistics on data quality can be computed  
**And** low-confidence mappings can be identified for review  
**And** source quality can be tracked over time

**Given** a data source configuration exists  
**When** creating mappings from that source  
**Then** default_confidence_score from data_sources table is applied  
**And** can be overridden based on specific record quality  
**And** provides consistent baseline per source

**Technical Requirements:**

- confidence_score column as NUMERIC(3,2) (0.00 to 1.00)
- Default value from data_sources.default_confidence_score
- last_verified_at timestamp for manual verification tracking
- Query support for ordering by confidence_score
- Validation: score must be between 0.00 and 1.00

### Story 2.4: Source-Specific Data Storage in JSONB

**As a** import adapter developer  
**I want** to store source-specific attributes in external_data JSONB  
**So that** I can preserve metadata without schema changes

**Acceptance Criteria:**

**Given** I import a company from Pharow  
**When** the company has Pharow-specific fields like list_name and export_date  
**Then** external_data stores: {"pharow": {"list_name": "Q1 2026", "export_date": "2026-01-05", "segment": "enterprise"}}  
**And** these fields are preserved without altering core schema  
**And** can be retrieved and displayed when needed

**Given** I import a person from LinkedIn  
**When** the person has LinkedIn-specific data  
**Then** external_data stores: {"linkedin": {"profile_url": "...", "connection_degree": 2, "last_activity": "2026-01-08"}}  
**And** LinkedIn metadata is accessible for enrichment  
**And** doesn't pollute the core crm.people table

**Given** a CSV import has custom columns  
**When** the CSV contains fields not in core schema  
**Then** external_data stores: {"csv": {"import_file": "leads_jan_2026.csv", "custom_field_1": "value", "notes": "..."}}  
**And** all custom data is preserved  
**And** maintains audit trail of original import data

**Given** multiple sources provide data for same entity  
**When** each source has different metadata  
**Then** I can query all mappings and compare external_data  
**And** see which source provided which specific attributes  
**And** enables intelligent conflict resolution

**Given** external_data contains nested structures  
**When** I query using PostgreSQL JSONB operators  
**Then** I can filter by JSONB fields: WHERE external_data->>'pharow'->>'list_name' = 'Q1 2026'  
**And** can extract specific attributes for reporting  
**And** leverage PostgreSQL JSONB indexing if needed

**Given** external_data is empty or NULL  
**When** no source-specific data exists  
**Then** external_data defaults to NULL or {}  
**And** doesn't break queries or lookups  
**And** is optional for minimal mappings

**Technical Requirements:**

- external_data column as JSONB
- Store nested objects per source type
- Support JSONB query operators (->, ->>, @>, etc.)
- Optional: GIN index on external_data for complex queries
- Validate JSON structure on insert/update

### Story 2.5: Entity Mapping Query Patterns and APIs

**As a** backend developer  
**I want** API endpoints and query utilities for entity mappings  
**So that** applications can efficiently lookup and manage mappings

**Acceptance Criteria:**

**Given** I need to find a company by external ID  
**When** I query GET /api/entity-mappings?data_source_id={id}&external_id={ext_id}&entity_type=company  
**Then** I receive the mapping if it exists  
**And** response includes: entity_id, confidence_score, external_data, timestamps  
**And** can immediately link to internal entity without core table query

**Given** I have a company entity_id  
**When** I query GET /api/entity-mappings?entity_type=company&entity_id={id}  
**Then** I receive all mappings for that company across all sources  
**And** can see all external IDs and source-specific data  
**And** response includes data_source details (name, type)

**Given** I need to check if external_id exists before import  
**When** I query existence of external_id for a source  
**Then** the query uses idx_external_mappings_external_id index  
**And** returns result in < 10ms even with millions of mappings  
**And** enables fast deduplication checks

**Given** I need to create a new mapping during import  
**When** I POST /api/entity-mappings with all required fields  
**Then** the mapping is created with validation  
**And** UNIQUE constraints prevent duplicates  
**And** response confirms creation with 201 status

**Given** I need to update a mapping's confidence or external_data  
**When** I PATCH /api/entity-mappings/:id  
**Then** the mapping is updated  
**And** last_synced_at is refreshed automatically  
**And** validation ensures confidence_score remains 0.00-1.00

**Given** I need to delete a mapping  
**When** I DELETE /api/entity-mappings/:id  
**Then** the mapping is removed  
**And** doesn't affect the core entity or other mappings  
**And** audit trail in import_records remains intact

**Given** I need batch operations during import  
**When** I POST /api/entity-mappings/batch with array of mappings  
**Then** all mappings are created in a transaction  
**And** either all succeed or all rollback  
**And** improves performance for large imports

**Technical Requirements:**

- REST endpoints: GET (query), POST (create), PATCH (update), DELETE (remove), POST /batch (bulk)
- Query params: data_source_id, external_id, entity_type, entity_id
- Leverage both indexes for optimal query performance
- Validate uniqueness constraints before insert
- Return joined data_source info in responses
- Support pagination for large result sets

---

## Epic 3: Import Pharow avec Deduplication

Implémenter l'import complet depuis Pharow avec détection et gestion intelligente des doublons.

**User Outcome:** Les utilisateurs peuvent importer des listes Pharow, le système détecte automatiquement les doublons et évite les duplications.

**FRs covered:** FR1, FR5, FR8, FR10

**Implementation:** Pharow adapter + deduplication engine (SIREN, LinkedIn URL matching)

### Story 3.1: Pharow Data Source Configuration

**As a** system administrator  
**I want** to configure Pharow as a data source with API credentials and settings  
**So that** the system can authenticate and fetch data from Pharow API

**Acceptance Criteria:**

**Given** I need to connect to Pharow API  
**When** I create a Pharow data source via POST /api/data-sources  
**Then** source_type is set to 'pharow'  
**And** config JSONB contains: {"api_endpoint": "https://api.pharow.com/v1", "api_key": "...", "rate_limit": 100}  
**And** default_confidence_score is set to 0.75 for Pharow data  
**And** source is marked as active

**Given** Pharow credentials are configured  
**When** I test the connection  
**Then** the system validates API key with Pharow  
**And** returns success/failure status  
**And** stores last_sync_at timestamp on successful validation

**Given** Pharow source exists  
**When** I update API credentials or settings  
**Then** config JSONB is updated  
**And** can modify rate_limit, api_endpoint, or field_mappings  
**And** changes take effect for next import

**Technical Requirements:**

- Pharow-specific config schema validation
- API key encryption in config JSONB
- Connection test endpoint
- Rate limiting configuration per source

### Story 3.2: Pharow API Client and Data Fetching

**As a** import service  
**I want** to fetch company and people data from Pharow API  
**So that** I can import lists into the CRM system

**Acceptance Criteria:**

**Given** Pharow source is configured  
**When** I initiate a Pharow import job  
**Then** the service reads config from data_sources table  
**And** authenticates with Pharow API using stored credentials  
**And** creates import_job with status='running'

**Given** Pharow API connection is established  
**When** I fetch a company list  
**Then** the service retrieves companies with fields: pharow_company_id, siren, name, siret, naf_sector, employee_range, address, website, linkedin_url  
**And** handles pagination for large lists  
**And** respects rate_limit from source config

**Given** Pharow API returns company data  
**When** I fetch associated people/positions  
**Then** the service retrieves people with: first_name, last_name, job_title, email, phone, linkedin_url  
**And** links people to their companies via pharow_company_id  
**And** handles missing or incomplete data gracefully

**Given** Pharow API call fails  
**When** network error or authentication failure occurs  
**Then** import_job status changes to 'failed'  
**And** error_message contains API error details  
**And** partially fetched data is not imported (transaction rollback)

**Given** Pharow API returns large dataset  
**When** import processes records  
**Then** progress updates records_processed counter periodically  
**And** memory usage remains bounded (streaming/batching)  
**And** long-running imports don't timeout

**Technical Requirements:**

- Pharow API client library or HTTP client
- Pagination support for list endpoints
- Rate limiting implementation
- Error handling and retry logic
- Batch processing for memory efficiency

### Story 3.3: Company Deduplication via SIREN

**As a** import service  
**I want** to detect duplicate companies using SIREN identifier  
**So that** I don't create duplicate company records

**Acceptance Criteria:**

**Given** I import a Pharow company with SIREN "123456789"  
**When** I check for existing company with same SIREN  
**Then** I query crm.companies WHERE organisation_id=X AND siren='123456789'  
**And** if found, retrieve existing company_id  
**And** mark this as potential duplicate for update/skip decision

**Given** no company exists with matching SIREN  
**When** SIREN is provided and unique  
**Then** I proceed to check external_entity_mappings for pharow_company_id  
**And** perform secondary deduplication check  
**And** only create new company if both checks pass

**Given** a company exists with matching SIREN  
**When** deciding whether to update  
**Then** I compare data completeness and recency  
**And** apply conflict resolution strategy  
**And** log action='updated' or 'skipped' in import_records

**Given** SIREN is NULL or missing  
**When** Pharow data lacks SIREN  
**Then** I skip SIREN-based deduplication  
**And** fall back to linkedin_url matching  
**And** document lower confidence_score for this mapping

**Technical Requirements:**

- Lookup query on crm.companies.siren with organisation_id
- Utilize UNIQUE index on (organisation_id, siren)
- Fast query performance (< 5ms per lookup)
- Handle NULL SIREN gracefully

### Story 3.4: Company Deduplication via LinkedIn URL

**As a** import service  
**I want** to detect duplicate companies using LinkedIn URL  
**So that** I can match companies even without SIREN

**Acceptance Criteria:**

**Given** I import a Pharow company with linkedin_url  
**When** SIREN match fails or is unavailable  
**Then** I query crm.companies WHERE organisation_id=X AND linkedin_url='https://linkedin.com/company/xyz'  
**And** if found, retrieve existing company_id  
**And** mark as duplicate for update/skip

**Given** a company exists with matching LinkedIn URL  
**When** deciding to update  
**Then** I check which source has higher confidence_score  
**And** prefer updating if Pharow data is more complete  
**And** log the update in import_records

**Given** LinkedIn URL format varies (with/without www, trailing slash)  
**When** comparing URLs  
**Then** I normalize URLs before comparison  
**And** strip www, trailing slashes, convert to lowercase  
**And** ensure consistent matching

**Given** no match via SIREN or LinkedIn URL  
**When** all deduplication checks fail  
**Then** I proceed to check external_entity_mappings  
**And** if no external mapping exists, create new company  
**And** confidence_score reflects new vs matched entity

**Technical Requirements:**

- Lookup query on crm.companies.linkedin_url with organisation_id
- URL normalization function
- UNIQUE index on (organisation_id, linkedin_url)
- Fast query performance

### Story 3.5: External ID Deduplication Check

**As a** import service  
**I want** to check if pharow_company_id already exists in external_entity_mappings  
**So that** I prevent re-importing the same Pharow record

**Acceptance Criteria:**

**Given** I import a Pharow company with pharow_company_id="pharow_12345"  
**When** I query external_entity_mappings  
**Then** I search for (organisation_id, data_source_id, entity_type='company', external_id='pharow_12345')  
**And** if found, retrieve the linked entity_id  
**And** determine this is a re-import (skip or update decision)

**Given** mapping exists for pharow_company_id  
**When** Pharow data has changed since last import  
**Then** I update the core company entity  
**And** update external_entity_mapping.last_synced_at  
**And** log action='updated' in import_records with before/after data

**Given** mapping exists for pharow_company_id  
**When** Pharow data is identical to existing  
**Then** I skip the update  
**And** only update external_entity_mapping.last_synced_at  
**And** log action='skipped' in import_records

**Given** no mapping exists for pharow_company_id  
**When** but SIREN or LinkedIn URL matches existing company  
**Then** I link this Pharow record to existing company  
**And** create new external_entity_mapping  
**And** log action='linked' indicating connection to existing entity

**Given** no mapping and no core entity match  
**When** all deduplication checks fail  
**Then** I create new company in crm.companies  
**And** create new external_entity_mapping  
**And** log action='created' in import_records

**Technical Requirements:**

- Fast lookup using idx_external_mappings_external_id
- Query: WHERE organisation_id AND data_source_id AND external_id
- Transaction to ensure company + mapping created atomically
- Handle race conditions in concurrent imports

### Story 3.6: Conflict Resolution and Data Merging

**As a** import service  
**I want** to intelligently resolve conflicts when updating existing companies  
**So that** I preserve the best quality data

**Acceptance Criteria:**

**Given** I find a duplicate company to update  
**When** Pharow data conflicts with existing data  
**Then** I apply conflict resolution rules based on confidence_score  
**And** prefer higher confidence source for each field  
**And** document decision in import_records.after_data

**Given** existing company has employee_range="50-100" from LinkedIn (confidence=0.90)  
**When** Pharow provides employee_range="100-250" (confidence=0.75)  
**Then** I keep LinkedIn value (higher confidence)  
**And** don't overwrite with lower confidence data  
**And** log this as 'skipped field' decision

**Given** existing company has NULL website_url  
**When** Pharow provides website_url  
**Then** I always update NULL fields regardless of confidence  
**And** filling gaps improves data completeness  
**And** increment data_completeness_score

**Given** Pharow data is more recent (last_synced_at)  
**When** confidence_scores are equal  
**Then** I prefer more recent data  
**And** update the field with newer information  
**And** track recency in conflict resolution

**Given** conflict resolution updates some fields  
**When** updating company  
**Then** I update only changed fields  
**And** preserve unchanged fields from higher confidence sources  
**And** updated_at timestamp reflects partial update

**Given** data completeness increases  
**When** new fields are added  
**Then** I recalculate data_completeness_score  
**And** store updated score in crm.companies  
**And** track data quality improvement over time

**Technical Requirements:**

- Conflict resolution engine with configurable rules
- Field-level confidence tracking
- Recency-based tiebreaker
- Data completeness scoring algorithm
- Before/after comparison for audit

### Story 3.7: Pharow List Name and Metadata Storage

**As a** import service  
**I want** to store Pharow-specific metadata like list_name in external_data  
**So that** I can trace which list a company came from

**Acceptance Criteria:**

**Given** I import companies from Pharow list "Q1 2026 Enterprise Leads"  
**When** I create external_entity_mapping  
**Then** external_data contains: {"pharow": {"list_name": "Q1 2026 Enterprise Leads", "export_date": "2026-01-09", "pharow_company_id": "pharow_12345"}}  
**And** list provenance is preserved  
**And** can filter/report by source list

**Given** company is imported from multiple Pharow lists  
**When** second import creates another mapping  
**Then** second mapping has different external_id (pharow_company_id from different context)  
**Or** I update existing mapping's external_data to append list history  
**And** track all lists this company appeared in

**Given** Pharow provides additional metadata  
**When** import includes segment, campaign, or custom fields  
**Then** external_data stores all Pharow-specific attributes  
**And** {"pharow": {"segment": "enterprise", "campaign_id": "c_789", ...}}  
**And** enables rich filtering and reporting

**Given** I query companies imported from specific list  
**When** I filter by external_data  
**Then** I can query: WHERE external_data->'pharow'->>'list_name' = 'Q1 2026 Enterprise Leads'  
**And** retrieve all companies from that list  
**And** supports campaign tracking and analysis

**Technical Requirements:**

- JSONB storage in external_entity_mappings.external_data
- Nested structure: {"pharow": {...}}
- JSONB query operators for filtering
- Optional: GIN index on external_data for complex queries

### Story 3.8: End-to-End Pharow Import Orchestration

**As a** data operations user  
**I want** to trigger and monitor Pharow imports via API  
**So that** I can import lists on-demand or on schedule

**Acceptance Criteria:**

**Given** I want to import a Pharow list  
**When** I POST /api/imports/pharow with {data_source_id, list_id, config}  
**Then** a new import_job is created with status='pending'  
**And** job is queued for processing  
**And** response includes job_id for tracking

**Given** import job starts  
**When** worker picks up the job  
**Then** status changes to 'running'  
**And** started_at is set  
**And** Pharow API client fetches data  
**And** deduplication and import logic executes

**Given** import processes records  
**When** each company is imported  
**Then** records_processed increments  
**And** records_created, records_updated, or records_skipped increment based on action  
**And** import_records entries are created for audit

**Given** import completes successfully  
**When** all records processed  
**Then** status changes to 'completed'  
**And** completed_at is set  
**And** final statistics show: 150 processed, 50 created, 80 updated, 20 skipped, 0 failed  
**And** data_sources.last_sync_at is updated

**Given** import fails  
**When** API error or database error occurs  
**Then** status changes to 'failed'  
**And** error_message and error_details capture failure  
**And** partial imports are rolled back (transaction integrity)  
**And** records_failed counter shows affected records

**Given** import is long-running  
**When** I query job status GET /api/import-jobs/:id  
**Then** I see real-time progress with records_processed count  
**And** can estimate completion time  
**And** can monitor system health

**Technical Requirements:**

- REST endpoint: POST /api/imports/pharow
- Background job queue (e.g., Bull, BullMQ)
- Transaction management for atomicity
- Real-time progress tracking
- Error handling and rollback
- Schedule support for automated imports

---

## Epic 4: Import LinkedIn Sales Navigator

Supporter l'import de données depuis LinkedIn Sales Navigator avec enrichissement des profils.

**User Outcome:** Les utilisateurs peuvent importer des leads depuis LinkedIn, le système enrichit les données existantes ou crée de nouvelles entités.

**FRs covered:** FR1, FR5, FR8, FR9

**Implementation:** LinkedIn adapter + field mappings + conflict resolution logic

### Story 4.1: LinkedIn Data Source Configuration

**As a** system administrator  
**I want** to configure LinkedIn Sales Navigator as a data source  
**So that** the system can import leads and enrich CRM data

**Acceptance Criteria:**

**Given** I need to connect to LinkedIn Sales Navigator  
**When** I create a LinkedIn data source via POST /api/data-sources  
**Then** source_type is set to 'linkedin'  
**And** config JSONB contains: {"api_endpoint": "...", "auth_token": "...", "organization_id": "..."}  
**And** default_confidence_score is set to 0.85 (high quality data)  
**And** source is marked as active

**Given** LinkedIn credentials are configured  
**When** I test the connection  
**Then** the system validates OAuth token with LinkedIn  
**And** returns success/failure status  
**And** stores token expiry for refresh management

**Given** LinkedIn source exists  
**When** I update auth credentials  
**Then** config JSONB is updated securely  
**And** OAuth token refresh is handled automatically  
**And** changes take effect for next import

**Technical Requirements:**

- LinkedIn-specific config schema
- OAuth token encryption and refresh handling
- Connection test with LinkedIn API
- High default_confidence_score (0.85) for verified profiles

### Story 4.2: LinkedIn Profile Data Extraction

**As a** import service  
**I want** to extract company and person data from LinkedIn profiles  
**So that** I can enrich CRM entities with verified information

**Acceptance Criteria:**

**Given** LinkedIn source is configured  
**When** I import a LinkedIn company profile  
**Then** the service extracts: name, linkedin_url, website_url, employee_range, industry, description  
**And** linkedin_url is normalized and stored as unique identifier  
**And** confidence_score is set to 0.90 for verified company profiles

**Given** LinkedIn returns person/position data  
**When** I extract profile information  
**Then** the service captures: first_name, last_name, job_title, company, linkedin_url, email (if available), location  
**And** seniority_level is derived from job_title  
**And** confidence_score reflects profile completeness

**Given** LinkedIn profile has "Verified" badge  
**When** extracting data  
**Then** confidence_score is increased to 0.95  
**And** last_verified_at is set to current timestamp  
**And** represents highest quality data source

**Given** LinkedIn profile is incomplete  
**When** essential fields are missing  
**Then** confidence_score is adjusted lower (0.70-0.80)  
**And** missing fields are documented in external_data  
**And** can be flagged for manual review

**Technical Requirements:**

- LinkedIn API client for profile data
- Field mapping from LinkedIn schema to CRM schema
- URL normalization for linkedin_url
- Dynamic confidence scoring based on profile quality
- Handle LinkedIn rate limits

### Story 4.3: LinkedIn URL-Based Deduplication

**As a** import service  
**I want** to deduplicate companies and people using LinkedIn URLs  
**So that** I link LinkedIn profiles to existing CRM entities

**Acceptance Criteria:**

**Given** I import a LinkedIn company profile with linkedin_url  
**When** I check for duplicates  
**Then** I query crm.companies WHERE organisation_id=X AND linkedin_url='{normalized_url}'  
**And** if found, retrieve existing company_id for enrichment  
**And** mark as update candidate

**Given** no company match via linkedin_url  
**When** checking external_entity_mappings  
**Then** I search for external_id containing LinkedIn profile ID  
**And** if found, link to existing entity  
**And** create mapping if missing

**Given** a person profile has linkedin_url  
**When** checking for duplicate people  
**Then** I query crm.people WHERE linkedin_url='{normalized_url}'  
**And** if found, enrich existing person record  
**And** update job_title and company if changed

**Given** multiple sources reference same LinkedIn URL  
**When** creating mappings  
**Then** LinkedIn mapping has highest confidence_score  
**And** becomes preferred source for that entity  
**And** other source data is retained but deprioritized

**Technical Requirements:**

- LinkedIn URL normalization (strip query params, standardize format)
- Fast lookup using UNIQUE index on linkedin_url
- External mapping creation for LinkedIn profile IDs
- Confidence-based prioritization in conflict resolution

### Story 4.4: LinkedIn Data Enrichment

**As a** import service  
**I want** to enrich existing CRM entities with LinkedIn data  
**So that** profiles become more complete and accurate

**Acceptance Criteria:**

**Given** an existing company has basic data from Pharow  
**When** I match it to a LinkedIn company profile  
**Then** I enrich with LinkedIn fields: industry, description, logo_url, follower_count  
**And** only update NULL or low-confidence fields  
**And** preserve high-quality data from other sources

**Given** existing person has email but no LinkedIn URL  
**When** I match by name + company  
**Then** I add linkedin_url to person record  
**And** increase confidence_score for that person  
**And** log enrichment in import_records

**Given** LinkedIn provides more recent job_title  
**When** existing position is outdated  
**Then** I create new position record with is_current=true  
**And** update old position with is_current=false, end_date  
**And** maintain employment history

**Given** LinkedIn confidence_score is 0.90  
**When** existing data has confidence_score 0.70  
**Then** I update with LinkedIn data  
**And** external_entity_mapping reflects higher confidence  
**And** last_verified_at is updated

**Technical Requirements:**

- Field-level enrichment logic
- Preserve multi-source data history
- Employment history tracking (multiple positions)
- Confidence-based field updates

### Story 4.5: LinkedIn Import Orchestration

**As a** data operations user  
**I want** to trigger LinkedIn imports and monitor progress  
**So that** I can enrich CRM data with LinkedIn profiles

**Acceptance Criteria:**

**Given** I want to import LinkedIn leads  
**When** I POST /api/imports/linkedin with {data_source_id, lead_list_url, config}  
**Then** import_job is created with status='pending'  
**And** job is queued for processing  
**And** response includes job_id for tracking

**Given** LinkedIn import runs  
**When** profiles are processed  
**Then** records_processed, records_created, records_updated counters increment  
**And** enrichment actions are logged in import_records  
**And** statistics show enrichment vs new entity creation ratio

**Given** LinkedIn import completes  
**When** all profiles processed  
**Then** status changes to 'completed'  
**And** summary shows: X companies enriched, Y people enriched, Z new entities  
**And** overall data_completeness_score improves

**Given** LinkedIn rate limit is hit  
**When** API returns 429 error  
**Then** import job pauses and retries with exponential backoff  
**And** status shows 'running' with retry info in config  
**And** resumes automatically when rate limit resets

**Technical Requirements:**

- REST endpoint: POST /api/imports/linkedin
- Background job queue with retry logic
- Rate limit handling with backoff
- Enrichment statistics tracking
- OAuth token refresh during long imports

---

## Epic 5: Import Manuel CSV/Excel

Permettre aux utilisateurs d'importer manuellement des données via fichiers CSV ou Excel.

**User Outcome:** Les utilisateurs peuvent uploader des fichiers CSV/Excel, mapper les colonnes, et importer des données avec validation et preview.

**FRs covered:** FR1, FR7, FR5, FR10

**Implementation:** CSV parser + column mapping UI + validation + preview before import

### Story 5.1: CSV/Excel File Upload

**As a** user  
**I want** to upload CSV or Excel files  
**So that** I can import custom data into the CRM

**Acceptance Criteria:**

**Given** I want to import a CSV file  
**When** I POST /api/imports/upload with multipart/form-data  
**Then** the file is validated for format (CSV or XLSX)  
**And** file size is checked (max 50MB)  
**And** file is stored temporarily with unique ID  
**And** response includes upload_id for next steps

**Given** I upload a CSV file  
**When** file is parsed  
**Then** system detects headers from first row  
**And** detects data types for each column (text, number, date, email, URL)  
**And** returns column metadata for mapping UI

**Given** I upload an Excel file  
**When** file is parsed  
**Then** system extracts all sheets  
**And** user selects which sheet to import  
**And** headers and data types are detected per sheet

**Given** CSV has encoding issues  
**When** file contains special characters  
**Then** system detects encoding (UTF-8, ISO-8859-1, etc.)  
**And** converts to UTF-8 for processing  
**And** handles BOM markers correctly

**Technical Requirements:**

- File upload endpoint with multipart support
- CSV parser library (e.g., csv-parse, papaparse)
- Excel parser library (e.g., xlsx)
- Temporary file storage (S3, local disk)
- Encoding detection and conversion
- File size limits and validation

### Story 5.2: Column Mapping Interface

**As a** user  
**I want** to map CSV columns to CRM fields  
**So that** data is imported into correct fields

**Acceptance Criteria:**

**Given** I uploaded a CSV with columns: "Company Name", "SIREN", "Website", "Contact Email"  
**When** I access column mapping interface  
**Then** system suggests mappings based on column names  
**And** "Company Name" → companies.name (auto-detected)  
**And** "SIREN" → companies.siren (auto-detected)  
**And** "Website" → companies.website_url (auto-detected)

**Given** column names don't match exactly  
**When** system suggests mappings  
**Then** fuzzy matching is used (e.g., "Company" matches "name")  
**And** user can adjust mappings via dropdown  
**And** unmapped columns can be stored in external_data

**Given** I map columns  
**When** I save mapping configuration  
**Then** mapping is stored with upload_id  
**And** POST /api/imports/csv/map with {upload_id, column_mappings}  
**And** response confirms mapping saved

**Given** I want to import custom fields  
**When** CSV has columns not in core schema  
**Then** I can map them to external_data  
**And** custom fields are stored in JSONB  
**And** preserved for future reference

**Technical Requirements:**

- Column mapping API endpoint
- Auto-detection logic with fuzzy matching
- UI-friendly mapping format (JSON)
- Support for custom field storage in external_data

### Story 5.3: CSV Data Validation and Preview

**As a** user  
**I want** to validate and preview CSV data before import  
**So that** I can fix errors before committing

**Acceptance Criteria:**

**Given** I mapped CSV columns  
**When** I request validation GET /api/imports/csv/:upload_id/validate  
**Then** system validates all rows against schema  
**And** checks required fields are present  
**And** validates data types (email format, URL format, SIREN format)  
**And** returns validation results with error details

**Given** CSV has validation errors  
**When** validation runs  
**Then** errors are grouped by type: missing_required, invalid_format, duplicate_detected  
**And** each error includes row number and field name  
**And** user can download error report

**Given** validation passes  
**When** I request preview GET /api/imports/csv/:upload_id/preview  
**Then** system returns first 10 rows with mapped data  
**And** shows how data will be imported  
**And** includes deduplication preview (X new, Y duplicates)

**Given** duplicates are detected  
**When** preview runs  
**Then** system identifies matches via SIREN, linkedin_url, email  
**And** shows which rows will create vs update vs skip  
**And** user can adjust deduplication strategy

**Technical Requirements:**

- Validation endpoint with schema checks
- Data type validation (regex for email, URL, SIREN)
- Duplicate detection preview
- Error reporting with row numbers
- Preview with first N rows

### Story 5.4: CSV Import Execution

**As a** user  
**I want** to execute CSV import after validation  
**So that** data is imported into the CRM

**Acceptance Criteria:**

**Given** CSV is validated and previewed  
**When** I POST /api/imports/csv/:upload_id/execute  
**Then** import_job is created with job_type='manual_upload'  
**And** data_source_id references CSV source  
**And** external_data stores: {"csv": {"filename": "leads.csv", "uploaded_by": "user@example.com"}}

**Given** CSV import runs  
**When** each row is processed  
**Then** deduplication checks run (SIREN, LinkedIn URL, external_id)  
**And** new companies/people are created  
**And** duplicates are updated or skipped based on strategy  
**And** import_records entries log all actions

**Given** CSV row has errors during import  
**When** constraint violation or data error occurs  
**Then** action='failed' is logged in import_records  
**And** error_message contains specific failure reason  
**And** records_failed counter increments  
**And** import continues with remaining rows

**Given** CSV import completes  
**When** all rows processed  
**Then** status='completed'  
**And** statistics show: rows processed, created, updated, skipped, failed  
**And** temporary file is deleted  
**And** user receives notification with results

**Given** CSV contains custom fields  
**When** importing  
**Then** custom fields are stored in external_entity_mappings.external_data  
**And** {"csv": {"custom_field_1": "value", "import_date": "2026-01-09"}}  
**And** all custom data is preserved

**Technical Requirements:**

- Import execution endpoint
- Transaction management for data integrity
- Deduplication integration
- Error handling per row
- Temporary file cleanup
- Notification system for completion

### Story 5.5: CSV Template Download and Reusable Mappings

**As a** user  
**I want** to download CSV templates and save mappings  
**So that** repeated imports are faster

**Acceptance Criteria:**

**Given** I want to import companies  
**When** I request GET /api/imports/csv/template?entity_type=company  
**Then** system generates CSV template with correct headers  
**And** includes all core fields (name, siren, linkedin_url, etc.)  
**And** first row contains field descriptions  
**And** user can fill and re-upload template

**Given** I successfully imported a CSV  
**When** import completes  
**Then** column mapping is saved as reusable configuration  
**And** I can retrieve saved mappings GET /api/imports/csv/mappings  
**And** next import can reuse mapping automatically

**Given** I upload CSV with same structure  
**When** headers match saved mapping  
**Then** system auto-applies previous mapping  
**And** skips manual mapping step  
**And** user proceeds directly to validation/preview

**Given** I have multiple mapping configurations  
**When** uploading new CSV  
**Then** I can select which mapping to apply  
**And** or create new mapping if structure differs  
**And** mappings are stored per organisation

**Technical Requirements:**

- Template generation endpoint
- Template includes field descriptions and examples
- Mapping configuration storage (database or file)
- Auto-detection of matching mappings
- Mapping management UI (list, select, delete)

---

## Epic 6: Nettoyage Schema Core

Retirer tous les champs source-spécifiques des tables core pour finaliser l'architecture source-agnostic.

**User Outcome:** Le schéma database est complètement source-agnostic et prêt pour supporter n'importe quelle nouvelle source future.

**FRs covered:** NFR1, NFR2

**Implementation:** Migration pour supprimer pharow_company_id et pharow_list_name + update queries

### Story 6.1: Remove pharow_company_id from companies table

**As a** database architect  
**I want** to remove pharow_company_id column from crm.companies  
**So that** the table is source-agnostic

**Acceptance Criteria:**

**Given** crm.companies has pharow_company_id column  
**When** I run migration to remove it  
**Then** ALTER TABLE crm.companies DROP COLUMN pharow_company_id is executed  
**And** column is permanently removed  
**And** database schema is updated

**Given** pharow_company_id had UNIQUE constraint  
**When** column is dropped  
**Then** associated index and constraint are automatically dropped  
**And** no orphaned constraints remain

**Given** application code references pharow_company_id  
**When** migration runs  
**Then** all queries using pharow_company_id are already updated  
**And** code uses external_entity_mappings.external_id instead  
**And** no broken queries after migration

**Technical Requirements:**

- Migration script: ALTER TABLE crm.companies DROP COLUMN pharow_company_id;
- Verify no foreign keys reference this column
- Update all application queries before migration
- Test migration on staging environment first

### Story 6.2: Remove pharow_list_name from positions table

**As a** database architect  
**I want** to remove pharow_list_name column from crm.positions  
**So that** the table is source-agnostic

**Acceptance Criteria:**

**Given** crm.positions has pharow_list_name column  
**When** I run migration to remove it  
**Then** ALTER TABLE crm.positions DROP COLUMN pharow_list_name is executed  
**And** column is permanently removed  
**And** list names are now in external_entity_mappings.external_data

**Given** application queries used pharow_list_name  
**When** migration completes  
**Then** queries are updated to join with external_entity_mappings  
**And** extract list_name from external_data JSONB  
**And** query: external_data->'pharow'->>'list_name'

**Technical Requirements:**

- Migration script: ALTER TABLE crm.positions DROP COLUMN pharow_list_name;
- Update queries to use external_entity_mappings join
- JSONB query for list_name extraction
- Test on staging before production

### Story 6.3: Update Application Queries

**As a** backend developer  
**I want** to update all queries to use external_entity_mappings  
**So that** application works after schema cleanup

**Acceptance Criteria:**

**Given** application needs to find company by pharow_company_id  
**When** pharow_company_id is removed from crm.companies  
**Then** query is updated to:

```sql
SELECT c.* FROM crm.companies c
JOIN crm.external_entity_mappings m ON m.entity_id = c.id AND m.entity_type = 'company'
WHERE m.organisation_id = X AND m.data_source_id = Y AND m.external_id = 'pharow_12345'
```

**And** retrieves company via mapping table

**Given** application displays pharow_list_name  
**When** column is removed  
**Then** query extracts from external_data:

```sql
SELECT m.external_data->'pharow'->>'list_name' AS list_name
FROM crm.external_entity_mappings m
WHERE m.entity_id = ...
```

**And** displays list name from JSONB

**Given** multiple queries reference pharow fields  
**When** all queries are updated  
**Then** comprehensive test suite validates all paths  
**And** 100% test coverage for mapping-based queries  
**And** no regressions after deployment

**Technical Requirements:**

- Audit all queries referencing pharow_company_id and pharow_list_name
- Rewrite using JOIN with external_entity_mappings
- Update ORM models if applicable
- Comprehensive integration tests
- Performance testing for JOIN queries

### Story 6.4: Validate Source-Agnostic Architecture

**As a** system architect  
**I want** to validate the schema is fully source-agnostic  
**So that** new sources can be added without schema changes

**Acceptance Criteria:**

**Given** schema cleanup is complete  
**When** I audit all CRM tables  
**Then** crm.companies contains ZERO source-specific columns  
**And** crm.people contains ZERO source-specific columns  
**And** crm.positions contains ZERO source-specific columns  
**And** all tables are truly source-agnostic

**Given** I want to add a new source (e.g., ZoomInfo)  
**When** I configure new data_source  
**Then** NO schema changes are required  
**And** only need to create import adapter  
**And** external_entity_mappings handles all source-specific data

**Given** architecture is validated  
**When** documentation is updated  
**Then** architecture doc confirms source-agnostic design  
**And** provides guide for adding new sources  
**And** includes examples of JSONB external_data usage

**Technical Requirements:**

- Schema audit script to detect source-specific columns
- Documentation update with architecture validation
- Guide for adding new import sources
- Proof of concept: add dummy source without schema change
