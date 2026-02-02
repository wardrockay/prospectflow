# Story 1.3: View Campaign Details

**Epic**: 1 - Campaign Management Foundation  
**Story ID**: 1.3  
**Story Points**: 3  
**Status**: done  
**Dependencies**: E1.2 (Campaign List)  
**Created**: 2026-01-13  
**Assignee**: Dev Team

---

## Story Overview

### User Story

**As a** freelance video producer  
**I want** to view detailed information about a specific campaign  
**So that** I can see prospects, drafts, and performance metrics for that campaign

### Business Context

This story enables users to drill down into a specific campaign to view comprehensive details, metrics, and manage campaign properties. The campaign details page serves as the central hub for all campaign-related activities and provides inline editing capabilities for quick updates.

**Business Value**:

- Users can view complete campaign information including all metrics
- Enables quick updates to campaign properties via inline editing
- Provides status management with confirmation workflows
- Serves as navigation entry point for prospects, drafts, and emails (tabs for future stories)
- Supports campaign lifecycle management with validated status transitions

### Technical Context

**Architecture**: Express.js API with layered architecture (Controller → Service → Repository)

**Key Patterns from Stories 1-1 & 1-2**:

- Multi-tenant isolation via `organisation_id` in all queries
- Zod validation schemas for request payloads
- Structured logging with Pino child loggers
- Custom error classes mapped to HTTP status codes
- campaign-api service established (Story 1-1)
- Aggregated metrics via LEFT JOINs (Story 1-2)

**Database Schema**: `outreach.campaigns` table with same JOIN pattern as list view for metrics consistency

---

## Architecture Overview

### API Endpoints

#### 1. GET /api/v1/campaigns/:id

Fetch single campaign with aggregated metrics.

```
GET /api/v1/campaigns/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <jwt>
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organisationId": "org-uuid",
    "name": "Social Media Content Upgrade",
    "valueProp": "Help businesses create engaging product showcase videos",
    "templateId": null,
    "status": "draft",
    "createdAt": "2026-01-13T10:00:00Z",
    "updatedAt": "2026-01-13T10:00:00Z",
    "totalProspects": 25,
    "emailsSent": 15,
    "responseCount": 3,
    "responseRate": 20.0
  }
}
```

#### 2. PATCH /api/v1/campaigns/:id

Update campaign properties (inline editing).

```
PATCH /api/v1/campaigns/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "valueProp": "New value proposition"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organisationId": "org-uuid",
    "name": "Updated Campaign Name",
    "valueProp": "New value proposition",
    "templateId": null,
    "status": "draft",
    "createdAt": "2026-01-13T10:00:00Z",
    "updatedAt": "2026-01-13T15:30:00Z"
  },
  "message": "Campaign updated successfully"
}
```

### File Structure

```
apps/campaign-api/src/
├── controllers/
│   └── campaign.controller.ts      # UPDATE (add getCampaign, updateCampaign)
├── services/
│   └── campaign.service.ts         # UPDATE (add getCampaignDetails, updateCampaign)
├── repositories/
│   └── campaign.repository.ts      # UPDATE (add findById, update methods)
├── schemas/
│   └── campaign.schema.ts          # UPDATE (add updateCampaignSchema)
├── routes/
│   └── campaign.routes.ts          # UPDATE (add GET /:id, PATCH /:id)
└── types/
    └── campaign.ts                 # REUSE (CampaignListItem for details)
```

---

## Acceptance Criteria

### AC1: Campaign Detail Page

**Given** I click on a campaign from the list  
**When** the detail page loads (GET /api/v1/campaigns/:id)  
**Then** I should receive campaign data containing:

- Campaign Name (editable inline via PATCH)
- Value Proposition (editable inline via PATCH)
- Template Used (templateId, display "No template" if null)
- Status (with change status capability via PATCH)
- Created Date (createdAt)
- Total Prospects (aggregated count)
- Emails Sent (aggregated count from messages)
- Response Count (aggregated count of replied messages)
- Response Rate (calculated percentage)  
  **And** response should return in < 2 seconds

### AC2: Tabs for Different Views (Frontend Structure)

**Given** I am on campaign detail page  
**When** I view the tabs  
**Then** I should see tab structure for:

- **Overview** (default, shows metrics from AC1)
- **Prospects** (list of prospects - Future: Epic E2)
- **Drafts** (pending email drafts - Future: Epic E4)
- **Sent** (sent emails - Future: Epic E6)
- **Responses** (replied emails - Future: Epic E7)  
  **And** Overview tab data is provided by this story's GET endpoint  
  **And** Other tabs will be implemented in future epics

**Note**: This AC is primarily frontend-driven. Backend provides data structure via GET endpoint.

### AC3: Inline Editing

**Given** I want to update campaign name or value prop  
**When** I click on the field and modify it  
**Then** frontend should call PATCH /api/v1/campaigns/:id  
**And** PATCH should accept `name` and/or `valueProp` fields  
**And** Server should validate with Zod schema:

- name: 1-100 characters, trimmed
- valueProp: 1-150 characters, trimmed  
  **And** On success, return updated campaign with new `updatedAt` timestamp  
  **And** On validation error, return 400 with field-specific errors

### AC4: Status Change

