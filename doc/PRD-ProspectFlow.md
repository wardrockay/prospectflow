# Product Requirements Document: ProspectFlow

**Version:** 1.0  
**Date:** January 2025  
**Status:** Draft  
**Owner:** LightAndShutter

---

## 1. Executive Summary

### 1.1 Product Overview
ProspectFlow is an AI-powered outbound prospecting platform designed to help freelance video producers generate qualified client meetings through intelligent, personalized cold email campaigns. The system automates the research and email drafting process while maintaining human oversight for trust and quality control.

**Core Value Proposition:** Transform 10 hours per week of manual prospecting work into 5 hours by automating company research and email personalization, while achieving a 10% response rate through highly relevant, opportunity-focused messaging.

### 1.2 Target Audience

**Primary Persona: The Craft-Focused Freelancer**
- **Profile:** New freelance video producers who want to focus on their creative work rather than prospecting
- **Services Offered:** Video production for businesses (pack shots, product demos, interviews, social media content)
- **Target Companies:** Businesses that are either:
  - Already active on social media (potential for more/better content)
  - Want more visibility (opportunity to start video presence)
- **Current Pain Points:**
  - Spending 10h/week on prospecting activities
  - Email writing is time-consuming and mentally draining
  - Company research takes significant time
  - Don't know how to prospect effectively
  - Want to focus on craft, not sales

**Usage Volume:**
- 30-40 emails per day
- Batched prospecting sessions
- 2-3 simultaneous campaigns running
- Manual review and send (no auto-send)

**Product Evolution:**
- **Phase 1:** Personal use tool for founder's video production business
- **Phase 2:** Public SaaS product for similar freelancers

### 1.3 Success Criteria

**Primary Success Metric:**
- Generate 10-15 qualified client meetings per month from target export

**Top 3 Performance Metrics (Priority Order):**
1. **Meetings Booked** - Number of confirmed meetings scheduled
2. **Email Quality** - Assessed by personalization depth and relevance
3. **Response Rate** - Target: 10% positive response rate

**Time Savings Goals:**
- Current time spent: 10h/week on prospecting
- Target time spent: 5h/week (50% reduction)
- Primary time sinks to address:
  - Email writing
  - Company research

**Quality Benchmarks:**
- **Personalization Quality:** Each email must reference at least 1 recent insight from the company's website or social media that can be turned into a specific video opportunity
- **Response Rate Target:** 10% positive response rate
- **Trust Factor:** User reviews every email before sending (no auto-send). System must provide clear, actionable drafts with transparent reasoning.

---

## 2. Problem Statement

Freelance video producers face a prospecting dilemma: they need a steady stream of clients to sustain their business, but the time spent on outbound prospecting directly competes with billable work and creative development. 

**Current State Challenges:**
1. **Time Burden:** 10 hours per week spent on prospecting represents 25% of a 40-hour work week - time that could be spent on paid projects or skill development
2. **Knowledge Gap:** New freelancers lack systematic prospecting frameworks and don't know how to identify or approach good-fit clients
3. **Generic Outreach:** Without deep research, emails lack the specific, relevant hooks that generate responses
4. **Mental Fatigue:** Writing personalized emails at scale is cognitively demanding and leads to quality degradation over time
5. **Inconsistent Pipeline:** Manual prospecting is often deprioritized when busy, leading to feast-or-famine cycles

**Why Existing Solutions Fall Short:**
- **Generic Email Tools:** Templates lack true personalization and don't research companies
- **Full Automation Tools:** Send emails automatically, damaging sender reputation and lacking quality control
- **Manual Research:** Time-consuming and doesn't scale to 30-40 emails/day
- **VAs/Agencies:** Expensive and still require significant oversight and training

---

## 3. User Journeys

### 3.1 Primary Journey: Campaign Execution (Happy Path)

**Persona:** Sarah, Freelance Video Producer  
**Goal:** Generate 5 meetings this week from 100 prospecting emails  
**Context:** Monday morning, starting weekly prospecting session

**Journey Steps:**

1. **Campaign Setup**
   - Sarah uploads a CSV of 100 local businesses she exported from a directory
   - She selects her campaign template: "Social Media Content Upgrade"
   - She sets her value proposition: "Help businesses create engaging product showcase videos"
   - System validates the data and confirms campaign creation
   - **Time Spent:** 5 minutes

2. **Batch Processing (System)**
   - System processes companies in batches overnight
   - For each company:
     - Extracts website content and recent social media posts
     - Identifies video opportunities (e.g., "They posted 3 product photos but no video")
     - Drafts personalized email with specific hook
   - **Processing Time:** Automated overnight

3. **Review & Send Session**
   - Tuesday morning, Sarah opens her "Ready to Review" queue (100 drafts)
   - For each email, she sees:
     - Draft email with highlighted personalization
     - Source data (website screenshot, social posts referenced)
     - AI confidence score and reasoning
   - She reviews emails, making minor edits to ~20% of them
   - She approves 30 emails for sending today (staying within daily limit)
   - **Time Spent:** 1.5 hours for 30 emails (3 min/email)

4. **Sending & Tracking**
   - Sarah clicks "Send Approved Batch" 
   - System sends via her Gmail account with proper pacing
   - Emails appear in her sent folder
   - System tracks opens and replies
   - **Time Spent:** 2 minutes

