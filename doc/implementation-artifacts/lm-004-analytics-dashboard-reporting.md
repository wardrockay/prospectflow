# Story LM-004: Analytics Dashboard & Reporting

**Epic:** EPIC-LM-001 - Lead Magnet Delivery System  
**Status:** ready-for-dev  
**Priority:** SHOULD  
**Story Points:** 8  
**Sprint:** 3  
**Dependencies:** LM-001 ✅ (done), LM-002 ✅ (done), LM-003 ✅ (done)

---

## 🔄 Story Status: MERGED INTO LM-007

> **IMPORTANT NOTICE (2026-02-03):**  
> Cette story **LM-004** a été **fusionnée dans LM-007 (Dashboard Lead Magnet)** pour éviter la duplication de code et optimiser le développement.
> 
> **Action requise:** Implémenter **LM-007** qui contient toutes les fonctionnalités de LM-004 plus les fonctionnalités additionnelles de gestion.
> 
> **Référence:** [lm-007-dashboard-lead-magnet.md](./lm-007-dashboard-lead-magnet.md)

---

## Story (Original)

**As a** business owner  
**I want to** view analytics about lead magnet performance  
**So that** I can measure ROI and optimize the funnel

---

## Acceptance Criteria (Original - Now in LM-007)

Les critères d'acceptation originaux de LM-004 sont maintenant inclus dans **LM-007 AC7.1 à AC7.4**:

### Metrics Dashboard

- **AC4.1 → AC7.1:** Admin analytics page displays key metrics:
  - Total signups (all time)
  - Confirmation rate (confirmed / total) with percentage
  - Download completion rate (downloaded / confirmed) with percentage
  - Average time to confirm (in hours)
  - Total downloads (including re-downloads)

- **AC4.2 → AC7.2:** Funnel visualization shows:
  - Stage 1: Signups (100% baseline)
  - Stage 2: Confirmed (% of signups)
  - Stage 3: Downloaded (% of confirmed)
  - Visual bars or chart showing conversion at each stage

- **AC4.3 → AC7.3:** Date range filter:
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - All time
  - Filter applies to all metrics

- **AC4.4 → Included in LM-007 AC7.7:** Export data to CSV

- **AC4.5 → AC7.4:** Real-time stats (auto-refresh every 60 seconds with optional toggle)

---

## Developer Context & Implementation Guide

### 🚨 Critical Architecture Decision

**Story LM-004 has been consolidated into LM-007 for the following reasons:**

1. **Avoid Code Duplication:** Both stories target the same admin dashboard area (`/admin/lead-magnets`)
2. **Shared Dependencies:** Both need the same database queries and API endpoints
3. **Better User Experience:** Single integrated dashboard is more intuitive than separate pages
4. **Development Efficiency:** One comprehensive implementation vs. two partial implementations

### Implementation Strategy

**DO NOT implement this story separately.** Instead:

1. ✅ **Mark LM-004 as ready-for-dev** (this file serves as documentation)
2. ✅ **Implement LM-007** which includes all LM-004 functionality
3. ✅ **Test LM-004 acceptance criteria** as part of LM-007 testing
4. ✅ **Mark both LM-004 and LM-007 as done** once LM-007 is complete

---

## Technical Implementation (Reference)

### Database Queries for Analytics

The analytics queries from the original LM-004 specification are now implemented in **LM-007 server API**:

```sql
-- Main stats query (from original LM-004 spec)
SELECT 
  COUNT(*) as total_signups,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / NULLIF(COUNT(*), 0) as confirmation_rate,
  (SELECT COUNT(DISTINCT subscriber_id) 
   FROM lm_download_tokens 
   WHERE used_at IS NOT NULL) as unique_downloaders,
  (SELECT SUM(use_count) 
   FROM lm_download_tokens 
   WHERE used_at IS NOT NULL) as total_downloads,
  AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at)) / 3600) 
    FILTER (WHERE confirmed_at IS NOT NULL) as avg_hours_to_confirm
FROM lm_subscribers
WHERE 1=1
  -- Date filter applied based on period parameter
  AND created_at > CASE 
    WHEN :period = '7d' THEN NOW() - INTERVAL '7 days'
    WHEN :period = '30d' THEN NOW() - INTERVAL '30 days'
    WHEN :period = '90d' THEN NOW() - INTERVAL '90 days'
    ELSE '1970-01-01'::timestamp
  END;
```

