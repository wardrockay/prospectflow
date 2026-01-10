# ProspectFlow Epics - Quick Reference

**Last Updated:** 2025-01-XX  
**Full Details:** See `epics.md` (137KB)

---

## 🎯 MVP (P0) - 147 Story Points

### Backend Infrastructure & APIs

### E0: Foundation Infrastructure (37 SP, 10 stories)

Database, Auth, Auth Package, RabbitMQ, Docker, CI/CD, Monitoring

- E0.1: Multi-tenant PostgreSQL (8 SP)
- E0.2: Express.js API Foundation (5 SP)
- E0.3: RabbitMQ Configuration (5 SP)
- E0.4: Authentication & Authorization (8 SP)
- E0.5: Extract Auth to Shared Package (3 SP) ✨ NEW
- E0.6: Structured Logging with Pino (3 SP)
- E0.7: Error Tracking with Sentry (2 SP)
- E0.8: Prometheus & Grafana (5 SP)
- E0.9: Docker Compose Orchestration (3 SP)
- E0.10: CI/CD Pipeline (5 SP)

### Frontend UI & User Experience

### UI-0: Frontend Foundation & Auth (8 SP, 3 stories)

Nuxt 3 setup, NuxtUI, Cognito authentication, app layout

- UI-0.1: Nuxt Project Setup (3 SP)
- UI-0.2: Authentication UI (3 SP)
- UI-0.3: App Layout & Navigation (2 SP)

### E1: Campaign Management (13 SP, 4 stories)

Create, view, manage campaigns

- E1.1: Create New Campaign (5 SP)
- E1.2: View Campaign List (3 SP)
- E1.3: View Campaign Details (3 SP)
- E1.4: Archive Campaign (2 SP)

### UI-1: Campaign Management UI (13 SP, 4 stories)

Frontend for campaigns - list, create, edit, details

- UI-1.1: Campaign List View (3 SP)
- UI-1.2: Campaign Creation Form (5 SP)
- UI-1.3: Campaign Details Page (3 SP)
- UI-1.4: Campaign Editing (2 SP)

### E2: Prospect Import & Validation (21 SP, 6 stories)

CSV upload, validation, duplicate detection

- E2.1: CSV File Upload Interface (3 SP)
- E2.2: CSV Parsing and Column Validation (5 SP)
- E2.3: Email Format and Data Validation (5 SP)
- E2.4: Duplicate Detection (Within Upload) (3 SP)
- E2.5: Duplicate Detection (Against Existing) (3 SP)
- E2.6: Validation Report and User Actions (5 SP)

### UI-2: Prospect Management UI (13 SP, 3 stories)

CSV upload, column mapping, validation results

- UI-2.1: CSV Upload Interface (5 SP)
- UI-2.2: Column Mapping Interface (5 SP)
- UI-2.3: Validation Results & Import (3 SP)

### E3: Automated Research Engine (34 SP, 6 stories)

Web scraping, social scanning, opportunity analysis

- E3.1: Research Queue and Job Management (5 SP)
- E3.2: Website Scraping for Business Intelligence (8 SP)
- E3.3: Social Media Scanning (Web Scraping) (8 SP)
- E3.4: Opportunity Analysis and Hook Generation (5 SP)
- E3.5: Research Profile Generation (5 SP)
- E3.6: Research Failure Handling (3 SP)

### E4: AI Email Draft Generation (34 SP, 7 stories)

OpenAI integration, prompt engineering, confidence scoring

- E4.1: AI Prompt Engineering and Template System (8 SP)
- E4.2: OpenAI API Integration (8 SP)
- E4.3: Draft Worker Service (5 SP)
- E4.4: AI Confidence Scoring Algorithm (5 SP)
- E4.5: Draft Reasoning and Source Attribution (3 SP)
- E4.6: Draft Regeneration Capability (3 SP)
- E4.7: Batch Draft Generation Orchestration (2 SP)

### E5: Email Review & Approval (21 SP, 5 stories)

Review queue, keyboard shortcuts, inline editing

- E5.1: Review Queue Interface (5 SP)
- E5.2: Keyboard Shortcuts for Rapid Review (5 SP)
- E5.3: Inline Draft Editing (5 SP)
- E5.4: Approve, Skip, Regenerate Actions (3 SP)
- E5.5: Batch Approval Capability (3 SP)

### UI-3: Email Review Interface (21 SP, 4 stories)

Review queue, preview, inline editor, keyboard shortcuts

- UI-3.1: Review Queue Layout (5 SP)
- UI-3.2: Email Preview & Edit Component (8 SP)
- UI-3.3: Keyboard Shortcuts (3 SP)
- UI-3.4: Batch Approval Actions (5 SP)

### E6: Gmail Integration & Sending (21 SP, 5 stories)

OAuth 2.0, Gmail API, rate limiting, unsubscribe

- E6.1: Gmail OAuth 2.0 Connection Flow (5 SP)
- E6.2: Email Sending via Gmail API (5 SP)
- E6.3: Rate Limiting and Pacing (3 SP)
- E6.4: Batch Email Sending Orchestration (5 SP)
- E6.5: Unsubscribe Mechanism (3 SP)

---

## 📈 Post-MVP (P1) - 42 Story Points

### E7: Response Tracking (21 SP, 4 stories)

Gmail monitoring, AI classification, notifications

- E7.1: Gmail Reply Detection Worker (8 SP)
- E7.2: Response Classification with AI (5 SP)
- E7.3: User Notifications for Responses (5 SP)
- E7.4: Response Dashboard (3 SP)

### E8: Campaign Analytics (21 SP, 4 stories)

Metrics, visualizations, meeting tracking