5. **Response Management**
   - Over next 3 days, Sarah receives 4 positive replies (13% response rate)
   - Dashboard shows: 3 meetings booked, 1 "not now but interested"
   - She follows up manually with the interested lead
   - **Time Spent:** 30 minutes (responding to interested leads)

**Total Time Investment:** ~2 hours for 30 personalized outreach emails + response handling  
**Result:** 3 meetings booked (10% conversion)  
**Time Savings vs. Manual:** 6-8 hours saved compared to manual research and writing

---

### 3.2 Secondary Journey: Quality Refinement

**Persona:** Marcus, Video Producer  
**Goal:** Improve response rate from 5% to 10%  
**Context:** After sending 200 emails with disappointing results

**Journey Steps:**

1. **Performance Analysis**
   - Marcus reviews campaign analytics
   - Notices: high open rate (40%) but low response rate (5%)
   - Dashboard shows: "Emails are being read but not converting"
   
2. **Email Review**
   - Reviews sample of sent emails and identifies pattern:
   - Personalization is present but too generic ("I see you're on Instagram")
   - Missing specific, compelling opportunity hook

3. **Template Refinement**
   - Updates campaign instructions to AI:
     - "Find specific recent post or content gap"
     - "Suggest concrete video idea based on their current content"
   - Adjusts tone to be more consultative, less salesy

4. **A/B Test**
   - Creates two versions of next batch
   - Sends 20 with old approach, 20 with new approach
   - Tracks which generates better response

5. **Iteration**
   - New approach generates 12% response rate
   - Adopts new template as default
   - Response rate improves across campaigns

**Outcome:** Through systematic testing and refinement, Marcus doubles his response rate

---

### 3.3 Edge Case Journey: Data Quality Issues

**Persona:** Lisa, Video Producer  
**Goal:** Send emails but encounters data problems  
**Context:** Uploaded CSV has incomplete information

**Journey Steps:**

1. **Upload & Validation**
   - Lisa uploads CSV of 50 companies
   - System validation flags:
     - 10 companies missing website URLs
     - 5 companies with invalid email formats
     - 2 duplicate entries

2. **Issue Resolution**
   - System presents clear error report
   - Lisa has options:
     - Auto-skip problematic entries (send to 33 valid companies)
     - Fix data inline in UI
     - Re-upload corrected CSV
   
3. **Manual Enrichment Decision**
   - Lisa chooses to fix 5 high-priority companies inline
   - Skips the remaining problematic entries
   - Proceeds with 38 valid companies

4. **Processing with Warnings**
   - System processes 38 companies
   - 3 companies fail research step (website unreachable, no social media)
   - System flags these as "Unable to personalize"
   
5. **Selective Sending**
   - Lisa reviews 35 successfully drafted emails
   - Manually researches the 3 flagged companies
   - Decides to skip those 3
   - Sends remaining 32 emails

**Outcome:** Despite data quality issues, Lisa successfully sends 32 personalized emails with minimal frustration

---

## 4. Domain Model & Key Concepts

### 4.1 Core Domain Entities