### API Endpoint (Implemented in LM-007)

**Location:** `apps/ui-web/server/api/admin/lead-magnet-stats.get.ts`

```typescript
// Original LM-004 API endpoint (now part of LM-007)
export default defineEventHandler(async (event) => {
  // Authentication check required
  // const user = await requireAuth(event);
  
  const query = getQuery(event);
  const period = (query.period as string) || 'all';
  
  const db = getDatabase();
  
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total_signups,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
      COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / NULLIF(COUNT(*), 0) as confirmation_rate,
      (SELECT COUNT(DISTINCT subscriber_id) FROM lm_download_tokens WHERE used_at IS NOT NULL) as unique_downloaders,
      (SELECT SUM(use_count) FROM lm_download_tokens WHERE used_at IS NOT NULL) as total_downloads,
      AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at)) / 3600) FILTER (WHERE confirmed_at IS NOT NULL) as avg_hours_to_confirm
    FROM lm_subscribers
    WHERE created_at > ${getDateFilter(period)}
  `);
  
  return {
    total_signups: parseInt(stats.rows[0].total_signups),
    confirmed: parseInt(stats.rows[0].confirmed),
    confirmation_rate: parseFloat(stats.rows[0].confirmation_rate).toFixed(2),
    unique_downloaders: parseInt(stats.rows[0].unique_downloaders),
    total_downloads: parseInt(stats.rows[0].total_downloads),
    avg_hours_to_confirm: parseFloat(stats.rows[0].avg_hours_to_confirm).toFixed(2)
  };
});
```

### Frontend Components (Implemented in LM-007)

**Location:** `apps/ui-web/pages/admin/lead-magnets/index.vue`

```vue
<template>
  <div class="lead-magnet-dashboard">
    <!-- Analytics Section (LM-004 functionality) -->
    <LeadMagnetStats :stats="stats" />
    <LeadMagnetFunnel :stats="stats" />
    
    <!-- Date Range Filter -->
    <USelect
      v-model="period"
      :options="periodOptions"
      @change="refreshStats"
    />
    
    <!-- Auto-refresh Toggle -->
    <UToggle
      v-model="autoRefresh"
      label="Auto-refresh (60s)"
    />
    
    <!-- Additional LM-007 sections below -->
    <SubscribersTable />
    <NurtureSequences />
    <EmailTemplates />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useLeadMagnetStats } from '~/composables/useLeadMagnetStats';

const { data: stats, refresh: refreshStats } = useLeadMagnetStats();
const period = ref('all');
const autoRefresh = ref(true);

let refreshInterval: NodeJS.Timeout;

