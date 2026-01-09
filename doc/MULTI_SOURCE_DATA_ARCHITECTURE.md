# Multi-Source Data Architecture

**Version:** 1.0  
**Date:** January 9, 2026  
**Status:** Proposed Architecture

## Executive Summary

The current database schema is tightly coupled to Pharow as a data source with hardcoded fields like `pharow_company_id` and `pharow_list_name`. This document proposes a generalized, extensible architecture that supports importing data from multiple sources while maintaining data integrity, traceability, and deduplication capabilities.

## Problem Statement

### Current Limitations

1. **Source-Specific Fields**: `pharow_company_id`, `pharow_list_name` embedded in core tables
2. **Single Source Assumption**: UNIQUE constraints assume only Pharow as external identifier
3. **No Source Tracking**: Cannot trace which system data originated from
4. **Poor Extensibility**: Adding new sources requires schema changes
5. **Merge Conflicts**: No systematic approach to reconciling data from multiple sources

## Proposed Architecture

### Design Principles

1. **Source Agnostic Core**: Core entities contain only universal attributes
2. **Extensible Metadata**: Source-specific data stored separately
3. **Audit Trail**: Complete provenance tracking for all imported data
4. **Flexible Deduplication**: Configurable matching rules per source
5. **Data Quality**: Confidence scoring and conflict resolution

### Schema Architecture

```
┌─────────────────────────────────────────────────────┐
│              Core Domain Entities                    │
│  (crm.companies, crm.people, crm.positions)         │
│  - Universal attributes only                         │
│  - No source-specific fields                         │
└─────────────────────────────────────────────────────┘
                          │
                          │ references
                          ▼
┌─────────────────────────────────────────────────────┐
│           External Entity Mappings                   │
│  (crm.external_entity_mappings)                     │
│  - Links core entities to external sources          │
│  - Tracks external IDs and source system            │
│  - Enables deduplication & reconciliation           │
└─────────────────────────────────────────────────────┘
                          │
                          │ references
                          ▼
┌─────────────────────────────────────────────────────┐
│              Data Sources Registry                   │
│  (crm.data_sources)                                 │
│  - Source system metadata                           │
│  - Import configuration                              │
│  - Data quality rules                               │
└─────────────────────────────────────────────────────┘
                          │
                          │ used by
                          ▼
┌─────────────────────────────────────────────────────┐
│            Import Jobs & Audit Log                   │
│  (crm.import_jobs, crm.import_records)              │
│  - Complete audit trail                             │
│  - Error tracking                                    │
│  - Reconciliation history                           │
└─────────────────────────────────────────────────────┘
```

## Detailed Schema Design

### 1. Data Sources Registry

```sql
CREATE TABLE crm.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,

  -- Source identification
  source_type TEXT NOT NULL,  -- 'pharow', 'salesforce', 'hubspot', 'apollo', 'csv', etc.
  source_name TEXT NOT NULL,  -- User-friendly name

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',  -- Source-specific settings

  -- Data quality
  default_confidence_score NUMERIC(3,2) DEFAULT 0.70,  -- 0.00 to 1.00

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, source_type, source_name)
);
```

### 2. External Entity Mappings

```sql
CREATE TABLE crm.external_entity_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,

  -- Source reference
  data_source_id UUID NOT NULL,

  -- Entity reference (polymorphic)
  entity_type TEXT NOT NULL,  -- 'company', 'person', 'position'
  entity_id UUID NOT NULL,     -- References crm.companies, crm.people, or crm.positions

  -- External identifier
  external_id TEXT NOT NULL,   -- ID in the source system
  external_data JSONB NULL,    -- Source-specific attributes

  -- Data quality
  confidence_score NUMERIC(3,2) DEFAULT 0.70,
  last_verified_at TIMESTAMPTZ NULL,

  -- Import tracking
  first_imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  import_job_id UUID NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite FK for RLS
  CONSTRAINT fk_external_mappings_source_same_org
    FOREIGN KEY (organisation_id, data_source_id)
    REFERENCES crm.data_sources(organisation_id, id)
    ON DELETE CASCADE,

  -- One external ID per source per entity
  UNIQUE (organisation_id, data_source_id, entity_type, external_id),

  -- One mapping per entity per source
  UNIQUE (organisation_id, data_source_id, entity_type, entity_id)
);

CREATE INDEX idx_external_mappings_entity
  ON crm.external_entity_mappings(organisation_id, entity_type, entity_id);

CREATE INDEX idx_external_mappings_external_id
  ON crm.external_entity_mappings(organisation_id, data_source_id, external_id);
```