```
┌─────────────────────────────────────────────────────────────┐
│                         CAMPAIGN                              │
│  - Campaign template/theme                                   │
│  - Value proposition                                         │
│  - Sender preferences                                        │
│  - Status (setup, processing, active, completed)            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ contains
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       PROSPECT                                │
│  - Company name                                              │
│  - Contact info (email, name, website)                       │
│  - Industry/category                                         │
│  - Source (where they were found)                            │
│  - Status (new, researching, ready, sent, replied)          │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ generates
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESEARCH PROFILE                           │
│  - Website content summary                                   │
│  - Recent social media activity                              │
│  - Video opportunities identified                            │
│  - Confidence score                                          │
│  - Data sources used                                         │
│  - Timestamp                                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ informs
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      EMAIL DRAFT                              │
│  - Subject line                                              │
│  - Body content                                              │
│  - Personalization hooks used                                │
│  - AI reasoning/confidence                                   │
│  - Status (draft, approved, sent)                            │
│  - Edit history                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ becomes
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      SENT EMAIL                               │
│  - Sent timestamp                                            │
│  - Gmail message ID                                          │
│  - Tracking data (opens, clicks)                             │
│  - Response status                                           │
│  - Follow-up actions                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Domain Concepts

**Campaign**
- A themed batch of outreach to similar prospects
- Example: "Social Media Content Upgrade for Local Restaurants"
- Contains: target persona, value prop, email template structure
- Lifecycle: Setup → Processing → Active → Completed

**Prospect**
- A potential client company + contact person
- Source of truth for company information
- Enriched through research process
- Can belong to multiple campaigns

**Research Profile**
- AI-generated intelligence about a prospect
- Includes: website analysis, social media scan, opportunity identification
- Must cite sources for transparency
- Has confidence score (High/Medium/Low)

**Personalization Hook**
- Specific, recent insight that makes email relevant
- Examples:
  - "I noticed your Instagram has great product photos but no video demos"
  - "Saw your recent LinkedIn post about expanding to e-commerce"
  - "Your 'About Us' page mentions new location opening soon"
- Must be verifiable and recent (< 90 days)

**Email Draft**
- AI-generated email awaiting human review
- Includes: subject, body, hook explanation, confidence score
- User can: approve as-is, edit, regenerate, or skip
- Never sent without explicit user approval

**Video Opportunity**
- Specific, actionable video project suggestion
- Based on: current content gaps, business goals, industry trends
- Examples:
  - "Product demo video for your new widget line"
  - "Customer testimonial video for social proof"
  - "Behind-the-scenes content for Instagram Stories"

### 4.3 Domain Rules & Constraints

1. **No Auto-Send Rule**: Emails are NEVER sent automatically. User must explicitly approve each email.

2. **Personalization Requirement**: An email cannot be marked "Ready to Send" unless it contains at least one verifiable personalization hook.

3. **Daily Send Limits**: System enforces sending limits to protect sender reputation (default: 40/day, configurable).

4. **Research Freshness**: Research profiles older than 30 days are marked "stale" and should be refreshed.

5. **Source Attribution**: Every personalization claim must link back to source (URL, social post, etc.).

6. **Confidence Scoring**:
   - **High (80-100%)**: Strong recent insight with clear video opportunity
   - **Medium (50-79%)**: Relevant insight but weaker opportunity connection
   - **Low (<50%)**: Generic or weak personalization - needs human review

7. **Duplicate Prevention**: System prevents sending to same email address within 90 days across campaigns.

8. **Email Quality Gates**:
   - Subject line: 30-60 characters
   - Body: 75-150 words
   - Must include one clear CTA
   - No spam trigger words
   - Proper unsubscribe mechanism

---

## 5. Functional Requirements

### 5.1 Core Features (MVP)

#### F1: Campaign Management
**Priority: P0 (MVP Critical)**

**User Stories:**
- As a freelancer, I want to create a new campaign with my value proposition so that emails align with my services
- As a user, I want to name and organize campaigns so I can track different outreach strategies
- As a user, I want to see campaign status at a glance so I know what needs attention

**Acceptance Criteria:**
- User can create campaign with: name, template selection, value prop (150 char max)
- User can view list of all campaigns with status indicators
- User can archive completed campaigns
- System validates required fields before campaign creation

**Technical Notes:**
- Campaign entity persists in Firestore
- Support for campaign templates (predefined structures)
- Status workflow: Draft → Active → Completed → Archived

---

#### F2: Prospect Import & Validation
**Priority: P0 (MVP Critical)**

**User Stories:**
- As a user, I want to upload a CSV of prospects so I can bulk import my target list
- As a user, I want immediate validation feedback so I can fix data issues before processing
- As a user, I want to see which prospects failed validation and why

**Acceptance Criteria:**
- User can upload CSV with columns: company_name, contact_email, contact_name (optional), website_url (optional)
- System validates:
  - Email format (RFC 5322 compliant)
  - No duplicates within upload
  - No duplicates with existing prospects (90-day window)
  - Website URL format (if provided)
- System displays validation report showing:
  - Total uploaded
  - Valid prospects
  - Invalid prospects with specific error messages
- User can choose to: proceed with valid only, fix and re-upload, or cancel
- Valid prospects are added to campaign with "New" status

**Technical Notes:**
- CSV parsing via Papa Parse or similar
- Validation runs client-side before API submission
- Firestore composite query to check for duplicates
- Batch write for prospect creation

---

#### F3: Automated Prospect Research
**Priority: P0 (MVP Critical)**

**User Stories:**
- As a system, I need to automatically research each prospect to gather personalization data
- As a user, I want the system to identify specific video opportunities so emails are relevant
- As a user, I want to see what data sources were used so I can trust the personalization

**Acceptance Criteria:**
- For each prospect, system performs:
  - **Website scraping**: Extract about page, recent blog posts, services page content
  - **Social media scan**: Check Instagram, LinkedIn, Facebook for recent posts (last 30 days)
  - **Opportunity analysis**: Identify 1-3 specific video opportunities based on:
    - Content gaps (e.g., no video but active on social media)
    - Recent announcements (new product, location, event)
    - Industry patterns (competitors doing X, they could too)
- System generates Research Profile containing:
  - Summary of business (2-3 sentences)
  - Top 2-3 personalization hooks with source URLs
  - Confidence score (High/Medium/Low)
  - Timestamp of research
- Research completes within 2 minutes per prospect
- If research fails (website down, no data), prospect is flagged as "Unable to Research"

**Technical Notes:**
- Research runs via worker queue (Bull/RabbitMQ)
- Website scraping: Puppeteer for dynamic content, Cheerio for static
- Social media: API integrations where possible, scraping where necessary
- AI analysis: GPT-4 or Claude for opportunity identification
- Store raw data + AI analysis in Firestore
- Rate limiting to avoid being blocked

---

#### F4: AI Email Draft Generation
**Priority: P0 (MVP Critical)**

**User Stories:**
- As a user, I want AI to draft personalized emails so I don't have to write from scratch
- As a user, I want to see the reasoning behind personalization so I can trust the quality
- As a user, I want emails to sound natural and professional, not robotic

**Acceptance Criteria:**
- System generates email draft for each prospect with valid research
- Email structure:
  - **Subject line**: 30-60 characters, personalized, curiosity-driven
  - **Opening**: Reference specific personalization hook
  - **Value prop**: Connect their opportunity to your service
  - **Call-to-action**: Low-commitment ask (15-min call, quick question)
  - **Signature**: User's name and credentials
- Draft includes:
  - Email content
  - Highlighted personalization sections
  - AI confidence score
  - Reasoning explanation ("I mentioned their Instagram because...")
  - Source links for verification
- Email tone: professional, consultative, not salesy
- Word count: 75-150 words
- Generation completes within 30 seconds per email

**Technical Notes:**
- LLM: GPT-4 or Claude with carefully crafted prompts
- Prompt includes: campaign context, research profile, user's value prop
- System prompt enforces tone, length, structure requirements
- Store draft with metadata in Firestore
- Support regeneration if user is unsatisfied

---

#### F5: Email Review & Approval Interface
**Priority: P0 (MVP Critical)**

**User Stories:**
- As a user, I want to review all drafted emails in one place so I can efficiently approve them
- As a user, I want to edit emails inline so I can add my personal touch
- As a user, I want to see research context while reviewing so I can judge quality

**Acceptance Criteria:**
- Review interface displays queue of "Ready to Review" emails
- For each email, user sees:
  - Draft email (editable)
  - Prospect info (company name, website link)
  - Research highlights (hooks used, sources)
  - AI confidence score
  - Preview of how email will appear
- User can:
  - **Approve**: Mark ready to send as-is
  - **Edit & Approve**: Make changes then approve
  - **Regenerate**: Request new draft with feedback
  - **Skip**: Remove from campaign
- Keyboard shortcuts for efficiency:
  - `A` = Approve
  - `E` = Edit mode
  - `S` = Skip
  - `R` = Regenerate
  - `→` = Next email
- Edit tracking: System logs changes made by user for learning
- Batch actions: Approve multiple emails at once
- Progress indicator: "15 of 100 reviewed"

**Technical Notes:**
- React-based review UI with smooth transitions
- Rich text editor for inline editing (Slate.js or similar)
- Optimistic updates for smooth UX
- Auto-save edits to Firestore
- Undo/redo support for edits

---

#### F6: Email Sending via Gmail Integration
**Priority: P0 (MVP Critical)**

**User Stories:**
- As a user, I want emails sent from my real Gmail account so they look legitimate
- As a user, I want to control sending pace so I don't trigger spam filters
- As a user, I want sent emails to appear in my Gmail sent folder so I have a record

**Acceptance Criteria:**
- User connects Gmail account via OAuth 2.0
- User can select approved emails and click "Send Batch"
- System sends emails via Gmail API:
  - From: user's Gmail address
  - Plain text format (better deliverability)
  - Proper headers (no bulk mail indicators)
  - Unsubscribe link in footer
- Sending pace: 1 email per 60-90 seconds (randomized interval)
- Sent emails appear in user's Gmail "Sent" folder
- System tracks:
  - Send timestamp
  - Gmail message ID
  - Delivery status
- User receives confirmation when batch is complete
- Daily send limit enforced (default 40, configurable)

**Technical Notes:**
- Gmail API integration via official SDK
- OAuth 2.0 flow with required scopes: `gmail.send`, `gmail.modify`
- Worker queue for paced sending
- Store Gmail message ID for thread tracking
- Retry logic for transient failures (rate limits, network issues)
- Webhook for delivery status updates (if available)

---

#### F7: Response Tracking & Notifications
**Priority: P1 (High Priority, Post-MVP)**

**User Stories:**
- As a user, I want to know when prospects reply so I can respond quickly
- As a user, I want to see response rate by campaign so I know what's working
- As a user, I want to be notified of positive replies so I don't miss opportunities

**Acceptance Criteria:**
- System monitors user's Gmail for replies to sent emails
- When reply detected:
  - Prospect status updated to "Replied"
  - Email thread linked in UI
  - User notified (in-app + optional email/SMS)
- Response classification:
  - **Positive**: Interested, wants to talk
  - **Objection**: Not now, too expensive, etc.
  - **Negative**: Not interested, unsubscribe
  - **Unclear**: Needs human review
- Dashboard displays:
  - Response rate by campaign
  - Response rate over time
  - Breakdown by classification
- User can click through to see full reply thread

**Technical Notes:**
- Gmail API with `gmail.readonly` scope
- Periodic polling (every 5 minutes) for new emails
- Thread matching via Gmail message ID
- AI classification of reply sentiment (GPT-4)
- Real-time notifications via WebSocket or polling
- Store reply text and classification in Firestore

---

#### F8: Campaign Analytics Dashboard
**Priority: P1 (High Priority, Post-MVP)**

**User Stories:**
- As a user, I want to see how my campaigns are performing so I can improve
- As a user, I want to compare campaigns to identify what works best
- As a user, I want to track progress toward my goal of 10-15 meetings/month

**Acceptance Criteria:**
- Dashboard displays per campaign:
  - Total emails sent
  - Open rate (if tracking enabled)
  - Response rate
  - Positive response rate
  - Meetings booked
  - Time invested (review + sending)
- Overall metrics across all campaigns:
  - Total meetings booked this month
  - Progress to 10-15 meeting goal
  - Average response rate
  - Time saved vs. manual prospecting
- Visualizations:
  - Response rate trend over time
  - Campaign performance comparison
  - Funnel view (sent → opened → replied → meeting)
- Export to CSV for external analysis

**Technical Notes:**
- Firestore aggregation queries
- Chart library: Recharts or similar
- Real-time updates via Firestore listeners
- Caching for performance
- Date range filtering

---

### 5.2 Secondary Features (Post-MVP)

#### F9: Follow-up Sequence Automation
**Priority: P2 (Nice to Have)**

**Description:** 
Automatically draft follow-up emails for prospects who don't respond within X days. Follow-ups maintain personalization thread and add new hooks.

**User Stories:**
- As a user, I want to send follow-ups to non-responders without starting from scratch
- As a user, I want follow-ups to add new information, not just repeat the original

**Acceptance Criteria:**
- User can enable follow-up sequence for campaign (e.g., "Send follow-up after 5 days")
- System drafts follow-up email that:
  - References original email
  - Adds new personalization hook (new social post, different angle)
  - Remains concise and respectful
- Follow-up requires approval before sending (same review process)
- Max 2 follow-ups per prospect
- User can disable follow-ups per campaign

---

#### F10: Email Template Library
**Priority: P2 (Nice to Have)**

**Description:**
Pre-built email templates for common video production scenarios (product demos, testimonials, social content, event coverage).

**User Stories:**
- As a new user, I want template examples so I don't start from a blank slate
- As an experienced user, I want to save my best-performing emails as templates

**Acceptance Criteria:**
- Library of 5-7 pre-built templates:
  - Social media content upgrade
  - Product demonstration video
  - Customer testimonial collection
  - Event coverage
  - About Us / team introduction video
- Each template includes:
  - Sample email structure
  - Personalization strategy guidance
  - When to use this template
- User can:
  - Clone template to create new campaign
  - Save custom templates to personal library
  - Edit template structure and prompts

---

#### F11: Social Media Deep Integration
**Priority: P2 (Nice to Have)**

**Description:**
Direct API integrations with Instagram, LinkedIn, Facebook to improve research depth and enable richer personalization.

**User Stories:**
- As a user, I want deeper social media insights so personalization is more compelling
- As a system, I want reliable social media data so research success rate improves

**Acceptance Criteria:**
- Instagram Business API integration to fetch:
  - Recent posts (images, captions, engagement)
  - Stories (if accessible)
  - Follower count and growth
- LinkedIn Company API integration to fetch:
  - Recent posts
  - Company updates
  - Employee count changes
- Facebook Pages API for business pages
- Enriched research profile with social media metrics
- Visual preview of referenced social posts in review UI

---

#### F12: CRM Integration (Hubspot, Pipedrive)
**Priority: P3 (Future)**

**Description:**
Sync prospects and meeting outcomes to user's CRM for unified pipeline management.

---

#### F13: A/B Testing Framework
**Priority: P3 (Future)**

**Description:**
Built-in A/B testing for subject lines, email structures, and calls-to-action with statistical significance tracking.

---

## 6. Non-Functional Requirements

### 6.1 Performance

**Response Time:**
- Page load: <2 seconds for dashboard and review interface
- Email draft generation: <30 seconds per email
- Prospect research: <2 minutes per prospect
- CSV upload validation: <5 seconds for 100 prospects

**Throughput:**
- Support 30-40 emails sent per day per user
- Process 100 prospects in batch overnight (6-8 hours)
- Handle 10 concurrent users during MVP

**Scalability:**
- Architecture must support growth to 100 users without redesign
- Database queries optimized for 10,000+ prospects per user

---

### 6.2 Security & Privacy

**Authentication:**
- OAuth 2.0 for Gmail integration
- Secure token storage (encrypted at rest)
- Token refresh handling
- Session management with proper timeout

**Data Protection:**
- All prospect data encrypted at rest (Firestore native encryption)
- Secrets managed via Vault or equivalent
- No prospect data shared with third parties
- GDPR-compliant data handling:
  - Right to export
  - Right to deletion
  - Data retention policies

**Email Security:**
- No auto-send to prevent unauthorized access consequences
- Rate limiting to prevent abuse
- Unsubscribe mechanism in all emails
- SPF/DKIM/DMARC alignment recommendations

---

### 6.3 Reliability & Availability

**Uptime:**
- Target: 99% uptime during business hours (MVP)
- Graceful degradation if external APIs fail

**Error Handling:**
- User-friendly error messages
- Automatic retry for transient failures (API rate limits, network issues)
- Failed prospects flagged with clear reason, not silently dropped

**Data Integrity:**
- No data loss during research or drafting process
- Transactional operations for critical state changes
- Audit log for sent emails

**Backup:**
- Daily Firestore backups
- 30-day retention

---

### 6.4 Usability

**Ease of Use:**
- Onboarding flow completes in <10 minutes
- Review interface requires minimal training
- Keyboard shortcuts for power users
- Mobile-responsive (view-only, not full editing)

**Accessibility:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility

**Help & Documentation:**
- Inline tooltips for key features
- Video walkthrough for first campaign
- FAQ section
- Email support during MVP

---

### 6.5 Maintainability

**Code Quality:**
- TypeScript throughout for type safety
- Linting (ESLint) and formatting (Prettier)
- Unit test coverage >70% for business logic
- Integration tests for critical workflows

**Logging & Monitoring:**
- Structured logging (JSON format)
- Error tracking (Sentry or similar)
- Performance monitoring for slow queries
- User activity analytics (privacy-respecting)

**Deployment:**
- CI/CD pipeline for automated testing and deployment
- Staging environment for pre-production testing
- Feature flags for gradual rollout
- Rollback capability

---

## 7. Technical Architecture (High-Level)

### 7.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│                     (React/Next.js)                          │
│  - Campaign Management UI                                    │
│  - Email Review Interface                                    │
│  - Analytics Dashboard                                       │
│  - Gmail OAuth Flow                                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       API GATEWAY                             │
│                    (Express.js/NestJS)                       │
│  - Authentication & Authorization                            │
│  - Request Validation                                        │
│  - Rate Limiting                                             │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Campaign   │ │   Research   │ │    Email     │
│   Service    │ │   Service    │ │   Service    │
└──────────────┘ └──────────────┘ └──────────────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                 ┌──────────────────┐
                 │    Firestore     │
                 │   (Database)     │
                 └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      ASYNC WORKERS                            │
│  - Research Worker (Prospect enrichment)                     │
│  - Draft Worker (Email generation)                           │
│  - Send Worker (Gmail sending with pacing)                   │
│  - Reply Detector (Monitor Gmail for replies)               │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────┐
│   Message Queue  │
│  (Bull/RabbitMQ) │
└──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                       │
│  - Gmail API (Send, read, track)                            │
│  - OpenAI/Anthropic (Email drafting, research analysis)     │
│  - Web Scraping (Puppeteer for prospect research)           │
│  - Social Media APIs (Instagram, LinkedIn, Facebook)        │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Data Flow: Campaign Execution

```
1. USER: Upload CSV
   ↓