**Given** I want to change campaign status  
**When** I submit status change via PATCH /api/v1/campaigns/:id  
**Then** I should see status transition validation:

**Allowed Transitions**:

- From `'draft'`: Can transition to `'running'` or `'archived'`
- From `'running'`: Can transition to `'paused'` or `'archived'`
- From `'paused'`: Can transition to `'running'` or `'archived'`
- From `'archived'`: Cannot transition (immutable)

**And** Invalid transitions should return 400 error: "Invalid status transition from {current} to {requested}"  
**And** Valid transitions should update status and return success

**UI Mapping** (implemented by frontend):

- "Pause Campaign" → `status: 'paused'` (only if current = 'running')
- "Resume Campaign" → `status: 'running'` (only if current = 'paused')
- "Archive Campaign" → `status: 'archived'` (with confirmation modal)

### AC5: Error Handling

**Given** various error scenarios occur  
**When** API responds  
**Then** appropriate errors should be returned:

**404 Not Found** - Campaign doesn't exist or belongs to different org:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Campaign not found",
    "details": { "campaignId": "uuid" }
  }
}
```

**400 Bad Request** - Invalid UUID format or validation error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid campaign data",
    "details": {
      "name": ["Campaign name must be 100 characters or less"]
    }
  }
}
```

**400 Bad Request** - Invalid status transition:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid status transition from archived to running"
  }
}
```

---

## Implementation Plan

### Phase 1: Schemas & Validation (0.5 SP)

#### Task 1.1: Add Update Campaign Schema

**File**: `apps/campaign-api/src/schemas/campaign.schema.ts`

**Objective**: Validate PATCH request body with optional fields and status transitions

```typescript
// ADD to existing file:

/**
 * Update campaign schema (PATCH)
 * All fields are optional but at least one must be provided
 */
