# Story LM-007: Dashboard Lead Magnet

**Epic:** EPIC-LM-001 - Lead Magnet Delivery System  
**Status:** ready-for-dev  
**Priority:** SHOULD  
**Story Points:** 13  
**Sprint:** 3  
**Dependencies:** LM-001 ✅, LM-002 ✅, LM-003

---

## Story

**As a** business owner (Tolliam)  
**I want to** view lead magnet analytics, manage subscribers, and configure nurture sequences  
**So that** I can measure funnel performance and engage with my leads

---

## Business Context

This story implements the **admin dashboard** for the Lead Magnet system in `ui-web`. It consolidates:
- LM-004 (Analytics Dashboard) - merged into this story
- Subscriber management
- Simple nurture sequence planning
- Email template management

### Dashboard Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Analytics** | Funnel visualization, KPIs, date filters | MUST |
| **Subscribers** | List, search, export CSV, delete (RGPD) | MUST |
| **Nurture Sequences** | Manual email planning list | SHOULD |
| **Email Templates** | CRUD templates with preview | SHOULD |

---

## Acceptance Criteria

### Analytics Dashboard

- [ ] **AC7.1:** Admin page at `/admin/lead-magnets` displays key metrics:
  - Total signups (all time)
  - Confirmation rate (confirmed / total) with percentage
  - Download completion rate (downloaded / confirmed) with percentage  
  - Average time to confirm (in hours)
  - Total downloads (including re-downloads)

- [ ] **AC7.2:** Funnel visualization shows:
  - Stage 1: Signups (100% baseline)
  - Stage 2: Confirmed (% of signups)
  - Stage 3: Downloaded (% of confirmed)
  - Visual bars or chart showing conversion at each stage

- [ ] **AC7.3:** Date range filter:
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - All time
  - Filter applies to all metrics

- [ ] **AC7.4:** Auto-refresh stats every 60 seconds (optional toggle)

### Subscribers Management

- [ ] **AC7.5:** Admin page at `/admin/subscribers` displays:
  - Paginated table (25 items per page)
  - Columns: Email, Status, Source, Created At, Confirmed At, Downloads
  - Sort by any column (click header)
  - Search by email (debounced input)

- [ ] **AC7.6:** Subscriber actions:
  - View details (modal or separate page)
  - Delete subscriber (RGPD compliance - cascades to all related data)
  - Confirmation dialog before delete

- [ ] **AC7.7:** Export to CSV:
  - Export filtered results
  - Columns: email, status, source, created_at, confirmed_at
  - French headers: "Email", "Statut", "Source", "Date inscription", "Date confirmation"

- [ ] **AC7.8:** Subscriber detail view shows:
  - All subscriber fields
  - Consent events history (audit trail)
  - Download tokens and usage

### Nurture Sequences (Simple)

- [ ] **AC7.9:** Admin page at `/admin/nurture` displays:
  - List of nurture sequence entries
  - Each entry: Name, Description, Status (draft/active), Email count

- [ ] **AC7.10:** Create/Edit nurture sequence:
  - Name (required)
  - Description (optional)
  - Status: draft or active
  - List of emails with:
    - Order (1, 2, 3...)
    - Subject line
    - Template reference
    - Delay from previous (e.g., "3 days after confirmation")