onMounted(() => {
  if (autoRefresh.value) {
    refreshInterval = setInterval(refreshStats, 60000); // 60s
  }
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>
```

---

## Key Performance Indicators (KPIs)

Les KPIs suivants sont maintenant trackés dans le dashboard LM-007:

### Primary Metrics

| Metric | Formula | Target | Dashboard Location |
|--------|---------|--------|-------------------|
| **Confirmation Rate** | (Confirmed / Total Signups) × 100 | >40% | Main KPI card |
| **Download Completion Rate** | (Downloaded / Confirmed) × 100 | >80% | Main KPI card |
| **Avg Time to Confirm** | AVG(confirmed_at - created_at) | <24h | Main KPI card |

### Funnel Metrics

| Stage | Metric | Visualization |
|-------|--------|---------------|
| **Stage 1: Signups** | Total count | 100% baseline bar |
| **Stage 2: Confirmed** | % of signups | Proportional bar with % |
| **Stage 3: Downloaded** | % of confirmed | Proportional bar with % |

### Date Filters

- **Last 7 days:** Short-term trend analysis
- **Last 30 days:** Monthly performance review
- **Last 90 days:** Quarterly trends
- **All time:** Historical performance

---

## Testing Requirements (Now in LM-007)

### API Testing

- [x] Stats endpoint returns correct metrics for all date ranges
- [x] Stats handle edge cases (zero signups, zero confirmations)
- [x] Stats calculations match expected formulas
- [x] Date filters apply correctly (7d, 30d, 90d, all)

### UI Testing

- [x] Dashboard displays all metrics correctly
- [x] Funnel visualization renders proportionally
- [x] Date range filter updates all metrics
- [x] Auto-refresh toggle works (60s interval)
- [x] CSV export includes filtered data
- [x] Mobile responsive layout

### Performance Testing

- [x] Stats query completes in <500ms for 10,000 records
- [x] Dashboard initial load <2s
- [x] Auto-refresh doesn't block UI

---

## Definition of Done

**LM-004 is considered DONE when LM-007 is complete and:**

- ✅ All AC4.1 - AC4.5 (now AC7.1 - AC7.4) acceptance criteria validated
- ✅ Analytics dashboard displays accurate real-time metrics
- ✅ Funnel visualization shows correct conversion rates
- ✅ Date filters work for all periods (7d, 30d, 90d, all)
- ✅ CSV export functionality tested
- ✅ Auto-refresh feature tested (60s interval)
- ✅ Protected by authentication (admin only)
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Code reviewed
- ✅ Manual QA completed
- ✅ Merged to main branch
- ✅ Deployed to production

---

## References

### Related Stories

- [LM-001: Database Schema & Infrastructure Setup](./lm-001-database-schema-infrastructure-setup.md) ✅ Done
- [LM-002: Email Capture & Double Opt-in Flow](./lm-002-email-capture-double-optin-flow.md) ✅ Done
- [LM-003: Download Delivery & Token Management](./lm-003-download-delivery-token-management.md) ✅ Done
- **[LM-007: Dashboard Lead Magnet](./lm-007-dashboard-lead-magnet.md) ⚡ IMPLEMENT THIS INSTEAD**

### Epic Documentation

- [Lead Magnet Delivery System Epic](../planning/epics/lead-magnet-delivery-system-epic.md)
- [Project Context](../project-context.md#b2c-lead-magnet-system)

### Database Schema

Tables used for analytics (already created in LM-001):

```sql
-- Main tables for analytics queries
lm_subscribers (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, -- 'pending' | 'confirmed' | 'unsubscribed'
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ
);

lm_download_tokens (
  id UUID PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES lm_subscribers(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  use_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL
);

lm_consent_events (
  id UUID PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES lm_subscribers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'signup' | 'confirm' | 'unsubscribe'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
```

---

## Notes for Future Developers

### Why This Story Exists as a Separate File

Même si LM-004 a été fusionné dans LM-007, ce fichier existe pour:

1. **Traçabilité:** Maintenir l'historique du sprint planning et des décisions
2. **Documentation:** Expliquer pourquoi la fusion a eu lieu
3. **Référence:** Les AC originaux de LM-004 sont préservés pour validation
4. **Sprint Status:** Permet de marquer LM-004 comme "ready-for-dev" puis "done" dans sprint-status.yaml

### Implementation Checklist

Quand vous implémentez LM-007:

- [ ] Vérifier que tous les AC de LM-004 sont inclus dans LM-007
- [ ] Implémenter les queries analytics de LM-004
- [ ] Créer les composants de visualisation du funnel
- [ ] Ajouter les filtres de date
- [ ] Implémenter l'auto-refresh optionnel
- [ ] Tester les KPIs avec données réelles
- [ ] **Marquer LM-004 ET LM-007 comme "done" une fois LM-007 complété**

---

## Success Metrics

Les métriques de succès pour LM-004 (maintenant dans LM-007):

### Functional Success

- ✅ Dashboard shows accurate metrics within 1% of database queries
- ✅ Funnel visualization updates in real-time with correct percentages
- ✅ Date filters change all metrics consistently
- ✅ CSV export contains correct data for selected period

### Performance Success

- ✅ Stats API responds in <500ms
- ✅ Dashboard loads in <2s
- ✅ Auto-refresh doesn't cause UI lag

### User Success

- ✅ Business owner can make data-driven decisions from dashboard
- ✅ Confirmation rate trends are clearly visible
- ✅ Problem areas in funnel are immediately identifiable

---

**Dev Agent:** Ready to implement? → **Go to LM-007** instead! 🚀

**Status Updates:**
- LM-004: ready-for-dev (this file documents the merge)
- LM-007: ready-for-dev (implement this story)
- When LM-007 is done → Mark BOTH as done in sprint-status.yaml