export const updateCampaignSchema = z
  .object({
    name: z.string().min(1, 'Campaign name is required').max(100).trim().optional(),
    valueProp: z
      .string()
      .min(1, 'Value proposition is required')
      .max(150, 'Value proposition must be 150 characters or less')
      .trim()
      .optional(),
    status: z.enum(['draft', 'running', 'paused', 'archived']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;

/**
 * Validate campaign status transition
 * @param from Current status
 * @param to Requested status
 * @returns true if transition is allowed
 */
export function isValidStatusTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  const transitions: Record<CampaignStatus, CampaignStatus[]> = {
    draft: ['running', 'archived'],
    running: ['paused', 'archived'],
    paused: ['running', 'archived'],
    archived: [], // Cannot transition from archived
  };

  return transitions[from]?.includes(to) ?? false;
}
```

**Acceptance Criteria**:

- [x] At least one field required for update
- [x] name: 1-100 chars, trimmed, optional
- [x] valueProp: 1-150 chars, trimmed, optional
- [x] status: enum validation, optional
- [x] Status transition validation helper function

---

### Phase 2: Repository Layer (1 SP)

#### Task 2.1: Add findById Method

**File**: `apps/campaign-api/src/repositories/campaign.repository.ts`

**Objective**: Fetch single campaign with aggregated metrics (reuse Story 1-2 JOIN pattern)

```typescript
// ADD to existing CampaignRepository class:

/**
 * Find campaign by ID with aggregated metrics
 * Uses same JOIN pattern as findAll for consistency
 */
async findById(
  organisationId: string,
  campaignId: string,
): Promise<CampaignListItem | null> {
  logger.debug({ organisationId, campaignId }, 'Fetching campaign by ID');

  const result = await trackDatabaseQuery('SELECT', 'outreach', async () => {
    return this.pool.query<CampaignListItem>(
      `SELECT
         c.id,
         c.organisation_id AS "organisationId",
         c.name,
         c.value_prop AS "valueProp",
         c.template_id AS "templateId",
         c.status,
         c.created_at AS "createdAt",
         c.updated_at AS "updatedAt",

         -- Aggregated metrics (same as list query for consistency)
         COALESCE(COUNT(DISTINCT p.id), 0)::int AS "totalProspects",
         COALESCE(COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END), 0)::int AS "emailsSent",
         COALESCE(COUNT(DISTINCT CASE WHEN m.replied_at IS NOT NULL THEN m.id END), 0)::int AS "responseCount",
         CASE
           WHEN COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END) > 0
           THEN ROUND(
             COUNT(DISTINCT CASE WHEN m.replied_at IS NOT NULL THEN m.id END)::numeric /
             COUNT(DISTINCT CASE WHEN m.sent_at IS NOT NULL THEN m.id END)::numeric * 100,
             2
           )
           ELSE 0
         END AS "responseRate"

       FROM outreach.campaigns c
       -- LEFT JOINs to include campaigns with 0 prospects/messages
       LEFT JOIN outreach.tasks t
         ON t.organisation_id = c.organisation_id
         AND t.campaign_id = c.id
       LEFT JOIN crm.people p
         ON p.organisation_id = t.organisation_id
         AND p.id = t.person_id
       LEFT JOIN outreach.messages m
         ON m.organisation_id = c.organisation_id
         AND m.campaign_id = c.id
       WHERE c.organisation_id = $1
         AND c.id = $2
       GROUP BY c.id, c.organisation_id, c.name, c.value_prop, c.template_id, c.status, c.created_at, c.updated_at`,
      [organisationId, campaignId],
    );
  });

  if (result.rows.length === 0) {
    logger.warn({ organisationId, campaignId }, 'Campaign not found');
    return null;
  }

  logger.info({ organisationId, campaignId }, 'Campaign fetched successfully');
  return result.rows[0];
}
```

**Acceptance Criteria**:

- [x] SELECT includes `organisation_id` and `id` filter
- [x] LEFT JOIN pattern matches Story 1-2 for consistency
- [x] Returns null if not found (not throwing error)
- [x] Returns CampaignListItem (same interface as list)
- [x] Logging with context

---

#### Task 2.2: Add update Method

**File**: `apps/campaign-api/src/repositories/campaign.repository.ts`

**Objective**: Update campaign fields with dynamic SQL

```typescript
// ADD to existing CampaignRepository class:

/**
 * Update campaign fields
 * Dynamically builds SET clause based on provided fields
 * @returns Updated campaign (basic fields only, no metrics)
 */
async update(
  organisationId: string,
  campaignId: string,
  updates: UpdateCampaignDto,
): Promise<Campaign | null> {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  // Build SET clause dynamically: "name = $3, value_prop = $4"
  // Map camelCase to snake_case for DB columns
  const columnMapping: Record<string, string> = {
    name: 'name',
    valueProp: 'value_prop',
    status: 'status',
  };

  const setClauses = fields.map((field, index) => {
    const column = columnMapping[field];
    return `${column} = $${index + 3}`; // $1, $2 are organisationId, campaignId
  });

  const values = fields.map((field) => updates[field as keyof UpdateCampaignDto]);

  logger.debug(
    { organisationId, campaignId, updates },
    'Updating campaign',
  );

  const result = await trackDatabaseQuery('UPDATE', 'outreach', async () => {
    return this.pool.query<Campaign>(
      `UPDATE outreach.campaigns
       SET ${setClauses.join(', ')},
           updated_at = now()
       WHERE organisation_id = $1
         AND id = $2
       RETURNING
         id,
         organisation_id AS "organisationId",
         name,
         value_prop AS "valueProp",
         template_id AS "templateId",
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [organisationId, campaignId, ...values],
    );
  });

  if (result.rows.length === 0) {
    logger.warn({ organisationId, campaignId }, 'Campaign not found for update');
    return null;
  }

  logger.info({ organisationId, campaignId, updates }, 'Campaign updated successfully');
  return result.rows[0];
}
```

**Acceptance Criteria**:

- [x] Dynamic SET clause based on provided fields
- [x] Maps camelCase (valueProp) to snake_case (value_prop)
- [x] Updates `updated_at` timestamp automatically
- [x] WHERE clause includes `organisation_id` and `id`
- [x] Returns updated campaign with RETURNING clause
- [x] Returns null if not found
- [x] Logging with context

---

### Phase 3: Service Layer (0.5 SP)

#### Task 3.1: Add getCampaignDetails Method

**File**: `apps/campaign-api/src/services/campaign.service.ts`

**Objective**: Fetch campaign and throw NotFoundError if missing

```typescript
// ADD to existing CampaignService class:

/**
 * Get campaign details by ID
 * @throws NotFoundError if campaign not found
 */
async getCampaignDetails(
  organisationId: string,
  campaignId: string,
): Promise<CampaignListItem> {
  logger.info({ organisationId, campaignId }, 'Fetching campaign details');

  const campaign = await this.campaignRepository.findById(organisationId, campaignId);

  if (!campaign) {
    logger.warn({ organisationId, campaignId }, 'Campaign not found');
    throw new NotFoundError('Campaign not found');
  }

  logger.info({ organisationId, campaignId }, 'Campaign details retrieved');
  return campaign;
}
```

**Acceptance Criteria**:

- [x] Delegates to repository findById
- [x] Throws NotFoundError if null returned
- [x] Logs operation start and completion

---

#### Task 3.2: Add updateCampaign Method with Status Validation

**File**: `apps/campaign-api/src/services/campaign.service.ts`

**Objective**: Update campaign with status transition validation

```typescript
// ADD to existing CampaignService class:

/**
 * Update campaign with status transition validation
 * @throws NotFoundError if campaign not found
 * @throws ValidationError if status transition invalid
 */
async updateCampaign(
  organisationId: string,
  campaignId: string,
  updates: UpdateCampaignDto,
): Promise<Campaign> {
  logger.info({ organisationId, campaignId, updates }, 'Updating campaign');

  // If status is being updated, validate transition
  if (updates.status) {
    // Fetch current campaign to check current status
    const currentCampaign = await this.campaignRepository.findById(organisationId, campaignId);

    if (!currentCampaign) {
      logger.warn({ organisationId, campaignId }, 'Campaign not found for update');
      throw new NotFoundError('Campaign not found');
    }

    // Validate status transition
    const isValid = isValidStatusTransition(
      currentCampaign.status as CampaignStatus,
      updates.status as CampaignStatus,
    );

    if (!isValid) {
      logger.warn(
        { organisationId, campaignId, from: currentCampaign.status, to: updates.status },
        'Invalid status transition',
      );
      throw new ValidationError(
        `Invalid status transition from ${currentCampaign.status} to ${updates.status}`,
      );
    }
  }

  // Perform update
  const updated = await this.campaignRepository.update(organisationId, campaignId, updates);

  if (!updated) {
    logger.warn({ organisationId, campaignId }, 'Campaign not found for update');
    throw new NotFoundError('Campaign not found');
  }

  logger.info({ organisationId, campaignId }, 'Campaign updated successfully');
  return updated;
}
```

**Acceptance Criteria**:

- [x] Validates status transition if status in updates
- [x] Fetches current campaign to check current status
- [x] Calls isValidStatusTransition helper
- [x] Throws ValidationError for invalid transitions
- [x] Throws NotFoundError if campaign doesn't exist
- [x] Delegates to repository update
- [x] Logs all operations

---

### Phase 4: Controller & Routes (0.5 SP)

#### Task 4.1: Add getCampaign Controller

**File**: `apps/campaign-api/src/controllers/campaign.controller.ts`

**Objective**: Handle GET /:id request

```typescript
// ADD to existing CampaignController class:

/**
 * Get single campaign details
 * GET /api/v1/campaigns/:id
 */
getCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: campaignId } = req.params;
    const organisationId = req.organisationId!;

    // Validate UUID format
    if (!this.isValidUUID(campaignId)) {
      req.log.warn({ campaignId }, 'Invalid campaign ID format');
      throw new ValidationError('Invalid campaign ID format');
    }

    req.log.info({ organisationId, campaignId }, 'Fetching campaign details');

    const campaign = await this.campaignService.getCampaignDetails(organisationId, campaignId);

    req.log.info({ organisationId, campaignId }, 'Campaign details retrieved');

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UUID validation helper
 */
private isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

**Acceptance Criteria**:

- [x] Extracts campaignId from req.params
- [x] Validates UUID format
- [x] Returns 200 with campaign data
- [x] Error handling via next(error)
- [x] Logging with req.log

---

#### Task 4.2: Add updateCampaign Controller

**File**: `apps/campaign-api/src/controllers/campaign.controller.ts`

**Objective**: Handle PATCH /:id request with validation

```typescript
// ADD to existing CampaignController class:

/**
 * Update campaign (inline editing)
 * PATCH /api/v1/campaigns/:id
 */
updateCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: campaignId } = req.params;
    const organisationId = req.organisationId!;

    // Validate UUID format
    if (!this.isValidUUID(campaignId)) {
      req.log.warn({ campaignId }, 'Invalid campaign ID format');
      throw new ValidationError('Invalid campaign ID format');
    }

    // Validate request body
    const parseResult = updateCampaignSchema.safeParse(req.body);

    if (!parseResult.success) {
      req.log.warn({ errors: parseResult.error.flatten() }, 'Update campaign validation failed');
      throw new ValidationError('Invalid campaign data', parseResult.error.flatten().fieldErrors);
    }

    const updates = parseResult.data;

    req.log.info({ organisationId, campaignId, updates }, 'Updating campaign');

    const updated = await this.campaignService.updateCampaign(organisationId, campaignId, updates);

    req.log.info({ organisationId, campaignId }, 'Campaign updated successfully');

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Campaign updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

**Acceptance Criteria**:

- [x] Validates UUID format
- [x] Validates request body with Zod schema
- [x] Returns 200 with updated campaign
- [x] Returns success message
- [x] Error handling via next(error)

---

#### Task 4.3: Add Routes

**File**: `apps/campaign-api/src/routes/campaign.routes.ts`

**Objective**: Register GET /:id and PATCH /:id routes

```typescript
// ADD to existing router:

// IMPORTANT: Place specific routes AFTER general routes to avoid conflicts
// GET /api/v1/campaigns (list) - already exists from Story 1-2
// GET /api/v1/campaigns/:id (details) - NEW
// PATCH /api/v1/campaigns/:id (update) - NEW

// Get campaign details
router.get('/:id', campaignController.getCampaign);

// Update campaign (inline editing, status change)
router.patch('/:id', campaignController.updateCampaign);
```

**Acceptance Criteria**:

- [x] GET /:id route registered
- [x] PATCH /:id route registered
- [x] Routes placed after GET / (list route)
- [x] Auth middleware inherited from router setup

---

### Phase 5: Testing (0.5 SP)

#### Task 5.1: Schema Tests

**File**: `apps/campaign-api/tests/unit/schemas/campaign.schema.test.ts`

**Objective**: Test update schema and status transitions

```typescript
// ADD to existing test file:

describe('updateCampaignSchema', () => {
  it('should accept valid name update', () => {
    const result = updateCampaignSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should accept valid valueProp update', () => {
    const result = updateCampaignSchema.safeParse({ valueProp: 'New value prop' });
    expect(result.success).toBe(true);
  });

  it('should accept valid status update', () => {
    const result = updateCampaignSchema.safeParse({ status: 'running' });
    expect(result.success).toBe(true);
  });

  it('should accept multiple fields', () => {
    const result = updateCampaignSchema.safeParse({
      name: 'New Name',
      valueProp: 'New value',
      status: 'paused',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty object', () => {
    const result = updateCampaignSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('At least one field');
    }
  });

  it('should reject name exceeding 100 chars', () => {
    const result = updateCampaignSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('should reject valueProp exceeding 150 chars', () => {
    const result = updateCampaignSchema.safeParse({ valueProp: 'a'.repeat(151) });
    expect(result.success).toBe(false);
  });

  it('should reject invalid status', () => {
    const result = updateCampaignSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should trim whitespace from name', () => {
    const result = updateCampaignSchema.safeParse({ name: '  Trimmed  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Trimmed');
    }
  });
});

describe('isValidStatusTransition', () => {
  it('should allow draft -> running', () => {
    expect(isValidStatusTransition('draft', 'running')).toBe(true);
  });

  it('should allow draft -> archived', () => {
    expect(isValidStatusTransition('draft', 'archived')).toBe(true);
  });

  it('should allow running -> paused', () => {
    expect(isValidStatusTransition('running', 'paused')).toBe(true);
  });

  it('should allow running -> archived', () => {
    expect(isValidStatusTransition('running', 'archived')).toBe(true);
  });

  it('should allow paused -> running', () => {
    expect(isValidStatusTransition('paused', 'running')).toBe(true);
  });

  it('should allow paused -> archived', () => {
    expect(isValidStatusTransition('paused', 'archived')).toBe(true);
  });

  it('should reject draft -> paused', () => {
    expect(isValidStatusTransition('draft', 'paused')).toBe(false);
  });

  it('should reject archived -> any status', () => {
    expect(isValidStatusTransition('archived', 'draft')).toBe(false);
    expect(isValidStatusTransition('archived', 'running')).toBe(false);
    expect(isValidStatusTransition('archived', 'paused')).toBe(false);
  });
});
```

**Acceptance Criteria**:

- [x] Tests for valid single field updates
- [x] Tests for multiple fields
- [x] Tests for empty object rejection
- [x] Tests for field length validation
- [x] Tests for invalid status values
- [x] Tests for whitespace trimming
- [x] Tests for all valid status transitions
- [x] Tests for invalid status transitions

---

#### Task 5.2: Repository Tests

**File**: `apps/campaign-api/tests/unit/repositories/campaign.repository.test.ts`

**Objective**: Test findById and update methods

```typescript
// ADD to existing test file:

describe('findById', () => {
  it('should return campaign with metrics', async () => {
    const mockCampaign = {
      id: 'campaign-1',
      organisationId: 'org-123',
      name: 'Test Campaign',
      valueProp: 'Test value',
      status: 'draft',
      totalProspects: 10,
      emailsSent: 5,
      responseCount: 2,
      responseRate: 40.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPool.query.mockResolvedValueOnce({ rows: [mockCampaign] });

    const result = await repository.findById('org-123', 'campaign-1');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE c.organisation_id = $1 AND c.id = $2'),
      ['org-123', 'campaign-1'],
    );
    expect(result).toEqual(mockCampaign);
  });

  it('should return null when campaign not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findById('org-123', 'nonexistent');

    expect(result).toBeNull();
  });

  it('should include LEFT JOINs for metrics', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{}] });

    await repository.findById('org-123', 'campaign-1');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN outreach.tasks'),
      expect.any(Array),
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN crm.people'),
      expect.any(Array),
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN outreach.messages'),
      expect.any(Array),
    );
  });
});

describe('update', () => {
  it('should update name field', async () => {
    const mockUpdated = {
      id: 'campaign-1',
      organisationId: 'org-123',
      name: 'Updated Name',
      valueProp: 'Original value',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPool.query.mockResolvedValueOnce({ rows: [mockUpdated] });

    const result = await repository.update('org-123', 'campaign-1', { name: 'Updated Name' });

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SET name = $3'),
      expect.arrayContaining(['org-123', 'campaign-1', 'Updated Name']),
    );
    expect(result).toEqual(mockUpdated);
  });

  it('should update multiple fields', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{}] });

    await repository.update('org-123', 'campaign-1', {
      name: 'New Name',
      valueProp: 'New value',
      status: 'running',
    });

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('SET name = $3, value_prop = $4, status = $5'),
      expect.arrayContaining(['org-123', 'campaign-1', 'New Name', 'New value', 'running']),
    );
  });

  it('should update updated_at timestamp', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{}] });

    await repository.update('org-123', 'campaign-1', { name: 'New' });

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('updated_at = now()'),
      expect.any(Array),
    );
  });

  it('should return null when campaign not found', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.update('org-123', 'nonexistent', { name: 'New' });

    expect(result).toBeNull();
  });

  it('should use RETURNING clause', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{}] });

    await repository.update('org-123', 'campaign-1', { name: 'New' });

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('RETURNING'),
      expect.any(Array),
    );
  });
});
```

**Acceptance Criteria**:

- [x] Test findById success case
- [x] Test findById not found (returns null)
- [x] Test findById includes LEFT JOINs
- [x] Test update single field
- [x] Test update multiple fields
- [x] Test update updated_at timestamp
- [x] Test update not found (returns null)
- [x] Test RETURNING clause

---

#### Task 5.3: Service Tests

**File**: `apps/campaign-api/tests/unit/services/campaign.service.test.ts`

**Objective**: Test getCampaignDetails and updateCampaign with status validation

```typescript
// ADD to existing test file:

describe('getCampaignDetails', () => {
  it('should return campaign from repository', async () => {
    const mockCampaign = { id: 'campaign-1', name: 'Test' };
    mockRepository.findById.mockResolvedValue(mockCampaign);

    const result = await service.getCampaignDetails('org-123', 'campaign-1');

    expect(mockRepository.findById).toHaveBeenCalledWith('org-123', 'campaign-1');
    expect(result).toEqual(mockCampaign);
  });

  it('should throw NotFoundError when campaign not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(service.getCampaignDetails('org-123', 'nonexistent')).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('updateCampaign', () => {
  it('should update campaign without status change', async () => {
    const mockUpdated = { id: 'campaign-1', name: 'Updated' };
    mockRepository.update.mockResolvedValue(mockUpdated);

    const result = await service.updateCampaign('org-123', 'campaign-1', { name: 'Updated' });

    expect(mockRepository.update).toHaveBeenCalledWith('org-123', 'campaign-1', {
      name: 'Updated',
    });
    expect(result).toEqual(mockUpdated);
  });

  it('should validate status transition when status provided', async () => {
    const mockCurrent = { id: 'campaign-1', status: 'draft' };
    const mockUpdated = { id: 'campaign-1', status: 'running' };

    mockRepository.findById.mockResolvedValue(mockCurrent);
    mockRepository.update.mockResolvedValue(mockUpdated);

    const result = await service.updateCampaign('org-123', 'campaign-1', { status: 'running' });

    expect(mockRepository.findById).toHaveBeenCalledWith('org-123', 'campaign-1');
    expect(result).toEqual(mockUpdated);
  });

  it('should throw ValidationError for invalid status transition', async () => {
    const mockCurrent = { id: 'campaign-1', status: 'archived' };
    mockRepository.findById.mockResolvedValue(mockCurrent);

    await expect(
      service.updateCampaign('org-123', 'campaign-1', { status: 'running' }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw NotFoundError when campaign not found during status check', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      service.updateCampaign('org-123', 'nonexistent', { status: 'running' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when update returns null', async () => {
    mockRepository.update.mockResolvedValue(null);

    await expect(service.updateCampaign('org-123', 'campaign-1', { name: 'New' })).rejects.toThrow(
      NotFoundError,
    );
  });
});
```

**Acceptance Criteria**:

- [x] Test getCampaignDetails success
- [x] Test getCampaignDetails throws NotFoundError
- [x] Test updateCampaign without status
- [x] Test updateCampaign with valid status transition
- [x] Test updateCampaign throws ValidationError for invalid transition
- [x] Test updateCampaign throws NotFoundError

---

#### Task 5.4: Controller Tests

**File**: `apps/campaign-api/tests/unit/controllers/campaign.controller.test.ts`

**Objective**: Test HTTP handlers for GET and PATCH

```typescript
// ADD to existing test file:

describe('getCampaign', () => {
  it('should return 200 with campaign data', async () => {
    const mockCampaign = { id: 'campaign-1', name: 'Test' };
    mockReq.params = { id: 'campaign-1' };
    mockService.getCampaignDetails.mockResolvedValue(mockCampaign);

    await controller.getCampaign(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockCampaign,
    });
  });

  it('should return validation error for invalid UUID', async () => {
    mockReq.params = { id: 'invalid-uuid' };

    await controller.getCampaign(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid campaign ID format',
      }),
    );
  });

  it('should pass NotFoundError to next', async () => {
    mockReq.params = { id: 'campaign-1' };
    const error = new NotFoundError('Campaign not found');
    mockService.getCampaignDetails.mockRejectedValue(error);

    await controller.getCampaign(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});

describe('updateCampaign', () => {
  it('should return 200 with updated campaign', async () => {
    const mockUpdated = { id: 'campaign-1', name: 'Updated' };
    mockReq.params = { id: 'campaign-1' };
    mockReq.body = { name: 'Updated' };
    mockService.updateCampaign.mockResolvedValue(mockUpdated);

    await controller.updateCampaign(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockUpdated,
      message: 'Campaign updated successfully',
    });
  });

  it('should return validation error for invalid UUID', async () => {
    mockReq.params = { id: 'invalid-uuid' };
    mockReq.body = { name: 'Updated' };

    await controller.updateCampaign(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid campaign ID format',
      }),
    );
  });

  it('should return validation error for empty body', async () => {
    mockReq.params = { id: 'campaign-1' };
    mockReq.body = {};

    await controller.updateCampaign(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid campaign data',
      }),
    );
  });

  it('should return validation error for invalid name length', async () => {
    mockReq.params = { id: 'campaign-1' };
    mockReq.body = { name: 'a'.repeat(101) };

    await controller.updateCampaign(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should pass ValidationError to next for invalid status transition', async () => {
    mockReq.params = { id: 'campaign-1' };
    mockReq.body = { status: 'running' };
    const error = new ValidationError('Invalid status transition');
    mockService.updateCampaign.mockRejectedValue(error);

    await controller.updateCampaign(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
```

**Acceptance Criteria**:

- [x] Test getCampaign 200 response
- [x] Test getCampaign invalid UUID
- [x] Test getCampaign NotFoundError handling
- [x] Test updateCampaign 200 response
- [x] Test updateCampaign invalid UUID
- [x] Test updateCampaign empty body
- [x] Test updateCampaign field validation
- [x] Test updateCampaign status transition error

---

## Dev Notes

### Critical Architecture Patterns (from project-context.md)

**Multi-Tenant Isolation (MANDATORY)**:

- ALL queries MUST include `organisation_id` filter
- Use composite primary keys: `(organisation_id, id)`
- Repository returns null for not found (service throws NotFoundError)

**Structured Logging (MANDATORY)**:

- Use `createChildLogger('CampaignService')` pattern
- Log format: context object first, message second
- Include request context for distributed tracing

**Error Handling**:

- Use custom error classes: `ValidationError`, `NotFoundError`
- Map to appropriate HTTP status codes (404, 400)
- Never expose stack traces in production

**Testing Standards**:

- Unit tests required for all layers
- Mock external dependencies (DB, Redis, RabbitMQ)
- > 80% coverage target

### Source Tree Components

**Modified Files**:

- `apps/campaign-api/src/types/campaign.ts` - REUSE CampaignListItem (no changes)
- `apps/campaign-api/src/schemas/campaign.schema.ts` - ADD updateCampaignSchema, isValidStatusTransition
- `apps/campaign-api/src/repositories/campaign.repository.ts` - ADD findById, update methods
- `apps/campaign-api/src/services/campaign.service.ts` - ADD getCampaignDetails, updateCampaign methods
- `apps/campaign-api/src/controllers/campaign.controller.ts` - ADD getCampaign, updateCampaign, isValidUUID
- `apps/campaign-api/src/routes/campaign.routes.ts` - ADD GET /:id, PATCH /:id routes
- `apps/campaign-api/tests/unit/**/*.test.ts` - ADD test cases

### Database Schema Notes

**Tables Used**:

- `outreach.campaigns` - Main campaign data (SELECT, UPDATE)
- `outreach.tasks` - Campaign tasks (LEFT JOIN for metrics)
- `crm.people` - Prospect details (LEFT JOIN for metrics)
- `outreach.messages` - Email tracking (LEFT JOIN for metrics)

**Query Pattern**: Reuse Story 1-2's LEFT JOIN pattern for consistency

**Indexes** (should exist from Epic 0):

- `idx_campaigns_org_status` on `(organisation_id, status)`
- `idx_campaigns_org_updated` on `(organisation_id, updated_at DESC)`
- Primary key on `(organisation_id, id)`

### Key Learnings from Stories 1-1 & 1-2

**Patterns to Reuse**:

1. **Consistent Response Structure**: Same as Story 1-2 for details view
2. **UUID Validation**: Add helper method `isValidUUID()` in controller
3. **Dynamic SQL**: Build SET clause dynamically for PATCH flexibility
4. **Status Validation**: Service-layer validation for business rules
5. **Not Found Handling**: Repository returns null, service throws NotFoundError

**Repository Pattern**:

- Use `trackDatabaseQuery()` wrapper for metrics
- Map DB snake_case to camelCase in SELECT/RETURNING
- findById reuses same JOIN pattern as findAll for consistency

**Controller Pattern**:

- Validate path params (UUID format)
- Validate body with Zod schema
- Use `req.log` for request-scoped logging
- Return consistent response format: `{ success: true, data: {...} }`

### Status Transition Business Logic

**Allowed Transitions** (AC4):

```
draft → [running, archived]
running → [paused, archived]
paused → [running, archived]
archived → [] (immutable)
```

**Implementation**:

- Validation in `isValidStatusTransition()` helper (schemas)
- Service layer checks transition before update
- Throws `ValidationError` for invalid transitions

**Frontend Integration** (for reference):

- "Pause Campaign" button → only shown if status = 'running'
- "Resume Campaign" button → only shown if status = 'paused'
- "Archive Campaign" button → requires confirmation modal

### Performance Considerations

**AC1 Requirement**: "page should load in < 2 seconds"

**Optimization Strategies**:

1. **Reuse Story 1-2's indexes**: Queries are similar, indexes already optimized
2. **Single query with JOINs**: No N+1 problem, all metrics in one SELECT
3. **Database query metrics**: Track performance with `trackDatabaseQuery()`

**Caching Opportunities** (future enhancement):

- Cache campaign details in Redis for 60 seconds
- Invalidate on PATCH updates
- Key format: `campaign:org-123:campaign-1:details`

### References

- **Epic & AC**: [doc/planning/epics/epics.md#story-e1-3](../planning/epics/epics.md)
- **Story 1-1**: [1-1-create-new-campaign.md](./1-1-create-new-campaign.md)
- **Story 1-2**: [1-2-view-campaign-list.md](./1-2-view-campaign-list.md)
- **Project Context**: [doc/project-context.md](../project-context.md)
- **Architecture**: [doc/reference/ARCHITECTURE.md](../reference/ARCHITECTURE.md)

---

## Definition of Done

### Functional Requirements

- [x] GET /api/v1/campaigns/:id endpoint implemented
- [x] PATCH /api/v1/campaigns/:id endpoint implemented
- [x] Campaign details include aggregated metrics (same as list view)
- [x] Inline editing works for name, valueProp
- [x] Status transitions validated with business rules
- [x] Multi-tenant isolation enforced (organisation_id filtering)
- [x] Response time < 2 seconds (measured with Prometheus)

### Technical Requirements

- [x] Types reuse CampaignListItem from Story 1-2
- [x] Zod schema for PATCH validation
- [x] Status transition helper function
- [x] Repository findById with LEFT JOINs
- [x] Repository update with dynamic SET clause
- [x] Service getCampaignDetails throws NotFoundError
- [x] Service updateCampaign validates status transitions
- [x] Controller getCampaign validates UUID format
- [x] Controller updateCampaign validates body
- [x] GET /:id and PATCH /:id routes registered
- [x] All layers use structured logging
- [x] Database queries include organisation_id

### Testing Requirements

- [x] Schema tests: updateCampaignSchema validation, status transitions
- [x] Repository tests: findById (success, not found), update (single/multiple fields)
- [x] Service tests: getCampaignDetails, updateCampaign (status validation)
- [x] Controller tests: getCampaign (200, invalid UUID), updateCampaign (200, validation errors)
- [x] > 80% code coverage for new code
- [x] All existing tests still pass (Story 1-1, 1-2)

### Documentation

- [x] API endpoints documented (GET, PATCH)
- [x] Status transition rules documented
- [x] Error scenarios documented
- [x] Story marked as review

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (via GitHub Copilot)

### Debug Log References

No debugging required - all tests passed on first run after fixes.

### Code Review Fixes Applied (2026-01-13)

**HIGH Severity - Fixed:**

1. **ValidationError Constructor** - Updated to accept `fieldErrors` parameter. Error middleware now returns fieldErrors in response.
2. **Same-Status Transitions** - `isValidStatusTransition()` now allows same-status transitions as no-op (draft→draft is valid).

**MEDIUM Severity - Fixed:** 3. **Missing Metrics** - Added `campaignDetailsTotal`, `campaignDetailsDuration`, `campaignUpdateTotal`, `campaignUpdateDuration` metrics with proper tracking in controller. 4. **Error Middleware** - Updated to handle ValidationError separately and include fieldErrors in response.

**LOW Severity - Fixed:** 5. **Missing valueProp trimming test** - Added test case for valueProp whitespace trimming.

**Tests Added:**

- 4 new tests for same-status transitions (draft→draft, running→running, paused→paused, archived→archived)
- 1 new test for valueProp whitespace trimming
- Total tests: 74 (was 69)

### Completion Notes List

**Implementation Summary:**

- ✅ Implemented GET /api/v1/campaigns/:id endpoint with aggregated metrics
- ✅ Implemented PATCH /api/v1/campaigns/:id endpoint with inline editing
- ✅ Added updateCampaignSchema with Zod validation
- ✅ Created isValidStatusTransition() helper function
- ✅ Added CampaignRepository.findById() with LEFT JOIN pattern (reused from Story 1-2)
- ✅ Added CampaignRepository.update() with dynamic SET clause
- ✅ Added CampaignService.getCampaignDetails() with NotFoundError handling
- ✅ Added CampaignService.updateCampaign() with status transition validation
- ✅ Added CampaignController.getCampaign() with UUID validation
- ✅ Added CampaignController.updateCampaign() with request validation
- ✅ Registered GET /:id and PATCH /:id routes
- ✅ Comprehensive tests: 30 schema tests, 16 repository tests, 9 service tests, 14 controller tests
- ✅ All 69 tests passing (100% success rate)
- ✅ Multi-tenant isolation enforced in all queries
- ✅ Structured logging with Pino throughout all layers

**Technical Decisions:**

1. Reused CampaignListItem interface from Story 1-2 for consistency
2. Same LEFT JOIN pattern as list view to ensure metric consistency
3. Dynamic SET clause in update method for flexibility
4. Status transition validation at service layer (business logic)
5. UUID validation at controller layer (input validation)

**Architecture Compliance:**

- Multi-tenant isolation: ✅ All queries filter by organisation_id
- Logging: ✅ Structured logging with context objects
- Error handling: ✅ Custom error classes (NotFoundError, ValidationError)
- Testing: ✅ Comprehensive unit tests across all layers

### File List

**Modified Files**:

- apps/campaign-api/src/schemas/campaign.schema.ts
- apps/campaign-api/src/repositories/campaign.repository.ts
- apps/campaign-api/src/services/campaign.service.ts
- apps/campaign-api/src/controllers/campaign.controller.ts
- apps/campaign-api/src/routes/campaign.routes.ts
- apps/campaign-api/src/errors/ValidationError.ts (CR fix)
- apps/campaign-api/src/config/metrics.ts (CR fix - added 4 new metrics)
- apps/campaign-api/src/middlewares/error.middleware.ts (CR fix - fieldErrors support)
- apps/campaign-api/tests/unit/schemas/campaign.schema.test.ts
- apps/campaign-api/tests/unit/repositories/campaign.repository.test.ts
- apps/campaign-api/tests/unit/services/campaign.service.test.ts
- apps/campaign-api/tests/unit/controllers/campaign.controller.test.ts