### 3. Import Jobs

```sql
CREATE TABLE crm.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,

  -- Source
  data_source_id UUID NOT NULL,

  -- Job metadata
  job_type TEXT NOT NULL,  -- 'full_sync', 'incremental', 'manual_upload'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed', 'cancelled'

  -- Execution
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,

  -- Results
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_skipped INT DEFAULT 0,
  records_failed INT DEFAULT 0,

  -- Error tracking
  error_message TEXT NULL,
  error_details JSONB NULL,

  -- Metadata
  triggered_by_user_id UUID NULL,
  config JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_import_jobs_source_same_org
    FOREIGN KEY (organisation_id, data_source_id)
    REFERENCES crm.data_sources(organisation_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_import_jobs_source_status
  ON crm.import_jobs(organisation_id, data_source_id, status);
```

### 4. Import Records (Audit Trail)

```sql
CREATE TABLE crm.import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,

  -- Job reference
  import_job_id UUID NOT NULL,

  -- Entity reference
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,  -- NULL if creation failed

  -- Import details
  action TEXT NOT NULL,  -- 'created', 'updated', 'skipped', 'failed'
  external_id TEXT NOT NULL,

  -- Changes
  before_data JSONB NULL,
  after_data JSONB NULL,
  external_data JSONB NULL,  -- Raw data from source

  -- Error handling
  error_message TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_import_records_job_same_org
    FOREIGN KEY (organisation_id, import_job_id)
    REFERENCES crm.import_jobs(organisation_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_import_records_job
  ON crm.import_records(organisation_id, import_job_id);

CREATE INDEX idx_import_records_entity
  ON crm.import_records(organisation_id, entity_type, entity_id);
```

### 5. Updated Core Tables

#### Companies (Cleaned)

```sql
CREATE TABLE crm.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,

  -- Official identifiers (France-specific but universal enough)
  siren VARCHAR(9),
  hq_siret VARCHAR(14),

  -- Core attributes
  name VARCHAR(255) NOT NULL,
  brand_name VARCHAR(255),
  linkedin_name VARCHAR(255),

  -- Activity
  naf_sector VARCHAR(255),
  activity TEXT,

  -- Business info
  founding_year SMALLINT,
  founding_date DATE,
  employee_range VARCHAR(50),
  annual_revenue_eur BIGINT,
  annual_revenue_year SMALLINT,
  is_growing BOOLEAN,

  -- Contact
  main_phone VARCHAR(32),
  generic_email CITEXT,
  website_url TEXT,
  linkedin_url TEXT,

  -- Address
  hq_address TEXT,

  -- Data quality
  data_completeness_score NUMERIC(3,2),  -- 0.00 to 1.00

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Natural key for deduplication
  UNIQUE (organisation_id, siren) WHERE siren IS NOT NULL,
  UNIQUE (organisation_id, linkedin_url) WHERE linkedin_url IS NOT NULL
);
```

#### Positions (Cleaned)

```sql
CREATE TABLE crm.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,

  person_id UUID NOT NULL,
  company_id UUID NOT NULL,

  -- Position details
  job_title VARCHAR(255),
  department VARCHAR(255),
  seniority_level VARCHAR(50),  -- 'entry', 'mid', 'senior', 'executive', 'c-level'

  -- Contact
  email CITEXT,
  email_status VARCHAR(50),     -- 'valid', 'invalid', 'catch-all', 'risky', 'unknown'
  email_confidence NUMERIC(3,2),  -- Renamed from email_reliability, normalized to 0-1

  -- Employment
  is_current BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_positions_person_same_org
    FOREIGN KEY (organisation_id, person_id)
    REFERENCES crm.people(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_positions_company_same_org
    FOREIGN KEY (organisation_id, company_id)
    REFERENCES crm.companies(organisation_id, id)
    ON DELETE CASCADE
);
```

## Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)

1. Create `crm.data_sources`
2. Create `crm.external_entity_mappings`
3. Create `crm.import_jobs`
4. Create `crm.import_records`

### Phase 2: Data Migration

1. Create default "pharow" data source for each organization
2. Migrate `pharow_company_id` → `external_entity_mappings`
3. Migrate `pharow_list_name` → `external_data` JSONB
4. Verify data integrity

### Phase 3: Update Application Code

1. Update import services to use new tables
2. Implement deduplication logic
3. Add multi-source reconciliation
4. Update queries to join with mappings