2. FRONTEND: Validate CSV → API: Create Campaign + Prospects
   ↓
3. API: Write prospects to Firestore → Enqueue research jobs
   ↓
4. RESEARCH WORKER: 
   - Fetch prospect from queue
   - Scrape website + social media
   - AI analysis for opportunities
   - Write Research Profile to Firestore
   - Enqueue draft job
   ↓
5. DRAFT WORKER:
   - Fetch prospect + research from Firestore
   - AI generate email draft
   - Write Draft to Firestore
   - Update prospect status to "Ready to Review"
   ↓
6. USER: Review drafts in UI
   - Approve, edit, or skip
   ↓
7. FRONTEND: Mark drafts as "Approved" → API
   ↓
8. USER: Click "Send Batch"
   ↓
9. SEND WORKER:
   - Fetch approved emails from Firestore
   - Send via Gmail API (paced)
   - Update status to "Sent"
   - Store Gmail message ID
   ↓
10. REPLY DETECTOR (periodic):
    - Poll Gmail for replies to sent messages
    - Classify reply sentiment
    - Notify user
```

### 7.3 Technology Stack

**Frontend:**
- React with Next.js (SSR/SSG)
- TypeScript
- Tailwind CSS for styling
- React Query for data fetching
- Zustand or Redux for state management

**Backend:**
- Node.js with NestJS framework
- TypeScript
- Bull for job queues (Redis-backed)
- Gmail API official SDK
- OpenAI/Anthropic SDK

**Database:**
- Firestore (primary database)
- Redis (caching, queue management)

**Infrastructure:**
- Docker containers
- Deployment: Cloud Run, Vercel, or similar
- Secrets: Vault
- Monitoring: Sentry (errors), Datadog/Prometheus (metrics)

**External APIs:**
- Gmail API
- OpenAI GPT-4 or Anthropic Claude
- Instagram/LinkedIn/Facebook APIs (future)

---

## 8. MVP Scope & Phasing

### 8.1 Phase 1: MVP (Weeks 1-8)

**Goal:** Core workflow functional for personal use by founder

**Features Included:**
- ✅ F1: Campaign Management (basic)
- ✅ F2: Prospect Import & Validation
- ✅ F3: Automated Prospect Research (website + Instagram only)
- ✅ F4: AI Email Draft Generation
- ✅ F5: Email Review & Approval Interface
- ✅ F6: Email Sending via Gmail
- ✅ Basic analytics (sent count, manual reply tracking)

**Features Excluded:**
- Automated response tracking
- Follow-up sequences
- Template library
- Advanced social media integration
- CRM integration

**Success Criteria:**
- Founder uses tool for 100% of prospecting activity
- Achieves 10% response rate
- Reduces prospecting time from 10h/week to 5h/week
- Generates 10-15 meetings in first month of use

**Deliverables:**
- Deployed application (single-user)
- User documentation
- Basic monitoring and error tracking

---

### 8.2 Phase 2: Polish & Scale (Weeks 9-12)

**Goal:** Production-ready for multiple users

**Features Added:**
- ✅ F7: Response Tracking & Notifications
- ✅ F8: Campaign Analytics Dashboard
- Multi-user support
- Improved UI/UX based on founder feedback
- Onboarding flow

**Success Criteria:**
- 5 beta users successfully run campaigns
- Average response rate >8% across users
- <5 critical bugs reported
- User satisfaction score >4/5

---

### 8.3 Phase 3: SaaS Launch (Weeks 13-16)

**Goal:** Public launch as SaaS product

**Features Added:**
- ✅ F10: Email Template Library
- Subscription billing (Stripe)
- User authentication (Firebase Auth or Auth0)
- Tiered pricing (Starter, Pro)
- Marketing website

**Success Criteria:**
- 50 paying users within 60 days of launch
- <2% churn rate
- Positive unit economics (LTV > 3x CAC)

---

### 8.4 Future Phases (Post-Launch)

**Phase 4: Advanced Personalization**
- ✅ F11: Social Media Deep Integration
- ✅ F9: Follow-up Sequences
- AI learning from user edits

**Phase 5: Enterprise Features**
- ✅ F12: CRM Integration
- ✅ F13: A/B Testing Framework
- Team collaboration features
- White-label options

---

## 9. Open Questions & Assumptions

### 9.1 Open Questions

1. **Data Source Access:**
   - Q: Will we need to pay for social media API access (Instagram Business API requires Facebook Business account)?
   - A: TBD - May start with scraping, upgrade to APIs if/when feasible

2. **Email Sending Limits:**
   - Q: What are realistic daily sending limits for new Gmail accounts vs. established accounts?
   - A: Will test with founder's account. Likely start conservative (20-30/day) and increase gradually.

3. **AI Model Selection:**
   - Q: GPT-4 vs. Claude for drafting? Cost vs. quality tradeoff?
   - A: Will A/B test during MVP development. Likely Claude 3 Opus for quality + cost balance.

4. **Prospect List Sources:**
   - Q: Where will users source their prospect lists from? Do we need to integrate with directories?
   - A: MVP assumes user brings own CSV. Future: integrate with directories like Apollo, Crunchbase.

5. **Unsubscribe Handling:**
   - Q: How do we handle unsubscribes across campaigns? Do we need a central suppression list?
   - A: Yes, implement global unsubscribe list checked before sending. Store in Firestore.

6. **International Support:**
   - Q: Multi-language support needed for MVP?
   - A: No, English-only for MVP. Future: Support French, Spanish, German based on demand.

### 9.2 Assumptions

1. **User has Gmail account:** MVP only supports Gmail. Future: Outlook, SMTP.

2. **User has basic CSV skills:** Can export prospect lists from directories or CRM.

3. **Target companies have online presence:** Website and/or active social media required for research.

4. **User operates in B2B/B2C local services:** Video production for small-medium businesses.

5. **User understands cold email best practices:** Knows to avoid spam triggers, respect unsubscribes, etc.

6. **User has established Gmail account:** New Gmail accounts have stricter sending limits. Recommend account is >6 months old with regular sending history.

7. **Budget for LLM API costs:** Estimated ~$0.10-0.50 per prospect (research + drafting). User or product absorbs cost.

---

## 10. Risks & Mitigations

### 10.1 Technical Risks

**Risk 1: Gmail API Rate Limits**
- **Description:** Gmail API has strict rate limits that could block sending at scale
- **Impact:** High - Core functionality blocked
- **Probability:** Medium
- **Mitigation:** 
  - Implement exponential backoff retry logic
  - Queue-based sending with configurable pacing
  - Monitor quota usage and alert before limits
  - Apply for higher quotas once product validates

**Risk 2: Web Scraping Blocked**
- **Description:** Target websites may block scraping attempts, reducing research success rate
- **Impact:** Medium - Degrades personalization quality
- **Probability:** Medium
- **Mitigation:**
  - Rotate user agents and IPs
  - Respect robots.txt
  - Implement fallback to manual research
  - Use residential proxies if needed (cost consideration)

**Risk 3: LLM Output Quality Variance**
- **Description:** AI-generated emails may be inconsistent in quality, requiring heavy editing
- **Impact:** High - Defeats time-saving purpose
- **Probability:** Medium
- **Mitigation:**
  - Extensive prompt engineering and testing
  - Show confidence scores to flag low-quality drafts
  - Implement feedback loop to improve prompts
  - Offer regeneration option

**Risk 4: Data Loss During Processing**
- **Description:** Prospects or drafts lost due to system failures
- **Impact:** Medium - User frustration, wasted time
- **Probability:** Low
- **Mitigation:**
  - Implement transactional writes
  - Daily Firestore backups
  - Idempotent workers (safe to retry)
  - Comprehensive error logging

### 10.2 Business Risks

**Risk 5: User Reputation Damage**
- **Description:** Poor email quality or spam-like behavior damages user's sender reputation
- **Impact:** Critical - User's Gmail account could be flagged
- **Probability:** Low (with manual review)
- **Mitigation:**
  - No auto-send feature (manual review required)
  - Built-in sending limits
  - Unsubscribe mechanism
  - Email quality guidelines in UI
  - Monitor bounce rates and spam complaints

**Risk 6: Low Response Rates**
- **Description:** Users don't achieve target 10% response rate, question product value
- **Impact:** High - Churn, poor word-of-mouth
- **Probability:** Medium
- **Mitigation:**
  - Set realistic expectations (cold email avg is 1-5%)
  - Provide template guidance and best practices
  - Implement A/B testing to help users improve
  - Offer personalized strategy consultation

**Risk 7: Competition from Established Tools**
- **Description:** Larger players (Instantly.ai, Lemlist) add similar AI features
- **Impact:** Medium - Harder to differentiate
- **Probability:** High
- **Mitigation:**
  - Focus on niche (freelance creatives, not generic sales)
  - Emphasize quality over volume
  - Build community and brand
  - Move fast on features that matter to target audience

### 10.3 Product Risks

**Risk 8: Founder's Needs Don't Generalize**
- **Description:** What works for founder may not work for other video producers
- **Impact:** High - Product doesn't find market fit
- **Probability:** Medium
- **Mitigation:**
  - Interview 10+ video producers during MVP
  - Beta test with diverse users (different niches, experience levels)
  - Build flexibility into templates and personalization strategies
  - Stay close to user feedback

**Risk 9: Too Much Manual Review Required**
- **Description:** If every email needs heavy editing, time savings disappear
- **Impact:** High - Product doesn't deliver on promise
- **Probability:** Medium
- **Mitigation:**
  - Measure edit rate during MVP (target <30% need edits)
  - Continuously improve prompt quality
  - Provide better research context to AI
  - Allow users to train AI on their style over time

---

## 11. Success Metrics & KPIs

### 11.1 User-Level Metrics

**Primary Success Metric:**
- **Meetings Booked per Month:** Target = 10-15 meetings per user
  - Tracked via: User self-reporting + (future) calendar integration
  - Evaluation: Monthly average across cohort

**Email Quality Metrics:**
- **Response Rate:** Target = 10% positive response rate
  - Tracked via: Reply detection system
  - Evaluation: Per campaign and overall average

- **Email Edit Rate:** Target = <30% of emails need editing
  - Tracked via: Edit event logging in review UI
  - Evaluation: % of drafts edited before approval

- **Confidence Score Distribution:** Target = >70% of drafts have "High" confidence
  - Tracked via: AI confidence scores on generated drafts
  - Evaluation: Distribution across High/Medium/Low

**Time Savings Metrics:**
- **Time to Review Batch:** Target = <3 minutes per email
  - Tracked via: Time between opening and approving draft
  - Evaluation: Average across all users

- **Total Prospecting Time:** Target = 5h/week (down from 10h/week)
  - Tracked via: User survey (weekly check-in)
  - Evaluation: Self-reported time spent on prospecting activities

### 11.2 System-Level Metrics

**Research Success Rate:**
- **Successful Research %:** Target = >85% of prospects successfully researched
  - Tracked via: Research worker success/failure logs
  - Evaluation: (Successful research jobs / Total research jobs) * 100

**Email Sending Metrics:**
- **Emails Sent per Day per User:** Target = 30-40
  - Tracked via: Send worker logs
  - Evaluation: Daily average per active user

- **Send Success Rate:** Target = >98%
  - Tracked via: Gmail API response codes
  - Evaluation: (Successful sends / Total send attempts) * 100

**Performance Metrics:**
- **Draft Generation Time:** Target = <30 seconds per email
  - Tracked via: Worker processing time logs
  - Evaluation: P50, P95, P99 latency

- **Research Processing Time:** Target = <2 minutes per prospect
  - Tracked via: Worker processing time logs
  - Evaluation: P50, P95, P99 latency

### 11.3 Product Metrics (Post-MVP)

**Activation:**
- **Time to First Campaign Sent:** Target = <24 hours from signup
  - Tracked via: User activity logs
  - Evaluation: Median time between account creation and first email sent

**Engagement:**
- **Weekly Active Users (WAU):** % of users who review/send emails weekly
  - Tracked via: User activity logs
  - Evaluation: Weekly cohort analysis

- **Campaigns Created per User:** Target = 2-3 active campaigns per user
  - Tracked via: Campaign creation events
  - Evaluation: Average per user per month

**Retention:**
- **Monthly Retention Rate:** Target = >80% after Month 1
  - Tracked via: User login + activity
  - Evaluation: Cohort retention curves

**Growth (SaaS Phase):**
- **User Acquisition:** Target = 50 users in first 60 days
- **Conversion Rate (Trial → Paid):** Target = >40%
- **Net Promoter Score (NPS):** Target = >50
- **Customer Lifetime Value (LTV):** Target = >3x Customer Acquisition Cost (CAC)

### 11.4 Measurement Plan

**Weekly Dashboard:**
- Active users
- Emails sent (total, per user)
- Response rate (by campaign)
- System uptime
- Critical errors

**Monthly Business Review:**
- Meetings booked (per user, cohort averages)
- User satisfaction survey results
- Feature usage heatmap
- Churn analysis
- Unit economics (post-launch)

**Quarterly Strategic Review:**
- Goal achievement (10-15 meetings/month)
- Product-market fit indicators
- Competitive landscape
- Roadmap prioritization

---

## 12. Appendix

### 12.1 Glossary

- **Prospect:** A potential client company + contact person
- **Campaign:** A themed batch of outreach emails to similar prospects
- **Research Profile:** AI-generated intelligence about a prospect (website analysis, social media scan, opportunities)
- **Personalization Hook:** Specific, recent insight that makes an email relevant to the recipient
- **Email Draft:** AI-generated email awaiting human review and approval
- **Video Opportunity:** Specific, actionable video project suggestion based on research
- **Confidence Score:** AI's assessment of email quality (High/Medium/Low)
- **Send Batch:** Group of approved emails queued for sending
- **Response Rate:** % of sent emails that receive any reply
- **Positive Response Rate:** % of sent emails that receive interested/meeting-booking replies
- **Edit Rate:** % of AI-generated drafts that require user editing before approval

### 12.2 References

**Market Research:**
- Cold email response rate benchmarks: 1-5% industry average (source: multiple sales studies)
- Video marketing demand: 86% of businesses use video (Wyzowl 2023)

**Technical References:**
- Gmail API Documentation: https://developers.google.com/gmail/api
- Email Deliverability Best Practices: (various sources)
- Cold Email Compliance: CAN-SPAM Act, GDPR guidelines

**Tools & Frameworks:**
- React/Next.js Documentation
- Firestore Documentation
- OpenAI API Documentation
- Anthropic Claude API Documentation

### 12.3 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | PM Agent | Initial comprehensive PRD |

---

## 13. Sign-Off

**Product Manager:**  
_[Name]_ - Date: _____

**Engineering Lead:**  
_[Name]_ - Date: _____

**Founder/Stakeholder:**  
_[Name]_ - Date: _____

---

**END OF DOCUMENT**

This PRD is a living document and will be updated as the product evolves through discovery, MVP, and iterations based on user feedback and market learnings.