- [ ] **AC7.11:** Simple implementation (NO automation):
  - Sequences are for **manual reference/planning**
  - No automatic sending (that's Phase 2)
  - Just stores the sequence configuration
  - Useful for planning and documentation

### Email Templates

- [ ] **AC7.12:** Admin page at `/admin/email-templates` displays:
  - List of email templates
  - Columns: Name, Subject, Last Modified, Actions

- [ ] **AC7.13:** Create/Edit email template:
  - Name (required)
  - Subject line (required)
  - HTML body (rich text editor or raw HTML)
  - Available variables: `{{email}}`, `{{download_url}}`, `{{subscriber_name}}`
  - Preview button (renders template with sample data)

- [ ] **AC7.14:** Seed data - Confirmation email template:
  - Pre-create the confirmation email template used in LM-002
  - Allow editing for future updates

### API Endpoints (ui-web server)

- [ ] **AC7.15:** Stats endpoint `GET /api/admin/lead-magnet-stats`:
  - Accepts query param: `?period=7d|30d|90d|all`
  - Returns: total_signups, confirmed, confirmation_rate, downloaders, downloads, avg_hours_to_confirm
  - Protected by authentication

- [ ] **AC7.16:** Subscribers endpoints:
  - `GET /api/admin/subscribers` - List with pagination, search, sort
  - `GET /api/admin/subscribers/:id` - Detail
  - `DELETE /api/admin/subscribers/:id` - Delete (RGPD)

- [ ] **AC7.17:** Nurture sequences endpoints:
  - `GET /api/admin/nurture-sequences` - List
  - `POST /api/admin/nurture-sequences` - Create
  - `GET /api/admin/nurture-sequences/:id` - Detail
  - `PUT /api/admin/nurture-sequences/:id` - Update
  - `DELETE /api/admin/nurture-sequences/:id` - Delete

- [ ] **AC7.18:** Email templates endpoints:
  - `GET /api/admin/email-templates` - List
  - `POST /api/admin/email-templates` - Create
  - `GET /api/admin/email-templates/:id` - Detail
  - `PUT /api/admin/email-templates/:id` - Update
  - `DELETE /api/admin/email-templates/:id` - Delete

---

## Database Schema Additions

### New Tables Required

```sql
-- Nurture Sequences (planning/configuration only)
CREATE TABLE lm_nurture_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nurture Sequence Emails (ordered list of emails in a sequence)
CREATE TABLE lm_nurture_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES lm_nurture_sequences(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES lm_email_templates(id) ON DELETE SET NULL,
  delay_days INT NOT NULL DEFAULT 0, -- Days after previous email (or confirmation for first)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nurture_emails_sequence ON lm_nurture_emails(sequence_id, order_index);

-- Email Templates
CREATE TABLE lm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed confirmation email template
INSERT INTO lm_email_templates (name, subject, html_body) VALUES (
  'Confirmation Double Opt-in',
  'Confirmez votre téléchargement - Guide Mariée Sereine',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Lato, sans-serif; color: #213E60; background: #F4F2EF; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
    <h1 style="color: #213E60; font-family: ''Cormorant Garamond'', serif;">
      Confirmez votre téléchargement
    </h1>
    <p>Bonjour,</p>
    <p>Merci de votre intérêt pour le <strong>Guide de la Mariée Sereine</strong> !</p>
    <p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et accéder à votre guide :</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{download_url}}" style="background: #FFCC2B; color: #213E60; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
        Confirmer et Télécharger
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">Ce lien est valide pendant <strong>48 heures</strong>.</p>
    <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">Light & Shutter Photography<br><a href="https://lightandshutter.fr">lightandshutter.fr</a></p>
  </div>
</body>
</html>'
);
```

---

## File Structure

```
apps/ui-web/
├── pages/admin/
│   ├── lead-magnets/
│   │   └── index.vue              # Analytics dashboard
│   ├── subscribers/
│   │   ├── index.vue              # Subscribers list
│   │   └── [id].vue               # Subscriber detail
│   ├── nurture/
│   │   ├── index.vue              # Nurture sequences list
│   │   └── [id].vue               # Sequence detail/edit
│   └── email-templates/
│       ├── index.vue              # Templates list
│       └── [id].vue               # Template edit
├── components/admin/
│   ├── LeadMagnetFunnel.vue       # Funnel visualization
│   ├── LeadMagnetStats.vue        # KPIs cards
│   ├── SubscribersTable.vue       # Paginated table
│   ├── SubscriberDetail.vue       # Detail modal/view
│   ├── NurtureSequenceForm.vue    # Sequence editor
│   └── EmailTemplateEditor.vue    # HTML template editor
├── composables/
│   ├── useLeadMagnetStats.ts      # Stats fetching
│   ├── useSubscribers.ts          # Subscribers CRUD
│   ├── useNurtureSequences.ts     # Sequences CRUD
│   └── useEmailTemplates.ts       # Templates CRUD
└── server/api/admin/
    ├── lead-magnet-stats.get.ts   # Stats endpoint
    ├── subscribers/
    │   ├── index.get.ts           # List
    │   ├── [id].get.ts            # Detail
    │   └── [id].delete.ts         # Delete (RGPD)
    ├── nurture-sequences/
    │   ├── index.get.ts           # List
    │   ├── index.post.ts          # Create
    │   ├── [id].get.ts            # Detail
    │   ├── [id].put.ts            # Update
    │   └── [id].delete.ts         # Delete
    └── email-templates/
        ├── index.get.ts           # List
        ├── index.post.ts          # Create
        ├── [id].get.ts            # Detail
        ├── [id].put.ts            # Update
        └── [id].delete.ts         # Delete
```

---

## Implementation Patterns

### Stats Endpoint

```typescript
// server/api/admin/lead-magnet-stats.get.ts
export default defineEventHandler(async (event) => {
  // TODO: Authentication check
  
  const query = getQuery(event);
  const period = (query.period as string) || 'all';
  
  let dateFilter = '';
  switch (period) {
    case '7d':
      dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
      break;
    case '30d':
      dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
      break;
    case '90d':
      dateFilter = "AND created_at > NOW() - INTERVAL '90 days'";
      break;
  }

  const db = getDatabase();
  
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total_signups,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
      ROUND(COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / NULLIF(COUNT(*), 0), 1) as confirmation_rate,
      (SELECT COUNT(DISTINCT subscriber_id) FROM lm_download_tokens WHERE used_at IS NOT NULL) as unique_downloaders,
      (SELECT COALESCE(SUM(use_count), 0) FROM lm_download_tokens WHERE used_at IS NOT NULL) as total_downloads,
      ROUND(AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at)) / 3600) FILTER (WHERE confirmed_at IS NOT NULL), 1) as avg_hours_to_confirm
    FROM lm_subscribers
    WHERE 1=1 ${dateFilter}
  `);
  
  return stats.rows[0];
});
```

### Funnel Component

```vue
<!-- components/admin/LeadMagnetFunnel.vue -->
<template>
  <div class="funnel">
    <div class="funnel-stage" v-for="stage in stages" :key="stage.name">
      <div class="stage-bar" :style="{ width: stage.percentage + '%' }">
        <span class="stage-label">{{ stage.name }}</span>
        <span class="stage-value">{{ stage.count }} ({{ stage.percentage }}%)</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  totalSignups: number;
  confirmed: number;
  downloaded: number;
}>();