### Phase 4: Clean Up (Breaking Changes)

1. Drop `pharow_company_id` column
2. Drop `pharow_list_name` column
3. Drop related indexes and constraints
4. Update documentation

## Implementation Guidelines

### Source-Specific Data Storage

Store source-specific attributes in the `external_data` JSONB column:

```json
{
  "pharow": {
    "list_name": "Q1 2026 Tech Leads",
    "export_date": "2026-01-05",
    "segment": "enterprise"
  },
  "salesforce": {
    "account_id": "001XX000003DGb2",
    "owner_name": "Jane Smith",
    "last_activity_date": "2026-01-08"
  }
}
```

### Deduplication Strategy

1. **Primary Keys**: SIREN, LinkedIn URL, email domain
2. **Fuzzy Matching**: Company name similarity, address matching
3. **Confidence Scoring**: Based on match quality
4. **Manual Review**: Low-confidence matches flagged for review

### Conflict Resolution

When multiple sources provide conflicting data:

1. **Confidence-Based**: Use data from higher confidence source
2. **Recency-Based**: Prefer most recently updated data
3. **Completeness-Based**: Prefer more complete records
4. **Manual Override**: Allow users to choose preferred source per field

### Query Examples

#### Find company with any external ID

```sql
SELECT c.*
FROM crm.companies c
JOIN crm.external_entity_mappings m ON m.entity_id = c.id
WHERE m.organisation_id = :org_id
  AND m.entity_type = 'company'
  AND m.external_id = :external_id
  AND m.data_source_id = :source_id;
```

#### Get all mappings for a company

```sql
SELECT
  ds.source_type,
  ds.source_name,
  m.external_id,
  m.external_data,
  m.confidence_score,
  m.last_synced_at
FROM crm.external_entity_mappings m
JOIN crm.data_sources ds ON ds.id = m.data_source_id
WHERE m.organisation_id = :org_id
  AND m.entity_type = 'company'
  AND m.entity_id = :company_id;
```

#### Import job statistics

```sql
SELECT
  ds.source_name,
  j.job_type,
  j.status,
  j.records_processed,
  j.records_created,
  j.records_updated,
  j.started_at,
  j.completed_at
FROM crm.import_jobs j
JOIN crm.data_sources ds ON ds.id = j.data_source_id
WHERE j.organisation_id = :org_id
ORDER BY j.started_at DESC;
```

## Benefits

### Technical Benefits

- **Extensibility**: Add new sources without schema changes
- **Maintainability**: Clear separation of concerns
- **Auditability**: Complete import history
- **Flexibility**: Support any source type

### Business Benefits

- **Multi-Source Strategy**: Import from multiple vendors
- **Data Quality**: Confidence scoring and conflict resolution
- **Vendor Independence**: Not locked to single provider
- **Cost Optimization**: Mix and match data sources

## Supported Source Types

### Planned Support

1. **Pharow** (existing)
2. **Apollo.io**
3. **ZoomInfo**
4. **Salesforce**
5. **HubSpot**
6. **LinkedIn Sales Navigator**
7. **CSV/Excel** (manual uploads)
8. **API Integrations** (custom)

### Source-Specific Considerations

Each source type requires:

1. Import adapter (ETL logic)
2. Field mapping configuration
3. Deduplication rules
4. Rate limiting strategy
5. Error handling

## Next Steps

1. **Review & Approval**: Stakeholder review of architecture
2. **Migration Planning**: Detailed timeline and rollback plan
3. **Implementation**: Phase 1 (new tables)
4. **Testing**: Comprehensive testing with sample data
5. **Deployment**: Gradual rollout with monitoring

## Appendix

### Example: Pharow Data Source Config

```json
{
  "api_endpoint": "https://api.pharow.com/v1",
  "field_mappings": {
    "company_id": "pharow_company_id",
    "list_name": "export_list"
  },
  "deduplication_keys": ["pharow_company_id", "siren"],
  "sync_schedule": "0 2 * * *",
  "rate_limit": 100
}
```

### Example: Import Job Workflow

```
1. User initiates import → CREATE import_job
2. Import service reads source data
3. For each record:
   a. Check external_entity_mappings for existing entity
   b. If exists: UPDATE entity + mapping
   c. If not: CREATE entity + mapping
   d. Log to import_records
4. Update import_job statistics
5. Mark job as completed/failed
```

---

**Document Prepared By**: AI Architect  
**Review Required**: Database Team, Backend Team, Product Team