- E8.1: Campaign Metrics Calculation (5 SP)
- E8.2: Analytics Dashboard UI (8 SP)
- E8.3: Meeting Tracking (5 SP)
- E8.4: Time Saved Calculation (3 SP)

### UI-4: Analytics Dashboard UI (13 SP, 3 stories)

Metrics visualization, response tracking, export

- UI-4.1: Campaign Metrics Charts (8 SP)
- UI-4.2: Response Tracking Dashboard (3 SP)
- UI-4.3: Export & Reporting (2 SP)

---

## 🚀 Enhancements (P2) - 55 Story Points

### E9: Follow-up Automation (21 SP, 4 stories)

Automated follow-up scheduling and drafting

- E9.1: Follow-up Sequence Configuration (5 SP)
- E9.2: Follow-up Draft Generation (8 SP)
- E9.3: Follow-up Scheduling Worker (5 SP)
- E9.4: Follow-up Analytics (3 SP)

### E10: Template Library (13 SP, 3 stories)

Pre-built and custom email templates

- E10.1: Pre-built Template Library (5 SP)
- E10.2: Custom Template Creation (5 SP)
- E10.3: Template Performance Tracking (3 SP)

### E11: Social Media API Integration (21 SP, 3 stories)

Direct API integrations for Instagram, LinkedIn, Facebook

- E11.1: Instagram Business API Integration (8 SP)
- E11.2: LinkedIn Company API Integration (8 SP)
- E11.3: Facebook Pages API Integration (5 SP)

---

## 🔮 Future (P3) - 42 Story Points

### E12: CRM Integration (21 SP, 2 stories)

HubSpot and Pipedrive bidirectional sync

- E12.1: HubSpot Integration (13 SP)
- E12.2: Pipedrive Integration (8 SP)

### E13: A/B Testing (21 SP, 4 stories)

Built-in A/B testing framework

- E13.1: A/B Test Configuration (8 SP)
- E13.2: Variant Draft Generation (5 SP)
- E13.3: Statistical Significance Tracking (5 SP)
- E13.4: Automatic Winner Rollout (3 SP)

---

## 📊 Key Metrics

| Metric                     | Value                        |
| -------------------------- | ---------------------------- |
| **Total Epics**            | 18 (14 backend + 4 frontend) |
| **Total Stories**          | 95+                          |
| **Total Story Points**     | 352 SP                       |
| **Backend Story Points**   | 284 SP                       |
| **Frontend Story Points**  | 68 SP                        |
| **MVP Story Points**       | 212 SP (60%)                 |
| **Estimated MVP Duration** | 10-11 sprints (5-5.5 months) |
| **Estimated Full Project** | 17-18 sprints (8.5-9 months) |

---

## 🔗 Dependencies (Critical Path)

```
E0 (Foundation) → Required for all other epics
  ↓
UI-0 (Frontend Foundation) → Required for all UI epics
  ↓
E1 (Campaigns) → Required for E2
  ├─→ UI-1 (Campaign UI)
  ↓
E2 (Import) → Required for E3
  ├─→ UI-2 (Prospect UI)
  ↓
E3 (Research) → Required for E4, E11
  ↓
E4 (AI Drafts) → Required for E5, E9, E10
  ↓
E5 (Review) → Required for E6
  ├─→ UI-3 (Email Review UI)
  ↓
E6 (Gmail Send) → Required for E7, E9
  ↓
E7 (Responses) → Required for E8
  ↓
E8 (Analytics) → Required for E12, E13
  └─→ UI-4 (Analytics UI)
```

---

## 📋 Sprint Mapping (Recommended)

| Sprint | Epics                   | Focus                     | SP  |
| ------ | ----------------------- | ------------------------- | --- |
| **0**  | E0, UI-0                | Foundation + Auth UI      | ~25 |
| **1**  | E1, UI-1                | Campaigns (API + UI)      | ~26 |
| **2**  | E2 (partial), UI-2      | Import API + UI           | ~25 |
| **3**  | E2 (cont), E3 (partial) | Import + Research start   | ~25 |
| **4**  | E3 (cont), E4 (partial) | Research + AI start       | ~25 |
| **5**  | E4 (cont), E5           | AI drafts + Review API    | ~25 |
| **6**  | UI-3                    | Email Review UI           | ~21 |
| **7**  | E6                      | Gmail integration         | ~21 |
| **8**  | E7, E8                  | Responses + Analytics API | ~25 |
| **9**  | UI-4                    | Analytics UI              | ~13 |
| **10** | E9, E10                 | Follow-ups + Templates    | ~20 |
| **11** | E11                     | Social API integration    | ~21 |
| **12** | E12                     | CRM integration           | ~21 |
| **13** | E13                     | A/B testing               | ~21 |

---

## 🚦 Status Legend

- ⬜ Not Started
- 🟨 In Progress
- ✅ Complete
- 🔴 Blocked
- ⚠️ At Risk

**Current Status:** All epics ⬜ Not Started (Ready for development)

---

## 📞 Quick Links

- **Full Backend Details:** [epics.md](./epics.md) (4,289 lines)
- **Full Frontend Details:** [ui-epics.md](./ui-epics.md)
- **Multi-Source Details:** [multi-source-epics.md](./multi-source-epics.md)
- **Executive Summary:** [EPICS-SUMMARY.md](./EPICS-SUMMARY.md)
- **Sprint Planning:** [sprint-status.yaml](../sprint-status.yaml)
- **Requirements:** [PRD-ProspectFlow.md](../PRD-ProspectFlow.md)
- **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md)
- **UX Design:** [ux-design/](../ux-design/)

---

**Last Updated:** 2026-01-09  
**Version:** 1.1  
**Status**: ✅ Ready for Development (Backend + Frontend)
