---
stepsCompleted: [1]
inputDocuments:
  - doc/lead-magnet-delivery-system-epic.md
  - doc/project-context.md
  - doc/reference/PRD-ProspectFlow.md
workflowType: 'architecture'
project_name: 'ProspectFlow - Lead Magnet System'
user_name: 'Tolliam'
date: '2026-02-02'
status: 'In Progress'
---

# Architecture: Lead Magnet Delivery System

**Document Type:** Architectural Decision Record (ADR)  
**Project:** ProspectFlow - B2C Lead Generation Module  
**Epic:** EPIC-LM-001  
**Created:** 2026-02-02  
**Status:** Ready for Implementation  
**Owner:** Tolliam

---

## Document Purpose

This architecture document defines the technical decisions, patterns, and guardrails for implementing the Lead Magnet Delivery System - a RGPD-compliant B2C email capture and content delivery system for Light & Shutter Photography.

**Scope:** This is a **modular architecture** that coexists with the core ProspectFlow B2B platform while maintaining clear separation of concerns.

---

## Executive Summary

The Lead Magnet System is a standalone B2C module within the ProspectFlow infrastructure that enables Light & Shutter to capture leads through a free downloadable guide ("Guide de la Mariée Sereine"). The system implements double opt-in for RGPD compliance and delivers content via time-limited AWS S3 signed URLs.

### Key Architectural Characteristics

- **Separation:** B2C tables in `public` schema with `lm_` prefix (isolated from B2B multi-tenant structure)
- **Serverless-first:** Leverages Nuxt Server API routes (no separate Express service required)
- **Cloud-native:** AWS SES for email delivery, S3 for file storage with signed URLs
- **Security-first:** SHA-256 token hashing, no plain-text secrets, time-limited access
- **RGPD-compliant:** Immutable consent audit trail, right-to-be-forgotten via cascading deletes

### Integration Points

| Component | Integration Method | Shared Resource |
|-----------|-------------------|-----------------|
| Database | Same PostgreSQL instance | Separate `lm_*` tables in `public` schema |
| Frontend | Nuxt 3 (ui-web) | Shared Nuxt app with new API routes |
| Migrations | Flyway | New migration file in existing pipeline |
| AWS | Dedicated services | New IAM user, S3 bucket, SES sender |
| Monitoring | Existing stack | Sentry, Grafana (optional new dashboards) |

---

_This document builds collaboratively through step-by-step architectural decisions. Sections are appended as we work through each decision together._