const stages = computed(() => [
  { 
    name: 'Inscriptions', 
    count: props.totalSignups, 
    percentage: 100 
  },
  { 
    name: 'Confirmés', 
    count: props.confirmed, 
    percentage: props.totalSignups > 0 
      ? Math.round((props.confirmed / props.totalSignups) * 100) 
      : 0 
  },
  { 
    name: 'Téléchargés', 
    count: props.downloaded, 
    percentage: props.confirmed > 0 
      ? Math.round((props.downloaded / props.confirmed) * 100) 
      : 0 
  }
]);
</script>

<style scoped>
.funnel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.funnel-stage {
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.stage-bar {
  background: linear-gradient(90deg, #FFCC2B, #94B6EF);
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 200px;
  transition: width 0.5s ease;
}

.stage-label {
  font-weight: bold;
  color: #213E60;
}

.stage-value {
  color: #213E60;
}
</style>
```

### Subscribers List Page

```vue
<!-- pages/admin/subscribers/index.vue -->
<template>
  <div class="subscribers-page">
    <h1>Subscribers Lead Magnet</h1>
    
    <div class="controls">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Rechercher par email..."
        @input="debouncedSearch"
      />
      <button @click="exportCsv" class="export-btn">
        📥 Exporter CSV
      </button>
    </div>

    <SubscribersTable 
      :subscribers="subscribers"
      :loading="loading"
      @sort="handleSort"
      @delete="handleDelete"
    />

    <div class="pagination">
      <button :disabled="page === 1" @click="page--">Précédent</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">Suivant</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const searchQuery = ref('');
const page = ref(1);
const sortBy = ref('created_at');
const sortOrder = ref<'asc' | 'desc'>('desc');

const { data: subscribersData, refresh, pending: loading } = await useFetch('/api/admin/subscribers', {
  query: {
    page,
    search: searchQuery,
    sortBy,
    sortOrder,
    limit: 25
  }
});

const subscribers = computed(() => subscribersData.value?.subscribers || []);
const totalPages = computed(() => subscribersData.value?.totalPages || 1);

const debouncedSearch = useDebounceFn(() => {
  page.value = 1;
  refresh();
}, 300);

function handleSort(column: string) {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = column;
    sortOrder.value = 'desc';
  }
}

async function handleDelete(id: string) {
  if (!confirm('Supprimer ce subscriber ? Cette action est irréversible (RGPD).')) return;
  
  await $fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
  refresh();
}

async function exportCsv() {
  const response = await $fetch('/api/admin/subscribers/export', {
    query: { search: searchQuery.value }
  });
  
  const blob = new Blob([response as string], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

definePageMeta({
  middleware: 'auth',
  layout: 'admin'
});
</script>
```

---

## Tasks / Subtasks

### Task 1: Database Schema (Sprint 3, Day 1)
- [ ] 1.1: Create migration file for nurture_sequences table
- [ ] 1.2: Create migration file for nurture_emails table
- [ ] 1.3: Create migration file for email_templates table
- [ ] 1.4: Add seed data for confirmation email template
- [ ] 1.5: Run migrations on dev database

### Task 2: Analytics Dashboard (Sprint 3, Day 1-2)
- [ ] 2.1: Create `/api/admin/lead-magnet-stats.get.ts` endpoint
- [ ] 2.2: Create `LeadMagnetStats.vue` component (KPI cards)
- [ ] 2.3: Create `LeadMagnetFunnel.vue` component
- [ ] 2.4: Create `/pages/admin/lead-magnets/index.vue` page
- [ ] 2.5: Add date range filter functionality
- [ ] 2.6: Add auto-refresh toggle

### Task 3: Subscribers Management (Sprint 3, Day 2-3)
- [ ] 3.1: Create subscribers API endpoints (list, detail, delete)
- [ ] 3.2: Create `SubscribersTable.vue` component
- [ ] 3.3: Create `/pages/admin/subscribers/index.vue` page
- [ ] 3.4: Create `/pages/admin/subscribers/[id].vue` detail page
- [ ] 3.5: Implement pagination and search
- [ ] 3.6: Implement CSV export endpoint
- [ ] 3.7: Implement delete with confirmation

### Task 4: Nurture Sequences (Sprint 3, Day 4)
- [ ] 4.1: Create nurture sequences API endpoints (CRUD)
- [ ] 4.2: Create `NurtureSequenceForm.vue` component
- [ ] 4.3: Create `/pages/admin/nurture/index.vue` list page
- [ ] 4.4: Create `/pages/admin/nurture/[id].vue` edit page
- [ ] 4.5: Implement email ordering in sequences

### Task 5: Email Templates (Sprint 3, Day 4-5)
- [ ] 5.1: Create email templates API endpoints (CRUD)
- [ ] 5.2: Create `EmailTemplateEditor.vue` component
- [ ] 5.3: Create `/pages/admin/email-templates/index.vue` list page
- [ ] 5.4: Create `/pages/admin/email-templates/[id].vue` edit page
- [ ] 5.5: Implement preview functionality

### Task 6: Testing & Polish (Sprint 3, Day 5)
- [ ] 6.1: Write integration tests for stats endpoint
- [ ] 6.2: Write tests for subscribers endpoints
- [ ] 6.3: Manual QA of all pages
- [ ] 6.4: Responsive design check
- [ ] 6.5: Error handling for all API calls

---

## Definition of Done

- ✅ Analytics dashboard shows accurate metrics
- ✅ Date range filter works correctly
- ✅ Subscribers list with pagination, search, sort
- ✅ CSV export generates valid file
- ✅ Delete subscriber works (RGPD cascade)
- ✅ Nurture sequences CRUD functional
- ✅ Email templates CRUD functional with preview
- ✅ All pages protected by authentication
- ✅ Responsive design (mobile-friendly)
- ✅ Code reviewed and merged

---

## Future Enhancements (Phase 2)

- [ ] Automatic nurture sequence sending (triggered by confirmation)
- [ ] Email scheduling and send tracking
- [ ] Advanced analytics (cohort analysis, source attribution)
- [ ] Bulk actions on subscribers
- [ ] Template versioning
- [ ] A/B testing support

---

**🎯 Story ready for development! Dashboard consolidates all admin functionality.**
